import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Safely attempt to initialize the Supabase client.
// To prevent startup crashes on missing keys, we handle null/undefined check gracefully.
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: {
    email: string;
    role: string;
  };
}

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  location: string;
  planName: string;
  date: string;
  time: string;
  budget: string;
  hours: string;
  notes: string;
  timestamp: string;
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return new Date().toISOString().split('T')[0];
}

function normalizeTime(timeStr: string): string {
  if (!timeStr) return '12:00:00';
  const matches = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (matches) {
    const hours = matches[1].padStart(2, '0');
    const minutes = matches[2];
    return `${hours}:${minutes}:00`;
  }
  return '12:00:00';
}

function parseOrGenerateUuid(idStr: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idStr)) {
    return idStr;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function formatNotes(booking: Booking): string {
  return `Notes:\n${booking.notes || ''}\n\nBudget: ${booking.budget || 'Custom Budget'}\nHours: ${booking.hours || 'Custom Hours'}`;
}

function parseBudgetFromNotes(notes: string): string {
  if (!notes) return 'Custom Budget';
  const match = notes.match(/Budget:\s*(.*)$/m);
  return match ? match[1].trim() : 'Custom Budget';
}

function parseHoursFromNotes(notes: string): string {
  if (!notes) return 'Custom Hours';
  const match = notes.match(/Hours:\s*(.*)$/m);
  return match ? match[1].trim() : 'Custom Hours';
}

function parseNotesFromNotes(notes: string): string {
  if (!notes) return '';
  const match = notes.match(/^Notes:\s*([\s\S]*?)(?=\n\nBudget:|$)/i);
  return match ? match[1].trim() : notes;
}

/**
 * Saves a new booking proposal.
 * Attempts to insert into Supabase if configured, otherwise logs to local storage.
 */
export async function saveBooking(booking: Booking): Promise<{ success: boolean; error?: string }> {
  if (supabase) {
    try {
      // Direct insert into Supabase
      const { error } = await supabase
        .from('bookings')
        .insert([{
          id: parseOrGenerateUuid(booking.id),
          client_name: booking.name,
          email: booking.email,
          phone: booking.phone,
          service: booking.planName || 'Classic Session',
          event_type: booking.category || 'Portraits',
          event_date: normalizeDate(booking.date),
          event_time: normalizeTime(booking.time),
          location: booking.location,
          notes: formatNotes(booking),
          booking_status: 'pending',
          payment_status: 'unpaid'
        }]);

      if (error) {
        console.warn('Supabase insert failed:', error.message);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.warn('Supabase communication error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Dispatch event to update other active elements
  window.dispatchEvent(new Event('bookings_updated'));
  return { success: true };
}

/**
 * Retrieves all bookings.
 * Attempts to fetch from Supabase if configured.
 */
export async function getBookings(): Promise<Booking[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch failed:', error.message);
        return [];
      }

      if (data && data.length > 0) {
        // Map DB fields back to Booking interface
        const mapped: Booking[] = data.map((b: any) => ({
          id: b.id,
          name: b.client_name || '',
          email: b.email || '',
          phone: b.phone || '',
          category: b.event_type || 'Portraits',
          location: b.location || 'Ekpoma',
          planName: b.service || 'Classic Session',
          date: b.event_date || '',
          time: b.event_time || '',
          budget: parseBudgetFromNotes(b.notes),
          hours: parseHoursFromNotes(b.notes),
          notes: parseNotesFromNotes(b.notes),
          timestamp: b.created_at || b.timestamp || ''
        }));

        return mapped;
      }
    } catch (err: any) {
      console.warn('Supabase fetch connection error:', err.message);
    }
  }

  return [];
}

/**
 * Deletes a booking by ID.
 */
export async function deleteBooking(id: string): Promise<void> {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('Unauthorized: Session required for deleting bookings.');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      try {
        await supabase.from('bookings').delete().eq('id', id);
      } catch (err: any) {
        console.warn('Supabase delete failed:', err.message);
      }
    }
  }

  window.dispatchEvent(new Event('bookings_updated'));
}

/**
 * Handles authentication for the hidden admin system using pure Supabase Authentication.
 */
export async function signInAdmin(email: string, password: string): Promise<AuthResponse> {
  console.log("[Auth Step] Login Attempt Initiated", { email });

  // Log the login attempt as requested
  const logs = JSON.parse(localStorage.getItem('verified_admin_logs') || '[]');
  logs.unshift({
    timestamp: new Date().toISOString(),
    email,
    status: 'ATTEMPT',
    ip: '127.0.0.1',
    userAgent: navigator.userAgent,
    method: 'SUPABASE'
  });
  localStorage.setItem('verified_admin_logs', JSON.stringify(logs.slice(0, 100)));

  if (!supabase) {
    updateLastLogStatus('FAILED');
    return { success: false, error: 'Supabase client is not initialized. Real Supabase Authentication is required.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[Auth Step] Supabase authentication failed:", error.message);
      updateLastLogStatus('FAILED');
      return { success: false, error: error.message };
    }

    if (!data.user) {
      updateLastLogStatus('FAILED');
      return { success: false, error: 'Authentication succeeded, but no user was returned.' };
    }

    let role = 'admin'; // Default fallback role

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Auto-create database profile with 'admin' role if not exists
          await supabase
            .from('profiles')
            .insert([{ id: data.user.id, email: data.user.email, role: 'admin' }]);
        }
      } else if (profile && profile.role) {
        role = profile.role;
      }
    } catch (profileCatchError: any) {
      console.warn("Profile check exception:", profileCatchError.message);
    }

    if (role !== 'admin') {
      updateLastLogStatus('FAILED');
      return { success: false, error: 'Unauthorized: Admin role is required.' };
    }

    updateLastLogStatus('SUCCESS');
    
    return {
      success: true,
      user: {
        email: data.user.email || email,
        role: 'admin',
      },
    };
  } catch (err: any) {
    updateLastLogStatus('ERROR');
    return { success: false, error: err.message || 'An unexpected authentication error occurred.' };
  }
}

/**
 * Updates the last recorded log with its eventual success/failure status.
 */
function updateLastLogStatus(status: 'SUCCESS' | 'FAILED' | 'ERROR') {
  const logs = JSON.parse(localStorage.getItem('verified_admin_logs') || '[]');
  if (logs.length > 0) {
    logs[0].status = status;
    localStorage.setItem('verified_admin_logs', JSON.stringify(logs));
  }
}

/**
 * Logs out the administrator using official Supabase signOut.
 */
