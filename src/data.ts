import { PortfolioItem, Service, PricingPlan, Testimonial } from './types';

export const PORTFOLIO_ITEMS: PortfolioItem[] = [];

export const SERVICES: Service[] = [
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
];

export const PRICING_PLANS: PricingPlan[] = [
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
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    name: 'Dr. Osasere Imasuen',
    role: 'AAU Faculty Member',
    location: 'Ekpoma',
    quote: 'Verified Photography did my academic portraits. The lighting and posture guidance were masterclass. The emerald background glow matched perfectly with my gown. Highly recommend to everyone in Esan land!',
    rating: 5
  },
  {
    id: 'test-2',
    name: 'Mrs. Cynthia Alao',
    role: 'Bride',
    location: 'Uromi',
    quote: 'Our traditional wedding was a flurry of cultural events, and they caught every single glance, smile, and tear. The photobook is of incredible museum quality. They truly captured stories beyond the lens.',
    rating: 5
  },
  {
    id: 'test-3',
    name: 'Efe Eromosele',
    role: 'Fashion Model',
    location: 'Auchi',
    quote: 'The outdoor session in the Auchi hills felt like a high-fashion shoot in Milan. The photographer has an incredible eye for natural lines, sunset lighting, and creative art direction.',
    rating: 5
  }
];
