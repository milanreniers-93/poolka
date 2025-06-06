// routes/profiles.js
const express = require('express');
const { supabaseAdmin, verifyAuth } = require('../config/supabase');
const router = express.Router();

// GET /api/profiles/me - Get current user's profile
router.get('/me', verifyAuth, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        organizations (
          id,
          name,
          email,
          phone,
          address_line_1,
          address_line_2,
          city,
          state_province,
          postal_code,
          country,
          industry,
          company_size,
          subscription_status
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(profile);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/profiles/me - Update current user's profile
router.put('/me', verifyAuth, async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.email; // Email changes should go through auth
    delete updates.created_at;
    delete updates.organization_id; // Handle org changes separately
    delete updates.role; // Role changes require admin permissions

    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: profile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profiles - Get all profiles in organization (fleet managers+)
router.get('/', verifyAuth, async (req, res) => {
  try {
    const { role, active_only, page = 1, limit = 50 } = req.query;

    // Check permissions
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!currentProfile || !['admin', 'fleet_manager'].includes(currentProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('organization_id', currentProfile.organization_id);

    // Apply filters
    if (role) query = query.eq('role', role);
    if (active_only === 'true') query = query.eq('is_active', true);

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: profiles, error } = await query;

    if (error) throw error;

    res.status(200).json({
      profiles: profiles || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: profiles?.length || 0
      }
    });

  } catch (error) {
    console.error('Get profiles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profiles/:id - Get profile by ID (fleet managers+)
router.get('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!currentProfile || !['admin', 'fleet_manager'].includes(currentProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('organization_id', currentProfile.organization_id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(profile);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/profiles/:id - Update profile by ID (admins only)
router.put('/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check permissions
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!currentProfile || currentProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can edit user profiles' });
    }

    // Can't edit own profile through this endpoint
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Use /me endpoint to edit your own profile' });
    }

    // Get target profile
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!targetProfile || targetProfile.organization_id !== currentProfile.organization_id) {
      return res.status(404).json({ error: 'Profile not found in your organization' });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.email; // Email changes should go through auth
    delete updates.created_at;
    delete updates.organization_id;

    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: profile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/profiles/:id/deactivate - Deactivate user (admins only)
router.put('/:id/deactivate', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!currentProfile || currentProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can deactivate users' });
    }

    // Can't deactivate own profile
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own profile' });
    }

    // Get target profile
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!targetProfile || targetProfile.organization_id !== currentProfile.organization_id) {
      return res.status(404).json({ error: 'Profile not found in your organization' });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profiles/stats/overview - Get user statistics (fleet managers+)
router.get('/stats/overview', verifyAuth, async (req, res) => {
  try {
    // Check permissions
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (!currentProfile || !['admin', 'fleet_manager'].includes(currentProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get user statistics
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active, created_at')
      .eq('organization_id', currentProfile.organization_id);

    if (profilesError) throw profilesError;

    // Calculate statistics
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalUsers: profiles.length,
      activeUsers: profiles.filter(p => p.is_active).length,
      inactiveUsers: profiles.filter(p => !p.is_active).length,
      adminCount: profiles.filter(p => p.role === 'admin').length,
      fleetManagerCount: profiles.filter(p => p.role === 'fleet_manager').length,
      driverCount: profiles.filter(p => p.role === 'driver').length,
      viewerCount: profiles.filter(p => p.role === 'viewer').length,
      newUsersThisMonth: profiles.filter(p => new Date(p.created_at) >= thisMonth).length,
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profiles/:id/bookings - Get user's booking history (fleet managers+)
router.get('/:id/bookings', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit = 10 } = req.query;

    // Check permissions
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    // Users can view their own bookings, or fleet managers can view any user's bookings
    const canView = id === req.user.id || 
                   (currentProfile && ['admin', 'fleet_manager'].includes(currentProfile.role));

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If fleet manager, ensure the target user is in the same organization
    if (id !== req.user.id) {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', id)
        .single();

      if (!targetProfile || targetProfile.organization_id !== currentProfile.organization_id) {
        return res.status(404).json({ error: 'User not found in your organization' });
      }
    }

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        cars!bookings_car_id_fkey (
          id,
          make,
          model,
          license_plate
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq('status', status);

    const { data: bookings, error } = await query;

    if (error) throw error;

    res.status(200).json({ bookings: bookings || [] });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/profiles/:id/stats - Get individual user statistics (fleet managers+)
router.get('/:id/stats', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    // Users can view their own stats, or fleet managers can view any user's stats
    const canView = id === req.user.id || 
                   (currentProfile && ['admin', 'fleet_manager'].includes(currentProfile.role));

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user's bookings
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('status, created_at, start_time, end_time')
      .eq('user_id', id);

    if (bookingsError) throw bookingsError;

    // Calculate statistics
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    const stats = {
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      activeBookings: bookings.filter(b => b.status === 'in_progress').length,
      monthlyBookings: bookings.filter(b => new Date(b.created_at) >= thisMonth).length,
      yearlyBookings: bookings.filter(b => new Date(b.created_at) >= thisYear).length,
      lastBookingDate: bookings.length > 0 ? 
        bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at : null,
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;