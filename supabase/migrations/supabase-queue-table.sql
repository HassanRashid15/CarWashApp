-- Queue Table Schema for CarWashApp
-- Run this SQL in your Supabase SQL Editor

-- Create Queue table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "Queue" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES "Customers"(id) ON DELETE CASCADE,
  queue_number INTEGER NOT NULL,
  status TEXT CHECK (status IN ('waiting', 'washing', 'completed', 'cancelled')) DEFAULT 'waiting',
  assigned_worker UUID REFERENCES "Workers"(id) ON DELETE SET NULL,
  service_type TEXT CHECK (service_type IN ('wash', 'detailing', 'wax', 'interior', 'full_service')) NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'unpaid')) DEFAULT 'pending',
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  remarks TEXT
);

-- If table already exists, add missing columns
DO $$ 
BEGIN
    -- Add customer_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "Queue" ADD COLUMN customer_id UUID REFERENCES "Customers"(id) ON DELETE CASCADE;
    END IF;

    -- Add queue_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'queue_number'
    ) THEN
        ALTER TABLE "Queue" ADD COLUMN queue_number INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Queue" 
        ADD COLUMN status TEXT CHECK (status IN ('waiting', 'washing', 'completed', 'cancelled')) DEFAULT 'waiting';
    END IF;

    -- Add assigned_worker column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'assigned_worker'
    ) THEN
        ALTER TABLE "Queue" ADD COLUMN assigned_worker UUID REFERENCES "Workers"(id) ON DELETE SET NULL;
    END IF;

    -- Add service_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'service_type'
    ) THEN
        ALTER TABLE "Queue" 
        ADD COLUMN service_type TEXT CHECK (service_type IN ('wash', 'detailing', 'wax', 'interior', 'full_service')) NOT NULL DEFAULT 'wash';
    END IF;

    -- Add price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'price'
    ) THEN
        ALTER TABLE "Queue" ADD COLUMN price NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;

    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE "Queue" 
        ADD COLUMN payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'unpaid')) DEFAULT 'pending';
    END IF;

    -- Add start_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'start_time'
    ) THEN
        ALTER TABLE "Queue" ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add end_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'end_time'
    ) THEN
        ALTER TABLE "Queue" ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add remarks column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Queue' AND column_name = 'remarks'
    ) THEN
        ALTER TABLE "Queue" ADD COLUMN remarks TEXT;
    END IF;

    -- Update existing rows to have default status
    UPDATE "Queue" 
    SET status = 'waiting' 
    WHERE status IS NULL;

    -- Update existing rows to have default payment_status
    UPDATE "Queue" 
    SET payment_status = 'pending' 
    WHERE payment_status IS NULL;
END $$;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_queue_status ON "Queue"(status);

-- Create index on queue_number for sorting
CREATE INDEX IF NOT EXISTS idx_queue_number ON "Queue"(queue_number);

-- Create index on customer_id for faster joins
CREATE INDEX IF NOT EXISTS idx_queue_customer_id ON "Queue"(customer_id);

-- Create index on assigned_worker for faster joins
CREATE INDEX IF NOT EXISTS idx_queue_assigned_worker ON "Queue"(assigned_worker);

-- Create index on payment_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_queue_payment_status ON "Queue"(payment_status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON "Queue"(created_at);

-- Enable Row Level Security
ALTER TABLE "Queue" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read queue" ON "Queue";
DROP POLICY IF EXISTS "Users can insert queue" ON "Queue";
DROP POLICY IF EXISTS "Users can update queue" ON "Queue";
DROP POLICY IF EXISTS "Users can delete queue" ON "Queue";

-- Create policies for authenticated users
CREATE POLICY "Users can read queue" ON "Queue"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert queue" ON "Queue"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update queue" ON "Queue"
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete queue" ON "Queue"
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create policy for public/anonymous access to read active queue entries
CREATE POLICY "Public can read active queue" ON "Queue"
  FOR SELECT USING (status IN ('waiting', 'washing'));

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'Queue' 
ORDER BY ordinal_position;

