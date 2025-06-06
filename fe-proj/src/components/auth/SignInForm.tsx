// src/components/auth/SignInForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocationState {
  message?: string;
  email?: string;
}

const SignInForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const { signIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle success message and pre-fill email from signup redirect
    const state = location.state as LocationState;
    
    if (state?.message) {
      setSuccessMessage(state.message);
      // Clear the message after 10 seconds
      setTimeout(() => setSuccessMessage(''), 10000);
    }
    
    if (state?.email) {
      setEmail(state.email);
    }
  }, [location.state]);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!email.match(/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await signIn(email.toLowerCase().trim(), password);
      // Navigation is handled by AuthLayout redirect after successful auth
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific error types
      if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (error.message?.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (error.message?.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An error occurred during sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first');
      return;
    }

    if (!email.match(/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      // In real app, implement password reset with Supabase
      // await supabase.auth.resetPasswordForEmail(email);
      console.log('Send password reset email to:', email);
      setSuccessMessage('Password reset link sent to your email address.');
      setError('');
    } catch (error) {
      setError('Failed to send password reset email. Please try again.');
    }
  };

  // ✅ Fixed navigation function
  const handleGoToSignUp = () => {
    navigate('/sign-up');
  };

  const isFormDisabled = isLoading || authLoading;

  return (
    <Card className="w-[400px]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your fleet management account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Success Message from Registration */}
        {successMessage && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                disabled={isFormDisabled}
                className={error && error.includes('email') ? 'border-red-500' : ''}
                autoComplete="email"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  disabled={isFormDisabled}
                  className={error && error.includes('password') ? 'border-red-500' : ''}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isFormDisabled}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="link"
                className="px-0 font-normal text-sm"
                onClick={handleForgotPassword}
                disabled={isFormDisabled}
              >
                Forgot your password?
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-3">
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isFormDisabled}
          onClick={handleSubmit}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              New to fleet management?
            </span>
          </div>
        </div>
      
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoToSignUp}
          disabled={isFormDisabled}
        >
          Create new account
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SignInForm;