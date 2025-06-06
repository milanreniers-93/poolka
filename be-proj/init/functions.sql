-- Updated functions for auth.users

-- Function to handle new user registration (creates profile automatically)
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at 
    BEFORE UPDATE ON cars 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_damages_updated_at 
    BEFORE UPDATE ON car_damages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at 
    BEFORE UPDATE ON maintenance_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_expenses_updated_at 
    BEFORE UPDATE ON vehicle_expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_inspections_updated_at 
    BEFORE UPDATE ON vehicle_inspections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflicts(
    p_car_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM bookings
    WHERE car_id = p_car_id
      AND status IN ('confirmed', 'in_progress')
      AND (p_booking_id IS NULL OR id != p_booking_id)
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      );
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get car availability status
CREATE OR REPLACE FUNCTION get_car_availability(
    p_car_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE
) RETURNS TEXT AS $$
DECLARE
    car_status car_status_enum;
    has_conflicts BOOLEAN;
BEGIN
    -- Check car status
    SELECT status INTO car_status FROM cars WHERE id = p_car_id;
    
    IF car_status IS NULL THEN
        RETURN 'not_found';
    END IF;
    
    IF car_status != 'available' THEN
        RETURN car_status::TEXT;
    END IF;
    
    -- Check for booking conflicts
    SELECT check_booking_conflicts(p_car_id, p_start_time, p_end_time) INTO has_conflicts;
    
    IF has_conflicts THEN
        RETURN 'booked';
    END IF;
    
    RETURN 'available';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate booking cost
CREATE OR REPLACE FUNCTION calculate_booking_cost(
    p_car_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE
) RETURNS NUMERIC AS $$
DECLARE
    daily_rate NUMERIC;
    duration_hours NUMERIC;
    duration_days NUMERIC;
    total_cost NUMERIC;
BEGIN
    -- Get the car's daily rate
    SELECT cars.daily_rate INTO daily_rate FROM cars WHERE id = p_car_id;
    
    IF daily_rate IS NULL OR daily_rate = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calculate duration in hours
    duration_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
    
    -- Convert to days (minimum 1 day)
    duration_days := GREATEST(1, CEIL(duration_hours / 24));
    
    -- Calculate total cost
    total_cost := daily_rate * duration_days;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update car mileage from booking
CREATE OR REPLACE FUNCTION update_car_mileage_from_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Update car mileage when booking is completed with end mileage
    IF NEW.status = 'completed' AND NEW.end_mileage IS NOT NULL AND OLD.end_mileage IS NULL THEN
        UPDATE cars 
        SET current_mileage = NEW.end_mileage,
            updated_at = NOW()
        WHERE id = NEW.car_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update car mileage
CREATE TRIGGER update_car_mileage_on_booking_completion
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_car_mileage_from_booking();

-- Function to get organization statistics
CREATE OR REPLACE FUNCTION get_organization_stats(p_org_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_cars', (SELECT COUNT(*) FROM cars WHERE organization_id = p_org_id),
        'available_cars', (SELECT COUNT(*) FROM cars WHERE organization_id = p_org_id AND status = 'available'),
        'total_users', (SELECT COUNT(*) FROM profiles WHERE organization_id = p_org_id AND is_active = true),
        'active_bookings', (SELECT COUNT(*) FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.organization_id = p_org_id AND b.status IN ('confirmed', 'in_progress')),
        'total_bookings_this_month', (
            SELECT COUNT(*) 
            FROM bookings b 
            JOIN cars c ON b.car_id = c.id 
            WHERE c.organization_id = p_org_id 
            AND b.created_at >= date_trunc('month', CURRENT_DATE)
        ),
        'maintenance_due', (
            SELECT COUNT(*) 
            FROM cars 
            WHERE organization_id = p_org_id 
            AND (next_service_due <= CURRENT_DATE + INTERVAL '30 days' OR current_mileage >= 50000)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;