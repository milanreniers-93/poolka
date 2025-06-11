
// routes/bookings.js - DEBUG VERSION
const express = require('express');
const { supabaseAdmin, verifyAuth } = require('../config/supabase');
const router = express.Router();

// GET /api/bookings - Get bookings with filters (DEBUG VERSION)
router.get('/', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Backend Debug - Bookings route hit');
    console.log('🔍 Backend Debug - req.user:', req.user ? { id: req.user.id, email: req.user.email } : 'undefined');
    
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

    console.log('🔍 Backend Debug - Query params:', { filter, page, limit, status });

    // Get user's organization for RLS
    console.log('🔍 Backend Debug - Querying profiles table for user:', req.user.id);
    
    const profileQuery = supabaseAdmin
      .from('profiles')
      .select('organization_id, role, first_name, last_name, email, id')
      .eq('id', req.user.id)
      .single();

    console.log('🔍 Backend Debug - Profile query built, executing...');
    
    const { data: profile, error: profileError } = await profileQuery;

    console.log('🔍 Backend Debug - Profile query result:', {
      hasProfile: !!profile,
      profile: profile,
      error: profileError ? {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      } : null
    });

    // Additional debugging - check if user exists in auth.users
    console.log('🔍 Backend Debug - Checking if user exists in auth.users...');
    try {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
      console.log('🔍 Backend Debug - Auth user check:', {
        found: !!authUser?.user,
        authError: authError?.message
      });
    } catch (authCheckError) {
      console.log('🔍 Backend Debug - Auth user check failed:', authCheckError.message);
    }

    // Additional debugging - test table access
    console.log('🔍 Backend Debug - Testing profiles table access...');
    try {
      const { data: tableTest, error: tableError } = await supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1);
      
      console.log('🔍 Backend Debug - Table access test:', {
        accessible: !tableError,
        error: tableError?.message
      });
    } catch (tableTestError) {
      console.log('🔍 Backend Debug - Table test failed:', tableTestError.message);
    }

    // Additional debugging - check if profile exists with different query
    console.log('🔍 Backend Debug - Alternative profile search...');
    try {
      const { data: allProfiles, error: allError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .limit(10);
      
      console.log('🔍 Backend Debug - All profiles sample:', {
        count: allProfiles?.length || 0,
        profiles: allProfiles?.map(p => ({ id: p.id, email: p.email })) || [],
        error: allError?.message
      });

      if (allProfiles?.length > 0) {
        const userProfile = allProfiles.find(p => p.id === req.user.id);
        console.log('🔍 Backend Debug - User found in all profiles:', !!userProfile);
      }
    } catch (altError) {
      console.log('🔍 Backend Debug - Alternative search failed:', altError.message);
    }

    if (!profile) {
      console.log('❌ Backend Debug - Profile not found, returning 404');
      return res.status(404).json({ 
        error: 'User profile not found',
        debug: {
          userId: req.user.id,
          profileError: profileError ? {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details
          } : 'No error, but no data returned'
        }
      });
    }

    console.log('✅ Backend Debug - Profile found, proceeding with bookings query');

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

    console.log('🔍 Backend Debug - Executing bookings query...');
    const { data: bookings, error } = await query;

    if (error) {
      console.log('❌ Backend Debug - Bookings query error:', error);
      throw error;
    }

    console.log('✅ Backend Debug - Bookings query successful:', {
      bookingsCount: bookings?.length || 0
    });

    res.status(200).json({
      bookings: bookings || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: bookings?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Backend Debug - Bookings route error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
});

module.exports = router;