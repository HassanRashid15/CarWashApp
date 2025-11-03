-- Customers Table Schema for CarWashApp
-- Run this SQL in your Supabase SQL Editor

-- Create Customers table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Customers" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unique_id TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT CHECK (vehicle_type IN ('car', 'bike', 'other')) DEFAULT 'car',
  vehicle_number TEXT,
  -- Car specific fields
  car_type TEXT,
  car_name TEXT,
  car_year INTEGER,
  car_color TEXT,
  -- Bike specific fields
  bike_type TEXT,
  bike_name TEXT,
  bike_year INTEGER,
  bike_color TEXT,
  -- Other vehicle details
  other_details TEXT,
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('waiting', 'washing', 'completed', 'cancelled')) DEFAULT 'waiting',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table already exists, add missing columns
DO $$ 
BEGIN
    -- Add unique_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'unique_id'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN unique_id TEXT UNIQUE;
    END IF;

    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'name'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN name TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'phone'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN phone TEXT;
    END IF;

    -- Add vehicle_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'vehicle_type'
    ) THEN
        ALTER TABLE "Customers" 
        ADD COLUMN vehicle_type TEXT CHECK (vehicle_type IN ('car', 'bike', 'other')) DEFAULT 'car';
    END IF;

    -- Add vehicle_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'vehicle_number'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN vehicle_number TEXT;
    END IF;

    -- Add car_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'car_type'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN car_type TEXT;
    END IF;

    -- Add car_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'car_name'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN car_name TEXT;
    END IF;

    -- Add car_year column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'car_year'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN car_year INTEGER;
    END IF;

    -- Add car_color column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'car_color'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN car_color TEXT;
    END IF;

    -- Add bike_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'bike_type'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN bike_type TEXT;
    END IF;

    -- Add bike_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'bike_name'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN bike_name TEXT;
    END IF;

    -- Add bike_year column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'bike_year'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN bike_year INTEGER;
    END IF;

    -- Add bike_color column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'bike_color'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN bike_color TEXT;
    END IF;

    -- Add other_details column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'other_details'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN other_details TEXT;
    END IF;

    -- Add entry_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'entry_time'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add exit_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'exit_time'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN exit_time TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Customers" 
        ADD COLUMN status TEXT CHECK (status IN ('waiting', 'washing', 'completed', 'cancelled')) DEFAULT 'waiting';
    END IF;

    -- Add remarks column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'remarks'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN remarks TEXT;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Customers' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "Customers" ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Update existing rows to have default status
    UPDATE "Customers" 
    SET status = 'waiting' 
    WHERE status IS NULL;
END $$;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_customers_status ON "Customers"(status);

-- Create index on entry_time for sorting
CREATE INDEX IF NOT EXISTS idx_customers_entry_time ON "Customers"(entry_time);

-- Create index on vehicle_number for searching
CREATE INDEX IF NOT EXISTS idx_customers_vehicle_number ON "Customers"(vehicle_number);

-- Enable Row Level Security
ALTER TABLE "Customers" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read customers" ON "Customers";
DROP POLICY IF EXISTS "Users can insert customers" ON "Customers";
DROP POLICY IF EXISTS "Users can update customers" ON "Customers";
DROP POLICY IF EXISTS "Users can delete customers" ON "Customers";

-- Create policies for authenticated users
CREATE POLICY "Users can read customers" ON "Customers"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert customers" ON "Customers"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update customers" ON "Customers"
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete customers" ON "Customers"
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'Customers' 
ORDER BY ordinal_position;