export async function signOutAdmin(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Retrieves the currently active administrator session from Supabase.
 */
export async function getAdminSession(): Promise<{ email: string; role: string } | null> {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      return {
        email: session.user.email || '',
        role: 'admin'
      };
    }
  } catch (err) {
    console.error('Error fetching admin session from Supabase:', err);
  }
  return null;
}

export interface CmsConfig {
  hero: {
    businessName: string;
    mainHeading: string;
    subheading: string;
    description: string;
    bgImage: string;
    videoUrl: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
    locations: string[];
  };
  navigation: {
    logoText: string;
    logoSubtext: string;
    sticky: boolean;
    socialLinks: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
      whatsapp?: string;
    };
  };
  about: {
    title: string;
    heading: string;
    headingHighlight: string;
    description: string;
    experienceYears: number;
    founderName: string;
    founderRole: string;
    founderPhoto: string;
    founderQuote: string;
    stats: Array<{ label: string; value: number; suffix: string }>;
    timeline: Array<{ title: string; desc: string }>;
    features: Array<{ title: string; desc: string; iconName: string }>;
    galleryFrames?: Array<{ title: string; image: string; fallbackImage: string; xOffset: number; yOffset: number; rotate: number; depth: number; borderColor: string; zIndex: number }>;
  };
  services: Array<{
    id: string;
    title: string;
    iconName: string;
    description: string;
    pricingRange: string;
    features: string[];
  }>;
  pricing: {
    packages: Array<{
      id: string;
      name: string;
      price: string;
      duration: string;
      description: string;
      features: string[];
      popular: boolean;
      category: string;
      visible?: boolean;
    }>;
  };
  testimonials: Array<{
    id: string;
    name: string;
    role: string;
    location: string;
    quote: string;
    rating: number;
    approved?: boolean;
    featured?: boolean;
  }>;
  faq: Array<{
    id: string;
    question: string;
    answer: string;
    order: number;
  }>;
  team: Array<{
    id: string;
    name: string;
    role: string;
    photo: string;
    bio: string;
    socialLinks?: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
    };
  }>;
  blogs?: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    featuredImage: string;
    date: string;
    author: string;
    seoTitle?: string;
    seoDescription?: string;
  }>;
  footer: {
    logoText: string;
    copyright: string;
    address: string;
    phone: string;
    email: string;
    aboutText: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: string;
    glassEffect: boolean;
    cursorEffect: boolean;
    pageTransitions: boolean;
    floatingEffects: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
  advanced: {
    maintenanceMode: boolean;
    googleAnalyticsId: string;
    emailNotifications: string;
    whatsappPhone: string;
    sectionsOrder?: string[];
    sectionsVisibility?: Record<string, boolean>;
    sectionsDraftState?: Record<string, boolean>;
    sectionData?: Record<string, any>;
    versions?: Array<{
      id: string;
      timestamp: string;
      note: string;
      configSnapshot: any;
    }>;
  };
  pages?: Array<{
    id: string;
    name: string;
    slug: string;
    seoTitle?: string;
    seoDescription?: string;
    visible: boolean;
    sectionsOrder?: string[];
  }>;
  customSections?: Record<string, {
    title: string;
    heading: string;
    description: string;
    bgImage?: string;
    ctaText?: string;
    ctaLink?: string;
    alignment?: 'left' | 'center' | 'right';
    themeMode?: 'light' | 'dark' | 'ambient';
  }>;
}

