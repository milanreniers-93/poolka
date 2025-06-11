// src/components/fleet-manager/CarInfoEditor.tsx - Migrated to use backend API
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api'; // ✅ Import API client instead of supabase
import { useAuth } from '@/contexts/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Car } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color?: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  status: string;
  current_mileage?: number;
  daily_rate?: number;
  notes?: string;
  organization_id: string;
  user_id: string;
}

interface CarFormData {
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  current_mileage: number;
  daily_rate: number;
  notes: string;
}

const CarInfoEditor: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CarFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    color: '',
    seats: 5,
    fuel_type: 'petrol',
    transmission: 'automatic',
    current_mileage: 0,
    daily_rate: 0,
    notes: ''
  });

  // ✅ MIGRATED: Fetch cars using backend API
  const { data: cars, isLoading } = useQuery({
    queryKey: ['cars', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      console.log('🚗 Fetching cars from backend API for organization:', profile.organization_id);
      
      // ✅ Use backend API instead of direct Supabase
      const carsData = await api.fleet.getCars(profile.organization_id);
      
      console.log('✅ Cars received from backend:', carsData?.length || 0);
      
      return carsData as Car[];
    },
    enabled: !!profile?.organization_id
  });

  // ✅ MIGRATED: Add car using backend API
  const addCarMutation = useMutation({
    mutationFn: async (carData: CarFormData) => {
      if (!profile?.organization_id || !profile?.id) {
        throw new Error('Missing organization or user ID');
      }

      console.log('➕ Creating car via backend API:', carData);

      // ✅ Use backend API instead of direct Supabase
      const newCar = await api.fleet.createCar({
        ...carData,
        organization_id: profile.organization_id,
        user_id: profile.id,
        status: 'available'
      });

      console.log('✅ Car created successfully:', newCar.id);
      return newCar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Car added successfully",
        description: "The vehicle has been added to your fleet.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Error adding car:', error);
      
      let errorMessage = 'Failed to add car';
      if (error.message?.includes('duplicate')) {
        errorMessage = 'A car with this license plate already exists';
      } else if (error.message?.includes('validation')) {
        errorMessage = 'Please check your car details and try again';
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'You do not have permission to add cars';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error adding car",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // ✅ MIGRATED: Update car using backend API
  const updateCarMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CarFormData> }) => {
      console.log('✏️ Updating car via backend API:', { id, updates });
      
      // ✅ Use backend API instead of direct Supabase
      const updatedCar = await api.fleet.updateCar(id, updates);
      
      console.log('✅ Car updated successfully:', updatedCar.id);
      return updatedCar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      setEditingCar(null);
      resetForm();
      toast({
        title: "Car updated successfully",
        description: "The vehicle information has been updated.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Error updating car:', error);
      
      let errorMessage = 'Failed to update car';
      if (error.message?.includes('duplicate')) {
        errorMessage = 'A car with this license plate already exists';
      } else if (error.message?.includes('validation')) {
        errorMessage = 'Please check your car details and try again';
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'You do not have permission to update this car';
      } else if (error.message?.includes('not found')) {
        errorMessage = 'Car not found. It may have been deleted.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error updating car",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // ✅ MIGRATED: Delete car using backend API
  const deleteCarMutation = useMutation({
    mutationFn: async (carId: string) => {
      console.log('🗑️ Deleting car via backend API:', carId);
      
      // ✅ Use backend API instead of direct Supabase
      await api.fleet.deleteCar(carId);
      
      console.log('✅ Car deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      toast({
        title: "Car deleted successfully",
        description: "The vehicle has been removed from your fleet.",
      });
    },
    onError: (error: any) => {
      console.error('❌ Error deleting car:', error);
      
      let errorMessage = 'Failed to delete car';
      if (error.message?.includes('has bookings')) {
        errorMessage = 'Cannot delete car with existing bookings. Cancel or complete all bookings first.';
      } else if (error.message?.includes('unauthorized')) {
        errorMessage = 'You do not have permission to delete this car';
      } else if (error.message?.includes('not found')) {
        errorMessage = 'Car not found. It may have already been deleted.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error deleting car",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      license_plate: '',
      color: '',
      seats: 5,
      fuel_type: 'petrol',
      transmission: 'automatic',
      current_mileage: 0,
      daily_rate: 0,
      notes: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.make.trim() || !formData.model.trim() || !formData.license_plate.trim()) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields (Make, Model, License Plate)",
        variant: "destructive",
      });
      return;
    }
    
    if (editingCar) {
      updateCarMutation.mutate({ id: editingCar.id, updates: formData });
    } else {
      addCarMutation.mutate(formData);
    }
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
    setFormData({
      make: car.make,
      model: car.model,
      year: car.year,
      license_plate: car.license_plate,
      color: car.color || '',
      seats: car.seats,
      fuel_type: car.fuel_type,
      transmission: car.transmission,
      current_mileage: car.current_mileage || 0,
      daily_rate: car.daily_rate || 0,
      notes: car.notes || ''
    });
  };

  const handleDelete = (carId: string) => {
    if (confirm('Are you sure you want to delete this car? This action cannot be undone.')) {
      deleteCarMutation.mutate(carId);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: 'Available', variant: 'default' as const },
      booked: { label: 'Booked', variant: 'secondary' as const },
      maintenance: { label: 'Maintenance', variant: 'destructive' as const },
      out_of_service: { label: 'Out of Service', variant: 'destructive' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading cars...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Fleet Management
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Manage your organization's vehicle fleet ({cars?.length || 0} vehicles)
            </p>
          </div>
          <Dialog open={isAddDialogOpen || !!editingCar} onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setEditingCar(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Car
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCar ? 'Edit Car' : 'Add New Car'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                      required
                      placeholder="e.g., Toyota, BMW"
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      required
                      placeholder="e.g., Camry, X3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="license_plate">License Plate *</Label>
                    <Input
                      id="license_plate"
                      value={formData.license_plate}
                      onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
                      required
                      placeholder="e.g., ABC-123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="e.g., Black, White"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seats">Seats *</Label>
                    <Input
                      id="seats"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.seats}
                      onChange={(e) => setFormData(prev => ({ ...prev, seats: parseInt(e.target.value) || 5 }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="fuel_type">Fuel Type *</Label>
                    <Select value={formData.fuel_type} onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="plug_in_hybrid">Plug-in Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="transmission">Transmission *</Label>
                    <Select value={formData.transmission} onValueChange={(value) => setFormData(prev => ({ ...prev, transmission: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automatic">Automatic</SelectItem>
                        <SelectItem value="cvt">CVT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="current_mileage">Current Mileage (km)</Label>
                    <Input
                      id="current_mileage"
                      type="number"
                      min="0"
                      value={formData.current_mileage}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_mileage: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="daily_rate">Daily Rate (€)</Label>
                    <Input
                      id="daily_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, daily_rate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes about this vehicle..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingCar(null);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addCarMutation.isPending || updateCarMutation.isPending}
                  >
                    {(addCarMutation.isPending || updateCarMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingCar ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingCar ? 'Update Car' : 'Add Car'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!cars || cars.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cars in your fleet</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first vehicle to the fleet.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Car
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{car.make} {car.model}</div>
                        <div className="text-sm text-gray-500">{car.year} • {car.color}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{car.license_plate}</TableCell>
                    <TableCell className="capitalize">{car.fuel_type}</TableCell>
                    <TableCell>{car.seats}</TableCell>
                    <TableCell>{getStatusBadge(car.status)}</TableCell>
                    <TableCell>€{car.daily_rate || 0}/day</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(car)}
                          disabled={updateCarMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(car.id)}
                          disabled={deleteCarMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CarInfoEditor;