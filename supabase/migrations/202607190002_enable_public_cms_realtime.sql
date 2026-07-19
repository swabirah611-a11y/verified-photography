-- Public-facing CMS records can be refreshed immediately in connected clients.
-- Sensitive tables such as bookings and profiles are intentionally excluded.
alter publication supabase_realtime add table
  public.exhibition_art,
  public.hero_canvas,
  public.about_vision,
  public.services_offered,
  public.pricing_packages,
  public.faq_modules,
  public.studio_team,
  public.editorial_blogs,
  public.testimonials,
  public.nav_socials;