export const DEFAULT_CMS_CONFIG: CmsConfig = {
  hero: {
    businessName: 'VERIFIED PHOTOGRAPHY',
    mainHeading: 'Capturing Stories',
    subheading: 'Beyond the Lens',
    description: 'Professional photography that transforms moments into timeless memories. Weddings, portraits, graduations, birthdays, events, and commercial photography with creativity, precision, and passion.',
    bgImage: '/src/assets/images/nigerian_traditional_wedding_1784211187352.jpg',
    videoUrl: '',
    ctaText: 'Book a Session',
    ctaLink: 'contact',
    secondaryCtaText: 'Explore Portfolio',
    secondaryCtaLink: 'portfolio',
    locations: ['Uromi', 'Ekpoma', 'Auchi']
  },
  navigation: {
    logoText: 'VERIFIED',
    logoSubtext: 'PHOTOGRAPHY',
    sticky: true,
    socialLinks: {
      instagram: 'https://instagram.com/verifiedphotography',
      facebook: 'https://facebook.com/verifiedphotography',
      whatsapp: 'https://wa.me/2349054657734',
      twitter: 'https://twitter.com/verifiedphoto'
    }
  },
  about: {
    title: 'Who We Are',
    heading: 'Every Frame Tells a',
    headingHighlight: 'Story',
    description: 'At VERIFIED PHOTOGRAPHY, we believe every smile, celebration, and milestone deserves to be preserved with creativity and authenticity. We don\'t simply take pictures, we capture emotions, stories, and memories that last a lifetime.',
    founderName: 'Alhassan "Verified" Bello',
    founderRole: 'Creative Director & Lead Photographer',
    founderPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    founderQuote: 'Visual storytelling isn\'t about the expensive camera; it\'s about knowing when the heart of a moment beats.',
    experienceYears: 6,
    stats: [
      { value: 500, suffix: '+', label: 'Happy Clients' },
      { value: 1200, suffix: '+', label: 'Projects Completed' },
      { value: 6, suffix: '+', label: 'Years of Experience' },
      { value: 100, suffix: '%', label: 'Client Satisfaction' }
    ],
    timeline: [
      { title: 'Consultation', desc: 'Understanding your unique story, goals, and ideal visual vibes.' },
      { title: 'Planning', desc: 'Selecting pristine backdrops, coordinating wardrobes, and crafting moodboards.' },
      { title: 'Photoshoot', desc: 'High-concept execution with state-of-the-art cinematic lighting rigs.' },
      { title: 'Professional Editing', desc: 'Custom color science, micro-retouching, and meticulous grading.' },
      { title: 'Delivery', desc: 'Secure, breathtaking private digital gallery vault & custom legacy frames.' }
    ],
    features: [
      { title: 'Professional Photography', desc: 'Creative storytelling through every photograph.', iconName: 'Camera' },
      { title: 'Professional Editing', desc: 'High-end color grading and cinematic retouching.', iconName: 'Palette' },
      { title: 'Fast Delivery', desc: 'Timely delivery without compromising quality.', iconName: 'Zap' },
      { title: 'Client Satisfaction', desc: 'Every client receives a personalized photography experience.', iconName: 'Heart' }
    ]
  },
  services: [
    {
      id: 'ser-1',
      title: 'Weddings & Cultural Nuptials',
      iconName: 'Heart',
      description: 'Exquisite, full-scale documentation of your traditional and white weddings, focusing on rich emotions, colors, and key milestones.',
      pricingRange: 'From ₦250,000',
      features: ['Multi-day coverage', '2 professional photographers', 'UHD Cinematic Video highlights', 'Premium photobook & online gallery']
    },
    {
      id: 'ser-2',
      title: 'Professional Portraits & Editorial',
      iconName: 'User',
      description: 'Individually crafted studio or outdoor portraits for creatives, models, and executives seeking to elevate their professional and artistic brands.',
      pricingRange: 'From ₦50,000',
      features: ['Professional retoucher included', 'High-end lighting set', 'Multiple outfit changes', 'Digital and print deliverable formats']
    },
    {
      id: 'ser-3',
      title: 'Graduation & Scholar Shoots',
      iconName: 'GraduationCap',
      description: 'Confident and proud academic portraits commemorating your milestone achievements, especially tailored for scholars in Ekpoma, Uromi, and Auchi.',
      pricingRange: 'From ₦40,000',
      features: ['Academic gowns/caps available', 'Creative pose direction', 'Framed print included', 'High-res digital deliverables']
    },
    {
      id: 'ser-4',
      title: 'Corporate Events & Anniversaries',
      iconName: 'Calendar',
      description: 'Comprehensive, high-fidelity event photography that captures the natural interactions, ambiance, and prestigious atmosphere of your milestones.',
      pricingRange: 'From ₦150,000',
      features: ['Same-day preview selection', 'Full candid documentation', 'Custom watermark option', 'Optimized assets for social media']
    },
    {
      id: 'ser-5',
      title: 'Product & Commercial Campaigns',
      iconName: 'Camera',
      description: 'High-concept commercial product shoot designs focusing on detailing, rich texture, and visual storytelling that boosts brand conversions.',
      pricingRange: 'From ₦120,000',
      features: ['Studio macro setups', 'Interactive 360 photography option', 'Commercial rights included', 'Professional color-grading']
    }
  ],
  pricing: {
    packages: [
      {
        id: 'price-1',
        name: 'Classic Session',
        price: '₦45,000',
        duration: '1.5 Hours',
        category: 'Portraits & Graduations',
        description: 'Perfect for single scholars, individual portraits, or standard professional headshots.',
        features: [
          '1.5 hours of dedicated shoot time',
          '1 location (Studio or Outdoor in Ekpoma/Uromi)',
          '10 fine-art fully retouched high-res images',
          '20+ polished color-graded digital proofs',
          '1 elegant wood-framed 8x10 print',
          'Delivery in 5-7 business days'
        ],
        popular: false
      },
      {
        id: 'price-2',
        name: 'Deluxe Celebration',
        price: '₦180,000',
        duration: '4 Hours',
        category: 'Events & Birthdays',
        description: 'Comprehensive coverage for premium birthday parties, family anniversaries, and elite events.',
        features: [
          'Up to 4 hours of active coverage',
          '1 principal photographer + assistant',
          '30 fully retouched high-res photographs',
          'All raw/unedited proof images in digital gallery',
          '1 premium 12x16 wood-framed portrait print',
          'Highlight video clip optimized for socials (9:16)',
          'Delivery in 4 business days'
        ],
        popular: true
      },
      {
        id: 'price-3',
        name: 'Royal Heritage',
        price: '₦350,000',
        duration: 'Full Day',
        category: 'Weddings',
        description: 'The ultimate coverage package for your royal, traditional, and white wedding celebrations.',
        features: [
          'Full-day coverage (Traditional and Reception)',
          '2 principal photographers + 1 cinematic videographer',
          '50 fine-art signature retouched portraits',
          'Premium leather-bound 12x12 digital photobook',
          'Two 16x20 majestic canvas prints',
          'UHD video highlights (3-5 mins cinematic cut)',
          'Expedited 48-hour preview teaser gallery'
        ],
        popular: false
      }
    ]
  },
  testimonials: [
    {
      id: 'test-1',
      name: 'Dr. Osasere Imasuen',
      role: 'AAU Faculty Member',
      location: 'Ekpoma',
      quote: 'Verified Photography did my academic portraits. The lighting and posture guidance were masterclass. The emerald background glow matched perfectly with my gown. Highly recommend to everyone in Esan land!',
      rating: 5,
      approved: true,
      featured: true
    },
    {
      id: 'test-2',
      name: 'Mrs. Cynthia Alao',
      role: 'Bride',
      location: 'Uromi',
      quote: 'Our traditional wedding was a flurry of cultural events, and they caught every single glance, smile, and tear. The photobook is of incredible museum quality. They truly captured stories beyond the lens.',
      rating: 5,
      approved: true,
      featured: true
    },
    {
      id: 'test-3',
      name: 'Efe Eromosele',
      role: 'Fashion Model',
      location: 'Auchi',
      quote: 'The outdoor session in the Auchi hills felt like a high-fashion shoot in Milan. The photographer has an incredible eye for natural lines, sunset lighting, and creative art direction.',
      rating: 5,
      approved: true,
      featured: true
    }
  ],
  faq: [
    { id: 'faq-1', question: 'Do you travel outside Ekpoma, Uromi, and Auchi?', answer: 'Yes! We primarily serve the Esan and Etsako regions, but we are fully mobile and available to travel nationwide for weddings and special events.', order: 1 },
    { id: 'faq-2', question: 'How long does it take to deliver final photos?', answer: 'Our standard delivery is 5 to 7 business days. For express packages or wedding teasers, we can provide a preview gallery within 48 hours!', order: 2 },
    { id: 'faq-3', question: 'Do we get access to the unedited raw files?', answer: 'Yes, depending on your selected plan. Our Deluxe and Royal Heritage plans include full access to the digital proof galleries so you can browse all raw moments.', order: 3 },
    { id: 'faq-4', question: 'How can I secure my photoshoot date?', answer: 'You can reserve your slot directly through our booking portal. A 50% commitment fee is required to fully lock in your custom session date.', order: 4 }
  ],
  team: [
    { id: 'team-1', name: 'Alhassan "Verified" Bello', role: 'Lead Photographer & Founder', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800', bio: 'With over 6 years of professional visual experience, Alhassan specializes in high-concept cultural wedding coverage and editorial portraiture.', socialLinks: { instagram: '#' } },
    { id: 'team-2', name: 'Esther Okojie', role: 'Chief Creative Editor', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800', bio: 'Esther heads the post-production department, crafting beautiful custom color profiles, skin retouches, and fine-art layouts.', socialLinks: { instagram: '#' } }
  ],
  blogs: [
    {
      id: 'blog-1',
      title: 'Mastering Traditional Wedding Color Grading',
      content: 'Traditional weddings in Nigeria are a vibrant canvas of colors, fabrics, and jewelry. To capture the true essence, we employ customized color grading techniques. Our creative focus is to enhance the rich golds, deep reds, and vibrant greens without losing natural skin tones.',
      category: 'Weddings',
      tags: ['Color Science', 'Nuptials', 'Retouching'],
      featuredImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
      date: '2026-06-15',
      author: 'Alhassan Bello',
      seoTitle: 'Mastering Traditional Wedding Color Grading | Verified Photo',
      seoDescription: 'Discover our premium tips for grading Nigerian traditional weddings.'
    },
    {
      id: 'blog-2',
      title: 'Lighting Techniques for High-Fashion Outdoor Shoots',
      content: 'Shooting under the midday sun in Auchi Hills can be a photographer\'s nightmare. In this article, we explain our dynamic range strategies, including high-speed sync flash, custom scrim diffusers, and matching key light levels to the majestic sky background.',
      category: 'Commercial',
      tags: ['Lighting', 'Outdoor', 'Gear'],
      featuredImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800',
      date: '2026-07-02',
      author: 'Esther Okojie',
      seoTitle: 'Outdoor Fashion Shoots & Lighting Guide | Verified Photo',
      seoDescription: 'Learn how to utilize artificial lighting to conquer challenging outdoor situations.'
    }
  ],
  footer: {
    logoText: 'VERIFIED',
    copyright: '© 2026 VERIFIED PHOTOGRAPHY. All rights reserved.',
    address: '12 Academic Road, Ekpoma, Edo State, Nigeria',
    phone: '+234 905 465 7734',
    email: 'book@verifiedphotography.com.ng',
    aboutText: 'Professional photography studio based in Edo State, specialized in capturing timeless stories, heritage, and genuine emotions.'
  },
  theme: {
    primaryColor: '#071A14',
    secondaryColor: '#10261F',
    accentColor: '#2EC4B6',
    backgroundColor: '#071A14',
    textColor: '#F8FFF9',
    borderRadius: '12px',
    glassEffect: true,
    cursorEffect: true,
    pageTransitions: true,
    floatingEffects: true
  },
  seo: {
    title: 'VERIFIED PHOTOGRAPHY | Premium Storytelling & Visual Heritage',
    description: 'Professional photography in Ekpoma, Uromi, and Auchi. Capturing traditional weddings, graduations, birthdays, and high-fashion corporate portfolios.',
    keywords: 'verified photography, photography in ekpoma, uromi weddings, auchi hills fashion, nigerian traditional wedding photographer',
    ogImage: '/src/assets/images/nigerian_traditional_wedding_1784211187352.jpg'
  },
  advanced: {
    maintenanceMode: false,
    googleAnalyticsId: 'G-XXXXXXXXXX',
    emailNotifications: 'book@verifiedphotography.com.ng',
    whatsappPhone: '+2349054657734'
  }
};

function mapDbToCmsConfig(dbRow: any, defaultCms: CmsConfig): CmsConfig {
  const config = JSON.parse(JSON.stringify(defaultCms)); // Deep clone
  
  if (dbRow.site_name) {
    config.navigation.logoText = dbRow.site_name;
    config.footer.logoText = dbRow.site_name;
    config.seo.title = dbRow.site_name + ' | Premium Storytelling & Visual Heritage';
  }
  if (dbRow.primary_color) config.theme.primaryColor = dbRow.primary_color;
  if (dbRow.secondary_color) config.theme.secondaryColor = dbRow.secondary_color;
  if (dbRow.accent_color) config.theme.accentColor = dbRow.accent_color;
  if (dbRow.hero_title) config.hero.mainHeading = dbRow.hero_title;
  if (dbRow.hero_subtitle) config.hero.subheading = dbRow.hero_subtitle;
  if (dbRow.about_text) config.about.description = dbRow.about_text;
  if (dbRow.footer_text) config.footer.copyright = dbRow.footer_text;
  
  if (dbRow.contact_email) {
    config.footer.email = dbRow.contact_email;
    config.advanced.emailNotifications = dbRow.contact_email;
  }
  if (dbRow.phone) config.footer.phone = dbRow.phone;
  if (dbRow.whatsapp) {
    config.advanced.whatsappPhone = dbRow.whatsapp;
    if (config.navigation.socialLinks) {
      config.navigation.socialLinks.whatsapp = dbRow.whatsapp;
    }
  }
  if (dbRow.address) config.footer.address = dbRow.address;
  if (dbRow.maintenance_mode !== undefined && dbRow.maintenance_mode !== null) {
    config.advanced.maintenanceMode = !!dbRow.maintenance_mode;
  }
  return config;
}

function mapCmsConfigToDb(config: CmsConfig): any {
  return {
    site_name: config.navigation?.logoText || config.seo?.title || 'VERIFIED PHOTOGRAPHY',
    logo: config.navigation?.logoText || '',
    favicon: '',
    primary_color: config.theme?.primaryColor || '#071A14',
    secondary_color: config.theme?.secondaryColor || '#10261F',
    accent_color: config.theme?.accentColor || '#2EC4B6',
    hero_title: config.hero?.mainHeading || '',
    hero_subtitle: config.hero?.subheading || '',
    about_text: config.about?.description || '',
    footer_text: config.footer?.copyright || '',
    contact_email: config.footer?.email || config.advanced?.emailNotifications || '',
    phone: config.footer?.phone || '',
    whatsapp: config.advanced?.whatsappPhone || (config.navigation?.socialLinks && config.navigation.socialLinks.whatsapp) || '',
    address: config.footer?.address || '',
    maintenance_mode: !!config.advanced?.maintenanceMode
  };
}

export async function getHeroCanvas(): Promise<any> {
  const emptyHero = {
    businessName: '',
    mainHeading: '',
    subheading: '',
    description: '',
    bgImage: '',
    videoUrl: '',
    ctaText: '',
    ctaLink: '',
    secondaryCtaText: '',
    secondaryCtaLink: '',
    locations: []
  };
  if (!supabase) return emptyHero;
  try {
    const { data, error } = await supabase.from('hero_canvas').select('*').limit(1).maybeSingle();
    if (data) {
      const anims = data.animations || {};
      return {
        businessName: anims.businessName || '',
        mainHeading: data.hero_title || '',
        subheading: data.hero_subtitle || '',
        description: data.call_to_action || '',
        bgImage: data.background_image || '',
        videoUrl: data.background_video || '',
        ctaText: data.primary_button?.text || '',
        ctaLink: data.primary_button?.link || '',
        secondaryCtaText: data.secondary_button?.text || '',
        secondaryCtaLink: data.secondary_button?.link || '',
        locations: anims.locations || []
      };
    }
  } catch (err) {
    console.warn('getHeroCanvas failed:', err);
  }
  return emptyHero;
}

export async function getAboutVision(): Promise<any> {
  const emptyAbout = {
    title: '',
    heading: '',
    headingHighlight: '',
    description: '',
    experienceYears: 0,
    founderName: '',
    founderRole: '',
    founderPhoto: '',
    founderQuote: '',
    stats: [],
    timeline: [],
    features: [],
    galleryFrames: []
  };

  if (!supabase) return emptyAbout;
  try {
    const { data, error } = await supabase.from('about_vision').select('*').limit(1).maybeSingle();
    if (data) {
      let title = '';
      let heading = '';
      let headingHighlight = '';
      try {
        if (data.mission) {
          const m = typeof data.mission === 'string' ? JSON.parse(data.mission) : data.mission;
          title = m.title || '';
          heading = m.heading || '';
          headingHighlight = m.headingHighlight || '';
        }
      } catch {}

      let founderName = '';
      let founderRole = '';
      let founderQuote = '';
      try {
        if (data.vision) {
          const v = typeof data.vision === 'string' ? JSON.parse(data.vision) : data.vision;
          founderName = v.founderName || '';
          founderRole = v.founderRole || '';
          founderQuote = v.founderQuote || '';
        }
      } catch {}

      let stats = [];
      try {
        if (data.achievements && data.achievements.length > 0) {
          stats = data.achievements.map((itemStr: any) => {
            return typeof itemStr === 'string' ? JSON.parse(itemStr) : itemStr;
          });
        }
      } catch {}

      let timeline = [];
      let features = [];
      let galleryFrames = [];
      try {
        if (data.studio_images && data.studio_images.length > 0) {
          const extra = typeof data.studio_images[0] === 'string' ? JSON.parse(data.studio_images[0]) : data.studio_images[0];
          timeline = extra.timeline || [];
          features = extra.features || [];
          galleryFrames = extra.galleryFrames || [];
        }
      } catch {}

      return {
        title,
        heading,
        headingHighlight,
        description: data.biography || '',
        experienceYears: data.experience || 0,
        founderName,
        founderRole,
        founderPhoto: data.profile_image || '',
        founderQuote,
        stats,
        timeline,
        features,
        galleryFrames
      };
    }
  } catch (err) {
    console.warn('getAboutVision failed:', err);
  }
  return emptyAbout;
}

export async function getServicesOffered(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('services_offered')
      .select('*')
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      return data.map((item: any) => {
        let features: string[] = [];
        let cover_image = item.cover_image || '';
        try {
          if (cover_image.startsWith('{')) {
            const parsed = JSON.parse(cover_image);
            cover_image = parsed.image || '';
            features = parsed.features || [];
          }
        } catch {}

        return {
          id: item.id,
          title: item.service_name || '',
          iconName: item.icon || 'Camera',
          description: item.description || '',
          pricingRange: `From ₦${Number(item.pricing || 0).toLocaleString()}`,
          features: features.length > 0 ? features : []
        };
      });
    }
  } catch (err) {
    console.warn('getServicesOffered failed:', err);
  }
  return [];
}

