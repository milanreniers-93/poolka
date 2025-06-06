-- Fleet Management Database Schema
-- Simplified version removing Supabase-specific features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types (enums)
CREATE TYPE user_role_enum AS ENUM ('admin', 'fleet_manager', 'driver', 'viewer');
CREATE TYPE company_size_enum AS ENUM ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+');
CREATE TYPE organization_status_enum AS ENUM ('pending', 'active', 'suspended', 'cancelled');
CREATE TYPE fuel_type_enum AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid', 'lpg', 'cng');
CREATE TYPE transmission_type_enum AS ENUM ('manual', 'automatic', 'cvt', 'semi_automatic');
CREATE TYPE car_status_enum AS ENUM ('available', 'booked', 'maintenance', 'out_of_service', 'retired');
CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE maintenance_type_enum AS ENUM ('scheduled', 'repair', 'inspection', 'upgrade', 'recall');
CREATE TYPE maintenance_status_enum AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue');
CREATE TYPE damage_type_enum AS ENUM ('scratch', 'dent', 'crack', 'missing_part', 'mechanical', 'electrical', 'interior', 'other');
CREATE TYPE damage_severity_enum AS ENUM ('minor', 'moderate', 'major', 'critical');
CREATE TYPE expense_category_enum AS ENUM ('fuel', 'maintenance', 'insurance', 'parking', 'tolls', 'fines', 'cleaning', 'other');
CREATE TYPE fuel_transaction_type_enum AS ENUM ('fuel_up', 'refund', 'adjustment');
CREATE TYPE inspection_type_enum AS ENUM ('pre_trip', 'post_trip', 'maintenance', 'damage_report', 'insurance');

-- Pricing plans
CREATE TABLE pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    price_monthly NUMERIC(10,2) NOT NULL,
    price_yearly NUMERIC(10,2),
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb NOT NULL,
    max_vehicles INTEGER,
    max_employees INTEGER,
    is_highlighted BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    registration_number VARCHAR(100),
    vat_number VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'Belgium' NOT NULL,
    industry VARCHAR(100),
    company_size company_size_enum,
    fleet_size INTEGER,
    status organization_status_enum DEFAULT 'pending',
    subscription_plan VARCHAR(50) DEFAULT 'trial',
    billing_email VARCHAR(255),
    pricing_plan_id UUID,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT positive_fleet_size CHECK (fleet_size IS NULL OR fleet_size > 0),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_vat CHECK (vat_number IS NULL OR length(vat_number) >= 8)
);

-- User profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone VARCHAR(50),
    organization_id UUID,
    role user_role_enum DEFAULT 'driver' NOT NULL,
    license_number VARCHAR(50),
    license_expiry DATE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT valid_license_dates CHECK (license_expiry IS NULL OR license_expiry > CURRENT_DATE),
    CONSTRAINT valid_profile_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Cars
CREATE TABLE cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    license_plate TEXT NOT NULL,
    vin TEXT,
    seats SMALLINT NOT NULL,
    trunk_size TEXT,
    fuel_type fuel_type_enum DEFAULT 'petrol' NOT NULL,
    transmission transmission_type_enum DEFAULT 'manual' NOT NULL,
    color VARCHAR(50),
    status car_status_enum DEFAULT 'available' NOT NULL,
    parking_spot TEXT,
    current_mileage INTEGER,
    last_service_date DATE,
    next_service_due DATE,
    insurance_expiry DATE,
    registration_expiry DATE,
    purchase_date DATE,
    purchase_price NUMERIC(10,2),
    current_value NUMERIC(10,2),
    daily_rate NUMERIC(8,2),
    assigned_to UUID,
    assigned_date DATE,
    user_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT cars_current_mileage_check CHECK (current_mileage >= 0),
    CONSTRAINT cars_seats_check CHECK (seats > 0 AND seats <= 50),
    CONSTRAINT cars_year_check CHECK (year >= 1900 AND year <= EXTRACT(year FROM now()) + 2),
    CONSTRAINT logical_assignment_date CHECK (assigned_to IS NULL OR assigned_date IS NULL OR assigned_date <= CURRENT_DATE),
    CONSTRAINT logical_service_dates CHECK (last_service_date IS NULL OR next_service_due IS NULL OR next_service_due >= last_service_date),
    CONSTRAINT unique_license_plate_per_org UNIQUE (organization_id, license_plate),
    CONSTRAINT unique_vin_global UNIQUE (vin)
);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    car_id UUID NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    destination TEXT,
    notes TEXT,
    passenger_count SMALLINT,
    status booking_status_enum DEFAULT 'pending' NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    start_mileage INTEGER,
    end_mileage INTEGER,
    total_cost NUMERIC(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT bookings_passenger_count_check CHECK (passenger_count > 0),
    CONSTRAINT logical_approval CHECK (
        (status IN ('confirmed', 'in_progress', 'completed') AND approved_by IS NOT NULL) OR
        status IN ('pending', 'cancelled')
    ),
    CONSTRAINT valid_booking_times CHECK (end_time > start_time),
    CONSTRAINT valid_future_booking CHECK (start_time > (now() - INTERVAL '1 hour')),
    CONSTRAINT valid_mileage_tracking CHECK (
        start_mileage IS NULL OR end_mileage IS NULL OR end_mileage >= start_mileage
    )
);

