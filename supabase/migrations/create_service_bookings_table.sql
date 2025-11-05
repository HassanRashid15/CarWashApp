-- Create service_bookings table
CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  service_price TEXT NOT NULL,
  service_features JSONB,
  customer_name TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'confirmed', 'completed', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_bookings_status ON service_bookings(status);
CREATE INDEX IF NOT EXISTS idx_service_bookings_created_at ON service_bookings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all bookings
CREATE POLICY "Allow authenticated users to read service bookings"
  ON service_bookings FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert service bookings
CREATE POLICY "Allow public to insert service bookings"
  ON service_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to update service bookings
CREATE POLICY "Allow authenticated users to update service bookings"
  ON service_bookings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