export async function getPricingPackages(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        name: item.package_name || '',
        price: `₦${Number(item.price || 0).toLocaleString()}`,
        duration: item.duration || '',
        description: item.description || '',
        features: item.features || [],
        popular: !!item.popular,
        category: 'Portraits & Weddings'
      }));
    }
  } catch (err) {
    console.warn('getPricingPackages failed:', err);
  }
  return [];
}

export async function getFaqModules(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('faq_modules')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        question: item.question || '',
        answer: item.answer || '',
        order: item.display_order || 0
      }));
    }
  } catch (err) {
    console.warn('getFaqModules failed:', err);
  }
  return [];
}

export async function getStudioTeam(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('studio_team')
      .select('*')
      .order('display_order', { ascending: true });

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        name: item.full_name || '',
        role: item.role || '',
        photo: item.profile_photo || '',
        bio: item.biography || '',
        socialLinks: item.social_links || {}
      }));
    }
  } catch (err) {
    console.warn('getStudioTeam failed:', err);
  }
  return [];
}

export async function getEditorialBlogs(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('editorial_blogs')
      .select('*')
      .order('published_at', { ascending: false });

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        content: item.content || '',
        category: item.category || '',
        tags: item.tags || [],
        featuredImage: item.featured_image || '',
        date: (item.published_at || item.created_at || '').split('T')[0] || '',
        author: item.author || '',
        seoTitle: item.seo_title || '',
        seoDescription: item.seo_description || ''
      }));
    }
  } catch (err) {
    console.warn('getEditorialBlogs failed:', err);
  }
  return [];
}

