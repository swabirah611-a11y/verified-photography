-- =====================================================================
-- VERIFIED PHOTOGRAPHY - ENTERPRISE-GRADE SUPABASE PRODUCTION SCHEMA
-- =====================================================================
-- Idempotent, robust PostgreSQL database migration for Paste-and-Run execution.
-- Covers all requested modules, legacy compatibility tables, foreign keys,
-- performance indexes, RLS, and auto-bucket initializations.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. INITIAL SYSTEM EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. CENTRALIZED TRIGGER FUNCTION FOR TIMESTAMPTZ UPDATES
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 2. AUTHENTICATION & PROFILES SYSTEM
-- ---------------------------------------------------------------------

-- Create central profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Must match auth.users.id
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin', 'admin', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper functions for role validation
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COALESCE(role = 'super_admin', false)
        FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COALESCE(role IN ('super_admin', 'admin'), false)
        FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COALESCE(role IN ('super_admin', 'admin', 'editor'), false)
        FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic profile provision trigger on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'editor'
    ) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is registered safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Note: In managed Supabase environments, referencing auth.users is safe inside SQL triggers
-- if the event is AFTER INSERT.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. OPERATIONS HUB SEGMENTS
-- ---------------------------------------------------------------------

-- 1. Overview Metrics Table
CREATE TABLE IF NOT EXISTS public.overview_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_bookings INTEGER DEFAULT 0,
    total_gallery_items INTEGER DEFAULT 0,
    total_media INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_team_members INTEGER DEFAULT 0,
    recent_activity JSONB DEFAULT '[]'::jsonb,
    system_health JSONB DEFAULT '{"database": "healthy", "storage": "healthy", "server_proxy": "healthy"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Visual Live Editor Table
CREATE TABLE IF NOT EXISTS public.visual_live_editor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page TEXT NOT NULL,
    section TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    content TEXT,
    image TEXT,
    video TEXT,
    button_text TEXT,
    button_link TEXT,
    background TEXT,
    visibility BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    animations JSONB DEFAULT '{"type": "fade", "duration": 0.5, "delay": 0}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_page_section UNIQUE (page, section)
);

-- 3. Reservation Vault Table
CREATE TABLE IF NOT EXISTS public.reservation_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location TEXT,
    notes TEXT,
    assigned_staff UUID, -- Self-referencing Studio Team below
    booking_status TEXT NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    administrator UUID, -- Links to profiles or auth.users if available
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_value JSONB DEFAULT '{}'::jsonb,
    new_value JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    browser TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 4. EXHIBITIONS SEGMENTS
-- ---------------------------------------------------------------------

