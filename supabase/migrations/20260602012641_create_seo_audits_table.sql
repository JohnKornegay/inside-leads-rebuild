/*
  # Create SEO Audits Table

  ## Summary
  Stores results from the free SEO audit tool on the website.

  ## New Tables
  - `seo_audits`
    - `id` (uuid, primary key)
    - `url` (text) - the URL/domain that was audited
    - `domain` (text) - normalized domain extracted from the URL
    - `overall_score` (integer) - 0-100 score
    - `results` (jsonb) - full structured audit results JSON
    - `visitor_ip` (text) - IP address for rate limiting
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public INSERT allowed (anyone can submit an audit)
  - No public SELECT (results are private to the session)
  - Authenticated users can read all audits (for admin purposes)

  ## Notes
  - Rate limiting enforced via visitor_ip + created_at in application logic
  - results JSON structure: { categories: {...}, checks: [...], summary: {...} }
*/

CREATE TABLE IF NOT EXISTS seo_audits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text        NOT NULL,
  domain      text        NOT NULL,
  overall_score integer   NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  results     jsonb       NOT NULL DEFAULT '{}',
  visitor_ip  text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_audits_visitor_ip_created_at ON seo_audits (visitor_ip, created_at DESC);
CREATE INDEX IF NOT EXISTS seo_audits_domain ON seo_audits (domain);
CREATE INDEX IF NOT EXISTS seo_audits_created_at ON seo_audits (created_at DESC);

ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert an audit"
  ON seo_audits FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read all audits"
  ON seo_audits FOR SELECT
  TO authenticated
  USING (true);