export async function getTestimonials(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        name: item.name || '',
        role: item.role || '',
        location: '',
        quote: item.content || '',
        rating: item.rating || 5,
        approved: true,
        featured: true
      }));
    }
  } catch (err) {
    console.warn('getTestimonials failed:', err);
  }
  return [];
}

export async function getNavSocials(): Promise<any> {
  const emptyNav = {
    logoText: '',
    logoSubtext: '',
    socialLinks: {
      instagram: '',
      facebook: '',
      twitter: '',
      whatsapp: ''
    },
    phone: '',
    email: ''
  };
  if (!supabase) return emptyNav;
  try {
    const { data, error } = await supabase.from('nav_socials').select('*').limit(1).maybeSingle();
    if (data) {
      const parts = (data.logo || '').split('|');
      return {
        logoText: parts[0] || '',
        logoSubtext: parts[1] || '',
        socialLinks: {
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          twitter: data.x || '',
          whatsapp: data.whatsapp || ''
        },
        phone: data.phone || '',
        email: data.email || ''
      };
    }
  } catch (err) {
    console.warn('getNavSocials failed:', err);
  }
  return emptyNav;
}

/**
 * Retrieves the unified CMS configuration, checking Supabase first and falling back to localStorage and default.
 */
export async function getCmsConfig(): Promise<CmsConfig> {
  const emptyConfig: CmsConfig = {
    hero: {
      businessName: '',
      mainHeading: '',
      subheading: '',
      description: '',
      bgImage: '',
      videoUrl: '',
      ctaText: '',
      ctaLink: '',
      secondaryCtaText: '',
      secondaryCtaLink: '',
      locations: []
    },
    navigation: {
      logoText: '',
      logoSubtext: '',
      sticky: true,
      socialLinks: {
        instagram: '',
        facebook: '',
        twitter: '',
        whatsapp: ''
      }
    },
    about: {
      title: '',
      heading: '',
      headingHighlight: '',
      description: '',
      founderName: '',
      founderRole: '',
      founderPhoto: '',
      founderQuote: '',
      experienceYears: 0,
      stats: [],
      timeline: [],
      features: [],
      galleryFrames: []
    },
    services: [],
    pricing: {
      packages: []
    },
    faq: [],
    team: [],
    blogs: [],
    testimonials: [],
    footer: {
      logoText: '',
      phone: '',
      email: '',
      aboutText: '',
      address: '',
      copyright: ''
    },
    theme: {
      primaryColor: '#2EC4B6',
      secondaryColor: '#FF9F1C',
      accentColor: '#E71D36',
      backgroundColor: '#011627',
      textColor: '#FDFFFC',
      borderRadius: '8px',
      glassEffect: true,
      cursorEffect: false,
      pageTransitions: true,
      floatingEffects: true
    },
    seo: {
      title: '',
      description: '',
      keywords: '',
      ogImage: ''
    },
    advanced: {
      maintenanceMode: false,
      googleAnalyticsId: '',
      emailNotifications: '',
      whatsappPhone: ''
    }
  };

  if (supabase) {
    try {
      const [
        hero,
        about,
        services,
        pricingPackages,
        faqs,
        team,
        blogs,
        testimonials,
        navSocials
      ] = await Promise.all([
        getHeroCanvas(),
        getAboutVision(),
        getServicesOffered(),
        getPricingPackages(),
        getFaqModules(),
        getStudioTeam(),
        getEditorialBlogs(),
        getTestimonials(),
        getNavSocials()
      ]);

      const composedConfig: CmsConfig = {
        hero: hero || emptyConfig.hero,
        about: about || emptyConfig.about,
        services: services || [],
        pricing: {
          packages: pricingPackages || []
        },
        faq: faqs || [],
        team: team || [],
        blogs: blogs || [],
        testimonials: testimonials || [],
        navigation: {
          logoText: navSocials?.logoText || '',
          logoSubtext: navSocials?.logoSubtext || '',
          sticky: true,
          socialLinks: navSocials?.socialLinks || emptyConfig.navigation.socialLinks
        },
        footer: {
          logoText: navSocials?.logoText || '',
          phone: navSocials?.phone || '',
          email: navSocials?.email || '',
          aboutText: about?.description || '',
          address: '',
          copyright: navSocials?.logoText ? `© ${new Date().getFullYear()} ${navSocials.logoText.toUpperCase()}. All rights reserved.` : ''
        },
        theme: emptyConfig.theme,
        seo: emptyConfig.seo,
        advanced: emptyConfig.advanced
      };

      return composedConfig;
    } catch (err: any) {
      console.warn('Composing cms_config from tables failed, returning empty:', err.message);
    }
  }

  return emptyConfig;
}

