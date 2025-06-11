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
<<<<<<< HEAD
                          bookings.filter(b => new Date(b.created_at) >= lastMonth && new Date(b.created_at) < thisMonth).length,
=======
                          bookings.filter(b => new Date(b.created_at) >= lastMonth && New Date(b.created_at) < thisMonth).length,
>>>>>>> moving_db_calls_to_backend
      },

      // Health indicators
      health: {
        maintenanceDue: cars.filter(c => 
          c.next_service_due && new Date(c.next_service_due) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ).length,
        pendingApprovals: bookings.filter(b => b.status === 'pending').length,
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 5ca7e49a23da53190a11dab9b09fa9e058446761
        overdueBookings: bookings.filter(b => 
          new Date(b.end_time) < now && b.status === 'in_progress'
        ).length,
      }
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/organizations/plan - Get current pricing plan details
router.get('/plan', verifyAuth, async (req, res) => {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return res.status(404).json({ error: 'User organization not found' });
    }

    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select(`
        pricing_plan_id,
        subscription_status,
        trial_ends_at,
        subscription_current_period_start,
        subscription_current_period_end,
        pricing_plans (
          id,
          name,
          price_monthly,
          price_yearly,
          max_vehicles,
          max_employees,
          features,
          description
        )
      `)
      .eq('id', profile.organization_id)
      .single();

    if (orgError) throw orgError;

    // Get current usage for plan limits
    const [carsCount, usersCount] = await Promise.all([
      supabaseAdmin.from('cars').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id),
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id).eq('is_active', true)
    ]);

    const planInfo = {
      currentPlan: organization.pricing_plans,
      subscription: {
        status: organization.subscription_status,
        trial_ends_at: organization.trial_ends_at,
        current_period_start: organization.subscription_current_period_start,
        current_period_end: organization.subscription_current_period_end,
      },
      usage: {
        vehicles: {
          current: carsCount.count || 0,
          limit: organization.pricing_plans?.max_vehicles || null,
          percentage: organization.pricing_plans?.max_vehicles ? 
            Math.round(((carsCount.count || 0) / organization.pricing_plans.max_vehicles) * 100) : 0
        },
        employees: {
          current: usersCount.count || 0,
          limit: organization.pricing_plans?.max_employees || null,
          percentage: organization.pricing_plans?.max_employees ? 
            Math.round(((usersCount.count || 0) / organization.pricing_plans.max_employees) * 100) : 0
        }
      },
      isTrialActive: organization.subscription_status === 'trial' && 
                    new Date(organization.trial_ends_at) > new Date(),
      daysUntilTrialEnd: organization.trial_ends_at ? 
        Math.max(0, Math.ceil((new Date(organization.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))) : 0
    };

    res.status(200).json(planInfo);

  } catch (error) {
    console.error('Get organization plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/organizations/billing-history - Get billing history (admins only)
router.get('/billing-history', verifyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

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
      return res.status(403).json({ error: 'Only administrators can view billing history' });
    }

    // Note: This would typically integrate with Stripe or another payment processor
    // For now, return a placeholder response
    res.status(200).json({
      billingHistory: [],
      message: 'Billing history integration pending - connect with Stripe API',
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0
      }
    });

  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/organizations/plan - Update pricing plan (admins only)
router.put('/plan', verifyAuth, async (req, res) => {
  try {
    const { pricing_plan_id } = req.body;

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
      return res.status(403).json({ error: 'Only administrators can change pricing plans' });
    }

    // Validate the pricing plan exists
    const { data: pricingPlan, error: planError } = await supabaseAdmin
      .from('pricing_plans')
      .select('id, name, max_vehicles, max_employees')
      .eq('id', pricing_plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !pricingPlan) {
      return res.status(404).json({ error: 'Pricing plan not found' });
    }

    // Check if current usage exceeds new plan limits
    const [carsCount, usersCount] = await Promise.all([
      supabaseAdmin.from('cars').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id),
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id).eq('is_active', true)
    ]);

    if (pricingPlan.max_vehicles && (carsCount.count || 0) > pricingPlan.max_vehicles) {
      return res.status(400).json({ 
        error: 'Current vehicle count exceeds new plan limit',
        details: `You have ${carsCount.count} vehicles but the new plan allows only ${pricingPlan.max_vehicles}`
      });
    }

    if (pricingPlan.max_employees && (usersCount.count || 0) > pricingPlan.max_employees) {
      return res.status(400).json({ 
        error: 'Current employee count exceeds new plan limit',
        details: `You have ${usersCount.count} employees but the new plan allows only ${pricingPlan.max_employees}`
      });
    }

    // Update the organization's pricing plan
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update({ 
        pricing_plan_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.organization_id)
      .select()
      .single();

    if (error) throw error;

    // Note: In a real implementation, this would trigger Stripe subscription changes
    res.status(200).json({
      message: 'Pricing plan updated successfully',
      organization: organization,
      note: 'Billing changes will be reflected in your next invoice'
    });

  } catch (error) {
    console.error('Update pricing plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

<<<<<<< HEAD
module.exports = router;
=======
module.exports = router;
=======
        overdueBook
>>>>>>> moving_db_calls_to_backend
>>>>>>> 5ca7e49a23da53190a11dab9b09fa9e058446761
