// routes/invite.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Create Supabase clients
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to validate authentication
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        message: 'Please sign in again'
      });
    }

    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred while verifying your identity'
    });
  }
};

// POST /api/invite-users
router.post('/invite-users', authenticateUser, async (req, res) => {
  console.log('🚀 Invite users endpoint called');
  console.log('Request body:', { ...req.body, emails: req.body.emails?.length + ' emails' });
  
  try {
    const { emails, role, organization_id, invited_by } = req.body;

    // Validate required fields
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Emails array is required and must not be empty' 
      });
    }

    if (!role || !organization_id || !invited_by) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Missing required fields: role, organization_id, or invited_by' 
      });
    }

    // Validate role
    const validRoles = ['admin', 'fleet_manager', 'driver', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    // Verify user has permission to invite
    console.log('🔍 Checking user permissions...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, first_name, last_name')
      .eq('id', req.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return res.status(403).json({ 
        error: 'User profile not found',
        message: 'Could not verify your account details'
      });
    }

    console.log('👤 User profile:', { role: profile.role, org_id: profile.organization_id });

    // Check if user has permission to invite
    if (!['admin', 'fleet_manager'].includes(profile.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Only administrators and fleet managers can invite users' 
      });
    }

    // Check if user belongs to the same organization
    if (profile.organization_id !== organization_id) {
      return res.status(403).json({ 
        error: 'Organization mismatch',
        message: 'You can only invite users to your own organization' 
      });
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email.trim()));
    
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid email addresses',
        message: 'Please check the following email addresses',
        invalidEmails 
      });
    }

    // Clean and normalize emails
    const cleanEmails = emails.map(email => email.trim().toLowerCase());

    // Check for existing users with these emails
    console.log('🔍 Checking for existing users...');
    const { data: existingUsers, error: existingUsersError } = await supabase
      .from('profiles')
      .select('email')
      .in('email', cleanEmails);

    if (existingUsersError) {
      console.error('Error checking existing users:', existingUsersError);
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Error checking existing users' 
      });
    }

    const existingEmails = existingUsers?.map(u => u.email) || [];
    const newEmails = cleanEmails.filter(email => !existingEmails.includes(email));

    console.log(`📊 Email analysis: ${cleanEmails.length} total, ${existingEmails.length} existing, ${newEmails.length} new`);

    if (newEmails.length === 0) {
      return res.status(400).json({ 
        error: 'No new users to invite',
        message: 'All provided email addresses are already registered',
        existingEmails 
      });
    }

    // Get organization details for the invitation email
    console.log('🏢 Getting organization details...');
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    if (orgError || !organization) {
      console.error('Organization error:', orgError);
      return res.status(404).json({ 
        error: 'Organization not found',
        message: 'Could not find the specified organization' 
      });
    }

    console.log('🏢 Organization found:', organization.name);

    // Send invitations using Supabase Admin
    console.log(`📧 Sending ${newEmails.length} invitations...`);
    const inviteResults = [];
    const failedInvites = [];

    for (const email of newEmails) {
      try {
        console.log(`📧 Inviting: ${email}`);
        
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            organization_id: organization_id,
            role: role,
            invited_by: invited_by,
            organization_name: organization.name,
            inviter_name: `${profile.first_name} ${profile.last_name}`,
          },
          redirectTo: `${process.env.APP_URL}/invite/complete`
        });

        if (error) {
          console.error(`❌ Failed to invite ${email}:`, error);
          failedInvites.push({ email, error: error.message });
        } else {
          console.log(`✅ Successfully invited: ${email}`);
          inviteResults.push({ email, invited: true });
          
          // Store invitation record in database for tracking
          try {
            await supabase
              .from('invitations')
              .insert({
                email,
                role,
                organization_id,
                invited_by,
                status: 'sent',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              });
          } catch (dbError) {
            console.warn(`⚠️ Could not store invitation record for ${email}:`, dbError);
            // Don't fail the entire process if we can't store the record
          }
        }
      } catch (error) {
        console.error(`💥 Unexpected error inviting ${email}:`, error);
        failedInvites.push({ email, error: 'Unexpected error occurred' });
      }
    }

    // Prepare response
    const response = {
      message: 'Invitation process completed',
      successful: inviteResults,
      failed: failedInvites,
      existingUsers: existingEmails,
      summary: {
        totalEmails: cleanEmails.length,
        alreadyRegistered: existingEmails.length,
        invitationsSent: inviteResults.length,
        invitationsFailed: failedInvites.length,
      }
    };

    console.log('📊 Invitation summary:', response.summary);

    // Return appropriate status code
    if (failedInvites.length > 0 && inviteResults.length > 0) {
      return res.status(207).json(response); // 207 Multi-Status (partial success)
    } else if (failedInvites.length > 0) {
      return res.status(400).json(response); // All failed
    } else {
      return res.status(200).json(response); // All successful
    }

  } catch (error) {
    console.error('💥 Unexpected error in invite-users endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while sending invitations',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack 
      })
    });
  }
});

module.exports = router;