/**
 * Saves the unified CMS configuration, uploading to Supabase if configured.
 */
export async function saveCmsConfig(config: CmsConfig): Promise<boolean> {
  window.dispatchEvent(new Event('cms_config_updated'));

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Unauthorized: Session required for saving configuration.');
        return false;
      }

      // 1. Save full JSON to website_settings
      let wsRowId = localStorage.getItem('verified_website_settings_row_id');
      if (!wsRowId) {
        const { data: existing, error: wsFetchErr } = await supabase
          .from('website_settings')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (!wsFetchErr && existing) {
          wsRowId = existing.id;
          localStorage.setItem('verified_website_settings_row_id', existing.id);
        }
      }

      if (wsRowId) {
        await supabase
          .from('website_settings')
          .update({ settings: config })
          .eq('id', wsRowId);
      } else {
        const { data: wsInserted, error: wsInsertErr } = await supabase
          .from('website_settings')
          .insert([{ settings: config }])
          .select('id')
          .single();
        if (!wsInsertErr && wsInserted) {
          localStorage.setItem('verified_website_settings_row_id', wsInserted.id);
        }
      }

      // 2. Save to cms_config table
      let rowId = localStorage.getItem('verified_cms_config_row_id');
      if (!rowId) {
        const { data: existing, error: fetchErr } = await supabase
          .from('cms_config')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (!fetchErr && existing) {
          rowId = existing.id;
          localStorage.setItem('verified_cms_config_row_id', existing.id);
        }
      }
      const dbRow = mapCmsConfigToDb(config);
      if (rowId) {
        await supabase.from('cms_config').update(dbRow).eq('id', rowId);
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('cms_config')
          .insert([dbRow])
          .select('id')
          .single();
        if (!insertError && insertData) {
          localStorage.setItem('verified_cms_config_row_id', insertData.id);
        }
      }

      // 3. Save to individual tables
      const heroRow = {
        hero_title: config.hero?.mainHeading || '',
        hero_subtitle: config.hero?.subheading || '',
        background_image: config.hero?.bgImage || '',
        background_video: config.hero?.videoUrl || '',
        call_to_action: config.hero?.description || '',
        primary_button: { text: config.hero?.ctaText || 'Book a Session', link: config.hero?.ctaLink || 'contact' },
        secondary_button: { text: config.hero?.secondaryCtaText || 'Explore Portfolio', link: config.hero?.secondaryCtaLink || 'portfolio' },
        animations: { entrance: "fade-up", speed: "slow", businessName: config.hero?.businessName, locations: config.hero?.locations }
      };
      const { data: heroExist } = await supabase.from('hero_canvas').select('id').limit(1).maybeSingle();
      if (heroExist) {
        await supabase.from('hero_canvas').update(heroRow).eq('id', heroExist.id);
      } else {
        await supabase.from('hero_canvas').insert([heroRow]);
      }

      const defaultGalleryFrames = [
        { title: 'Wedding Photography', image: '/src/assets/images/nigerian_traditional_wedding_1784211187352.jpg', fallbackImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800', xOffset: -120, yOffset: -100, rotate: -8, depth: 1.4, borderColor: 'border-[#2EC4B6]/20 hover:border-[#2EC4B6]/80', zIndex: 10 },
        { title: 'Portrait Photography', image: '/src/assets/images/fashion_editorial_auchi_1784211215673.jpg', fallbackImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800', xOffset: 140, yOffset: -140, rotate: 10, depth: 0.9, borderColor: 'border-[#34D399]/20 hover:border-[#34D399]/80', zIndex: 5 },
        { title: 'Graduation Photography', image: '/src/assets/images/graduation_portrait_ekpoma_1784211201712.jpg', fallbackImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800', xOffset: -150, yOffset: 110, rotate: 6, depth: 1.8, borderColor: 'border-[#6EE7B7]/20 hover:border-[#6EE7B7]/80', zIndex: 12 },
        { title: 'Birthday Photography', image: '/src/assets/images/event_celebration_uromi_1784211232313.jpg', fallbackImage: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800', xOffset: 150, yOffset: 90, rotate: -6, depth: 1.2, borderColor: 'border-[#10B981]/20 hover:border-[#10B981]/80', zIndex: 15 },
        { title: 'Event Photography', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800', fallbackImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800', xOffset: 0, yOffset: -20, rotate: 2, depth: 2.2, borderColor: 'border-[#2EC4B6]/30 hover:border-[#2EC4B6]/90', zIndex: 8 },
        { title: 'Commercial Photography', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800', fallbackImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800', xOffset: 10, yOffset: 180, rotate: -4, depth: 0.6, borderColor: 'border-[#059669]/20 hover:border-[#059669]/80', zIndex: 6 }
      ];
      const aboutRow = {
        biography: config.about?.description || '',
        experience: config.about?.experienceYears || 5,
        profile_image: config.about?.founderPhoto || '',
        mission: JSON.stringify({ title: config.about?.title, heading: config.about?.heading, headingHighlight: config.about?.headingHighlight }),
        vision: JSON.stringify({ founderName: config.about?.founderName, founderRole: config.about?.founderRole, founderQuote: config.about?.founderQuote }),
        achievements: (config.about?.stats || []).map(s => JSON.stringify(s)),
        studio_images: [JSON.stringify({ timeline: config.about?.timeline, features: config.about?.features, galleryFrames: config.about?.galleryFrames || defaultGalleryFrames })]
      };
      const { data: aboutExist } = await supabase.from('about_vision').select('id').limit(1).maybeSingle();
      if (aboutExist) {
        await supabase.from('about_vision').update(aboutRow).eq('id', aboutExist.id);
      } else {
        await supabase.from('about_vision').insert([aboutRow]);
      }

      const navRow = {
        logo: `${config.navigation?.logoText || 'VERIFIED'}|${config.navigation?.logoSubtext || 'PHOTOGRAPHY'}`,
        whatsapp: config.navigation?.socialLinks?.whatsapp || '',
        phone: config.footer?.phone || '',
        email: config.footer?.email || '',
        instagram: config.navigation?.socialLinks?.instagram || '',
        facebook: config.navigation?.socialLinks?.facebook || '',
        x: config.navigation?.socialLinks?.twitter || ''
      };
      const { data: navExist } = await supabase.from('nav_socials').select('id').limit(1).maybeSingle();
      if (navExist) {
        await supabase.from('nav_socials').update(navRow).eq('id', navExist.id);
      } else {
        await supabase.from('nav_socials').insert([navRow]);
      }

      await supabase.from('services_offered').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const serviceRows = (config.services || []).map((s, idx) => {
        const priceNum = Number((s.pricingRange || '').replace(/[^0-9]/g, '')) || 50000;
        return {
          service_name: s.title,
          description: s.description,
          icon: s.iconName,
          cover_image: JSON.stringify({ image: '', features: s.features }),
          pricing: priceNum,
          display_order: idx,
          featured: true
        };
      });
      if (serviceRows.length > 0) {
        await supabase.from('services_offered').insert(serviceRows);
      }

      await supabase.from('pricing_packages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const pricingRows = (config.pricing?.packages || []).map((p, idx) => {
        const priceNum = Number((p.price || '').replace(/[^0-9]/g, '')) || 45000;
        return {
          package_name: p.name,
          description: p.description,
          features: p.features,
          price: priceNum,
          duration: p.duration,
          popular: !!p.popular,
          display_order: idx
        };
      });
      if (pricingRows.length > 0) {
        await supabase.from('pricing_packages').insert(pricingRows);
      }

      await supabase.from('faq_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const faqRows = (config.faq || []).map((f, idx) => ({
        question: f.question,
        answer: f.answer,
        category: 'general',
        display_order: f.order || idx,
        active: true
      }));
      if (faqRows.length > 0) {
        await supabase.from('faq_modules').insert(faqRows);
      }

      await supabase.from('studio_team').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const teamRows = (config.team || []).map((t, idx) => ({
        full_name: t.name,
        role: t.role,
        biography: t.bio,
        profile_photo: t.photo,
        social_links: t.socialLinks || { instagram: '#' },
        display_order: idx
      }));
      if (teamRows.length > 0) {
        await supabase.from('studio_team').insert(teamRows);
      }

      await supabase.from('editorial_blogs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const blogRows = (config.blogs || []).map(b => ({
        title: b.title,
        slug: b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        excerpt: b.content.slice(0, 100),
        content: b.content,
        featured_image: b.featuredImage,
        author: b.author,
        category: b.category,
        tags: b.tags,
        read_time: 5,
        seo_title: b.seoTitle,
        seo_description: b.seoDescription
      }));
      if (blogRows.length > 0) {
        await supabase.from('editorial_blogs').insert(blogRows);
      }

      await supabase.from('testimonials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const testimonialRows = (config.testimonials || []).map(t => ({
        name: t.name,
        role: t.role,
        content: t.quote,
        rating: t.rating
      }));
      if (testimonialRows.length > 0) {
        await supabase.from('testimonials').insert(testimonialRows);
      }

      window.dispatchEvent(new Event('hero_updated'));
      window.dispatchEvent(new Event('about_updated'));
      window.dispatchEvent(new Event('services_updated'));
      window.dispatchEvent(new Event('pricing_updated'));
      window.dispatchEvent(new Event('faq_updated'));
      window.dispatchEvent(new Event('team_updated'));
      window.dispatchEvent(new Event('blogs_updated'));
      window.dispatchEvent(new Event('testimonials_updated'));
      window.dispatchEvent(new Event('navigation_updated'));

      return true;
    } catch (err: any) {
      console.warn('Supabase individual tables update exception:', err.message);
      return false;
    }
  }
  return true;
}

