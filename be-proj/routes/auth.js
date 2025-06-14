// routes/auth.js - Fixed version
const express = require('express');
const { supabaseAdmin, supabase, verifyAuth } = require('../config/supabase'); // Fix: use correct import
const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      role = 'admin',
      organizationName,
      organizationEmail,
      organizationPhone,
      addressLine1,
      city,
      postalCode,
      country,
      industry,
      companySize,
      fleetSize,
      pricingPlanId
    } = req.body;

    if (!email || !password || !firstName || !lastName || !organizationName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName, organizationName' 
      });
    }

    // Step 1: Create organization first
    console.log('Creating organization...');
    const orgInsertData = {
      name: organizationName,
      email: organizationEmail || email,
      phone: organizationPhone,
      address_line_1: addressLine1,
      city: city,
      postal_code: postalCode,
      country: country || 'Belgium',
      industry: industry,
      company_size: companySize,
      fleet_size: fleetSize,
      pricing_plan_id: pricingPlanId,
      subscription_status: 'trial',
      status: 'active'
    };

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert(orgInsertData)
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return res.status(400).json({ error: `Failed to create organization: ${orgError.message}` });
    }

    console.log('Organization created:', orgData.id);

    // Step 2: Create auth user
    console.log('Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          organization_id: orgData.id,
          role: role
        }
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      // Clean up organization if user creation failed
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      return res.status(400).json({ error: `Failed to create user account: ${authError.message}` });
    }

    if (!authData.user) {
      // Clean up organization
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      return res.status(400).json({ error: 'User creation succeeded but no user data returned' });
    }

    console.log('Auth user created:', authData.user.id);

    // Step 3: Upsert profile (handle trigger-created profiles)
    console.log('Upserting profile...');
    const profileData = {
      id: authData.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      role: role,
      organization_id: orgData.id,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up organization and user if profile creation fails
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      return res.status(400).json({ error: `Failed to create user profile: ${profileError.message}` });
    }

    console.log('Profile created successfully');

    res.status(201).json({
      message: 'User and organization created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      organization: orgData,
      profile: profile,
      session: authData.session
    });

  } catch (error) {
    console.error('Signup process failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/signin - FIXED VERSION
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 Sign in attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Fix: Use the correct supabase client reference
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      console.error('❌ Supabase auth error:', error);
      return res.status(401).json({ error: error.message });
    }

    if (!data.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    console.log('✅ User authenticated:', data.user.id);

    // Get user profile with organization info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        organizations (
          id,
          name,
          email,
          subscription_status
        )
      `)
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return res.status(404).json({ error: 'User profile not found' });
    }

    console.log('✅ Profile loaded for user:', profile.first_name, profile.last_name);

    res.status(200).json({
      message: 'Sign in successful',
      session: data.session,
      user: data.user,
      profile: profile
    });

  } catch (error) {
    console.error('💥 Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/signout
router.post('/signout', verifyAuth, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: 'Signed out successfully' });

  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Get current user and profile
router.get('/me', verifyAuth, async (req, res) => {
  try {
    // Get user profile with organization info
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
          subscription_status,
          pricing_plans (
            id,
            name,
            price_monthly,
            max_vehicles,
            max_employees
          )
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json({
      user: req.user,
      profile: profile
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', verifyAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // First verify current password by attempting sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });

    if (verifyError) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({ error: 'Failed to update password' });
    }

    res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/session - Refresh session
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        organizations (
          id,
          name,
          subscription_status
        )
      `)
      .eq('id', user.id)
      .single();

    res.status(200).json({
      user: user,
      profile: profile
    });

  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, verifyAuth };