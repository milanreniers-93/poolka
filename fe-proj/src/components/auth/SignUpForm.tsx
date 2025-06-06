// src/components/auth/SignUpForm.tsx - Simplified free signup
import React, { useState } from 'react';
import { useAuth } from '../../contexts/auth/AuthContext'; 
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Info, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { 
  SignUpUserData, 
  SignUpOrganizationData, 
  CompanySize
} from '@/contexts/auth/types';

const SignUpForm: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // User Information
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Organization Information
  const [organizationName, setOrganizationName] = useState('');
  const [organizationEmail, setOrganizationEmail] = useState('');
  const [organizationPhone, setOrganizationPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Belgium');
  const [companySize, setCompanySize] = useState<CompanySize | ''>('');
  const [industry, setIndustry] = useState('');
  const [fleetSize, setFleetSize] = useState('');
  
  // Driver Information (optional)
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  
  // Form State
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companySizeOptions = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501-1000', label: '501-1000 employees' },
    { value: '1000+', label: '1000+ employees' }
  ];
  

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!firstName.trim()) newErrors.firstName = 'First name is required';
      if (!lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!email.trim()) newErrors.email = 'Email is required';
      if (!email.match(/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (password !== confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    }

    if (step === 2) {
      if (!organizationName.trim()) newErrors.organizationName = 'Organization name is required';
      if (!organizationEmail.trim()) newErrors.organizationEmail = 'Organization email is required';
      if (!organizationEmail.match(/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
        newErrors.organizationEmail = 'Please enter a valid organization email';
      }
      if (!addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
      if (!city.trim()) newErrors.city = 'City is required';
      if (!postalCode.trim()) newErrors.postalCode = 'Postal code is required';
      if (fleetSize && (isNaN(Number(fleetSize)) || Number(fleetSize) < 1)) {
        newErrors.fleetSize = 'Fleet size must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(2)) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const userData: SignUpUserData = {
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        licenseExpiry: licenseExpiry || undefined,
        role: 'admin' // Company creator is always admin
      };

      const organizationData: SignUpOrganizationData = {
        name: organizationName.trim(),
        email: organizationEmail.toLowerCase().trim(),
        phone: organizationPhone.trim() || undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        stateProvince: stateProvince.trim() || undefined,
        postalCode: postalCode.trim(),
        country: country.trim(),
        industry: industry.trim() || undefined,
        companySize: companySize || undefined,
        fleetSize: fleetSize ? parseInt(fleetSize) : undefined,
        // No pricing plan - they'll choose later
        pricingPlanId: undefined
      };

      console.log('Submitting signup with data:', { 
        userData: { ...userData, password: '[REDACTED]' }, 
        organizationData
      });

      const result = await signUp(userData, organizationData);
      
      console.log('Signup successful:', result);
      
      // SUCCESS - Redirect to dashboard
      // Use role-based redirect:
      if (result.profile.role === 'driver') {
        navigate('/bookings', { replace: true });
      } else {
        navigate('/fleet-manager', { replace: true });
      }
      
    } catch (error: any) {
      console.error('Sign up error:', {
        error,
        message: error?.message,
        status: error?.status,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      
      let errorMessage = 'Failed to create account. ';
      
      if (error.message?.includes('duplicate key') || error.message?.includes('already registered')) {
        errorMessage += 'An account with this email already exists.';
      } else if (error.message?.includes('weak password') || error.message?.includes('Password')) {
        errorMessage += 'Password is too weak. Please use a stronger password with at least 8 characters.';
      } else if (error.message?.includes('invalid email')) {
        errorMessage += 'Please enter a valid email address.';
      } else if (error.message?.includes('organization')) {
        errorMessage += 'Error creating organization. Please check your organization details.';
      } else if (error.message?.includes('profile')) {
        errorMessage += 'Error creating user profile. Please try again.';
      } else if (error.message?.includes('Email rate limit exceeded')) {
        errorMessage += 'Too many signup attempts. Please wait a few minutes before trying again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage += 'Please check your email and confirm your account before signing in.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          1
        </div>
        <div className={`w-12 h-px ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
      </div>
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="space-y-4">
      {/* Simple free signup message */}
      <Alert className="bg-green-50 border-green-200">
        <Info className="h-4 w-4 text-green-500" />
        <AlertDescription>
          Create your free FleetFlow account. As the company creator, you'll have administrator privileges to manage your fleet.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={errors.firstName ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={errors.lastName ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={errors.email ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+32 xxx xxx xxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={errors.password ? 'border-red-500' : ''}
            disabled={isLoading}
            placeholder="Minimum 8 characters"
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={errors.confirmPassword ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700">Driver Information (Optional)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseExpiry">License Expiry</Label>
            <Input
              id="licenseExpiry"
              type="date"
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrganizationInfo = () => (
    <div className="space-y-4">      
      <div className="flex items-center space-x-2 mb-4">
        <Building2 className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium">Organization Details</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization Name *</Label>
        <Input
          id="organizationName"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          className={errors.organizationName ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.organizationName && <p className="text-red-500 text-sm">{errors.organizationName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="organizationEmail">Organization Email *</Label>
          <Input
            id="organizationEmail"
            type="email"
            value={organizationEmail}
            onChange={(e) => setOrganizationEmail(e.target.value)}
            className={errors.organizationEmail ? 'border-red-500' : ''}
            disabled={isLoading}
            placeholder="contact@company.com"
          />
          {errors.organizationEmail && <p className="text-red-500 text-sm">{errors.organizationEmail}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationPhone">Organization Phone</Label>
          <Input
            id="organizationPhone"
            type="tel"
            value={organizationPhone}
            onChange={(e) => setOrganizationPhone(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine1">Address *</Label>
        <Input
          id="addressLine1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          className={errors.addressLine1 ? 'border-red-500' : ''}
          disabled={isLoading}
          placeholder="Street address"
        />
        {errors.addressLine1 && <p className="text-red-500 text-sm">{errors.addressLine1}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine2">Address Line 2</Label>
        <Input
          id="addressLine2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          disabled={isLoading}
          placeholder="Apartment, suite, etc. (optional)"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={errors.city ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="stateProvince">State/Province</Label>
          <Input
            id="stateProvince"
            value={stateProvince}
            onChange={(e) => setStateProvince(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code *</Label>
          <Input
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className={errors.postalCode ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.postalCode && <p className="text-red-500 text-sm">{errors.postalCode}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            placeholder="e.g., Transportation, Construction"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companySize">Company Size</Label>
          <Select value={companySize} onValueChange={setCompanySize as (value: CompanySize) => void} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {companySizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fleetSize">Estimated Fleet Size</Label>
        <Input
          id="fleetSize"
          type="number"
          placeholder="Number of vehicles"
          value={fleetSize}
          onChange={(e) => setFleetSize(e.target.value)}
          className={errors.fleetSize ? 'border-red-500' : ''}
          disabled={isLoading}
          min="1"
        />
        {errors.fleetSize && <p className="text-red-500 text-sm">{errors.fleetSize}</p>}
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create Your Free Account</CardTitle>
        <CardDescription className="text-center">
          {currentStep === 1 ? 'Enter your personal information' : 'Enter your organization details'}
        </CardDescription>
        {renderStepIndicator()}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {errors.submit && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {errors.submit}
            </AlertDescription>
          </Alert>
        )}
        
        {currentStep === 1 ? renderPersonalInfo() : renderOrganizationInfo()}
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex w-full space-x-2">
          {currentStep === 2 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleBack} 
              className="flex-1"
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          <Button 
            type="button"
            className="flex-1" 
            disabled={isLoading}
            onClick={currentStep === 1 ? handleNext : handleSubmit}
          >
            {isLoading ? 'Creating Account...' : 
             currentStep === 1 ? 'Next' : 'Create Free Account'}
          </Button>
        </div>
        
        <Button
          variant="link"
          className="mt-2"
          onClick={() => navigate('/sign-in')}
          disabled={isLoading}
        >
          Already have an account? Sign in
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SignUpForm;