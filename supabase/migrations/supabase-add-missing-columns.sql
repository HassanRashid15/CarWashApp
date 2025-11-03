-- Add missing columns to existing Workers table
-- Run this SQL in your Supabase SQL Editor if you get column errors

-- Add employee_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'employee_id'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN employee_id TEXT UNIQUE;
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Workers" 
        ADD COLUMN status TEXT CHECK (status IN ('available', 'busy', 'off-duty')) DEFAULT 'available';
    END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'phone'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Add emergency_contact column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'emergency_contact'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN emergency_contact TEXT;
    END IF;
END $$;

-- Add address column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'address'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN address TEXT;
    END IF;
END $$;

-- Add cnic_no column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'cnic_no'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN cnic_no TEXT;
    END IF;
END $$;

-- Add city column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'city'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN city TEXT;
    END IF;
END $$;

-- Add age column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'age'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN age INTEGER;
    END IF;
END $$;

-- Add joined_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'joined_date'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN joined_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Add last_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'last_active'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN last_active TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add total_jobs column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'total_jobs'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN total_jobs INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add profile_image column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'profile_image'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN profile_image TEXT;
    END IF;
END $$;

-- Add education_level column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'education_level'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN education_level TEXT;
    END IF;
END $$;

-- Add previous_experience column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'previous_experience'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN previous_experience INTEGER;
    END IF;
END $$;

-- Add province column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'province'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN province TEXT;
    END IF;
END $$;

-- Add date_of_birth column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN date_of_birth DATE;
    END IF;
END $$;

-- Add blood_group column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'blood_group'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN blood_group TEXT;
    END IF;
END $$;

-- Add salary column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'salary'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN salary NUMERIC(10, 2);
    END IF;
END $$;

-- Add remarks column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Workers' AND column_name = 'remarks'
    ) THEN
        ALTER TABLE "Workers" ADD COLUMN remarks TEXT;
    END IF;
END $$;

-- Update existing rows to have default status if status is NULL
UPDATE "Workers" 
SET status = 'available' 
WHERE status IS NULL;

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Workers' 
ORDER BY ordinal_position;

