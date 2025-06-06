import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY 

// Use service role key for backend - gives full database access
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to create client with user context for RLS
export const createUserClient = (accessToken) => {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY 
  
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
  
  return userClient
}