-- Workers Table Schema for CarWashApp
-- Run this SQL in your Supabase SQL Editor

-- Option 1: If table doesn't exist, create it
-- Option 2: If table exists but missing columns, run supabase-add-missing-columns.sql instead

-- Drop table if exists (use with caution - will delete all data)
-- DROP TABLE IF EXISTS "Workers" CASCADE;

-- Create Workers table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Workers" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  emergency_contact TEXT,
  address TEXT,
  cnic_no TEXT,
  city TEXT,
  age INTEGER,
  status TEXT CHECK (status IN ('available', 'busy', 'off-duty')) DEFAULT 'available',
  joined_date DATE DEFAULT CURRENT_DATE,
  last_active TIMESTAMP WITH TIME ZONE,
  total_jobs INTEGER DEFAULT 0,
  profile_image TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  education_level TEXT,
  previous_experience INTEGER,
  province TEXT,
  date_of_birth DATE,
  blood_group TEXT,
  salary NUMERIC(10, 2)
);

-- If table already exists with only name/id/created_at, add missing columns
DO $$ 
BEGIN
    -- Add employee_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN employee_id TEXT UNIQUE;
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'phone'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN phone TEXT;
    END IF;

    -- Add emergency_contact column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'emergency_contact'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN emergency_contact TEXT;
    END IF;

    -- Add address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'address'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN address TEXT;
    END IF;

    -- Add cnic_no column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'cnic_no'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN cnic_no TEXT;
    END IF;

    -- Add city column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'city'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN city TEXT;
    END IF;

    -- Add age column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'age'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN age INTEGER;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Workers" 
        ADD COLUMN status TEXT CHECK (status IN ('available', 'busy', 'off-duty')) DEFAULT 'available';
    END IF;

    -- Add joined_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'joined_date'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN joined_date DATE DEFAULT CURRENT_DATE;
    END IF;

    -- Add last_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'last_active'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN last_active TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add total_jobs column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'total_jobs'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN total_jobs INTEGER DEFAULT 0;
    END IF;

    -- Add profile_image column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'profile_image'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN profile_image TEXT;
    END IF;

    -- Add remarks column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'remarks'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN remarks TEXT;
    END IF;

    -- Update existing rows to have default status
    UPDATE "Workers" 
    SET status = 'available' 
    WHERE status IS NULL;
END $$;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_workers_status ON "Workers"(status);

-- Create index on joined_date for sorting
CREATE INDEX IF NOT EXISTS idx_workers_joined_date ON "Workers"(joined_date);

-- Enable Row Level Security
ALTER TABLE "Workers" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read workers" ON "Workers";
DROP POLICY IF EXISTS "Users can insert workers" ON "Workers";
DROP POLICY IF EXISTS "Users can update workers" ON "Workers";
DROP POLICY IF EXISTS "Users can delete workers" ON "Workers";

-- Create policies for authenticated users
CREATE POLICY "Users can read workers" ON "Workers"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert workers" ON "Workers"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update workers" ON "Workers"
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete workers" ON "Workers"
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'Workers' 
ORDER BY ordinal_position;

