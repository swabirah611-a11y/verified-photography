-- Align the live CMS, public site, and Storage access model.
ALTER FUNCTION public.is_admin_or_editor() SET search_path = '';
REVOKE ALL ON FUNCTION public.is_admin_or_editor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_editor() TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

DO $$
DECLARE
  table_name text;
  public_tables text[] := ARRAY[
    'hero_canvas','about_vision','nav_socials','services_offered',
    'pricing_packages','faq_modules','studio_team','editorial_blogs','testimonials'
  ];
BEGIN
  FOREACH table_name IN ARRAY public_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public can read content" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "CMS users can read content" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "CMS users can insert content" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "CMS users can update content" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "CMS users can delete content" ON public.%I', table_name);
    EXECUTE format('CREATE POLICY "Public can read content" ON public.%I FOR SELECT TO anon USING (true)', table_name);
    EXECUTE format('CREATE POLICY "CMS users can read content" ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_editor())', table_name);
    EXECUTE format('CREATE POLICY "CMS users can insert content" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor())', table_name);
    EXECUTE format('CREATE POLICY "CMS users can update content" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor())', table_name);
    EXECUTE format('CREATE POLICY "CMS users can delete content" ON public.%I FOR DELETE TO authenticated USING (public.is_admin_or_editor())', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public can view published exhibitions" ON public.exhibition_art;
DROP POLICY IF EXISTS "CMS users can view all exhibitions" ON public.exhibition_art;
DROP POLICY IF EXISTS "CMS users can insert exhibitions" ON public.exhibition_art;
DROP POLICY IF EXISTS "CMS users can update exhibitions" ON public.exhibition_art;
DROP POLICY IF EXISTS "CMS users can delete exhibitions" ON public.exhibition_art;
CREATE POLICY "Public can view published exhibitions" ON public.exhibition_art FOR SELECT TO anon USING (published IS TRUE);
CREATE POLICY "CMS users can view all exhibitions" ON public.exhibition_art FOR SELECT TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "CMS users can insert exhibitions" ON public.exhibition_art FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can update exhibitions" ON public.exhibition_art FOR UPDATE TO authenticated USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can delete exhibitions" ON public.exhibition_art FOR DELETE TO authenticated USING (public.is_admin_or_editor());

DROP POLICY IF EXISTS "Public can view portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "CMS users can view portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "CMS users can insert portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "CMS users can update portfolio" ON public.portfolio;
DROP POLICY IF EXISTS "CMS users can delete portfolio" ON public.portfolio;
CREATE POLICY "Public can view portfolio" ON public.portfolio FOR SELECT TO anon USING (true);
CREATE POLICY "CMS users can view portfolio" ON public.portfolio FOR SELECT TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "CMS users can insert portfolio" ON public.portfolio FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can update portfolio" ON public.portfolio FOR UPDATE TO authenticated USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can delete portfolio" ON public.portfolio FOR DELETE TO authenticated USING (public.is_admin_or_editor());

DROP POLICY IF EXISTS "CMS users can read settings" ON public.website_settings;
DROP POLICY IF EXISTS "CMS users can insert settings" ON public.website_settings;
DROP POLICY IF EXISTS "CMS users can update settings" ON public.website_settings;
DROP POLICY IF EXISTS "CMS users can delete settings" ON public.website_settings;
CREATE POLICY "CMS users can read settings" ON public.website_settings FOR SELECT TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "CMS users can insert settings" ON public.website_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can update settings" ON public.website_settings FOR UPDATE TO authenticated USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can delete settings" ON public.website_settings FOR DELETE TO authenticated USING (public.is_admin_or_editor());

DROP POLICY IF EXISTS "Authenticated users can view media" ON public.media_vault;
DROP POLICY IF EXISTS "Authenticated users can insert media" ON public.media_vault;
DROP POLICY IF EXISTS "Authenticated users can update media" ON public.media_vault;
DROP POLICY IF EXISTS "Authenticated users can delete media" ON public.media_vault;
CREATE POLICY "CMS users can view media" ON public.media_vault FOR SELECT TO authenticated USING (public.is_admin_or_editor());
CREATE POLICY "CMS users can insert media" ON public.media_vault FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can update media" ON public.media_vault FOR UPDATE TO authenticated USING (public.is_admin_or_editor()) WITH CHECK (public.is_admin_or_editor());
CREATE POLICY "CMS users can delete media" ON public.media_vault FOR DELETE TO authenticated USING (public.is_admin_or_editor());

DROP POLICY IF EXISTS "Admin full control on objects" ON storage.objects;
DROP POLICY IF EXISTS "Public select on branding" ON storage.objects;
DROP POLICY IF EXISTS "Public select on exhibition-art" ON storage.objects;
DROP POLICY IF EXISTS "Public select on hero-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public select on team" ON storage.objects;
CREATE POLICY "CMS users can view media objects" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('media-vault','exhibition-art','hero-assets','team','branding') AND public.is_admin_or_editor());
CREATE POLICY "CMS users can upload media objects" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('media-vault','exhibition-art','hero-assets','team','branding') AND public.is_admin_or_editor());
CREATE POLICY "CMS users can update media objects" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('media-vault','exhibition-art','hero-assets','team','branding') AND public.is_admin_or_editor())
  WITH CHECK (bucket_id IN ('media-vault','exhibition-art','hero-assets','team','branding') AND public.is_admin_or_editor());
CREATE POLICY "CMS users can delete media objects" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('media-vault','exhibition-art','hero-assets','team','branding') AND public.is_admin_or_editor());
