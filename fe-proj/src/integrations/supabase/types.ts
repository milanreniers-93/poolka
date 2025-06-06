export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          car_id: string
          created_at: string | null
          destination: string | null
          end_mileage: number | null
          end_time: string
          id: string
          notes: string | null
          passenger_count: number | null
          reason: string | null
          start_mileage: number | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status_enum"]
          total_cost: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          car_id: string
          created_at?: string | null
          destination?: string | null
          end_mileage?: number | null
          end_time: string
          id?: string
          notes?: string | null
          passenger_count?: number | null
          reason?: string | null
          start_mileage?: number | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status_enum"]
          total_cost?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          car_id?: string
          created_at?: string | null
          destination?: string | null
          end_mileage?: number | null
          end_time?: string
          id?: string
          notes?: string | null
          passenger_count?: number | null
          reason?: string | null
          start_mileage?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status_enum"]
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_damages: {
        Row: {
          actual_cost: number | null
          affects_safety: boolean | null
          car_id: string
          created_at: string | null
          damage_type: Database["public"]["Enums"]["damage_type_enum"]
          description: string | null
          estimated_cost: number | null
          id: string
          incident_date: string | null
          incident_location: string | null
          insurance_claim_number: string | null
          is_repaired: boolean | null
          repair_notes: string | null
          repaired_at: string | null
          repaired_by: string | null
          reported_by: string
          responsible_party: string | null
          severity: Database["public"]["Enums"]["damage_severity_enum"]
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          affects_safety?: boolean | null
          car_id: string
          created_at?: string | null
          damage_type: Database["public"]["Enums"]["damage_type_enum"]
          description?: string | null
          estimated_cost?: number | null
          id?: string
          incident_date?: string | null
          incident_location?: string | null
          insurance_claim_number?: string | null
          is_repaired?: boolean | null
          repair_notes?: string | null
          repaired_at?: string | null
          repaired_by?: string | null
          reported_by: string
          responsible_party?: string | null
          severity: Database["public"]["Enums"]["damage_severity_enum"]
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          affects_safety?: boolean | null
          car_id?: string
          created_at?: string | null
          damage_type?: Database["public"]["Enums"]["damage_type_enum"]
          description?: string | null
          estimated_cost?: number | null
          id?: string
          incident_date?: string | null
          incident_location?: string | null
          insurance_claim_number?: string | null
          is_repaired?: boolean | null
          repair_notes?: string | null
          repaired_at?: string | null
          repaired_by?: string | null
          reported_by?: string
          responsible_party?: string | null
          severity?: Database["public"]["Enums"]["damage_severity_enum"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_damages_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          assigned_date: string | null
          assigned_to: string | null
          color: string | null
          created_at: string | null
          current_mileage: number | null
          current_value: number | null
          daily_rate: number | null
          fuel_type: Database["public"]["Enums"]["fuel_type_enum"]
          id: string
          insurance_expiry: string | null
          last_service_date: string | null
          license_plate: string
          make: string
          model: string
          next_service_due: string | null
          notes: string | null
          organization_id: string
          parking_spot: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_expiry: string | null
          seats: number
          status: Database["public"]["Enums"]["car_status_enum"]
          transmission: Database["public"]["Enums"]["transmission_type_enum"]
          trunk_size: string | null
          updated_at: string | null
          user_id: string
          vin: string | null
          year: number
        }
        Insert: {
          assigned_date?: string | null
          assigned_to?: string | null
          color?: string | null
          created_at?: string | null
          current_mileage?: number | null
          current_value?: number | null
          daily_rate?: number | null
          fuel_type?: Database["public"]["Enums"]["fuel_type_enum"]
          id?: string
          insurance_expiry?: string | null
          last_service_date?: string | null
          license_plate: string
          make: string
          model: string
          next_service_due?: string | null
          notes?: string | null
          organization_id: string
          parking_spot?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          seats: number
          status?: Database["public"]["Enums"]["car_status_enum"]
          transmission?: Database["public"]["Enums"]["transmission_type_enum"]
          trunk_size?: string | null
          updated_at?: string | null
          user_id: string
          vin?: string | null
          year: number
        }
        Update: {
          assigned_date?: string | null
          assigned_to?: string | null
          color?: string | null
          created_at?: string | null
          current_mileage?: number | null
          current_value?: number | null
          daily_rate?: number | null
          fuel_type?: Database["public"]["Enums"]["fuel_type_enum"]
          id?: string
          insurance_expiry?: string | null
          last_service_date?: string | null
          license_plate?: string
          make?: string
          model?: string
          next_service_due?: string | null
          notes?: string | null
          organization_id?: string
          parking_spot?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["car_status_enum"]
          transmission?: Database["public"]["Enums"]["transmission_type_enum"]
          trunk_size?: string | null
          updated_at?: string | null
          user_id?: string
          vin?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_coordinates: {
        Row: {
          coordinate_notes: string | null
          created_at: string | null
          damage_id: string
          damage_radius: number | null
          id: string
          view_name: string
          x_coordinate: number
          y_coordinate: number
        }
        Insert: {
          coordinate_notes?: string | null
          created_at?: string | null
          damage_id: string
          damage_radius?: number | null
          id?: string
          view_name: string
          x_coordinate: number
          y_coordinate: number
        }
        Update: {
          coordinate_notes?: string | null
          created_at?: string | null
          damage_id?: string
          damage_radius?: number | null
          id?: string
          view_name?: string
          x_coordinate?: number
          y_coordinate?: number
        }
        Relationships: [
          {
            foreignKeyName: "damage_coordinates_damage_id_fkey"
            columns: ["damage_id"]
            isOneToOne: false
            referencedRelation: "car_damages"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_media: {
        Row: {
          created_at: string | null
          damage_id: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          damage_id: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          damage_id?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_media_damage_id_fkey"
            columns: ["damage_id"]
            isOneToOne: false
            referencedRelation: "car_damages"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_transactions: {
        Row: {
          booking_id: string | null
          car_id: string
          created_at: string | null
          distance_since_last_fillup: number | null
          fuel_efficiency: number | null
          fuel_type: string | null
          id: string
          liters_filled: number
          mileage_at_fillup: number | null
          notes: string | null
          payment_method: string | null
          price_per_liter: number
          receipt_number: string | null
          station_location: string | null
          station_name: string | null
          total_amount: number
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["fuel_transaction_type_enum"]
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          car_id: string
          created_at?: string | null
          distance_since_last_fillup?: number | null
          fuel_efficiency?: number | null
          fuel_type?: string | null
          id?: string
          liters_filled: number
          mileage_at_fillup?: number | null
          notes?: string | null
          payment_method?: string | null
          price_per_liter: number
          receipt_number?: string | null
          station_location?: string | null
          station_name?: string | null
          total_amount: number
          transaction_date: string
          transaction_type?: Database["public"]["Enums"]["fuel_transaction_type_enum"]
          user_id: string
        }
        Update: {
          booking_id?: string | null
          car_id?: string
          created_at?: string | null
          distance_since_last_fillup?: number | null
          fuel_efficiency?: number | null
          fuel_type?: string | null
          id?: string
          liters_filled?: number
          mileage_at_fillup?: number | null
          notes?: string | null
          payment_method?: string | null
          price_per_liter?: number
          receipt_number?: string | null
          station_location?: string | null
          station_name?: string | null
          total_amount?: number
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["fuel_transaction_type_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_transactions_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          actual_cost: number | null
          car_id: string
          completed_by: string | null
          completed_date: string | null
          completed_mileage: number | null
          created_at: string | null
          description: string | null
          due_mileage: number | null
          estimated_cost: number | null
          id: string
          invoice_number: string | null
          labor_cost: number | null
          maintenance_type: Database["public"]["Enums"]["maintenance_type_enum"]
          next_service_date: string | null
          next_service_mileage: number | null
          parts_cost: number | null
          scheduled_by: string | null
          scheduled_date: string | null
          service_provider: string | null
          status: Database["public"]["Enums"]["maintenance_status_enum"]
          technician_name: string | null
          title: string
          updated_at: string | null
          warranty_info: string | null
          work_performed: string | null
        }
        Insert: {
          actual_cost?: number | null
          car_id: string
          completed_by?: string | null
          completed_date?: string | null
          completed_mileage?: number | null
          created_at?: string | null
          description?: string | null
          due_mileage?: number | null
          estimated_cost?: number | null
          id?: string
          invoice_number?: string | null
          labor_cost?: number | null
          maintenance_type: Database["public"]["Enums"]["maintenance_type_enum"]
          next_service_date?: string | null
          next_service_mileage?: number | null
          parts_cost?: number | null
          scheduled_by?: string | null
          scheduled_date?: string | null
          service_provider?: string | null
          status?: Database["public"]["Enums"]["maintenance_status_enum"]
          technician_name?: string | null
          title: string
          updated_at?: string | null
          warranty_info?: string | null
          work_performed?: string | null
        }
        Update: {
          actual_cost?: number | null
          car_id?: string
          completed_by?: string | null
          completed_date?: string | null
          completed_mileage?: number | null
          created_at?: string | null
          description?: string | null
          due_mileage?: number | null
          estimated_cost?: number | null
          id?: string
          invoice_number?: string | null
          labor_cost?: number | null
          maintenance_type?: Database["public"]["Enums"]["maintenance_type_enum"]
          next_service_date?: string | null
          next_service_mileage?: number | null
          parts_cost?: number | null
          scheduled_by?: string | null
          scheduled_date?: string | null
          service_provider?: string | null
          status?: Database["public"]["Enums"]["maintenance_status_enum"]
          technician_name?: string | null
          title?: string
          updated_at?: string | null
          warranty_info?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          billing_email: string | null
          city: string
          company_size: Database["public"]["Enums"]["company_size_enum"] | null
          country: string
          created_at: string | null
          email: string
          fleet_size: number | null
          id: string
          industry: string | null
          legal_name: string | null
          name: string
          phone: string | null
          postal_code: string
          registration_number: string | null
          state_province: string | null
          status: Database["public"]["Enums"]["organization_status_enum"] | null
          subscription_plan: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          billing_email?: string | null
          city: string
          company_size?: Database["public"]["Enums"]["company_size_enum"] | null
          country?: string
          created_at?: string | null
          email: string
          fleet_size?: number | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          name: string
          phone?: string | null
          postal_code: string
          registration_number?: string | null
          state_province?: string | null
          status?:
            | Database["public"]["Enums"]["organization_status_enum"]
            | null
          subscription_plan?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          billing_email?: string | null
          city?: string
          company_size?: Database["public"]["Enums"]["company_size_enum"] | null
          country?: string
          created_at?: string | null
          email?: string
          fleet_size?: number | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          name?: string
          phone?: string | null
          postal_code?: string
          registration_number?: string | null
          state_province?: string | null
          status?:
            | Database["public"]["Enums"]["organization_status_enum"]
            | null
          subscription_plan?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_login: string | null
          last_name: string
          license_expiry: string | null
          license_number: string | null
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role_enum"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          is_active?: boolean
          last_login?: string | null
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_analytics: {
        Row: {
          average_speed: number | null
          booking_id: string
          car_id: string
          cost_per_km: number | null
          created_at: string | null
          end_location: string | null
          estimated_co2_emissions: number | null
          fuel_consumed: number | null
          fuel_efficiency: number | null
          harsh_braking_events: number | null
          id: string
          max_speed: number | null
          rapid_acceleration_events: number | null
          route_taken: string | null
          start_location: string | null
          total_cost: number | null
          total_distance: number | null
          total_duration: number | null
          user_id: string
        }
        Insert: {
          average_speed?: number | null
          booking_id: string
          car_id: string
          cost_per_km?: number | null
          created_at?: string | null
          end_location?: string | null
          estimated_co2_emissions?: number | null
          fuel_consumed?: number | null
          fuel_efficiency?: number | null
          harsh_braking_events?: number | null
          id?: string
          max_speed?: number | null
          rapid_acceleration_events?: number | null
          route_taken?: string | null
          start_location?: string | null
          total_cost?: number | null
          total_distance?: number | null
          total_duration?: number | null
          user_id: string
        }
        Update: {
          average_speed?: number | null
          booking_id?: string
          car_id?: string
          cost_per_km?: number | null
          created_at?: string | null
          end_location?: string | null
          estimated_co2_emissions?: number | null
          fuel_consumed?: number | null
          fuel_efficiency?: number | null
          harsh_braking_events?: number | null
          id?: string
          max_speed?: number | null
          rapid_acceleration_events?: number | null
          route_taken?: string | null
          start_location?: string | null
          total_cost?: number | null
          total_distance?: number | null
          total_duration?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_analytics_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_analytics_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_expenses: {
        Row: {
          amount: number
          booking_id: string | null
          car_id: string
          category: Database["public"]["Enums"]["expense_category_enum"]
          created_at: string | null
          description: string
          expense_date: string
          id: string
          invoice_number: string | null
          is_reimbursable: boolean | null
          location: string | null
          maintenance_record_id: string | null
          mileage_at_expense: number | null
          receipt_number: string | null
          reimbursed: boolean | null
          reimbursed_date: string | null
          subcategory: string | null
          updated_at: string | null
          user_id: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          car_id: string
          category: Database["public"]["Enums"]["expense_category_enum"]
          created_at?: string | null
          description: string
          expense_date: string
          id?: string
          invoice_number?: string | null
          is_reimbursable?: boolean | null
          location?: string | null
          maintenance_record_id?: string | null
          mileage_at_expense?: number | null
          receipt_number?: string | null
          reimbursed?: boolean | null
          reimbursed_date?: string | null
          subcategory?: string | null
          updated_at?: string | null
          user_id: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          car_id?: string
          category?: Database["public"]["Enums"]["expense_category_enum"]
          created_at?: string | null
          description?: string
          expense_date?: string
          id?: string
          invoice_number?: string | null
          is_reimbursable?: boolean | null
          location?: string | null
          maintenance_record_id?: string | null
          mileage_at_expense?: number | null
          receipt_number?: string | null
          reimbursed?: boolean | null
          reimbursed_date?: string | null
          subcategory?: string | null
          updated_at?: string | null
          user_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_expenses_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_expenses_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          booking_id: string | null
          car_id: string
          checklist_items: Json | null
          created_at: string | null
          id: string
          inspection_date: string
          inspection_type: Database["public"]["Enums"]["inspection_type_enum"]
          inspector_user_id: string
          mileage_reading: number | null
          notes: string | null
          overall_condition: number | null
          requires_immediate_attention: boolean | null
          requires_maintenance: boolean | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          car_id: string
          checklist_items?: Json | null
          created_at?: string | null
          id?: string
          inspection_date: string
          inspection_type: Database["public"]["Enums"]["inspection_type_enum"]
          inspector_user_id: string
          mileage_reading?: number | null
          notes?: string | null
          overall_condition?: number | null
          requires_immediate_attention?: boolean | null
          requires_maintenance?: boolean | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          car_id?: string
          checklist_items?: Json | null
          created_at?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type_enum"]
          inspector_user_id?: string
          mileage_reading?: number | null
          notes?: string | null
          overall_condition?: number | null
          requires_immediate_attention?: boolean | null
          requires_maintenance?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status_enum:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      car_status_enum:
        | "available"
        | "booked"
        | "maintenance"
        | "out_of_service"
        | "retired"
      company_size_enum:
        | "1-10"
        | "11-50"
        | "51-200"
        | "201-500"
        | "501-1000"
        | "1000+"
      damage_severity_enum: "minor" | "moderate" | "major" | "critical"
      damage_type_enum:
        | "scratch"
        | "dent"
        | "crack"
        | "missing_part"
        | "mechanical"
        | "electrical"
        | "interior"
        | "other"
      expense_category_enum:
        | "fuel"
        | "maintenance"
        | "insurance"
        | "parking"
        | "tolls"
        | "fines"
        | "cleaning"
        | "other"
      fuel_transaction_type_enum: "fuel_up" | "refund" | "adjustment"
      fuel_type_enum:
        | "petrol"
        | "diesel"
        | "electric"
        | "hybrid"
        | "plug_in_hybrid"
        | "lpg"
        | "cng"
      inspection_type_enum:
        | "pre_trip"
        | "post_trip"
        | "maintenance"
        | "damage_report"
        | "insurance"
      maintenance_status_enum:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "overdue"
      maintenance_type_enum:
        | "scheduled"
        | "repair"
        | "inspection"
        | "upgrade"
        | "recall"
      organization_status_enum: "pending" | "active" | "suspended" | "cancelled"
      transmission_type_enum: "manual" | "automatic" | "cvt" | "semi_automatic"
      user_role_enum: "admin" | "fleet_manager" | "driver" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status_enum: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      car_status_enum: [
        "available",
        "booked",
        "maintenance",
        "out_of_service",
        "retired",
      ],
      company_size_enum: [
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "501-1000",
        "1000+",
      ],
      damage_severity_enum: ["minor", "moderate", "major", "critical"],
      damage_type_enum: [
        "scratch",
        "dent",
        "crack",
        "missing_part",
        "mechanical",
        "electrical",
        "interior",
        "other",
      ],
      expense_category_enum: [
        "fuel",
        "maintenance",
        "insurance",
        "parking",
        "tolls",
        "fines",
        "cleaning",
        "other",
      ],
      fuel_transaction_type_enum: ["fuel_up", "refund", "adjustment"],
      fuel_type_enum: [
        "petrol",
        "diesel",
        "electric",
        "hybrid",
        "plug_in_hybrid",
        "lpg",
        "cng",
      ],
      inspection_type_enum: [
        "pre_trip",
        "post_trip",
        "maintenance",
        "damage_report",
        "insurance",
      ],
      maintenance_status_enum: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "overdue",
      ],
      maintenance_type_enum: [
        "scheduled",
        "repair",
        "inspection",
        "upgrade",
        "recall",
      ],
      organization_status_enum: ["pending", "active", "suspended", "cancelled"],
      transmission_type_enum: ["manual", "automatic", "cvt", "semi_automatic"],
      user_role_enum: ["admin", "fleet_manager", "driver", "viewer"],
    },
  },
} as const
