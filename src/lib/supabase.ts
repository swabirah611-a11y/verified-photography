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
  // Always log locally to ensure consistency
  const localBookings = JSON.parse(localStorage.getItem('verified_photography_bookings') || '[]');
  
  // Check for duplicate submission (same name, date, and category)
  const isDuplicate = localBookings.some((b: Booking) => 
    b.name.trim().toLowerCase() === booking.name.trim().toLowerCase() && 
    b.date === booking.date && 
    b.category.trim().toLowerCase() === booking.category.trim().toLowerCase()
  );

  if (isDuplicate) {
    return { success: false, error: 'A booking for this name, date, and category has already been submitted.' };
  }

  localBookings.unshift(booking);
  localStorage.setItem('verified_photography_bookings', JSON.stringify(localBookings));

  if (supabase) {
    try {
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
        console.warn('Supabase insert failed, using localStorage fallback:', error.message);
        // Do not fail the call since it was written to localStorage
      }
    } catch (err: any) {
      console.warn('Supabase communication error, using localStorage fallback:', err.message);
    }
  }

  // Dispatch event to update other active elements
  window.dispatchEvent(new Event('bookings_updated'));
  return { success: true };
}

/**
 * Retrieves all bookings.
 * Attempts to fetch from Supabase if configured, falling back to localStorage.
 */
export async function getBookings(): Promise<Booking[]> {
  const localBookings = JSON.parse(localStorage.getItem('verified_photography_bookings') || '[]');

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch failed, returning localStorage cache:', error.message);
        return localBookings;
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

        localStorage.setItem('verified_photography_bookings', JSON.stringify(mapped));
        return mapped;
      }
    } catch (err: any) {
      console.warn('Supabase fetch connection error, returning localStorage cache:', err.message);
    }
  }

  return localBookings;
}

/**
 * Deletes a booking by ID.
 */
export async function deleteBooking(id: string): Promise<void> {
  const localBookings = JSON.parse(localStorage.getItem('verified_photography_bookings') || '[]');
  const filtered = localBookings.filter((b: Booking) => b.id !== id);
  localStorage.setItem('verified_photography_bookings', JSON.stringify(filtered));

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

/**
 * Retrieves the unified CMS configuration, checking Supabase first and falling back to localStorage and default.
 */
export async function getCmsConfig(): Promise<CmsConfig> {
  const localConfig = localStorage.getItem('verified_cms_config');
  let config = DEFAULT_CMS_CONFIG;
  if (localConfig) {
    try {
      config = JSON.parse(localConfig);
    } catch {}
  } else {
    localStorage.setItem('verified_cms_config', JSON.stringify(DEFAULT_CMS_CONFIG));
  }

  if (supabase) {
    try {
      // 1. Fetch from website_settings table (stores entire CmsConfig JSON)
      const { data: wsData, error: wsError } = await supabase
        .from('website_settings')
        .select('id, settings')
        .limit(1)
        .maybeSingle();

      if (!wsError && wsData && wsData.settings) {
        localStorage.setItem('verified_website_settings_row_id', wsData.id);
        const parsedSettings = typeof wsData.settings === 'string'
          ? JSON.parse(wsData.settings)
          : wsData.settings;

        const mergedConfig = {
          ...DEFAULT_CMS_CONFIG,
          ...parsedSettings,
          theme: { ...DEFAULT_CMS_CONFIG.theme, ...(parsedSettings.theme || {}) },
          hero: { ...DEFAULT_CMS_CONFIG.hero, ...(parsedSettings.hero || {}) },
          navigation: { ...DEFAULT_CMS_CONFIG.navigation, ...(parsedSettings.navigation || {}) },
          about: { ...DEFAULT_CMS_CONFIG.about, ...(parsedSettings.about || {}) },
          footer: { ...DEFAULT_CMS_CONFIG.footer, ...(parsedSettings.footer || {}) },
          seo: { ...DEFAULT_CMS_CONFIG.seo, ...(parsedSettings.seo || {}) },
          advanced: { ...DEFAULT_CMS_CONFIG.advanced, ...(parsedSettings.advanced || {}) }
        };

        localStorage.setItem('verified_cms_config', JSON.stringify(mergedConfig));
        return mergedConfig as CmsConfig;
      } else if (!wsData && !wsError) {
        await supabase
          .from('website_settings')
          .insert([{ settings: config }]);
      }
    } catch (err: any) {
      console.warn('website_settings fetch failed, falling back:', err.message);
    }

    try {
      const { data, error } = await supabase
        .from('cms_config')
        .select('id, site_name, logo, favicon, primary_color, secondary_color, accent_color, hero_title, hero_subtitle, about_text, footer_text, contact_email, phone, whatsapp, address, maintenance_mode')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Supabase cms_config fetch notice:', error.message);
      } else if (data) {
        localStorage.setItem('verified_cms_config_row_id', data.id);
        const mappedConfig = mapDbToCmsConfig(data, config);
        localStorage.setItem('verified_cms_config', JSON.stringify(mappedConfig));
        return mappedConfig;
      } else {
        console.log('Inserting default cms_config row (auto UUID)...');
        const dbRow = mapCmsConfigToDb(config);
        const { data: insertData, error: insertError } = await supabase
          .from('cms_config')
          .insert([dbRow])
          .select('id')
          .single();
        if (!insertError && insertData) {
          localStorage.setItem('verified_cms_config_row_id', insertData.id);
        } else if (insertError) {
          console.warn('Fallback: cms_config insert failed:', insertError.message);
        }
      }
    } catch (err: any) {
      console.warn('Supabase cms_config exception:', err.message);
    }
  }

  return config;
}