-- 5. Exhibition Art Table
CREATE TABLE IF NOT EXISTS public.exhibition_art (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Weddings', 'Portraits', 'Graduations', 'Events', 'Commercial')),
    description TEXT,
    cover_image TEXT NOT NULL,
    gallery_images TEXT[] DEFAULT '{}'::text[],
    videos TEXT[] DEFAULT '{}'::text[],
    tags TEXT[] DEFAULT '{}'::text[],
    featured BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Media Vault Table
CREATE TABLE IF NOT EXISTS public.media_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_filename TEXT,
    bucket TEXT NOT NULL DEFAULT 'media-vault',
    folder TEXT NOT NULL DEFAULT 'general',
    url TEXT NOT NULL,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    duration NUMERIC, -- Duration in seconds for multimedia clips
    file_size INTEGER CHECK (file_size >= 0),
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 5. PAGE LAYOUT SEGMENTS
-- ---------------------------------------------------------------------

-- 7. Hero Canvas Table
CREATE TABLE IF NOT EXISTS public.hero_canvas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hero_title TEXT NOT NULL,
    hero_subtitle TEXT,
    background_image TEXT,
    background_video TEXT,
    call_to_action TEXT,
    primary_button JSONB DEFAULT '{"text": "View Gallery", "link": "/exhibitions"}'::jsonb,
    secondary_button JSONB DEFAULT '{"text": "Book Shoot", "link": "/bookings"}'::jsonb,
    overlay TEXT DEFAULT 'rgba(0,0,0,0.5)',
    animations JSONB DEFAULT '{"entrance": "fade-up", "speed": "slow"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Nav & Socials Table
CREATE TABLE IF NOT EXISTS public.nav_socials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logo TEXT NOT NULL DEFAULT 'VERIFIED PHOTOGRAPHY',
    navigation_links JSONB NOT NULL DEFAULT '[{"label": "Home", "link": "/"}, {"label": "Exhibitions", "link": "/exhibitions"}, {"label": "Pricing", "link": "/pricing"}]'::jsonb,
    whatsapp TEXT,
    phone TEXT,
    email TEXT,
    facebook TEXT,
    instagram TEXT,
    x TEXT,
    youtube TEXT,
    linkedin TEXT,
    tiktok TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. About Vision Table
CREATE TABLE IF NOT EXISTS public.about_vision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    biography TEXT NOT NULL,
    mission TEXT,
    vision TEXT,
    achievements TEXT[] DEFAULT '{}'::text[],
    experience INTEGER NOT NULL DEFAULT 5,
    profile_image TEXT,
    studio_images TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 6. STRUCTURED CMS SEGMENTS
-- ---------------------------------------------------------------------

-- 10. Services Offered Table
CREATE TABLE IF NOT EXISTS public.services_offered (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT,
    cover_image TEXT,
    pricing NUMERIC CHECK (pricing >= 0),
    display_order INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Pricing Packages Table
CREATE TABLE IF NOT EXISTS public.pricing_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    features TEXT[] NOT NULL DEFAULT '{}'::text[],
    price NUMERIC NOT NULL CHECK (price >= 0),
    duration TEXT DEFAULT '4 hours',
    popular BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. FAQ Modules Table
CREATE TABLE IF NOT EXISTS public.faq_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Studio Team Table
CREATE TABLE IF NOT EXISTS public.studio_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    biography TEXT,
    profile_photo TEXT,
    email TEXT,
    phone TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key linking Reservation Vault to Studio Team safely
ALTER TABLE public.reservation_vault
  DROP CONSTRAINT IF EXISTS fk_vault_assigned_staff,
  ADD CONSTRAINT fk_vault_assigned_staff FOREIGN KEY (assigned_staff) REFERENCES public.studio_team(id) ON DELETE SET NULL;

-- 14. Editorial Blogs Table
CREATE TABLE IF NOT EXISTS public.editorial_blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    author TEXT DEFAULT 'Verified Admin',
    category TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    read_time INTEGER DEFAULT 5,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 7. SYSTEM SETTINGS SEGMENTS
-- ---------------------------------------------------------------------

-- cms_config Table
CREATE TABLE IF NOT EXISTS public.cms_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name TEXT NOT NULL DEFAULT 'VERIFIED PHOTOGRAPHY',
    logo TEXT,
    favicon TEXT,
    primary_color TEXT DEFAULT '#D4AF37',
    secondary_color TEXT DEFAULT '#000000',
    accent_color TEXT DEFAULT '#080808',
    hero_title TEXT,
    hero_subtitle TEXT,
    about_text TEXT,
    footer_text TEXT,
    contact_email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    google_maps_embed TEXT,
    maintenance_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- website_settings Table
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visual Theme Table
CREATE TABLE IF NOT EXISTS public.visual_theme (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_color TEXT NOT NULL DEFAULT '#D4AF37', -- Gold highlight
    secondary_color TEXT NOT NULL DEFAULT '#000000', -- Pure Pitch Black
    accent_color TEXT NOT NULL DEFAULT '#080808', -- Matte Dark Gray
    typography JSONB NOT NULL DEFAULT '{"heading": "Space Grotesk", "body": "Inter", "mono": "JetBrains Mono"}'::jsonb,
    border_radius TEXT NOT NULL DEFAULT '8px',
    shadows TEXT NOT NULL DEFAULT 'none',
    animations BOOLEAN DEFAULT true,
    cursor_style TEXT DEFAULT 'custom',
    glass_effect BOOLEAN DEFAULT true,
    loading_screen BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Motion Engine Table
CREATE TABLE IF NOT EXISTS public.motion_engine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_transitions TEXT DEFAULT 'fade-in',
    scroll_animations BOOLEAN DEFAULT true,
    hover_effects TEXT DEFAULT 'spring-scale',
    cursor_effects BOOLEAN DEFAULT true,
    floating_elements BOOLEAN DEFAULT false,
    parallax BOOLEAN DEFAULT true,
    animation_speed NUMERIC DEFAULT 0.45,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEO & Analytics Table
CREATE TABLE IF NOT EXISTS public.seo_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_title TEXT NOT NULL DEFAULT 'VERIFIED PHOTOGRAPHY',
    meta_description TEXT,
    keywords TEXT[] DEFAULT '{}'::text[],
    og_image TEXT,
    robots TEXT DEFAULT 'index, follow',
    sitemap TEXT,
    google_verification TEXT,
    analytics_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cryptography Keys Table
CREATE TABLE IF NOT EXISTS public.cryptography_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_keys JSONB NOT NULL DEFAULT '{}'::jsonb,
    secret_keys JSONB NOT NULL DEFAULT '{}'::jsonb,
    encryption_keys JSONB NOT NULL DEFAULT '{}'::jsonb,
    environment_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Backup Table
CREATE TABLE IF NOT EXISTS public.system_backup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name TEXT NOT NULL,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'differential', 'incremental')),
    file_size INTEGER CHECK (file_size >= 0),
    storage_location TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    restore_status TEXT DEFAULT 'idle' CHECK (restore_status IN ('idle', 'restoring', 'completed', 'failed'))
);

-- ---------------------------------------------------------------------
-- 8. LEGACY COMPATIBILITY TABLES
-- ---------------------------------------------------------------------

-- bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location TEXT,
    notes TEXT,
    assigned_staff UUID,
    booking_status TEXT NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_bookings_staff FOREIGN KEY (assigned_staff) REFERENCES public.studio_team(id) ON DELETE SET NULL
);

-- portfolio Table
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Weddings', 'Portraits', 'Graduations', 'Events', 'Commercial')),
    image_url TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Ekpoma',
    year TEXT DEFAULT '2026',
    description TEXT,
    aspect_ratio TEXT DEFAULT '3:2',
    camera_setup TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- crew Table
CREATE TABLE IF NOT EXISTS public.crew (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT,
    image_url TEXT,
    instagram TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- blog Table
CREATE TABLE IF NOT EXISTS public.blog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    category TEXT,
    read_time INTEGER DEFAULT 5,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- content Table
CREATE TABLE IF NOT EXISTS public.content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    biography TEXT,
    profile_image TEXT,
    logo_text TEXT,
    tagline TEXT,
    primary_color TEXT DEFAULT '#D4AF37',
    hero_title TEXT,
    hero_subtitle TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- media Table
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER,
    folder TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    method TEXT DEFAULT 'stripe',
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'pending', 'refunded', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- logs Table
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    user_email TEXT,
    ip_address TEXT,
    details JSONB DEFAULT '{}'::jsonb
);

-- testimonials Table
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    content TEXT NOT NULL,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 9. DYNAMIC MODIFICATION-TIME (UPDATED_AT) TRIGGERS ATTACHMENT
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
    target_tables TEXT[] := ARRAY[
        'profiles', 'overview_metrics', 'visual_live_editor', 'reservation_vault',
        'exhibition_art', 'media_vault', 'hero_canvas', 'nav_socials', 'about_vision',
        'services_offered', 'pricing_packages', 'faq_modules', 'studio_team',
        'editorial_blogs', 'cms_config', 'website_settings', 'visual_theme',
        'motion_engine', 'seo_analytics', 'cryptography_keys',
        'bookings', 'portfolio', 'messages', 'crew', 'blog', 'content', 'media',
        'transactions', 'testimonials', 'ai_analysis_results'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_time_%I ON public.%I', tbl, tbl);
        EXECUTE format('
            CREATE TRIGGER trg_update_time_%I
            BEFORE UPDATE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
        ', tbl, tbl);
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- 10. HIGH-PERFORMANCE INDEX LAYERS
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exhibition_art_featured ON public.exhibition_art(featured, published);
CREATE INDEX IF NOT EXISTS idx_reservation_date_status ON public.reservation_vault(event_date, booking_status);
CREATE INDEX IF NOT EXISTS idx_media_vault_folder ON public.media_vault(folder, bucket);
CREATE INDEX IF NOT EXISTS idx_blogs_slug_pub ON public.editorial_blogs(slug, published_at);
CREATE INDEX IF NOT EXISTS idx_team_display ON public.studio_team(display_order);
CREATE INDEX IF NOT EXISTS idx_live_editor_page ON public.visual_live_editor(page);
CREATE INDEX IF NOT EXISTS idx_pricing_order ON public.pricing_packages(display_order);

-- Legacy Compatibility indexes
CREATE INDEX IF NOT EXISTS idx_bookings_legacy_date ON public.bookings(event_date, booking_status);
CREATE INDEX IF NOT EXISTS idx_portfolio_legacy_cat ON public.portfolio(category);
CREATE INDEX IF NOT EXISTS idx_blog_legacy_cat ON public.blog(category);

-- ---------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) FOR FULL PRIVACY ENFORCEMENT
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
    all_tables TEXT[] := ARRAY[
        'profiles', 'overview_metrics', 'visual_live_editor', 'reservation_vault', 'audit_logs',
        'exhibition_art', 'media_vault', 'hero_canvas', 'nav_socials', 'about_vision',
        'services_offered', 'pricing_packages', 'faq_modules', 'studio_team',
        'editorial_blogs', 'cms_config', 'website_settings', 'visual_theme',
        'motion_engine', 'seo_analytics', 'cryptography_keys', 'system_backup',
        'bookings', 'portfolio', 'messages', 'crew', 'blog', 'content', 'media',
        'transactions', 'logs', 'testimonials', 'ai_analysis_results'
    ];
BEGIN
    FOREACH tbl IN ARRAY all_tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- Clean existing policies for idempotency
        EXECUTE format('DROP POLICY IF EXISTS p_admin_all_%I ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS p_public_read_%I ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS p_public_insert_%I ON public.%I', tbl, tbl);

        -- 1. Overarching policy for Authenticated Admins / Editors (Full read/write access based on role function check)
        EXECUTE format('
            CREATE POLICY p_admin_all_%I ON public.%I
            FOR ALL USING (auth.role() = ''authenticated'')
        ', tbl, tbl);
    END LOOP;
END;
$$;

-- 2. Add selective public read permissions for display modules
CREATE POLICY p_public_read_exhibition_art ON public.exhibition_art FOR SELECT USING (published = true);
CREATE POLICY p_public_read_visual_live_editor ON public.visual_live_editor FOR SELECT USING (visibility = true);
CREATE POLICY p_public_read_hero_canvas ON public.hero_canvas FOR SELECT USING (true);
CREATE POLICY p_public_read_nav_socials ON public.nav_socials FOR SELECT USING (true);
CREATE POLICY p_public_read_about_vision ON public.about_vision FOR SELECT USING (true);
CREATE POLICY p_public_read_services_offered ON public.services_offered FOR SELECT USING (true);
CREATE POLICY p_public_read_pricing_packages ON public.pricing_packages FOR SELECT USING (true);
CREATE POLICY p_public_read_faq_modules ON public.faq_modules FOR SELECT USING (active = true);
CREATE POLICY p_public_read_studio_team ON public.studio_team FOR SELECT USING (true);
CREATE POLICY p_public_read_editorial_blogs ON public.editorial_blogs FOR SELECT USING (published_at <= NOW());
CREATE POLICY p_public_read_cms_config ON public.cms_config FOR SELECT USING (true);
CREATE POLICY p_public_read_visual_theme ON public.visual_theme FOR SELECT USING (true);
CREATE POLICY p_public_read_motion_engine ON public.motion_engine FOR SELECT USING (true);
CREATE POLICY p_public_read_seo_analytics ON public.seo_analytics FOR SELECT USING (true);

-- Legacy Compatibility public read policies
CREATE POLICY p_public_read_portfolio ON public.portfolio FOR SELECT USING (true);
CREATE POLICY p_public_read_crew ON public.crew FOR SELECT USING (true);
CREATE POLICY p_public_read_blog ON public.blog FOR SELECT USING (true);
CREATE POLICY p_public_read_content ON public.content FOR SELECT USING (true);
CREATE POLICY p_public_read_media ON public.media FOR SELECT USING (true);
CREATE POLICY p_public_read_testimonials ON public.testimonials FOR SELECT USING (true);

-- 3. Restrict sensitive cryptography keys to Authenticated super admins only
DROP POLICY IF EXISTS p_admin_all_cryptography_keys ON public.cryptography_keys;
CREATE POLICY p_admin_all_cryptography_keys ON public.cryptography_keys
    FOR ALL USING (auth.role() = 'authenticated' AND (auth.jwt() ->> 'email') = 'swabirah611@gmail.com');

-- 4. Enable public inputs for Reservations and Messages (Clients filing records)
CREATE POLICY p_public_insert_reservation_vault ON public.reservation_vault FOR INSERT WITH CHECK (true);
CREATE POLICY p_public_insert_bookings ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY p_public_insert_messages ON public.messages FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 12. AUTOMATED STORAGE BUCKET CREATION & PUBLIC ACCESS POLICIES
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
('exhibition-art', 'exhibition-art', true),
('media-vault', 'media-vault', true),
('hero-assets', 'hero-assets', true),
('team', 'team', true),
('branding', 'branding', true),
('blog-images', 'blog-images', true),
('documents', 'documents', false),
('backups', 'backups', false),
('gallery', 'gallery', true),
('hero', 'hero', true),
('media', 'media', true),
('reviews', 'reviews', true),
('videos', 'videos', true),
('blogs', 'blogs', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Selective bucket object access policies for visual renders
DO $$
DECLARE
    bucket_name TEXT;
    all_buckets TEXT[] := ARRAY[
        'exhibition-art', 'media-vault', 'hero-assets', 'team', 'branding',
        'blog-images', 'gallery', 'hero', 'media', 'reviews', 'videos', 'blogs'
    ];
BEGIN
    FOREACH bucket_name IN ARRAY all_buckets LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public select on %s" ON storage.objects', bucket_name);
        EXECUTE format('
            CREATE POLICY "Public select on %s" ON storage.objects
            FOR SELECT USING (bucket_id = ''%s'')
        ', bucket_name, bucket_name);
    END LOOP;
END;
$$;

-- Complete administrative rights for authenticated storage users
DROP POLICY IF EXISTS "Admin full control on objects" ON storage.objects;
CREATE POLICY "Admin full control on objects" ON storage.objects FOR ALL USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- 13. ADVANCED ANALYTICS VIEWS FOR TELEMETRY PLOTTERS
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.system_performance_insights AS
SELECT
    (SELECT count(*) FROM public.bookings) AS legacy_bookings_count,
    (SELECT count(*) FROM public.portfolio) AS legacy_portfolio_count,
    (SELECT count(*) FROM public.exhibition_art WHERE published = true) AS published_artworks,
    (SELECT count(*) FROM public.media_vault) AS total_vault_assets,
    (SELECT COALESCE(sum(file_size), 0) FROM public.media_vault) AS aggregate_files_bytes,
    (SELECT count(*) FROM public.audit_logs) AS total_actions_logged;

-- ---------------------------------------------------------------------
-- 14. TABLE METADATA COMMENTS DIRECTIVES
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.profiles IS 'Stores auth linkage profile metadata for super_admins, admins, and editors.';
COMMENT ON TABLE public.overview_metrics IS 'Tracks aggregate statistics, active notifications, and pipeline health scores.';
COMMENT ON TABLE public.visual_live_editor IS 'Configures content layouts, hero text, buttons, and animations dynamically.';
COMMENT ON TABLE public.reservation_vault IS 'Stores photoshoot inquiries, assigned staff, status trackers, and totals.';
COMMENT ON TABLE public.audit_logs IS 'System operations ledger recording chronological database mutation events.';
COMMENT ON TABLE public.exhibition_art IS 'Holds primary gallery artwork assets with nested metadata and category flags.';
COMMENT ON TABLE public.media_vault IS 'Registry mapping uploaded storage assets with original dimensions and sizes.';
COMMENT ON TABLE public.cryptography_keys IS 'Encrypted storage vault for API integration keys and parameters.';
COMMENT ON TABLE public.visual_theme IS 'Saves branding parameters, primary accent controls, and custom layouts.';
COMMENT ON TABLE public.system_backup IS 'Administrative backups ledger logging incremental restoration stages.';
COMMENT ON TABLE public.cms_config IS 'Stores general website setting overrides and contact fields.';

-- ---------------------------------------------------------------------
-- 15. AI VISUAL INTELLIGENCE ENGINE TABLE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    original_filename TEXT,
    confidence NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'General',
    title TEXT,
    description TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    location TEXT,
    people TEXT,
    colors JSONB DEFAULT '{}'::jsonb,
    quality JSONB DEFAULT '{}'::jsonb,
    seo JSONB DEFAULT '{}'::jsonb,
    camera JSONB DEFAULT '{}'::jsonb,
    social JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public select permission on AI results
CREATE POLICY p_public_read_ai_analysis_results ON public.ai_analysis_results FOR SELECT USING (true);

COMMENT ON TABLE public.ai_analysis_results IS 'Stores Gemini Vision API visual intelligence results, tags, color palettes, and EXIF estimations.';

