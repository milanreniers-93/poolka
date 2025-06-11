// src/components/debug/AuthDebugger.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { supabase } from '@/lib/supabase'; // Import your supabase client
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Database, AlertTriangle, CheckCircle } from 'lucide-react';

const AuthDebugger: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const diagnostics: any = {
        timestamp: new Date().toISOString(),
        authContext: {},
        supabaseAuth: {},
        database: {},
        errors: []
      };

      // 1. Check Auth Context
      console.log('🔍 Checking Auth Context...');
      diagnostics.authContext = {
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : null,
        profile: profile ? {
          id: profile.id,
          role: profile.role,
          first_name: profile.first_name,
          last_name: profile.last_name
        } : null,
        loading: authLoading
      };

      // 2. Check Supabase Auth directly
      console.log('🔍 Checking Supabase Auth directly...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        diagnostics.supabaseAuth = {
          session: session ? {
            user_id: session.user?.id,
            expires_at: session.expires_at,
            token_preview: session.access_token?.substring(0, 20) + '...'
          } : null,
          user: authUser ? {
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            user_metadata: authUser.user_metadata,
            app_metadata: authUser.app_metadata
          } : null,
          sessionError: sessionError?.message,
          userError: userError?.message
        };

        if (sessionError) diagnostics.errors.push(`Session Error: ${sessionError.message}`);
        if (userError) diagnostics.errors.push(`User Error: ${userError.message}`);

      } catch (authErr: any) {
        diagnostics.errors.push(`Auth Check Failed: ${authErr.message}`);
      }

      // 3. Check Database Profile
      console.log('🔍 Checking Database Profile...');
      if (user?.id) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          diagnostics.database.profile = {
            exists: !!profileData,
            data: profileData,
            error: profileError?.message
          };

          if (profileError) {
            diagnostics.errors.push(`Profile Query Error: ${profileError.message}`);
          }

        } catch (dbErr: any) {
          diagnostics.errors.push(`Database Error: ${dbErr.message}`);
        }

        // 4. Check if profiles table exists and structure
        try {
          const { data: tableInfo, error: tableError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

          diagnostics.database.tableAccessible = !tableError;
          if (tableError) {
            diagnostics.errors.push(`Table Access Error: ${tableError.message}`);
          }

        } catch (tableErr: any) {
          diagnostics.errors.push(`Table Check Error: ${tableErr.message}`);
        }
      }

      // 5. Check RLS policies (try to access without user context)
      console.log('🔍 Checking RLS Policies...');
      try {
        const { data: rlsTest, error: rlsError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        diagnostics.database.rlsStatus = {
          accessible: !rlsError,
          error: rlsError?.message
        };

      } catch (rlsErr: any) {
        diagnostics.database.rlsStatus = {
          accessible: false,
          error: rlsErr.message
        };
      }

      setDebugInfo(diagnostics);
      console.log('🔍 Full Diagnostics:', diagnostics);

    } catch (err: any) {
      setError(`Diagnostics failed: ${err.message}`);
      console.error('❌ Diagnostics Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createMissingProfile = async () => {
    if (!user?.id) {
      setError('No user ID available');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          email: user.email,
          role: 'employee' // default role
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Profile created:', data);
      await runDiagnostics(); // Re-run diagnostics

    } catch (err: any) {
      setError(`Failed to create profile: ${err.message}`);
      console.error('❌ Profile creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      runDiagnostics();
    }
  }, [authLoading, user, profile]);

  if (authLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading auth context...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authentication Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Running...</>
              ) : (
                <><Database className="h-4 w-4 mr-2" />Run Diagnostics</>
              )}
            </Button>

            {debugInfo?.authContext?.user && !debugInfo?.database?.profile?.exists && (
              <Button onClick={createMissingProfile} disabled={loading} variant="outline">
                Create Missing Profile
              </Button>
            )}
          </div>

          {debugInfo && (
            <div className="space-y-4">
              
              {/* Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 border rounded">
                  {debugInfo.authContext.user ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    Auth User: {debugInfo.authContext.user ? 'Found' : 'Missing'}
                  </span>
                </div>

                <div className="flex items-center gap-2 p-3 border rounded">
                  {debugInfo.database.profile?.exists ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    Profile: {debugInfo.database.profile?.exists ? 'Found' : 'Missing'}
                  </span>
                </div>

                <div className="flex items-center gap-2 p-3 border rounded">
                  {debugInfo.database.tableAccessible ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    Table Access: {debugInfo.database.tableAccessible ? 'OK' : 'Failed'}
                  </span>
                </div>
              </div>

              {/* Errors */}
              {debugInfo.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <strong>Issues Found:</strong>
                      {debugInfo.errors.map((error: string, idx: number) => (
                        <div key={idx} className="text-sm">• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Detailed Debug Info */}
              <details className="border rounded p-4">
                <summary className="cursor-pointer font-medium">
                  View Detailed Debug Information
                </summary>
                <pre className="mt-4 text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>

            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDebugger;