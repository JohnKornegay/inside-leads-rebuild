-- Create contact_submissions table
--
-- 1. New Tables
--    - contact_submissions
--      - id (uuid, primary key) - Unique identifier for each submission
--      - service (text) - Selected service type
--      - budget (text) - Budget range selected
--      - name (text, required) - Contact's full name
--      - company (text) - Company name
--      - email (text, required) - Contact email address
--      - phone (text) - Contact phone number
--      - website (text) - Current website URL
--      - description (text, required) - Project description
--      - notes (text) - Additional notes
--      - status (text, default 'new') - Submission status (new, contacted, converted, archived)
--      - source (text, default 'contact_page') - Where the submission came from
--      - ip_address (text) - IP address for spam prevention
--      - honeybook_id (text) - HoneyBook contact ID reference
--      - created_at (timestamptz) - When the submission was created
--      - updated_at (timestamptz) - When the submission was last updated
--
-- 2. Security
--    - Enable RLS on contact_submissions table
--    - Add policy for public inserts (form submissions)
--    - Add policy for authenticated admin users to read all submissions
--    - Add policy for authenticated admin users to update submissions

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  budget text,
  name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  website text,
  description text NOT NULL,
  notes text,
  status text DEFAULT 'new',
  source text DEFAULT 'contact_page',
  ip_address text,
  honeybook_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for form submissions)
CREATE POLICY "Anyone can submit contact forms"
  ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Authenticated users can read all submissions
CREATE POLICY "Authenticated users can read submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update submissions
CREATE POLICY "Authenticated users can update submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_submissions_status_idx ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS contact_submissions_email_idx ON contact_submissions(email);