/**
 * PORTFOLIO DATABASE HELPERS (Offline-resilient)
 */
import { PortfolioItem } from '../types';

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase portfolio fetch failed:', error.message);
        return [];
      }

      if (data) {
        const mapped: PortfolioItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          category: item.category as any,
          location: item.location || 'Ekpoma',
          image: item.image_url,
          description: item.description || '',
          date: item.year || '2026',
          cameraSetup: item.camera_setup || 'Sony Custom G-Master'
        }));
        return mapped;
      }
    } catch (err: any) {
      console.warn('Supabase connection error fetching portfolio:', err.message);
    }
  }
  return [];
}

export async function savePortfolioItem(item: PortfolioItem): Promise<boolean> {
  window.dispatchEvent(new Event('portfolio_items_updated'));

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Unauthorized: Session required for portfolio writes.');
        return false;
      }

      const isNew = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
      
      const dbRow = {
        title: item.title,
        category: item.category,
        image_url: item.image,
        location: item.location,
        year: item.date,
        description: item.description,
        camera_setup: item.cameraSetup || 'Sony Custom G-Master'
      };

      if (isNew) {
        const { error } = await supabase.from('portfolio').insert([dbRow]);
        if (error) {
          console.error('Supabase portfolio insert failed:', error.message);
          return false;
        }
      } else {
        const { error } = await supabase.from('portfolio').update(dbRow).eq('id', item.id);
        if (error) {
          console.error('Supabase portfolio update failed:', error.message);
          return false;
        }
      }

      return true;
    } catch (err: any) {
      console.error('Supabase portfolio save exception:', err.message);
      return false;
    }
  }
  return false;
}

