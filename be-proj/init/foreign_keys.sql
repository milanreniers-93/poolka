-- Foreign Key Constraints (Updated for auth.users)

-- Organizations
ALTER TABLE organizations
    ADD CONSTRAINT organizations_pricing_plan_id_fkey 
    FOREIGN KEY (pricing_plan_id) REFERENCES pricing_plans(id);

-- Profiles
ALTER TABLE profiles
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles
    ADD CONSTRAINT profiles_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Cars
ALTER TABLE cars
    ADD CONSTRAINT cars_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE cars
    ADD CONSTRAINT cars_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE cars
    ADD CONSTRAINT cars_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Bookings
ALTER TABLE bookings
    ADD CONSTRAINT bookings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE bookings
    ADD CONSTRAINT bookings_car_id_fkey 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE bookings
    ADD CONSTRAINT bookings_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES profiles(id);

-- Car damages
ALTER TABLE car_damages
    ADD CONSTRAINT car_damages_car_id_fkey 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE car_damages
    ADD CONSTRAINT car_damages_reported_by_fkey 
    FOREIGN KEY (reported_by) REFERENCES auth.users(id);

-- Damage coordinates
ALTER TABLE damage_coordinates
    ADD CONSTRAINT damage_coordinates_damage_id_fkey 
    FOREIGN KEY (damage_id) REFERENCES car_damages(id) ON DELETE CASCADE;

-- Damage media
ALTER TABLE damage_media
    ADD CONSTRAINT damage_media_damage_id_fkey 
    FOREIGN KEY (damage_id) REFERENCES car_damages(id) ON DELETE CASCADE;

ALTER TABLE damage_media
    ADD CONSTRAINT damage_media_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);

-- Fuel transactions
ALTER TABLE fuel_transactions
    ADD CONSTRAINT fuel_transactions_car_id_fkey 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE fuel_transactions
    ADD CONSTRAINT fuel_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE fuel_transactions
    ADD CONSTRAINT fuel_transactions_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES bookings(id);

-- Maintenance records
ALTER TABLE maintenance_records
    ADD CONSTRAINT maintenance_records_car_id_fkey 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE maintenance_records
    ADD CONSTRAINT maintenance_records_scheduled_by_fkey 
    FOREIGN KEY (scheduled_by) REFERENCES auth.users(id);

ALTER TABLE maintenance_records
    ADD CONSTRAINT maintenance_records_completed_by_fkey 
    FOREIGN KEY (completed_by) REFERENCES auth.users(id);

-- Trip analytics
ALTER TABLE trip_analytics
    ADD CONSTRAINT trip_analytics_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE trip_analytics
    ADD CONSTRAINT trip_analytics_car_id_fkey 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE trip_analytics
    ADD CONSTRAINT trip_analytics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Vehicle expenses
ALTER TABLE vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_car_id_fkey 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES bookings(id);

ALTER TABLE vehicle_expenses
    ADD CONSTRAINT vehicle_expenses_maintenance_record_id_fkey 
    FOREIGN KEY (maintenance_record_id) REFERENCES maintenance_records(id);

-- Vehicle inspections
ALTER TABLE vehicle_inspections
    ADD CONSTRAINT vehicle_inspections_car_id_fkey 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE vehicle_inspections
    ADD CONSTRAINT vehicle_inspections_inspector_user_id_fkey 
    FOREIGN KEY (inspector_user_id) REFERENCES auth.users(id);

ALTER TABLE vehicle_inspections
    ADD CONSTRAINT vehicle_inspections_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES bookings(id);