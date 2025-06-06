// routes/bookings.js
const express = require('express');
const { supabaseAdmin, verifyAuth } = require('../config/supabase');
const router = express.Router();

// GET /api/bookings - Get bookings with filters
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { 
      filter = 'all', 
      page = 1, 
      limit = 50,
      car_id,
      status,
      start_date,
      end_date,
      user_id 
    } = req.query;

    // Get user's organization for RLS
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          license_plate,
          parking_spot
        ),
        profiles!bookings_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `);

    // Apply organization filter (users can only see bookings from their org)
    query = query.eq('cars.organization_id', profile.organization_id);

    // Apply user-specific filter if not admin/fleet_manager
    if (!['admin', 'fleet_manager'].includes(profile.role)) {
      query = query.eq('user_id', req.user.id);
    }

    // Apply filters
    if (car_id) query = query.eq('car_id', car_id);
    if (status) query = query.eq('status', status);
    if (user_id && ['admin', 'fleet_manager'].includes(profile.role)) {
      query = query.eq('user_id', user_id);
    }

    // Date filters
    if (start_date) query = query.gte('start_time', start_date);
    if (end_date) query = query.lte('end_time', end_date);

    // Time-based filters
    const now = new Date().toISOString();
    if (filter === 'upcoming') {
      query = query.gte('start_time', now);
    } else if (filter === 'past') {
      query = query.lt('end_time', now);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: bookings, error } = await query;

    if (error) throw error;

    res.status(200).json({
      bookings: bookings || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: bookings?.length || 0
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bookings/:id - Get booking by ID
router.get('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          license_plate,
          parking_spot,
          organization_id
        ),
        profiles!bookings_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    // Users can only view their own bookings or bookings in their organization
    const canView = booking.user_id === req.user.id || 
                   (profile && booking.cars.organization_id === profile.organization_id && 
                    ['admin', 'fleet_manager'].includes(profile.role));

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json(booking);

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bookings - Create new booking
router.post('/', verifyAuth, async (req, res) => {
  try {
    const {
      car_id,
      start_time,
      end_time,
      reason,
      destination,
      passenger_count,
      notes
    } = req.body;

    // Validate required fields
    if (!car_id || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Missing required fields: car_id, start_time, end_time' 
      });
    }

    // Validate dates
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const now = new Date();

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    if (startDate < now) {
      return res.status(400).json({ error: 'Start time cannot be in the past' });
    }

    // Check if car exists and is available
    const { data: car, error: carError } = await supabaseAdmin
      .from('cars')
      .select('id, status, organization_id')
      .eq('id', car_id)
      .single();

    if (carError || !car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    if (car.status !== 'available') {
      return res.status(400).json({ error: 'Car is not available for booking' });
    }

    // Check user permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile || profile.organization_id !== car.organization_id) {
      return res.status(403).json({ error: 'Access denied - car not in your organization' });
    }

    // Check for booking conflicts
    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('car_id', car_id)
      .in('status', ['confirmed', 'in_progress'])
      .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time}),and(start_time.gte.${start_time},end_time.lte.${end_time})`);

    if (conflictError) throw conflictError;

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ error: 'Car is already booked for this time period' });
    }

    // Create booking
    const bookingData = {
      user_id: req.user.id,
      car_id,
      start_time,
      end_time,
      reason,
      destination,
      passenger_count: passenger_count ? parseInt(passenger_count) : null,
      notes,
      status: 'pending', // Require approval by default
      created_at: new Date().toISOString()
    };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
      .select(`
        *,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          license_plate
        )
      `)
      .single();

    if (bookingError) throw bookingError;

    res.status(201).json({
      message: 'Booking created successfully',
      booking: booking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/bookings/:id - Update booking
router.put('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('user_id, status, car_id, cars!bookings_car_id_fkey(organization_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    const canEdit = existingBooking.user_id === req.user.id || 
                   (profile && existingBooking.cars.organization_id === profile.organization_id && 
                    ['admin', 'fleet_manager'].includes(profile.role));

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prevent editing completed bookings
    if (existingBooking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot edit completed bookings' });
    }

    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates };
    delete allowedUpdates.id;
    delete allowedUpdates.user_id;
    delete allowedUpdates.created_at;
    allowedUpdates.updated_at = new Date().toISOString();

    // Special handling for status changes (approval/completion)
    if (updates.status && updates.status !== existingBooking.status) {
      if (updates.status === 'confirmed' && !['admin', 'fleet_manager'].includes(profile.role)) {
        return res.status(403).json({ error: 'Only fleet managers can approve bookings' });
      }
      
      if (updates.status === 'confirmed') {
        allowedUpdates.approved_by = req.user.id;
        allowedUpdates.approved_at = new Date().toISOString();
      }
    }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .update(allowedUpdates)
      .eq('id', id)
      .select(`
        *,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          license_plate
        )
      `)
      .single();

    if (error) throw error;

    res.status(200).json({
      message: 'Booking updated successfully',
      booking: booking
    });

  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/bookings/:id - Cancel booking
router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('user_id, status, start_time, cars!bookings_car_id_fkey(organization_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    const canCancel = existingBooking.user_id === req.user.id || 
                     (profile && existingBooking.cars.organization_id === profile.organization_id && 
                      ['admin', 'fleet_manager'].includes(profile.role));

    if (!canCancel) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prevent canceling past or completed bookings
    const now = new Date();
    const startTime = new Date(existingBooking.start_time);
    
    if (startTime < now && existingBooking.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel past or in-progress bookings' });
    }

    if (existingBooking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed bookings' });
    }

    // Update status to cancelled instead of deleting
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Booking cancelled successfully' });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bookings/calendar - Get calendar view data
router.get('/calendar/data', verifyAuth, async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Get user's organization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        reason,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          license_plate,
          organization_id
        ),
        profiles!bookings_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .gte('start_time', start)
      .lte('end_time', end);

    // Apply organization filter
    query = query.eq('cars.organization_id', profile.organization_id);

    // Apply user filter if not admin/fleet_manager
    if (!['admin', 'fleet_manager'].includes(profile.role)) {
      query = query.eq('user_id', req.user.id);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    res.status(200).json({ bookings: bookings || [] });

  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;