export async function deletePortfolioItem(id: string): Promise<boolean> {
  window.dispatchEvent(new Event('portfolio_items_updated'));

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Unauthorized: Session required for portfolio deletes.');
        return false;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        const { error } = await supabase.from('portfolio').delete().eq('id', id);
        if (error) {
          console.error('Supabase portfolio delete failed:', error.message);
          return false;
        }
      }
      return true;
    } catch (err: any) {
      console.error('Supabase portfolio delete exception:', err.message);
      return false;
    }
  }
  return false;
}

/**
 * EXHIBITIONS DATABASE HELPERS
 */
export interface Exhibition {
  id: string;
  title: string;
  category: 'Weddings' | 'Portraits' | 'Graduations' | 'Events' | 'Commercial';
  description: string;
  cover_image: string;
  gallery_images: string[];
  videos?: string[];
  tags?: string[];
  featured?: boolean;
  published?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export async function getExhibitions(): Promise<Exhibition[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('exhibition_art')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase exhibition_art fetch failed:', error.message);
        return [];
      }

      if (data) {
        const mapped: Exhibition[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          category: item.category as any,
          description: item.description || '',
          cover_image: item.cover_image,
          gallery_images: item.gallery_images || [],
          videos: item.videos || [],
          tags: item.tags || [],
          featured: !!item.featured,
          published: !!item.published,
          display_order: item.display_order || 0,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
        return mapped;
      }
    } catch (err: any) {
      console.warn('Supabase connection error fetching exhibitions:', err.message);
    }
  }
  return [];
}

export let lastExhibitionError: string | null = null;

export async function saveExhibition(exhibition: Exhibition): Promise<boolean> {
  window.dispatchEvent(new Event('exhibitions_updated'));
  lastExhibitionError = null;

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const errorMsg = 'Unauthorized: Session required for exhibitions writes.';
        console.warn(errorMsg);
        lastExhibitionError = errorMsg;
        return false;
      }

      const isNew = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exhibition.id);
      
      const dbRow = {
        title: exhibition.title,
        category: exhibition.category,
        description: exhibition.description,
        cover_image: exhibition.cover_image,
        gallery_images: exhibition.gallery_images,
        videos: exhibition.videos || [],
        tags: exhibition.tags || [],
        featured: !!exhibition.featured,
        published: !!exhibition.published,
        display_order: exhibition.display_order || 0
      };

      const payload = dbRow;

      if (isNew) {
        const { data, error } = await supabase.from('exhibition_art').insert([dbRow]).select();
        if (error) {
          console.error("Exhibition insert failed", {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            payload
          });
          lastExhibitionError = `Database insert failed [${error.code || 'UNKNOWN'}]: ${error.message}`;
          return false;
        }
        console.log("Successfully inserted exhibition_art record:", data);
      } else {
        const { data, error } = await supabase.from('exhibition_art').update(dbRow).eq('id', exhibition.id).select();
        if (error) {
          console.error("Exhibition update failed", {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            payload
          });
          lastExhibitionError = `Database update failed [${error.code || 'UNKNOWN'}]: ${error.message}`;
          return false;
        }
        console.log("Successfully updated exhibition_art record:", data);
      }

      // Sync via BroadcastChannel
      try {
        const channel = new BroadcastChannel('exhibitions_sync');
        channel.postMessage('refresh');
        channel.close();
      } catch (e) {}

      return true;
    } catch (err: any) {
      console.error('Supabase exhibition save exception:', err.message);
      return false;
    }
  }
  return false;
}

export async function deleteExhibition(id: string): Promise<boolean> {
  window.dispatchEvent(new Event('exhibitions_updated'));

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Unauthorized: Session required for exhibition deletes.');
        return false;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        const { error } = await supabase.from('exhibition_art').delete().eq('id', id);
        if (error) {
          console.error('Supabase exhibition delete failed:', error.message);
          return false;
        }
      }

      // Sync via BroadcastChannel
      try {
        const channel = new BroadcastChannel('exhibitions_sync');
        channel.postMessage('refresh');
        channel.close();
      } catch (e) {}

      return true;
    } catch (err: any) {
      console.error('Supabase exhibition delete exception:', err.message);
      return false;
    }
  }
  return false;
}

export async function deleteOrphanFile(url: string): Promise<boolean> {
  if (!supabase || !url) return false;
  try {
    // Check if the URL is used anywhere else in exhibition_art or portfolio
    const { count: exhCount } = await supabase
      .from('exhibition_art')
      .select('id', { count: 'exact', head: true })
      .or(`cover_image.eq.${url}`);
      
    const { count: portCount } = await supabase
      .from('portfolio')
      .select('id', { count: 'exact', head: true })
      .eq('image_url', url);

    if ((exhCount || 0) > 0 || (portCount || 0) > 0) {
      console.log('File is referenced elsewhere, skipping deletion:', url);
      return false;
    }

    // Parse storage path
    const marker = '/storage/v1/object/public/media-vault/';
    const index = url.indexOf(marker);
    if (index === -1) return false;
    const storagePath = decodeURIComponent(url.substring(index + marker.length));

    // Delete from Supabase Storage
    const { error: storageErr } = await supabase.storage.from('media-vault').remove([storagePath]);
    if (storageErr) {
      console.error('Failed to remove orphan file from storage:', storageErr.message);
    }

    // Delete from media_vault table
    const { error: dbErr } = await supabase.from('media_vault').delete().eq('url', url);
    if (dbErr) {
      console.error('Failed to remove orphan file database metadata:', dbErr.message);
    }

    return true;
  } catch (err: any) {
    console.error('Failed to delete orphan file:', err.message);
    return false;
  }
}

