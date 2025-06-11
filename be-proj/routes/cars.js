// routes/cars.js
const express = require('express');
const { supabaseAdmin, verifyAuth } = require('../config/supabase');
const router = express.Router();

// GET /api/cars - Get all cars in organization
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { status, available_only, page = 1, limit = 50 } = req.query;

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
      .from('cars')
      .select(`
        *,
        profiles!cars_assigned_to_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', profile.organization_id);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (available_only === 'true') query = query.eq('status', 'available');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: cars, error } = await query;

    if (error) throw error;

    res.status(200).json({
      cars: cars || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: cars?.length || 0
      }
    });

  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cars/:id - Get car by ID
router.get('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user's organization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const { data: car, error } = await supabaseAdmin
      .from('cars')
      .select(`
        *,
        profiles!cars_assigned_to_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (error || !car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.status(200).json(car);

  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cars - Create new car (fleet managers only)
router.post('/', verifyAuth, async (req, res) => {
  try {
    const {
      make,
      model,
      year,
      license_plate,
      vin,
      seats,
      trunk_size,
      fuel_type,
      transmission,
      color,
      parking_spot,
      current_mileage,
      daily_rate,
      notes
    } = req.body;

    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile || !['admin', 'fleet_manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Only fleet managers can add vehicles' });
    }

    // Validate required fields
    if (!make || !model || !year || !license_plate || !seats) {
      return res.status(400).json({ 
        error: 'Missing required fields: make, model, year, license_plate, seats' 
      });
    }

    // Check for duplicate license plate within organization
    const { data: existingCar } = await supabaseAdmin
      .from('cars')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('license_plate', license_plate.trim().toUpperCase())
      .single();

    if (existingCar) {
      return res.status(409).json({ error: 'A car with this license plate already exists in your organization' });
    }

    const carData = {
      organization_id: profile.organization_id,
      user_id: req.user.id,
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year),
      license_plate: license_plate.trim().toUpperCase(),
      vin: vin?.trim(),
      seats: parseInt(seats),
      trunk_size: trunk_size?.trim(),
      fuel_type: fuel_type || 'petrol',
      transmission: transmission || 'manual',
      color: color?.trim(),
      parking_spot: parking_spot?.trim(),
      current_mileage: current_mileage ? parseInt(current_mileage) : null,
      daily_rate: daily_rate ? parseFloat(daily_rate) : null,
      notes: notes?.trim(),
      status: 'available',
      created_at: new Date().toISOString()
    };

    const { data: car, error } = await supabaseAdmin
      .from('cars')
      .insert(carData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Car added successfully',
      car: car
    });

  } catch (error) {
    console.error('Create car error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/cars/:id - Update car (fleet managers only)
router.put('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile || !['admin', 'fleet_manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Only fleet managers can edit vehicles' });
    }

    // Get existing car
    const { data: existingCar, error: fetchError } = await supabaseAdmin
      .from('cars')
      .select('id, organization_id, license_plate')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !existingCar) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Check for duplicate license plate if it's being updated
    if (updates.license_plate && updates.license_plate !== existingCar.license_plate) {
      const { data: duplicateCar } = await supabaseAdmin
        .from('cars')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('license_plate', updates.license_plate.trim().toUpperCase())
        .neq('id', id)
        .single();

      if (duplicateCar) {
        return res.status(409).json({ error: 'A car with this license plate already exists in your organization' });
      }
    }

    // Remove fields that shouldn't be updated
    const allowedUpdates = { ...updates };
    delete allowedUpdates.id;
    delete allowedUpdates.organization_id;
    delete allowedUpdates.user_id;
    delete allowedUpdates.created_at;
    allowedUpdates.updated_at = new Date().toISOString();

    // Process numeric fields
    if (allowedUpdates.year) allowedUpdates.year = parseInt(allowedUpdates.year);
    if (allowedUpdates.seats) allowedUpdates.seats = parseInt(allowedUpdates.seats);
    if (allowedUpdates.current_mileage) allowedUpdates.current_mileage = parseInt(allowedUpdates.current_mileage);
    if (allowedUpdates.daily_rate) allowedUpdates.daily_rate = parseFloat(allowedUpdates.daily_rate);
    if (allowedUpdates.license_plate) allowedUpdates.license_plate = allowedUpdates.license_plate.trim().toUpperCase();

    const { data: car, error } = await supabaseAdmin
      .from('cars')
      .update(allowedUpdates)
      .eq('id', id)
      .select(`
        *,
        profiles!cars_assigned_to_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    res.status(200).json({
      message: 'Car updated successfully',
      car: car
    });

  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cars/:id - Delete car (admins only)
router.delete('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions - only admins can delete cars
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete vehicles' });
    }

    // Check if car exists and belongs to organization
    const { data: car, error: fetchError } = await supabaseAdmin
      .from('cars')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (fetchError || !car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Check for active bookings
    const { data: activeBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('car_id', id)
      .in('status', ['confirmed', 'in_progress'])
      .limit(1);

    if (bookingsError) throw bookingsError;

    if (activeBookings && activeBookings.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete car with active bookings. Cancel all bookings first.' 
      });
    }

    // Soft delete by updating status instead of hard delete
    const { error } = await supabaseAdmin
      .from('cars')
      .update({ 
        status: 'retired',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Car retired successfully' });

  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cars/availability/:car_id - Check car availability
router.get('/availability/:car_id', verifyAuth, async (req, res) => {
  try {
    const { car_id } = req.params;
    const { start_time, end_time } = req.query;

    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time are required' });
    }

    // Get user's organization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if car exists and belongs to organization
    const { data: car, error: carError } = await supabaseAdmin
      .from('cars')
      .select('id, status, organization_id')
      .eq('id', car_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (carError || !car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    if (car.status !== 'available') {
      return res.status(200).json({ 
        available: false, 
        reason: `Car is ${car.status}` 
      });
    }

    // Check for booking conflicts
    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, status')
      .eq('car_id', car_id)
      .in('status', ['confirmed', 'in_progress'])
      .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time}),and(start_time.gte.${start_time},end_time.lte.${end_time})`);

    if (conflictError) throw conflictError;

    const hasConflicts = conflicts && conflicts.length > 0;

    res.status(200).json({
      available: !hasConflicts,
      reason: hasConflicts ? 'Car is already booked for this time period' : null,
      conflicts: hasConflicts ? conflicts : []
    });

  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/cars/:id/assign - Assign car to user (fleet managers only)
router.put('/:id/assign', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile || !['admin', 'fleet_manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Only fleet managers can assign vehicles' });
    }

    // Check if car exists and belongs to organization
    const { data: car, error: carError } = await supabaseAdmin
      .from('cars')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (carError || !car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // If assigned_to is provided, verify the user exists and belongs to organization
    if (assigned_to) {
      const { data: assignee, error: assigneeError } = await supabaseAdmin
        .from('profiles')
        .select('id, organization_id')
        .eq('id', assigned_to)
        .eq('organization_id', profile.organization_id)
        .single();

      if (assigneeError || !assignee) {
        return res.status(404).json({ error: 'Assignee not found in your organization' });
      }
    }

    const { data: updatedCar, error } = await supabaseAdmin
      .from('cars')
      .update({ 
        assigned_to: assigned_to || null,
        assigned_date: assigned_to ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        profiles!cars_assigned_to_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    res.status(200).json({
      message: assigned_to ? 'Car assigned successfully' : 'Car unassigned successfully',
      car: updatedCar
    });

  } catch (error) {
    console.error('Assign car error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cars/stats - Get fleet statistics (fleet managers only)
router.get('/stats/overview', verifyAuth, async (req, res) => {
  try {
    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!profile || !['admin', 'fleet_manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Only fleet managers can view fleet statistics' });
    }

    // Get car statistics
    const { data: cars, error: carsError } = await supabaseAdmin
      .from('cars')
      .select('status')
      .eq('organization_id', profile.organization_id);

    if (carsError) throw carsError;

    // Get booking statistics for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('status, created_at, cars!bookings_car_id_fkey(organization_id)')
      .eq('cars.organization_id', profile.organization_id)
      .gte('created_at', startOfMonth.toISOString());

    if (bookingsError) throw bookingsError;

    // Calculate statistics
    const stats = {
      totalCars: cars.length,
      availableCars: cars.filter(c => c.status === 'available').length,
      bookedCars: cars.filter(c => c.status === 'booked').length,
      maintenanceCars: cars.filter(c => c.status === 'maintenance').length,
      retiredCars: cars.filter(c => c.status === 'retired').length,
      monthlyBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      activeBookings: bookings.filter(b => b.status === 'in_progress').length,
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('Get fleet stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;