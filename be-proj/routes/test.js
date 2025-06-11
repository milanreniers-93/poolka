// Add this to your backend as a temporary test endpoint
// routes/test.js or add to existing routes

const express = require('express');
const { supabaseAdmin, verifyAuth } = require('../config/supabase');
const router = express.Router();

// Test endpoint to debug auth and profile issues
router.get('/debug-auth', verifyAuth, async (req, res) => {
  try {
    console.log('🔍 Test Debug - Auth test endpoint hit');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: {},
      profile: {},
      database: {},
      errors: []
    };

    // 1. Check req.user from verifyAuth
    debugInfo.user = {
      exists: !!req.user,
      id: req.user?.id,
      email: req.user?.email,
      aud: req.user?.aud,
      role: req.user?.role
    };

    console.log('🔍 Test Debug - req.user:', debugInfo.user);

    if (!req.user) {
      return res.status(401).json({ error: 'No user in request', debug: debugInfo });
    }

    // 2. Test direct profile query
    try {
      console.log('🔍 Test Debug - Querying profile...');
      
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      debugInfo.profile = {
        found: !!profile,
        data: profile,
        error: profileError ? {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        } : null
      };

      console.log('🔍 Test Debug - Profile result:', debugInfo.profile);

    } catch (profileQueryError) {
      debugInfo.errors.push(`Profile query exception: ${profileQueryError.message}`);
      console.log('❌ Test Debug - Profile query exception:', profileQueryError);
    }

    // 3. Test database connectivity
    try {
      console.log('🔍 Test Debug - Testing database connectivity...');
      
      const { data: dbTest, error: dbError } = await supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1);

      debugInfo.database.accessible = !dbError;
      debugInfo.database.error = dbError?.message;

      console.log('🔍 Test Debug - Database test:', {
        accessible: debugInfo.database.accessible,
        error: debugInfo.database.error
      });

    } catch (dbException) {
      debugInfo.errors.push(`Database exception: ${dbException.message}`);
      console.log('❌ Test Debug - Database exception:', dbException);
    }

    // 4. Test if user exists in auth.users
    try {
      console.log('🔍 Test Debug - Checking auth.users...');
      
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
      
      debugInfo.authUser = {
        found: !!authUser?.user,
        error: authError?.message
      };

      console.log('🔍 Test Debug - Auth user check:', debugInfo.authUser);

    } catch (authException) {
      debugInfo.errors.push(`Auth user check exception: ${authException.message}`);
      console.log('❌ Test Debug - Auth user check exception:', authException);
    }

    // 5. List some profiles to see if table is accessible
    try {
      console.log('🔍 Test Debug - Sampling profiles table...');
      
      const { data: sampleProfiles, error: sampleError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .limit(5);

      debugInfo.profilesSample = {
        count: sampleProfiles?.length || 0,
        profiles: sampleProfiles?.map(p => ({ 
          id: p.id, 
          email: p.email,
          isCurrentUser: p.id === req.user.id 
        })) || [],
        error: sampleError?.message
      };

      console.log('🔍 Test Debug - Profiles sample:', debugInfo.profilesSample);

    } catch (sampleException) {
      debugInfo.errors.push(`Profiles sample exception: ${sampleException.message}`);
      console.log('❌ Test Debug - Profiles sample exception:', sampleException);
    }

    console.log('🔍 Test Debug - Full debug info:', debugInfo);

    res.status(200).json({
      message: 'Auth debug test completed',
      debug: debugInfo
    });

  } catch (error) {
    console.error('❌ Test Debug - Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Test endpoint failed', 
      message: error.message,
      stack: error.stack 
    });
  }
});

module.exports = router;

// Don't forget to register this route in your main app.js:
// app.use('/api/test', require('./routes/test'));