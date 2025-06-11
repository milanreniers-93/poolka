// routes/organizations.js
const express = require('express');
const { supabaseAdmin, verifyAuth } = require('../config/supabase');
const router = express.Router();

// GET /api/organizations/me - Get current user's organization
router.get('/me', verifyAuth, async (req, res) => {
  try {
    // Get user's profile to find organization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return res.status(404).json({ error: 'User organization not found' });
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        *,
        pricing_plans (
          id,
          name,
          price_monthly,
          price_yearly,
          max_vehicles,
          max_employees,
          features
        )
      `)
      .eq('id', profile.organization_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.status(200).json(organization);

  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/organizations/me - Update current user's organization (admins only)
router.put('/me', verifyAuth, async (req, res) => {
  try {
    const updates = req.body;

    // Check permissions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update organization details' });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    delete updates.subscription_status; // Handle subscriptions separately
    delete updates.pricing_plan_id; // Handle plan changes separately
    
    updates.updated_at = new Date().toISOString();

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', profile.organization_id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      message: 'Organization updated successfully',
      organization: organization
    });

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/organizations/stats - Get organization statistics (fleet managers+)
router.get('/stats', verifyAuth, async (req, res) => {
  try {
    // Check permissions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!['admin', 'fleet_manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get comprehensive organization statistics
    const orgId = profile.organization_id;

    // Get car statistics
    const { data: cars, error: carsError } = await supabaseAdmin
      .from('cars')
      .select('status, created_at, current_mileage')
      .eq('organization_id', orgId);

    if (carsError) throw carsError;

    // Get user statistics
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active, created_at')
      .eq('organization_id', orgId);

    if (usersError) throw usersError;

    // Get booking statistics
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('status, created_at, start_time, end_time, cars!bookings_car_id_fkey(organization_id)')
      .eq('cars.organization_id', orgId);

    if (bookingsError) throw bookingsError;

    // Calculate time-based metrics
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Compile comprehensive statistics
    const stats = {
      // Fleet statistics
      fleet: {
        totalVehicles: cars.length,
        availableVehicles: cars.filter(c => c.status === 'available').length,
        bookedVehicles: cars.filter(c => c.status === 'booked').length,
        maintenanceVehicles: cars.filter(c => c.status === 'maintenance').length,
        outOfServiceVehicles: cars.filter(c => c.status === 'out_of_service').length,
        retiredVehicles: cars.filter(c => c.status === 'retired').length,
        averageMileage: cars.length > 0 ? 
          Math.round(cars.reduce((sum, car) => sum + (car.current_mileage || 0), 0) / cars.length) : 0,
        newVehiclesThisMonth: cars.filter(c => new Date(c.created_at) >= thisMonth).length,
      },

      // User statistics
      users: {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        inactiveUsers: users.filter(u => !u.is_active).length,
        adminCount: users.filter(u => u.role === 'admin').length,
        fleetManagerCount: users.filter(u => u.role === 'fleet_manager').length,
        driverCount: users.filter(u => u.role === 'driver').length,
        viewerCount: users.filter(u => u.role === 'viewer').length,
        newUsersThisMonth: users.filter(u => new Date(u.created_at) >= thisMonth).length,
      },

      // Booking statistics
      bookings: {
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        activeBookings: bookings.filter(b => b.status === 'in_progress').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
        
        // Time-based metrics
        bookingsThisMonth: bookings.filter(b => new Date(b.created_at) >= thisMonth).length,
        bookingsThisYear: bookings.filter(b => new Date(b.created_at) >= thisYear).length,
        bookingsLastMonth: bookings.filter(b => 
          new Date(b.created_at) >= lastMonth && new Date(b.created_at) < thisMonth
        ).length,
        
        // Future bookings
        upcomingBookings: bookings.filter(b => 
          new Date(b.start_time) > now && ['confirmed', 'pending'].includes(b.status)
        ).length,
      },

      // Usage metrics
      usage: {
        utilizationRate: cars.filter(c => c.status === 'available').length > 0 ? 
          Math.round((cars.filter(c => c.status === 'booked').length / cars.filter(c => c.status === 'available').length) * 100) : 0,
        averageBookingsPerVehicle: cars.length > 0 ? Math.round(bookings.length / cars.length) : 0,
        averageBookingsPerUser: users.filter(u => u.is_active).length > 0 ? 
          Math.round(bookings.length / users.filter(u => u.is_active).length) : 0,
      },

      // Growth metrics
      growth: {
        userGrowthRate: users.filter(u => new Date(u.created_at) >= lastMonth).length,
        vehicleGrowthRate: cars.filter(c => new Date(c.created_at) >= lastMonth).length,
        bookingGrowthRate: bookings.filter(b => new Date(b.created_at) >= thisMonth).length - 
                          bookings.filter(b => new Date(b.created_at) >= lastMonth && New Date(b.created_at) < thisMonth).length,
      },

      // Health indicators
      health: {
        maintenanceDue: cars.filter(c => 
          c.next_service_due && new Date(c.next_service_due) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ).length,
        pendingApprovals: bookings.filter(b => b.status === 'pending').length,
        overdueBook