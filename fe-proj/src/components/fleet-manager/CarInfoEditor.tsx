// src/components/fleet-manager/CarInfoEditor.tsx - Clean version without syntax errors
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

  // Fetch cars
  const { data: cars, isLoading } = useQuery({
    queryKey: ['cars', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('make', { ascending: true });

      if (error) throw error;
      return data as Car[];
    },
    enabled: !!profile?.organization_id
  });

  // Add car mutation
  const addCarMutation = useMutation({
    mutationFn: async (carData: CarFormData) => {
      if (!profile?.organization_id || !profile?.id) {
        throw new Error('Missing organization or user ID');
      }

      const { data, error } = await supabase
        .from('cars')
        .insert({
          ...carData,
          organization_id: profile.organization_id,
          user_id: profile.id,
          status: 'available'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      toast({
        title: "Error adding car",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update car mutation
  const updateCarMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CarFormData> }) => {
      const { data, error } = await supabase
        .from('cars')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      toast({
        title: "Error updating car",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete car mutation
  const deleteCarMutation = useMutation({
    mutationFn: async (carId: string) => {
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', carId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      toast({
        title: "Car deleted successfully",
        description: "The vehicle has been removed from your fleet.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting car",
        description: error.message,
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
    if (confirm('Are you sure you want to delete this car?')) {
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
              Manage your organization's vehicle fleet
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
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="license_plate">License Plate *</Label>
                    <Input
                      id="license_plate"
                      value={formData.license_plate}
                      onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="seats">Seats *</Label>
                    <Input
                      id="seats"
                      type="number"
                      value={formData.seats}
                      onChange={(e) => setFormData(prev => ({ ...prev, seats: parseInt(e.target.value) }))}
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
                    <Label htmlFor="current_mileage">Current Mileage</Label>
                    <Input
                      id="current_mileage"
                      type="number"
                      value={formData.current_mileage}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_mileage: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="daily_rate">Daily Rate (€)</Label>
                    <Input
                      id="daily_rate"
                      type="number"
                      step="0.01"
                      value={formData.daily_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, daily_rate: parseFloat(e.target.value) }))}
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
                  <Button type="submit" disabled={addCarMutation.isPending || updateCarMutation.isPending}>
                    {editingCar ? 'Update Car' : 'Add Car'}
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(car.id)}
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