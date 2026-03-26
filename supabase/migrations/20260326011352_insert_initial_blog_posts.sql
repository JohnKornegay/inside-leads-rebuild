-- Insert initial blog posts from existing website
--
-- This migration populates the blog_posts table with the existing blog content
-- from the current static HTML website. All posts are set to published status.

DO $$
DECLARE
  cat_branding_id uuid;
  cat_ppc_id uuid;
  cat_local_id uuid;
  cat_social_id uuid;
  cat_seo_id uuid;
BEGIN
  SELECT id INTO cat_branding_id FROM blog_categories WHERE slug = 'branding';
  SELECT id INTO cat_ppc_id FROM blog_categories WHERE slug = 'ppc';
  SELECT id INTO cat_local_id FROM blog_categories WHERE slug = 'local';
  SELECT id INTO cat_social_id FROM blog_categories WHERE slug = 'social';
  SELECT id INTO cat_seo_id FROM blog_categories WHERE slug = 'seo';

  INSERT INTO blog_posts (
    title,
    slug,
    excerpt,
    content,
    featured_image,
    category_id,
    status,
    published_at,
    seo_title,
    seo_description
  ) VALUES
  (
    '10 Ways to Increase Brand Awareness in 2024',
    '10-ways-to-increase-brand-awareness-2024',
    'As a business owner, you''re always looking for ways to increase brand awareness. With the right strategies in place, you can effectively boost your brand awareness and drive business growth.',
    'As a business owner, you''re always looking for ways to increase brand awareness. With the right strategies in place, you can effectively boost your brand awareness and drive business growth. This comprehensive guide covers proven tactics including social media engagement, content marketing, strategic partnerships, influencer collaborations, and community involvement.',
    'https://uploads-ssl.webflow.com/5f7e542e02989ea7d01f5620/63a99b9ef1c7f64df9eb6a9a_pexels-caio-67112.jpg',
    cat_branding_id,
    'published',
    now() - interval '10 days',
    '10 Ways to Increase Brand Awareness in 2024 | Inside Leads',
    'Discover proven strategies to boost brand awareness and drive business growth in 2024. Expert tips from Inside Leads.'
  ),
  (
    'Understanding Google Ads Bidding Strategies',
    'understanding-google-ads-bidding-strategies',
    'Google Ads offers several options for bidding on PPC campaigns. Choosing the right bidding method can make a significant difference in performance and return on your marketing budget.',
    'Google Ads offers several options for bidding on PPC campaigns. Choosing the right bidding method can make a significant difference in performance and return on your marketing budget. Learn about manual CPC, enhanced CPC, maximize conversions, target CPA, target ROAS, and when to use each strategy.',
    'https://uploads-ssl.webflow.com/5f7e542e02989ea7d01f5620/63a9a59860216ab712a22b6d_pexels-pixabay-265087.jpg',
    cat_ppc_id,
    'published',
    now() - interval '8 days',
    'Understanding Google Ads Bidding Strategies | PPC Guide',
    'Master Google Ads bidding strategies to maximize your PPC campaign performance and ROI. Expert insights from Inside Leads.'
  ),
  (
    'Hyperlocal Marketing 101: What is it?',
    'hyperlocal-marketing-101-what-is-it',
    'When it comes to marketing a local business, thinking small can be a better strategy. Hyperlocal marketing targets prospects in a highly restricted zone around your business.',
    'When it comes to marketing a local business, thinking small can be a better strategy. Hyperlocal marketing targets prospects in a highly restricted zone around your business. Learn how to leverage local SEO, geotargeted ads, community partnerships, and location-based promotions to dominate your local market.',
    'https://uploads-ssl.webflow.com/5f7e542e02989ea7d01f5620/63a9a954d2940d47d78ff849_pexels-serpstat-572056.jpg',
    cat_local_id,
    'published',
    now() - interval '6 days',
    'Hyperlocal Marketing 101: What is it? | Local Marketing Guide',
    'Learn how hyperlocal marketing can help your business dominate your local market with targeted strategies.'
  ),
  (
    'How To Get Recommended On Instagram',
    'how-to-get-recommended-on-instagram',
    'Instagram Recommendations appear on the Explore page and Reels tab based on user preferences. Leveraging this feature can significantly increase your content''s reach to targeted audiences.',
    'Instagram Recommendations appear on the Explore page and Reels tab based on user preferences. Leveraging this feature can significantly increase your content''s reach to targeted audiences. Discover proven tactics for creating engaging content, optimizing posting times, using trending audio, and building authentic engagement.',
    'https://uploads-ssl.webflow.com/5f7e542e02989ea7d01f5620/63a9b2509e321823398f4eb5_pexels-prateek-katyal-2694434.jpg',
    cat_social_id,
    'published',
    now() - interval '4 days',
    'How To Get Recommended On Instagram | Social Media Tips',
    'Learn how to leverage Instagram''s recommendation algorithm to expand your reach and grow your audience organically.'
  ),
  (
    '14 Myths About the Design Process',
    '14-myths-about-the-design-process',
    'Even the most experienced designers encounter myths and misconceptions about web design. Let''s clear the air and share the truth about some of the most common myths in the field.',
    'Even the most experienced designers encounter myths and misconceptions about web design. Let''s clear the air and share the truth about some of the most common myths in the field. From timeline expectations to revision processes, we debunk the most common misunderstandings about professional web design.',
    'https://uploads-ssl.webflow.com/5f7e542e02989ea7d01f5620/63a9a0f9a56bae0dcb8ddf7b_pexels-tranmautritam-326518.jpg',
    cat_branding_id,
    'published',
    now() - interval '2 days',
    '14 Myths About the Design Process | Web Design Truths',
    'Debunking common web design myths and misconceptions. Learn the truth about professional design processes.'
  ),
  (
    'How AI Is Transforming SEO in 2025',
    'how-ai-is-transforming-seo-2025',
    'From Google''s AI Overviews to RankBrain and Gemini, artificial intelligence is reshaping how search works. Here''s how forward-thinking businesses need to adapt their SEO strategy right now.',
    'From Google''s AI Overviews to RankBrain and Gemini, artificial intelligence is reshaping how search works. Here''s how forward-thinking businesses need to adapt their SEO strategy right now. Learn about AI-powered search algorithms, semantic search optimization, content quality signals, and the future of SEO in an AI-driven world.',
    'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg',
    cat_seo_id,
    'published',
    now() - interval '1 day',
    'How AI Is Transforming SEO in 2025 | AI & Search Marketing',
    'Discover how artificial intelligence is reshaping SEO and what your business needs to do to stay ahead in 2025.'
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;
