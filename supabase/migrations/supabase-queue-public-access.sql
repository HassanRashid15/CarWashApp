-- Additional RLS policies for public queue access
-- Run this SQL in your Supabase SQL Editor after running supabase-queue-table.sql

-- Allow public/anonymous access to read active queue entries
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can read active queue" ON "Queue";

-- Create policy for public/anonymous access to read active queue entries
CREATE POLICY "Public can read active queue" ON "Queue"
  FOR SELECT USING (status IN ('waiting', 'washing'));

-- Also allow public access to read customer names (for queue display)
-- Note: This allows reading customer names for queue entries
-- Update Customers table RLS to allow public read of names only
DROP POLICY IF EXISTS "Public can read customer names for queue" ON "Customers";

CREATE POLICY "Public can read customer names for queue" ON "Customers"
  FOR SELECT USING (true); -- Allow reading all customer names (public queue display)

-- Also allow public access to read worker names (for queue display)
DROP POLICY IF EXISTS "Public can read worker names for queue" ON "Workers";

CREATE POLICY "Public can read worker names for queue" ON "Workers"
  FOR SELECT USING (true); -- Allow reading all worker names (public queue display)


