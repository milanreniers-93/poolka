// routes/bookings.js - Updated with separate endpoints

const express = require('express');
const { supabaseAdmin, verifyAuth } = require('../config/supabase');
const router = express.Router();

// Helper function to get user profile and permissions
const getUserProfile = async (userId) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('organization_id, role, first_name, last_name, email, id')
    .eq('id', userId)
    .single();
  
  if (!profile || error) {
    throw new Error('User profile not found');
  }

  const rolePermissions = {
    'admin': { canViewAll: true, canViewOrgWide: true, canManageAll: true },
    'fleet_manager': { canViewAll: true, canViewOrgWide: true, canManageAll: true },
    'manager': { canViewAll: false, canViewOrgWide: true, canManageAll: false },
    'employee': { canViewAll: false, canViewOrgWide: false, canManageAll: false },
    'user': { canViewAll: false, canViewOrgWide: false, canManageAll: false }
  };

  const permissions = rolePermissions[profile.role] || { canViewAll: false, canViewOrgWide: false, canManageAll: false };
  
  return { profile, permissions };
};

// POST /api/bookings/:id/approve - Dedicated approval endpoint
router.post('/:id/approve', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Approval endpoint hit');
    console.log('🔍 Backend Debug - Booking ID:', req.params.id);
    
    const bookingId = req.params.id;
    const { profile, permissions } = await getUserProfile(req.user.id);

    // Only admins/fleet managers can approve
    if (!permissions.canManageAll) {
      return res.status(403).json({ error: 'Access denied - insufficient permissions to approve bookings' });
    }

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*, cars!bookings_car_id_fkey(organization_id)')
      .eq('id', bookingId)
      .single();

    if (!existingBooking || fetchError) {
      console.log('❌ Backend Debug - Booking not found:', fetchError);
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('🔍 Backend Debug - Existing booking status:', existingBooking.status);

    // Security check
    if (existingBooking.cars?.organization_id !== profile.organization_id) {
      return res.status(403).json({ error: 'Access denied - booking not in your organization' });
    }

    // Business logic check
    if (existingBooking.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending bookings can be approved' });
    }

    // Approval update - use 'approved' status with required approval fields
    console.log('🔍 Backend Debug - Updating booking to approved status');
    const { data: approvedBooking, error: approvalError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'approved',
        status_changed_by: req.user.id,  // Updated field name
        status_changed_at: new Date().toISOString(),  // Updated field name
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
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
      `)
      .single();

    if (approvalError) {
      console.log('❌ Backend Debug - Approval failed:', approvalError);
      throw approvalError;
    }

    console.log('✅ Booking approved successfully:', bookingId);

    res.status(200).json({
      booking: approvedBooking,
      message: 'Booking approved successfully'
    });

  } catch (error) {
    console.error('❌ Approval error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

// POST /api/bookings/:id/reject - Dedicated rejection endpoint
router.post('/:id/reject', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Rejection endpoint hit');
    
    const bookingId = req.params.id;
    const { reason } = req.body;
    const { profile, permissions } = await getUserProfile(req.user.id);

    if (!permissions.canManageAll) {
      return res.status(403).json({ error: 'Access denied - insufficient permissions to reject bookings' });
    }

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*, cars!bookings_car_id_fkey(organization_id)')
      .eq('id', bookingId)
      .single();

    if (!existingBooking || fetchError) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Security check
    if (existingBooking.cars?.organization_id !== profile.organization_id) {
      return res.status(403).json({ error: 'Access denied - booking not in your organization' });
    }

    if (existingBooking.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending bookings can be rejected' });
    }

    // Rejection update - use 'rejected' status with required approval fields
    const { data: rejectedBooking, error: rejectionError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'rejected',
        status_changed_by: req.user.id,  // Updated field name
        status_changed_at: new Date().toISOString(),  // Updated field name
        notes: reason ? `Rejection reason: ${reason}` : null,  // Store reason in notes
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
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
      `)
      .single();

    if (rejectionError) throw rejectionError;

    console.log('✅ Booking rejected successfully:', bookingId);

    res.status(200).json({
      booking: rejectedBooking,
      message: 'Booking rejected successfully'
    });

  } catch (error) {
    console.error('❌ Rejection error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

// GET /api/bookings/calendar/data - Get calendar data (must come before /:id route)
router.get('/calendar/data', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Calendar data route hit');
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const { profile, permissions } = await getUserProfile(req.user.id);

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        reason,
        destination,
        user_id,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          license_plate,
          organization_id
        ),
        profiles!bookings_user_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('cars.organization_id', profile.organization_id)
      .gte('start_time', start)
      .lte('end_time', end);

    // Apply role-based filtering
    if (!permissions.canViewAll) {
      query = query.eq('user_id', req.user.id);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    // Transform data for calendar format
    const calendarEvents = bookings?.map(booking => ({
      id: booking.id,
      title: `${booking.cars?.make} ${booking.cars?.model}`,
      start: booking.start_time,
      end: booking.end_time,
      status: booking.status,
      car: booking.cars,
      user: booking.profiles,
      reason: booking.reason,
      destination: booking.destination,
      isOwn: booking.user_id === req.user.id
    })) || [];

    res.status(200).json({ events: calendarEvents });

  } catch (error) {
    console.error('❌ Calendar data error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

// GET /api/bookings/:id - Get individual booking by ID
router.get('/:id', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Individual booking route hit');
    console.log('🔍 Backend Debug - Booking ID:', req.params.id);
    
    const bookingId = req.params.id;

    if (!bookingId || bookingId === 'undefined' || bookingId === 'null') {
      return res.status(400).json({ error: 'Valid booking ID is required' });
    }

    const { profile, permissions } = await getUserProfile(req.user.id);

    let query = supabaseAdmin
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
      .eq('id', bookingId)
      .single();

    const { data: booking, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Booking not found' });
      }
      throw error;
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Security checks
    if (booking.cars?.organization_id !== profile.organization_id) {
      return res.status(403).json({ error: 'Access denied - booking not in your organization' });
    }

    if (!permissions.canViewAll && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - you can only view your own bookings' });
    }

    res.status(200).json({ booking });

  } catch (error) {
    console.error('❌ Individual booking route error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

// POST /api/bookings - Create new booking
router.post('/', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Create booking route hit');
    
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

    if (startDate < now) {
      return res.status(400).json({ error: 'Cannot book in the past' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const { profile } = await getUserProfile(req.user.id);

    // Verify car belongs to user's organization
    const { data: car, error: carError } = await supabaseAdmin
      .from('cars')
      .select('id, organization_id, status')
      .eq('id', car_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!car || carError) {
      return res.status(404).json({ error: 'Car not found or not accessible' });
    }

    if (car.status !== 'available') {
      return res.status(400).json({ error: 'Car is not available for booking' });
    }

    // Enhanced conflict checking with detailed debugging
    console.log('🔍 Backend Debug - Checking for booking conflicts...');
    console.log('🔍 Backend Debug - Car ID:', car_id);
    console.log('🔍 Backend Debug - Start time:', start_time);
    console.log('🔍 Backend Debug - End time:', end_time);

    // Check for conflicting bookings - more detailed approach
    const { data: allBookings, error: allBookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, status, user_id')
      .eq('car_id', car_id)
      .in('status', ['approved', 'pending']); // Check both approved and pending bookings

    console.log('🔍 Backend Debug - All bookings for this car:', allBookings?.length || 0);
    
    if (allBookings) {
      allBookings.forEach(booking => {
        console.log('🔍 Existing booking:', {
          id: booking.id,
          status: booking.status,
          start: booking.start_time,
          end: booking.end_time,
          user: booking.user_id
        });
      });
    }

    if (allBookingsError) {
      console.log('❌ Error fetching bookings:', allBookingsError);
      throw allBookingsError;
    }

    // Manual conflict detection for better debugging
    const conflicts = [];
    const newStart = new Date(start_time);
    const newEnd = new Date(end_time);

    if (allBookings) {
      allBookings.forEach(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        
        // Check if bookings overlap
        const hasOverlap = (newStart < bookingEnd) && (newEnd > bookingStart);
        
        console.log('🔍 Conflict check:', {
          bookingId: booking.id,
          bookingStatus: booking.status,
          bookingStart: booking.start_time,
          bookingEnd: booking.end_time,
          newStart: start_time,
          newEnd: end_time,
          hasOverlap: hasOverlap
        });
        
        if (hasOverlap) {
          conflicts.push(booking);
        }
      });
    }

    console.log('🔍 Backend Debug - Conflicts found:', conflicts.length);

    if (conflicts.length > 0) {
      console.log('❌ Backend Debug - Conflicting bookings:', conflicts);
      return res.status(409).json({ 
        error: 'Car is already booked during this time period',
        conflicts: conflicts.map(c => ({
          id: c.id,
          status: c.status,
          start_time: c.start_time,
          end_time: c.end_time
        })),
        debug: {
          requestedStart: start_time,
          requestedEnd: end_time,
          carId: car_id
        }
      });
    }

    console.log('✅ Backend Debug - No conflicts found, proceeding with booking creation');

    // Create the booking
    const bookingData = {
      user_id: req.user.id,
      car_id,
      start_time,
      end_time,
      reason: reason || null,
      destination: destination || null,
      passenger_count: passenger_count || 1,
      notes: notes || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newBooking, error: createError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
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
      `)
      .single();

    if (createError) throw createError;

    console.log('✅ Booking created successfully:', newBooking.id);

    res.status(201).json({
      booking: newBooking,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('❌ Create booking error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

// PUT /api/bookings/:id - Update booking (regular updates only, no status changes)
router.put('/:id', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Regular update route hit');
    console.log('🔍 Backend Debug - Booking ID:', req.params.id);
    console.log('🔍 Backend Debug - Request body:', JSON.stringify(req.body, null, 2));
    
    const bookingId = req.params.id;
    const updates = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const { profile, permissions } = await getUserProfile(req.user.id);

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          organization_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (!existingBooking || fetchError) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Security checks
    if (existingBooking.cars?.organization_id !== profile.organization_id) {
      return res.status(403).json({ error: 'Access denied - booking not in your organization' });
    }

    if (!permissions.canManageAll && existingBooking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - you can only update your own bookings' });
    }

    // IMPORTANT: Prevent status changes through regular update
    if (updates.status && ['approved', 'rejected', 'completed'].includes(updates.status)) {
      return res.status(400).json({ 
        error: 'Status changes to approved/rejected/completed must use dedicated endpoints',
        hint: 'Use POST /api/bookings/:id/approve or POST /api/bookings/:id/reject'
      });
    }

    // Validate date updates if provided
    if (updates.start_time || updates.end_time) {
      const startTime = updates.start_time || existingBooking.start_time;
      const endTime = updates.end_time || existingBooking.end_time;
      
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      if (endDate <= startDate) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      // Check for conflicts if times are being changed
      if (updates.start_time || updates.end_time) {
        const { data: conflicts, error: conflictError } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, end_time')
          .eq('car_id', existingBooking.car_id)
          .neq('id', bookingId)
          .in('status', ['approved']) // Fixed: use only 'approved' instead of 'confirmed', 'active'
          .or(`start_time.lt.${endTime},end_time.gt.${startTime}`);

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
          return res.status(409).json({ 
            error: 'Car is already booked during this time period',
            conflicts: conflicts
          });
        }
      }
    }

    // Allow regular field updates (no status changes)
    const allowedUpdates = [
      'start_time', 'end_time', 'reason', 'destination', 
      'passenger_count', 'notes'
    ];
    
    const updateData = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });
    
    updateData.updated_at = new Date().toISOString();

    console.log('🔍 Backend Debug - Final update data:', updateData);

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
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
      `)
      .single();

    if (updateError) throw updateError;

    console.log('✅ Booking updated successfully:', bookingId);

    res.status(200).json({
      booking: updatedBooking,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('❌ Update booking error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

// DELETE /api/bookings/:id - Cancel booking (user cancellation)
router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Delete booking route hit');
    
    const bookingId = req.params.id;

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const { profile, permissions } = await getUserProfile(req.user.id);

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        cars!bookings_car_id_fkey (organization_id)
      `)
      .eq('id', bookingId)
      .single();

    if (!existingBooking || fetchError) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Security checks
    if (existingBooking.cars?.organization_id !== profile.organization_id) {
      return res.status(403).json({ error: 'Access denied - booking not in your organization' });
    }

    // Only the booking owner or admins can cancel
    if (!permissions.canManageAll && existingBooking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied - you can only cancel your own bookings' });
    }

    // Check if booking can be cancelled
    if (existingBooking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed booking' });
    }

    if (existingBooking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Note: Users can cancel approved bookings, but not rejected ones
    if (existingBooking.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot cancel a rejected booking' });
    }

    // Update booking status to cancelled
    const { data: cancelledBooking, error: cancelError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select('*')
      .single();

    if (cancelError) throw cancelError;

    console.log('✅ Booking cancelled successfully:', bookingId);

    res.status(200).json({
      booking: cancelledBooking,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

// GET /api/bookings - Get all bookings with filters
router.get('/', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Bookings list route hit');
    
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

    const maxLimit = 100;
    const sanitizedLimit = Math.min(parseInt(limit) || 50, maxLimit);
    const sanitizedPage = Math.max(parseInt(page) || 1, 1);

    const { profile, permissions } = await getUserProfile(req.user.id);

    let query = supabaseAdmin
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
      `);

    // MANDATORY: Always filter by organization
    query = query.eq('cars.organization_id', profile.organization_id);

    // Apply role-based filtering
    if (permissions.canViewAll) {
      // Admins can see all bookings, optionally filter by user_id
      if (user_id) {
        query = query.eq('user_id', user_id);
      }
    } else {
      // Regular users can only see their own bookings
      query = query.eq('user_id', req.user.id);
      
      if (user_id && user_id !== req.user.id) {
        return res.status(403).json({ 
          error: 'Access denied - you can only view your own bookings'
        });
      }
    }

    // Apply other filters
    if (car_id) query = query.eq('car_id', car_id);
    if (status) query = query.eq('status', status);
    
    // Enhanced date filtering - check for overlaps
    if (start_date && end_date) {
      // Find bookings that overlap with the requested time range
      // A booking overlaps if: booking_start < requested_end AND booking_end > requested_start
      query = query.or(`and(start_time.lt.${end_date},end_time.gt.${start_date})`);
    } else {
      // Regular date filtering
      if (start_date) query = query.gte('start_time', start_date);
      if (end_date) query = query.lte('end_time', end_date);
    }

    // Time-based filters
    const now = new Date().toISOString();
    if (filter === 'upcoming') {
      query = query.gte('start_time', now);
    } else if (filter === 'past') {
      query = query.lt('end_time', now);
    }

    // Apply pagination
    const offset = (sanitizedPage - 1) * sanitizedLimit;
    query = query
      .order('start_time', { ascending: false })
      .range(offset, offset + sanitizedLimit - 1);

    const { data: bookings, error } = await query;

    if (error) throw error;

    // Post-query validation
    const validatedBookings = bookings?.filter(booking => {
      if (booking.cars?.organization_id !== profile.organization_id) {
        return false;
      }
      if (!permissions.canViewAll && booking.user_id !== req.user.id) {
        return false;
      }
      return true;
    }) || [];

    res.status(200).json({
      bookings: validatedBookings,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total: validatedBookings.length
      },
      userRole: profile.role,
      permissions: permissions
    });

  } catch (error) {
    console.error('❌ Bookings list error:', error);
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

module.exports = router;