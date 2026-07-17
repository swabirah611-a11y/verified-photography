export interface PortfolioItem {
  id: string;
  title: string;
  category: 'Weddings' | 'Portraits' | 'Graduations' | 'Events' | 'Commercial';
  location: string;
  image: string;
  description: string;
  date: string;
  cameraSetup?: string;
}

export interface Service {
  id: string;
  title: string;
  iconName: string;
  description: string;
  pricingRange: string;
  features: string[];
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
  features: string[];
  popular: boolean;
  category: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  rating: number;
}
