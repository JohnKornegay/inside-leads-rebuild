-- Create blog management tables
--
-- 1. New Tables
--    - blog_categories
--      - id (uuid, primary key) - Unique identifier
--      - name (text, required) - Category display name
--      - slug (text, required, unique) - URL-friendly identifier
--      - description (text) - Category description
--      - order_index (integer) - Display order in filters
--      - created_at (timestamptz) - Creation timestamp
--
--    - blog_posts
--      - id (uuid, primary key) - Unique identifier
--      - title (text, required) - Post title
--      - slug (text, required, unique) - URL-friendly identifier
--      - excerpt (text) - Short summary/preview
--      - content (text, required) - Full post content
--      - featured_image (text) - Image URL
--      - category_id (uuid, foreign key) - Reference to blog_categories
--      - author (text) - Author name
--      - status (text, default 'draft') - draft or published
--      - published_at (timestamptz) - When the post was published
--      - view_count (integer, default 0) - Number of views
--      - seo_title (text) - SEO optimized title
--      - seo_description (text) - Meta description
--      - seo_keywords (text) - SEO keywords
--      - created_at (timestamptz) - Creation timestamp
--      - updated_at (timestamptz) - Last update timestamp
--
--    - blog_tags
--      - id (uuid, primary key) - Unique identifier
--      - name (text, required, unique) - Tag name
--      - slug (text, required, unique) - URL-friendly identifier
--      - created_at (timestamptz) - Creation timestamp
--
--    - blog_post_tags (junction table)
--      - post_id (uuid, foreign key) - Reference to blog_posts
--      - tag_id (uuid, foreign key) - Reference to blog_tags
--      - created_at (timestamptz) - Creation timestamp
--
-- 2. Security
--    - Enable RLS on all blog tables
--    - Public read access for published posts
--    - Authenticated admin access for all operations

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  featured_image text,
  category_id uuid REFERENCES blog_categories(id) ON DELETE SET NULL,
  author text DEFAULT 'Inside Leads Team',
  status text DEFAULT 'draft',
  published_at timestamptz,
  view_count integer DEFAULT 0,
  seo_title text,
  seo_description text,
  seo_keywords text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create blog_post_tags junction table
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES blog_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

-- Enable RLS on all tables
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Public read access for blog_categories
CREATE POLICY "Anyone can read categories"
  ON blog_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Public read access for published blog posts
CREATE POLICY "Anyone can read published posts"
  ON blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Public read access for blog_tags
CREATE POLICY "Anyone can read tags"
  ON blog_tags
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Public read access for blog_post_tags
CREATE POLICY "Anyone can read post tags"
  ON blog_post_tags
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated admin policies for blog_categories
CREATE POLICY "Authenticated users can insert categories"
  ON blog_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON blog_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON blog_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Authenticated admin policies for blog_posts
CREATE POLICY "Authenticated users can read all posts"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (true);

-- Authenticated admin policies for blog_tags
CREATE POLICY "Authenticated users can insert tags"
  ON blog_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags"
  ON blog_tags
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tags"
  ON blog_tags
  FOR DELETE
  TO authenticated
  USING (true);

-- Authenticated admin policies for blog_post_tags
CREATE POLICY "Authenticated users can insert post tags"
  ON blog_post_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete post tags"
  ON blog_post_tags
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_category_id_idx ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS blog_categories_slug_idx ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS blog_tags_slug_idx ON blog_tags(slug);

-- Insert default categories
INSERT INTO blog_categories (name, slug, description, order_index) VALUES
  ('SEO', 'seo', 'Search Engine Optimization strategies and tips', 1),
  ('PPC', 'ppc', 'Pay-Per-Click advertising insights', 2),
  ('Social Media', 'social', 'Social media marketing strategies', 3),
  ('Brand Strategy', 'branding', 'Building and growing your brand', 4),
  ('Local Marketing', 'local', 'Local SEO and marketing tactics', 5),
  ('Web Development', 'web', 'Website design and development', 6),
  ('AI Consulting', 'ai', 'AI and automation in marketing', 7)
ON CONFLICT (slug) DO NOTHING;