-- Car damages
CREATE TABLE car_damages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID NOT NULL,
    reported_by UUID NOT NULL,
    damage_type damage_type_enum NOT NULL,
    severity damage_severity_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_cost NUMERIC(10,2),
    actual_cost NUMERIC(10,2),
    repair_notes TEXT,
    repaired_by VARCHAR(255),
    repaired_at TIMESTAMP WITH TIME ZONE,
    insurance_claim_number VARCHAR(100),
    responsible_party VARCHAR(255),
    incident_location TEXT,
    incident_date TIMESTAMP WITH TIME ZONE,
    is_repaired BOOLEAN DEFAULT false,
    affects_safety BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT logical_repair_status CHECK (
        is_repaired = false OR (is_repaired = true AND repaired_at IS NOT NULL)
    ),
    CONSTRAINT positive_costs CHECK (estimated_cost IS NULL OR estimated_cost >= 0)
);

-- Damage coordinates
CREATE TABLE damage_coordinates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    damage_id UUID NOT NULL,
    x_coordinate NUMERIC(5,2) NOT NULL,
    y_coordinate NUMERIC(5,2) NOT NULL,
    view_name VARCHAR(20) NOT NULL,
    damage_radius NUMERIC(4,2) DEFAULT 2.0,
    coordinate_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT damage_coordinates_damage_radius_check CHECK (damage_radius > 0 AND damage_radius <= 10),
    CONSTRAINT damage_coordinates_view_name_check CHECK (view_name IN ('front', 'back', 'left', 'right', 'top', 'interior')),
    CONSTRAINT damage_coordinates_x_coordinate_check CHECK (x_coordinate >= 0 AND x_coordinate <= 100),
    CONSTRAINT damage_coordinates_y_coordinate_check CHECK (y_coordinate >= 0 AND y_coordinate <= 100)
);

-- Damage media
CREATE TABLE damage_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    damage_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fuel transactions
CREATE TABLE fuel_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID NOT NULL,
    user_id UUID NOT NULL,
    transaction_type fuel_transaction_type_enum DEFAULT 'fuel_up' NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    fuel_type VARCHAR(20),
    liters_filled NUMERIC(6,2) NOT NULL,
    price_per_liter NUMERIC(6,3) NOT NULL,
    total_amount NUMERIC(8,2) NOT NULL,
    station_name VARCHAR(255),
    station_location TEXT,
    mileage_at_fillup INTEGER,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    distance_since_last_fillup INTEGER,
    fuel_efficiency NUMERIC(5,2),
    booking_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT positive_fuel_amounts CHECK (
        liters_filled > 0 AND price_per_liter > 0 AND total_amount > 0
    )
);

-- Maintenance records
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID NOT NULL,
    maintenance_type maintenance_type_enum NOT NULL,
    status maintenance_status_enum DEFAULT 'scheduled' NOT NULL,
    scheduled_date DATE,
    completed_date DATE,
    due_mileage INTEGER,
    completed_mileage INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    work_performed TEXT,
    service_provider VARCHAR(255),
    technician_name VARCHAR(255),
    estimated_cost NUMERIC(10,2),
    actual_cost NUMERIC(10,2),
    parts_cost NUMERIC(10,2),
    labor_cost NUMERIC(10,2),
    invoice_number VARCHAR(100),
    warranty_info TEXT,
    scheduled_by UUID,
    completed_by UUID,
    next_service_date DATE,
    next_service_mileage INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT logical_completion_status CHECK (
        status != 'completed' OR (status = 'completed' AND completed_date IS NOT NULL)
    )
);

-- Trip analytics
CREATE TABLE trip_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL,
    car_id UUID NOT NULL,
    user_id UUID NOT NULL,
    total_distance NUMERIC(8,2),
    total_duration INTEGER,
    fuel_consumed NUMERIC(6,2),
    fuel_efficiency NUMERIC(5,2),
    max_speed INTEGER,
    average_speed NUMERIC(5,2),
    harsh_braking_events INTEGER DEFAULT 0,
    rapid_acceleration_events INTEGER DEFAULT 0,
    start_location TEXT,
    end_location TEXT,
    route_taken TEXT,
    estimated_co2_emissions NUMERIC(6,2),
    total_cost NUMERIC(8,2),
    cost_per_km NUMERIC(6,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vehicle expenses
CREATE TABLE vehicle_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID NOT NULL,
    user_id UUID NOT NULL,
    category expense_category_enum NOT NULL,
    subcategory VARCHAR(100),
    amount NUMERIC(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT NOT NULL,
    vendor_name VARCHAR(255),
    location TEXT,
    receipt_number VARCHAR(100),
    invoice_number VARCHAR(100),
    is_reimbursable BOOLEAN DEFAULT true,
    reimbursed BOOLEAN DEFAULT false,
    reimbursed_date DATE,
    booking_id UUID,
    maintenance_record_id UUID,
    mileage_at_expense INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Vehicle inspections
CREATE TABLE vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_id UUID NOT NULL,
    inspector_user_id UUID NOT NULL,
    inspection_type inspection_type_enum NOT NULL,
    inspection_date TIMESTAMP WITH TIME ZONE NOT NULL,
    mileage_reading INTEGER,
    overall_condition INTEGER,
    notes TEXT,
    checklist_items JSONB,
    requires_maintenance BOOLEAN DEFAULT false,
    requires_immediate_attention BOOLEAN DEFAULT false,
    booking_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT vehicle_inspections_overall_condition_check CHECK (overall_condition >= 1 AND overall_condition <= 5)
);