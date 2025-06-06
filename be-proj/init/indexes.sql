-- Create indexes for better performance

-- Organization indexes
CREATE INDEX idx_organizations_status ON organizations USING btree (status);

-- Profile indexes
CREATE INDEX idx_profiles_email ON profiles USING btree (email);
CREATE INDEX idx_profiles_organization_id ON profiles USING btree (organization_id);
CREATE INDEX idx_profiles_role ON profiles USING btree (role);

-- Car indexes
CREATE INDEX idx_cars_organization_id ON cars USING btree (organization_id);
CREATE INDEX idx_cars_status ON cars USING btree (status);
CREATE INDEX idx_cars_license_plate ON cars USING btree (license_plate);
CREATE INDEX idx_cars_assigned_to ON cars USING btree (assigned_to);
CREATE INDEX idx_cars_next_service_due ON cars USING btree (next_service_due) WHERE next_service_due IS NOT NULL;

-- Booking indexes
CREATE INDEX idx_bookings_user_id ON bookings USING btree (user_id);
CREATE INDEX idx_bookings_car_id ON bookings USING btree (car_id);
CREATE INDEX idx_bookings_status ON bookings USING btree (status);
CREATE INDEX idx_bookings_start_time ON bookings USING btree (start_time);
CREATE INDEX idx_bookings_end_time ON bookings USING btree (end_time);
CREATE INDEX idx_bookings_date_range ON bookings USING btree (start_time, end_time);

-- Car damage indexes
CREATE INDEX idx_car_damages_car_id ON car_damages USING btree (car_id);
CREATE INDEX idx_car_damages_reported_by ON car_damages USING btree (reported_by);
CREATE INDEX idx_car_damages_severity ON car_damages USING btree (severity);
CREATE INDEX idx_car_damages_incident_date ON car_damages USING btree (incident_date);

-- Damage coordinate indexes
CREATE INDEX idx_damage_coordinates_damage_id ON damage_coordinates USING btree (damage_id);
CREATE INDEX idx_damage_coordinates_view ON damage_coordinates USING btree (view_name);

-- Fuel transaction indexes
CREATE INDEX idx_fuel_transactions_car_id ON fuel_transactions USING btree (car_id);
CREATE INDEX idx_fuel_transactions_user_id ON fuel_transactions USING btree (user_id);
CREATE INDEX idx_fuel_transactions_date ON fuel_transactions USING btree (transaction_date);

-- Maintenance record indexes
CREATE INDEX idx_maintenance_records_car_id ON maintenance_records USING btree (car_id);
CREATE INDEX idx_maintenance_records_status ON maintenance_records USING btree (status);
CREATE INDEX idx_maintenance_records_scheduled_date ON maintenance_records USING btree (scheduled_date);
CREATE INDEX idx_maintenance_records_due_mileage ON maintenance_records USING btree (due_mileage);

-- Trip analytics indexes
CREATE INDEX idx_trip_analytics_booking_id ON trip_analytics USING btree (booking_id);
CREATE INDEX idx_trip_analytics_car_id ON trip_analytics USING btree (car_id);
CREATE INDEX idx_trip_analytics_user_id ON trip_analytics USING btree (user_id);

-- Vehicle expense indexes
CREATE INDEX idx_vehicle_expenses_car_id ON vehicle_expenses USING btree (car_id);
CREATE INDEX idx_vehicle_expenses_category ON vehicle_expenses USING btree (category);
CREATE INDEX idx_vehicle_expenses_date ON vehicle_expenses USING btree (expense_date);

-- Vehicle inspection indexes
CREATE INDEX idx_vehicle_inspections_car_id ON vehicle_inspections USING btree (car_id);
CREATE INDEX idx_vehicle_inspections_type ON vehicle_inspections USING btree (inspection_type);
CREATE INDEX idx_vehicle_inspections_date ON vehicle_inspections USING btree (inspection_date);