/**
 * Saves the unified CMS configuration, uploading to Supabase if configured, otherwise saving to localStorage.
 */
export async function saveCmsConfig(config: CmsConfig): Promise<boolean> {
  localStorage.setItem('verified_cms_config', JSON.stringify(config));
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
    } catch (err: any) {
      console.warn('website_settings save failed, continuing to legacy cms_config:', err.message);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Unauthorized: Session required for saving configuration.');
        return false;
      }

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
        const { error: updateError } = await supabase
          .from('cms_config')
          .update(dbRow)
          .eq('id', rowId);

        if (updateError) {
          console.warn('Supabase cms_config update failed, attempting insert fallback:', updateError.message);
          const { data: insertData, error: insertError } = await supabase
            .from('cms_config')
            .insert([dbRow])
            .select('id')
            .single();
          if (!insertError && insertData) {
            localStorage.setItem('verified_cms_config_row_id', insertData.id);
          }
        }
      } else {
        console.log('Inserting brand new cms_config row during save...');
        const { data: insertData, error: insertError } = await supabase
          .from('cms_config')
          .insert([dbRow])
          .select('id')
          .single();

        if (insertError) {
          console.warn('Supabase cms_config insert failed:', insertError.message);
          return false;
        } else if (insertData) {
          localStorage.setItem('verified_cms_config_row_id', insertData.id);
        }
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase cms_config exception during save:', err.message);
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
  const localPortfolio = JSON.parse(localStorage.getItem('verified_portfolio_items') || '[]');

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase portfolio fetch failed, returning cache:', error.message);
        return localPortfolio;
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

        localStorage.setItem('verified_portfolio_items', JSON.stringify(mapped));
        return mapped;
      }
    } catch (err: any) {
      console.warn('Supabase connection error fetching portfolio, returning cache:', err.message);
    }
  }

  return localPortfolio;
}

export async function savePortfolioItem(item: PortfolioItem): Promise<boolean> {
  // Update local cache
  const localPortfolio = JSON.parse(localStorage.getItem('verified_portfolio_items') || '[]');
  const index = localPortfolio.findIndex((p: any) => p.id === item.id);
  if (index >= 0) {
    localPortfolio[index] = item;
  } else {
    localPortfolio.unshift(item);
  }
  localStorage.setItem('verified_portfolio_items', JSON.stringify(localPortfolio));
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
  return true;
}

export async function deletePortfolioItem(id: string): Promise<boolean> {
  const localPortfolio = JSON.parse(localStorage.getItem('verified_portfolio_items') || '[]');
  const filtered = localPortfolio.filter((p: any) => p.id !== id);
  localStorage.setItem('verified_portfolio_items', JSON.stringify(filtered));
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
  return true;
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
  const localExhibitions = JSON.parse(localStorage.getItem('verified_exhibitions') || '[]');

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('exhibition_art')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase exhibition_art fetch failed:', error.message);
        return localExhibitions;
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

        localStorage.setItem('verified_exhibitions', JSON.stringify(mapped));
        return mapped;
      }
    } catch (err: any) {
      console.warn('Supabase connection error fetching exhibitions, returning cache:', err.message);
    }
  }

  return localExhibitions;
}

export async function saveExhibition(exhibition: Exhibition): Promise<boolean> {
  const localExhibitions = JSON.parse(localStorage.getItem('verified_exhibitions') || '[]');
  const index = localExhibitions.findIndex((e: any) => e.id === exhibition.id);
  if (index >= 0) {
    localExhibitions[index] = exhibition;
  } else {
    localExhibitions.unshift(exhibition);
  }
  localStorage.setItem('verified_exhibitions', JSON.stringify(localExhibitions));
  window.dispatchEvent(new Event('exhibitions_updated'));

  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Unauthorized: Session required for exhibitions writes.');
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

      if (isNew) {
        const { error } = await supabase.from('exhibition_art').insert([dbRow]);
        if (error) {
          console.error('Supabase exhibition insert failed:', error.message);
          return false;
        }
      } else {
        const { error } = await supabase.from('exhibition_art').update(dbRow).eq('id', exhibition.id);
        if (error) {
          console.error('Supabase exhibition update failed:', error.message);
          return false;
        }
      }
      return true;
    } catch (err: any) {
      console.error('Supabase exhibition save exception:', err.message);
      return false;
    }
  }
  return true;
}

export async function deleteExhibition(id: string): Promise<boolean> {
  const localExhibitions = JSON.parse(localStorage.getItem('verified_exhibitions') || '[]');
  const filtered = localExhibitions.filter((e: any) => e.id !== id);
  localStorage.setItem('verified_exhibitions', JSON.stringify(filtered));
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
      return true;
    } catch (err: any) {
      console.error('Supabase exhibition delete exception:', err.message);
      return false;
    }
  }
  return true;
}
