import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  Sparkles, 
  Send, 
  Trash2, 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  AlertTriangle, 
  MessageSquare,
  ArrowRight,
  Inbox
} from 'lucide-react';
import { saveBooking, getBookings, Booking } from '../lib/supabase';

interface ContactSectionProps {
  prefilledCategory?: string;
  prefilledPlan?: string;
}

// Fixed mock fully booked dates in current and next month for simulation
const MOCK_BOOKED_DATES = [
  // Saturdays of this month/next month are popular and hardcoded as fully booked
  11, 18, 25
];

export default function ContactSection({ prefilledCategory = '', prefilledPlan = '' }: ContactSectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Portrait',
    date: '',
    time: '10:00 AM',
    location: 'Ekpoma',
    budget: '',
    hours: '4',
    notes: '',
    planName: 'Classic Session'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  
  // Custom interactive calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // Simulated email dispatch log states (live server animation)
  const [showEmailTerminal, setShowEmailTerminal] = useState(false);
  const [dispatchedEmails, setDispatchedEmails] = useState<any[]>([]);

  // Interactive map active node state
  const [activeMapNode, setActiveMapNode] = useState<'ekpoma' | 'uromi' | 'auchi'>('ekpoma');

  // Handle category and plan changes passed down
  useEffect(() => {
    if (prefilledCategory || prefilledPlan) {
      setFormData(prev => ({
        ...prev,
        category: prefilledCategory || prev.category,
        planName: prefilledPlan || prev.planName
      }));
      
      const el = document.getElementById('booking-portal-form');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [prefilledCategory, prefilledPlan]);

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const selectedDateObj = new Date(year, month, day);
    if (selectedDateObj < today) return; // Prevent past dates
    
    // Check if it is a simulated fully booked day (Saturdays in current calendar view)
    const dayOfWeek = selectedDateObj.getDay();
    const isMockBooked = MOCK_BOOKED_DATES.includes(day) && (dayOfWeek === 6);
    if (isMockBooked) return;

    setSelectedCalendarDate(selectedDateObj);
    const formattedDate = selectedDateObj.toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: formattedDate }));
    
    // Clear validation error if any
    if (validationErrors.date) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy.date;
        return copy;
      });
    }
  };

  // Live client-side validations
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      errors.name = 'Full name must be at least 3 characters.';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    
    // Nigeria phone standard validation or standard international length
    const phoneClean = formData.phone.replace(/[^0-9+]/g, '');
    if (phoneClean.length < 10 || phoneClean.length > 15) {
      errors.phone = 'Phone number must be between 10 and 15 digits.';
    }
    
    if (!formData.date) {
      errors.date = 'Please pick a scheduled date from our interactive calendar.';
    }

    if (!formData.time) {
      errors.time = 'Please select a preferred shoot hour.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const bookingPayload: Booking = {
      id: 'book-' + Date.now(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      category: formData.category,
      location: formData.location,
      planName: formData.planName,
      date: formData.date,
      time: formData.time,
      budget: formData.budget || 'Custom Budget',
      hours: formData.hours,
      notes: formData.notes || 'No special requirements specified.',
      timestamp: new Date().toISOString()
    };

    // Latency delay to feel professional & cinematic
    await new Promise(resolve => setTimeout(resolve, 1400));

    const result = await saveBooking(bookingPayload);

    setIsSubmitting(false);

    if (!result.success) {
      setDuplicateError(result.error || 'Duplicate submission detected.');
      return;
    }

    // Trigger local simulation of customer + admin email alerts
    triggerEmailSimulation(bookingPayload);
    setIsSubmitted(true);
  };

  const triggerEmailSimulation = (booking: Booking) => {
    const customerEmail = {
      id: 'email-cust-' + Date.now(),
      to: booking.email,
      from: 'studio@verifiedphotography.com.ng',
      subject: '✅ Booking Proposal Received - Verified Photography',
      body: `Hello ${booking.name},\n\nWe have received your photography booking request for: \n📅 Date: ${booking.date} at ${booking.time}\n📸 Service Focus: ${booking.category}\n📍 Capture Hub: ${booking.location}\n⏱️ Duration: ${booking.hours} hours\n\nOur client relations administrator is verifying our studio slots and will call your phone (${booking.phone}) within 2 hours to confirm your schedule.\n\nThank you for choosing Verified Photography!\nEdo State, Nigeria.`
    };

    const adminEmail = {
      id: 'email-admin-' + Date.now(),
      to: 'admin@verifiedphotography.com',
      from: 'noreply@verifiedphotography.com.ng',
      subject: `🚨 ALERT: New Booking Request by ${booking.name}`,
      body: `Administrator Notice:\n\nName: ${booking.name}\nEmail: ${booking.email}\nPhone: ${booking.phone}\nDate: ${booking.date} @ ${booking.time}\nLocation: ${booking.location}\nCategory: ${booking.category}\nBudget: ${booking.budget || 'Standard Package pricing'}\nDuration: ${booking.hours} hours\nNotes: ${booking.notes}\n\nThis record has been written securely to your Supabase cloud backend and is accessible in your Admin Control Dashboard.`
    };

    setDispatchedEmails([customerEmail, adminEmail]);
    setShowEmailTerminal(true);
  };

  const handleResetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      category: 'Portrait',
      date: '',
      time: '10:00 AM',
      location: 'Ekpoma',
      budget: '',
      hours: '4',
      notes: '',
      planName: 'Classic Session'
    });
    setSelectedCalendarDate(null);
    setIsSubmitted(false);
    setDuplicateError(null);
    setValidationErrors({});
  };

  const mapNodeData = {
    ekpoma: {
      name: "Ekpoma Main Hub",
      sub: "AAU University District (Primary Capture Zone)",
      crews: "Verified Prime Crew (3 Photographers active)",
      fee: "₦0 (Zero Travel Surcharges)",
      coords: "Serving AAU Gate, College Rd, Town Planning, and environs."
    },
    uromi: {
      name: "Uromi Executive Hub",
      sub: "Esan North-East District (Aesthetic/Outdoor Experts)",
      crews: "Verified Legacy Crew (2 Outdoor specialist units)",
      fee: "₦0 (Zero Travel Surcharges)",
      coords: "Serving Royal Market Rd, Mission Rd, and custom scenic clearings."
    },
    auchi: {
      name: "Auchi Scenic Office",
      sub: "Etsako West District (Hills & Brutalist Architecture)",
      crews: "Verified Aerial & Landscape Crew",
      fee: "₦0 (Zero Travel Surcharges)",
      coords: "Serving Poly Hill, Jattu Road, scenic viewpoints, and cliffs."
    }
  };

  return (
    <section id="contact" className="relative py-24 md:py-32 bg-[#030c09] overflow-hidden">
      {/* Cinematic Spotlights */}
      <div className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-[#2EC4B6]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#6EE7B7]/4 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ================= SECTION HEADER ================= */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs font-mono tracking-widest text-[#2EC4B6] uppercase font-semibold">05 // RESERVATION PORTAL</span>
            <div className="h-px w-6 bg-[#2EC4B6]/50" />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-space font-bold text-white mb-4">
            Book Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7]">Photography Session</span>
          </h2>

          <p className="text-xs md:text-sm text-[#A7C4B8] max-w-xl mx-auto leading-relaxed">
            Let's capture your special moments. Tell us about your event, and we'll get back to you promptly. Pick available dates dynamically on our live calendar.
          </p>
        </div>

        {/* ================= FOUR AMINATED GLASS CARDS ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16 md:mb-24">
          {/* Card 1: Call */}
          <motion.a
            href="tel:+2349054657734"
            className="p-5 md:p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] hover:border-[#2EC4B6]/20 relative group overflow-hidden flex flex-col justify-between h-36 transition-all"
            whileHover={{ y: -6 }}
            id="contact-card-call"
          >
            <div className="absolute inset-0 bg-[#2EC4B6]/1 blur-[20px] rounded-full translate-y-12 group-hover:translate-y-0 transition-transform duration-500" />
            <div className="w-10 h-10 rounded-xl bg-[#2EC4B6]/10 flex items-center justify-center border border-[#2EC4B6]/20 text-[#2EC4B6] group-hover:shadow-[0_0_15px_rgba(46,196,182,0.3)] transition-all">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#A7C4B8] uppercase tracking-wider mb-0.5">📞 Call Studio</div>
              <div className="text-xs md:text-sm font-space font-bold text-white group-hover:text-[#2EC4B6] transition-colors">0905 465 7734</div>
            </div>
          </motion.a>

          {/* Card 2: WhatsApp */}
          <motion.a
            href="https://wa.me/2349054657734?text=Hello%20VERIFIED%20PHOTOGRAPHY%2C%20I'd%20like%20to%20book%20a%20photography%20session."
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 md:p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] hover:border-[#2EC4B6]/20 relative group overflow-hidden flex flex-col justify-between h-36 transition-all"
            whileHover={{ y: -6 }}
            id="contact-card-whatsapp"
          >
            <div className="absolute inset-0 bg-[#25D366]/1 blur-[20px] rounded-full translate-y-12 group-hover:translate-y-0 transition-transform duration-500" />
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20 text-[#25D366] group-hover:shadow-[0_0_15px_rgba(37,211,102,0.3)] transition-all">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#A7C4B8] uppercase tracking-wider mb-0.5">💬 WhatsApp</div>
              <div className="text-xs md:text-sm font-space font-bold text-white group-hover:text-[#25D366] transition-colors">Start Live Chat</div>
            </div>
          </motion.a>

          {/* Card 3: Service Areas */}
          <motion.button
            onClick={() => {
              const mapSection = document.getElementById('coverage-map-element');
              if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="p-5 md:p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] hover:border-[#2EC4B6]/20 relative group overflow-hidden flex flex-col justify-between h-36 text-left transition-all cursor-pointer"
            whileHover={{ y: -6 }}
            id="contact-card-areas"
          >
            <div className="absolute inset-0 bg-[#2EC4B6]/1 blur-[20px] rounded-full translate-y-12 group-hover:translate-y-0 transition-transform duration-500" />
            <div className="w-10 h-10 rounded-xl bg-[#2EC4B6]/10 flex items-center justify-center border border-[#2EC4B6]/20 text-[#2EC4B6] group-hover:shadow-[0_0_15px_rgba(46,196,182,0.3)] transition-all">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#A7C4B8] uppercase tracking-wider mb-0.5">📍 Service Areas</div>
              <div className="text-xs md:text-sm font-space font-bold text-white group-hover:text-[#2EC4B6] transition-colors">Uromi • Ekpoma • Auchi</div>
            </div>
          </motion.button>

          {/* Card 4: Email */}
          <motion.a
            href="mailto:book@verifiedphotography.com.ng"
            className="p-5 md:p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] hover:border-[#2EC4B6]/20 relative group overflow-hidden flex flex-col justify-between h-36 transition-all"
            whileHover={{ y: -6 }}
            id="contact-card-email"
          >
            <div className="absolute inset-0 bg-[#2EC4B6]/1 blur-[20px] rounded-full translate-y-12 group-hover:translate-y-0 transition-transform duration-500" />
            <div className="w-10 h-10 rounded-xl bg-[#2EC4B6]/10 flex items-center justify-center border border-[#2EC4B6]/20 text-[#2EC4B6] group-hover:shadow-[0_0_15px_rgba(46,196,182,0.3)] transition-all">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#A7C4B8] uppercase tracking-wider mb-0.5">📧 Email</div>
              <div className="text-xs md:text-sm font-space font-bold text-white group-hover:text-[#2EC4B6] transition-colors">book@verifiedphotography</div>
            </div>
          </motion.a>
        </div>

        {/* ================= MAP & FORM CONTENT ROW ================= */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          
          {/* LEFT PANEL: INTERACTIVE COVERAGE MAP */}
          <div className="lg:col-span-5 space-y-8" id="coverage-map-element">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 box-glow">
              <h3 className="text-lg font-space font-bold text-white mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2EC4B6]" /> Regional Coverage Area
              </h3>
              <p className="text-xs text-[#A7C4B8] leading-relaxed mb-6">
                Verified Photography operates dynamically across core Edo hubs. Hover over our operational locations on the regional map below to review on-duty crews and transit guidelines.
              </p>

              {/* Custom SVG Vector Map Coverages */}
              <div className="relative w-full aspect-square max-w-[340px] mx-auto bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
                {/* Visual compass markings */}
                <div className="absolute top-3 left-3 text-[8px] font-mono text-white/20 select-none">EDO STATE REGION VECTOR GRID</div>
                <div className="absolute bottom-3 right-3 text-[8px] font-mono text-[#2EC4B6]/40 select-none">100% SERVICE COVERAGE</div>

                {/* Grid Background */}
                <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <rect width="20" height="20" fill="none" />
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Coverage zones vector mapping */}
                <svg viewBox="0 0 300 300" className="w-full h-full p-4 relative z-10">
                  {/* Connecting Paths (Road routes) */}
                  <motion.path
                    d="M 150 150 L 170 210"
                    stroke="rgba(46,196,182,0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    fill="none"
                    animate={{ strokeDashoffset: [0, -20] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  />
                  <motion.path
                    d="M 150 150 L 110 80"
                    stroke="rgba(46,196,182,0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    fill="none"
                    animate={{ strokeDashoffset: [0, 20] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  />

                  {/* Pulsing coverage circles */}
                  {/* Ekpoma Circle */}
                  <circle cx="150" cy="150" r="45" fill="rgba(46,196,182,0.03)" stroke="rgba(46,196,182,0.15)" strokeWidth="1" />
                  <circle cx="150" cy="150" r="2" fill="#2EC4B6" />
                  <motion.circle
                    cx="150"
                    cy="150"
                    r="45"
                    stroke="#2EC4B6"
                    strokeWidth="0.5"
                    fill="none"
                    initial={{ scale: 0.2, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                  />

                  {/* Uromi Circle */}
                  <circle cx="170" cy="210" r="35" fill="rgba(110,231,183,0.03)" stroke="rgba(110,231,183,0.15)" strokeWidth="1" />
                  <circle cx="170" cy="210" r="2" fill="#6EE7B7" />
                  <motion.circle
                    cx="170"
                    cy="210"
                    r="35"
                    stroke="#6EE7B7"
                    strokeWidth="0.5"
                    fill="none"
                    initial={{ scale: 0.2, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: 0.8, ease: "easeOut" }}
                  />

                  {/* Auchi Circle */}
                  <circle cx="110" cy="80" r="40" fill="rgba(46,196,182,0.03)" stroke="rgba(46,196,182,0.15)" strokeWidth="1" />
                  <circle cx="110" cy="80" r="2" fill="#2EC4B6" />
                  <motion.circle
                    cx="110"
                    cy="80"
                    r="40"
                    stroke="#2EC4B6"
                    strokeWidth="0.5"
                    fill="none"
                    initial={{ scale: 0.2, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2.5, delay: 1.6, ease: "easeOut" }}
                  />

                  {/* Interactive node labels */}
                  {/* Ekpoma node */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setActiveMapNode('ekpoma')}
                  >
                    <rect x="110" y="125" width="80" height="18" rx="4" fill={activeMapNode === 'ekpoma' ? '#2EC4B6' : '#071A14'} stroke="#2EC4B6" strokeWidth="0.5" className="transition-all duration-300" />
                    <text x="150" y="137" fill={activeMapNode === 'ekpoma' ? '#071A14' : '#F8FFF9'} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                      📍 EKPOMA HUB
                    </text>
                  </g>

                  {/* Uromi node */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setActiveMapNode('uromi')}
                  >
                    <rect x="130" y="222" width="80" height="18" rx="4" fill={activeMapNode === 'uromi' ? '#6EE7B7' : '#071A14'} stroke="#6EE7B7" strokeWidth="0.5" className="transition-all duration-300" />
                    <text x="170" y="234" fill={activeMapNode === 'uromi' ? '#071A14' : '#F8FFF9'} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                      📍 UROMI HUB
                    </text>
                  </g>

                  {/* Auchi node */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setActiveMapNode('auchi')}
                  >
                    <rect x="70" y="48" width="80" height="18" rx="4" fill={activeMapNode === 'auchi' ? '#2EC4B6' : '#071A14'} stroke="#2EC4B6" strokeWidth="0.5" className="transition-all duration-300" />
                    <text x="110" y="60" fill={activeMapNode === 'auchi' ? '#071A14' : '#F8FFF9'} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                      📍 AUCHI HUB
                    </text>
                  </g>
                </svg>
              </div>

              {/* Dynamic Map Node Inspector Card */}
              <div className="mt-6 p-4 rounded-xl bg-[#04100c] border border-white/5 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-[#2EC4B6] tracking-wider font-bold">
                    Coverage Hub Information
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#6EE7B7] animate-ping" />
                </div>
                <h4 className="font-space font-bold text-sm text-white mb-1">
                  {mapNodeData[activeMapNode].name}
                </h4>
                <p className="text-[11px] text-[#A7C4B8] mb-3 leading-relaxed">
                  {mapNodeData[activeMapNode].sub}
                </p>
                <div className="space-y-1.5 pt-2 border-t border-white/5 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Crews on Ground:</span>
                    <span className="text-white font-bold">{mapNodeData[activeMapNode].crews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">Client Travel Fee:</span>
                    <span className="text-[#6EE7B7] font-bold">{mapNodeData[activeMapNode].fee}</span>
                  </div>
                  <div className="text-[9px] text-[#A7C4B8]/70 italic mt-2 leading-relaxed">
                    ⚙️ Coordinates: {mapNodeData[activeMapNode].coords}
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE CONSOLE DISPATCH (Emails dispatched display panel) */}
            <AnimatePresence>
              {showEmailTerminal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 rounded-2xl bg-black border border-white/10 font-mono text-xs overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2 text-brand-glow">
                      <Inbox className="w-4 h-4 animate-bounce text-[#2EC4B6]" />
                      <span className="font-bold uppercase tracking-wider text-[10px]">SMTP Notification Terminal</span>
                    </div>
                    <button 
                      onClick={() => setShowEmailTerminal(false)}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Close Logs
                    </button>
                  </div>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {dispatchedEmails.map((email, idx) => (
                      <div key={email.id} className="p-3 rounded bg-white/[0.02] border border-white/5 text-[11px]">
                        <div className="text-[#2EC4B6] font-bold mb-1">
                          {idx === 0 ? '📨 Customer Confirmation Copy' : '📨 Administrative Alert Dispatch'}
                        </div>
                        <div className="space-y-0.5 text-white/60 mb-2">
                          <div><span className="text-brand-muted">To:</span> {email.to}</div>
                          <div><span className="text-brand-muted">From:</span> {email.from}</div>
                          <div><span className="text-brand-muted">Subject:</span> {email.subject}</div>
                        </div>
                        <pre className="text-[10px] text-[#A7C4B8] whitespace-pre-wrap font-sans leading-relaxed pt-1.5 border-t border-white/5">
                          {email.body}
                        </pre>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT PANEL: RESERVATION WIZARD FORM */}
          <div className="lg:col-span-7" id="booking-portal-form">
            <div className="p-6 md:p-8 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden box-glow">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7]" />

              <AnimatePresence mode="wait">
                {!isSubmitted ? (
                  <motion.div
                    key="booking-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-lg md:text-xl font-space font-bold text-white mb-6 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#2EC4B6] animate-pulse" /> Client Session Wizard
                    </h3>

                    {duplicateError && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2.5 mb-6">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{duplicateError}</span>
                      </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      
                      {/* Section 1: Personal Information */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-mono uppercase text-[#2EC4B6] tracking-widest font-bold block mb-2 border-b border-white/5 pb-1">
                          1. Personal Identity
                        </span>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              placeholder="e.g. Osasere Imade"
                              className={`w-full bg-black/40 border ${validationErrors.name ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/20 transition-all placeholder:text-white/20`}
                            />
                            {validationErrors.name && (
                              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {validationErrors.name}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={e => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="e.g. 09054657734"
                              className={`w-full bg-black/40 border ${validationErrors.phone ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/20 transition-all placeholder:text-white/20`}
                            />
                            {validationErrors.phone && (
                              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {validationErrors.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="e.g. client@verifiedphotography.com"
                            className={`w-full bg-black/40 border ${validationErrors.email ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/20 transition-all placeholder:text-white/20`}
                          />
                          {validationErrors.email && (
                            <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {validationErrors.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Event Details */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-mono uppercase text-[#2EC4B6] tracking-widest font-bold block mb-2 border-b border-white/5 pb-1">
                          2. Photography Focus
                        </span>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Photography Service Dropdown
                            </label>
                            <select
                              value={formData.category}
                              onChange={e => setFormData({ ...formData, category: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] transition-all cursor-pointer"
                            >
                              <option value="Wedding">Wedding Shoot (Ceremony & Hall)</option>
                              <option value="Portrait">Portrait & Headshot (Creative/Glamour)</option>
                              <option value="Graduation">Graduation Celebration</option>
                              <option value="Birthday">Birthday Milestone Session</option>
                              <option value="Event Coverage">General Event Coverage</option>
                              <option value="Commercial">Commercial Product Shoot</option>
                              <option value="Other">Other Bespoke Idea</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Regional Capture Hub
                            </label>
                            <select
                              value={formData.location}
                              onChange={e => setFormData({ ...formData, location: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] transition-all cursor-pointer"
                            >
                              <option value="Ekpoma">Ekpoma Hub (AAU Precinct)</option>
                              <option value="Uromi">Uromi Hub (Scenic Openings)</option>
                              <option value="Auchi">Auchi Hub (Rock Clippings)</option>
                            </select>
                          </div>
                        </div>

                        {/* Interactive Calendar Widget Inside Form */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block font-bold">
                            Interactive Calendar: Pick Your Target Date *
                          </label>
                          <div className="p-4 rounded-xl bg-black/60 border border-white/10 max-w-sm mx-auto sm:max-w-none">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-xs font-space font-bold text-white uppercase tracking-wider">
                                {monthNames[month]} {year}
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={handlePrevMonth}
                                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white hover:text-[#2EC4B6] transition-all"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleNextMonth}
                                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white hover:text-[#2EC4B6] transition-all"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Calendar Grid Days */}
                            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] text-[#A7C4B8] uppercase font-bold mb-2">
                              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d}>{d}</div>
                              ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                              {/* Empty padding for first day offset */}
                              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="aspect-square opacity-20" />
                              ))}

                              {/* Days loop */}
                              {Array.from({ length: daysInMonth }).map((_, idx) => {
                                const dayNum = idx + 1;
                                const cellDate = new Date(year, month, dayNum);
                                const isPast = cellDate < today;
                                const isSelected = selectedCalendarDate?.getDate() === dayNum && selectedCalendarDate?.getMonth() === month && selectedCalendarDate?.getFullYear() === year;
                                
                                // Saturday/Sunday weekend check
                                const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                                
                                // Simulated fully booked dates on Saturdays (deterministic)
                                const isBooked = MOCK_BOOKED_DATES.includes(dayNum) && (cellDate.getDay() === 6);

                                return (
                                  <button
                                    key={`day-${dayNum}`}
                                    type="button"
                                    disabled={isPast || isBooked}
                                    onClick={() => handleSelectDate(dayNum)}
                                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center font-mono text-[10px] transition-all ${
                                      isPast 
                                        ? 'text-white/10 line-through cursor-not-allowed bg-transparent' 
                                        : isBooked
                                          ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed'
                                          : isSelected
                                            ? 'bg-[#2EC4B6] text-[#071A14] font-black shadow-[0_0_15px_rgba(46,196,182,0.4)]'
                                            : isWeekend
                                              ? 'bg-[#2EC4B6]/5 border border-[#2EC4B6]/20 text-[#6EE7B7] hover:bg-[#2EC4B6]/15 font-bold'
                                              : 'bg-white/5 text-white hover:bg-white/10'
                                    }`}
                                  >
                                    <span>{dayNum}</span>
                                    {isBooked && (
                                      <span className="absolute bottom-0.5 text-[6px] text-red-400 scale-75 uppercase">Full</span>
                                    )}
                                    {isWeekend && !isBooked && !isSelected && (
                                      <span className="absolute bottom-0.5 text-[6px] text-[#2EC4B6] scale-75">WE</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5 text-[9px] font-mono text-brand-muted">
                              <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-[#2EC4B6]/5 border border-[#2EC4B6]/20" />
                                <span>Weekend Peak</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-red-500/15 border border-red-500/30" />
                                <span>Fully Booked</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded bg-[#2EC4B6]" />
                                <span>My Select</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 mt-2 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                            <CalendarIcon className="w-4 h-4 text-[#2EC4B6]" />
                            <div>
                              <div className="text-[9px] font-mono text-[#A7C4B8] uppercase">Selected Target Date:</div>
                              <span className="text-xs font-mono font-bold text-white">
                                {formData.date ? `${formData.date} (${new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long' })})` : 'None (Select a valid date on the calendar above)'}
                              </span>
                            </div>
                          </div>
                          {validationErrors.date && (
                            <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {validationErrors.date}
                            </p>
                          )}
                        </div>

                        {/* Shoot time dropdown */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Event Time Slot *
                            </label>
                            <select
                              value={formData.time}
                              onChange={e => setFormData({ ...formData, time: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] transition-all cursor-pointer"
                            >
                              <option value="08:00 AM">Morning Session (08:00 AM - 12:00 PM)</option>
                              <option value="10:00 AM">Preferred Slot (10:00 AM)</option>
                              <option value="01:00 PM">Afternoon Premium (01:00 PM - 05:00 PM)</option>
                              <option value="04:00 PM">Golden Hour Sunset Shoot (04:00 PM)</option>
                              <option value="08:00 PM">Night Gala Coverage (08:00 PM onwards)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Hours of Coverage Needed
                            </label>
                            <select
                              value={formData.hours}
                              onChange={e => setFormData({ ...formData, hours: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] transition-all cursor-pointer"
                            >
                              <option value="2">2 Hours Session (Mini portfolio)</option>
                              <option value="4">4 Hours Session (Standard portraiture/Corporate)</option>
                              <option value="8">8 Hours Session (Full ceremonial weddings)</option>
                              <option value="12">Full Day Extensive Coverage (12 Hours)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Budget and Notes */}
                      <div className="space-y-4">
                        <span className="text-[9px] font-mono uppercase text-[#2EC4B6] tracking-widest font-bold block mb-2 border-b border-white/5 pb-1">
                          3. Custom Budgets & Notes
                        </span>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Target Package Plan
                            </label>
                            <select
                              value={formData.planName}
                              onChange={e => setFormData({ ...formData, planName: e.target.value })}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] transition-all cursor-pointer"
                            >
                              <option value="Classic Session">Classic Session Plan (₦45k)</option>
                              <option value="Deluxe Celebration">Deluxe Celebration Plan (₦180k)</option>
                              <option value="Royal Heritage">Royal Heritage Plan (₦350k)</option>
                              <option value="Custom Enquiry">Custom Project Enquiry</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                              Estimated Budget (₦ - Optional)
                            </label>
                            <input
                              type="text"
                              value={formData.budget}
                              onChange={e => setFormData({ ...formData, budget: e.target.value })}
                              placeholder="e.g. 150,000"
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] transition-all placeholder:text-white/20"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-[#A7C4B8] tracking-wider block mb-1.5 font-bold">
                            Message / Special Creative Requests
                          </label>
                          <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Share your aesthetic vision, wedding themes, or other guidelines..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2EC4B6] transition-all resize-none placeholder:text-white/20"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4.5 rounded-xl bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-[#071A14] font-space font-bold text-xs uppercase tracking-wider hover:shadow-[0_0_25px_rgba(46,196,182,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-4.5 w-4.5 text-[#071A14]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Locking session slot...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Request Booking Session Slot</span>
                          </>
                        )}
                      </button>

                    </form>
                  </motion.div>
                ) : (
                  // SUCCESS CONFIRMATION MODAL TRANSITION
                  <motion.div
                    key="booking-success"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="text-center py-10 px-4 flex flex-col items-center justify-center space-y-6"
                  >
                    {/* Circle Success Ripple Animation */}
                    <div className="relative w-20 h-20 bg-[#2EC4B6]/15 rounded-full flex items-center justify-center border border-[#2EC4B6]/30">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-[#2EC4B6]"
                        initial={{ scale: 0.6, opacity: 0.8 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                      />
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      >
                        <Check className="w-10 h-10 text-[#2EC4B6]" strokeWidth={3} />
                      </motion.div>
                    </div>

                    <div>
                      <h4 className="text-xl md:text-2xl font-space font-bold text-white mb-2">
                        ✅ Booking Received
                      </h4>
                      <p className="text-xs md:text-sm text-[#A7C4B8] max-w-md mx-auto leading-relaxed">
                        We've received your request. We'll contact you shortly to confirm your booking.
                      </p>
                      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono text-[#2EC4B6] inline-block">
                        📅 Shoot Date Secured: <span className="font-bold">{formData.date}</span> @ {formData.time}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm pt-4">
                      <button
                        onClick={() => {
                          const homeSection = document.getElementById('home');
                          if (homeSection) homeSection.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-space font-bold text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
                      >
                        Return Home
                      </button>
                      <button
                        onClick={handleResetForm}
                        className="flex-1 py-3 bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-[#071A14] rounded-xl font-space font-bold text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(46,196,182,0.3)] transition-all cursor-pointer border-none"
                      >
                        Book Another Session
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
