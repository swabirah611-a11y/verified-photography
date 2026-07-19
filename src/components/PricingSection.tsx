import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CmsConfig } from '../lib/supabase';
import { Check, Star, ArrowRight, Shield, Award, Users, GraduationCap } from 'lucide-react';

interface PricingSectionProps {
  onSelectPlan: (planName: string, category: string) => void;
  cmsConfig?: CmsConfig;
}

export default function PricingSection({ onSelectPlan, cmsConfig }: PricingSectionProps) {
  const [activeTestimonial, setActiveTestimonial] = useState<number>(0);

  const plans = (cmsConfig?.pricing?.packages ?? []).filter((plan) => plan.visible !== false);
  const testimonials = cmsConfig?.testimonials ?? [];

  return (
    <section id="pricing" className="relative py-24 md:py-32 bg-brand-secondary/30 overflow-hidden">
      {/* Background radial spotlight */}
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-brand-accent/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-brand-glow/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs font-mono tracking-widest text-brand-accent uppercase font-semibold">04 // INVESTMENTS</span>
            <div className="h-px w-6 bg-brand-accent/50" />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-space font-bold text-brand-text mb-4">
            Transparent, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-glow">Premium Packages</span>
          </h2>

          <p className="text-xs md:text-sm text-brand-muted max-w-xl mx-auto">
            Choose a level of storytelling that meets your exact vision. No hidden charges. Fully customized retouching and digital proof delivery included.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-24">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className={`p-6 md:p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                plan.popular
                  ? 'bg-brand-secondary border-2 border-brand-accent box-glow scale-102 lg:scale-105 z-10'
                  : 'bg-brand-bg border border-white/5 hover:border-white/10'
              }`}
            >
              {/* Popular Ribbon Accent */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-brand-accent text-brand-bg font-space text-[10px] tracking-wider uppercase font-bold py-1 px-4 rounded-bl-xl shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <span className="text-[10px] font-mono tracking-widest text-brand-glow uppercase font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  {plan.category}
                </span>

                <h3 className="text-xl md:text-2xl font-space font-bold text-brand-text mt-4">
                  {plan.name}
                </h3>

                <p className="text-xs text-brand-muted mt-2 leading-relaxed min-h-[40px]">
                  {plan.description}
                </p>

                {/* Pricing / Duration */}
                <div className="my-6 pt-6 border-t border-white/5">
                  <div className="text-3xl md:text-4xl font-space font-extrabold text-brand-text">
                    {plan.price}
                  </div>
                  <div className="text-[10px] md:text-xs text-brand-accent font-mono tracking-wider uppercase mt-1">
                    Coverage Duration: {plan.duration}
                  </div>
                </div>

                {/* Features checklist */}
                <ul className="space-y-3 mb-8 pt-6 border-t border-white/5">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs text-brand-muted">
                      <div className="w-4 h-4 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-brand-accent/20">
                        <Check className="w-3 h-3 text-brand-accent" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onSelectPlan(plan.name, plan.category)}
                className={`w-full py-3 rounded-xl font-space font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  plan.popular
                    ? 'bg-brand-accent hover:bg-brand-glow text-brand-bg hover:shadow-[0_0_20px_rgba(46,196,182,0.4)]'
                    : 'bg-white/5 hover:bg-brand-secondary text-brand-muted hover:text-brand-text border border-white/5 hover:border-white/10'
                }`}
              >
                <span>Select & Book Package</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          {plans.length === 0 && (
            <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-brand-bg p-10 text-center">
              <h3 className="text-xl font-space font-bold text-brand-text">Pricing packages are being curated</h3>
              <p className="mt-2 text-sm text-brand-muted">Contact the studio for a personalized quotation.</p>
            </div>
          )}
        </div>

        {/* BRAND TRUST & TESTIMONIALS PANEL */}
        <div className="pt-16 border-t border-white/5">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            
            {/* Left side: Credentials */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono tracking-widest text-brand-accent uppercase font-semibold">TESTIMONIALS</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-space font-bold text-brand-text mb-4">
                Trusted by <span className="text-brand-glow text-glow">Discerning Families</span> & Scholars
              </h3>
              <p className="text-xs md:text-sm text-brand-muted leading-relaxed mb-6">
                Our commitment to premium service, friendly communication, and rapid turnaround has earned us full trust in the community. Read authentic testimonials from Uromi, Ekpoma, and Auchi.
              </p>
              
              <div className="flex items-center gap-2">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTestimonial(idx)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
                      activeTestimonial === idx
                        ? 'bg-brand-accent w-8 box-glow'
                        : 'bg-white/15 hover:bg-white/30'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Right side: Testimonials Carousel Card */}
            <div className="md:col-span-7">
              <div className="relative min-h-[220px]">
                {testimonials.map((test, index) => {
                  const isActive = activeTestimonial === index;
                  if (!isActive) return null;
                  return (
                    <motion.div
                      key={test.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 md:p-8 rounded-2xl bg-brand-bg border border-white/5 box-glow flex flex-col justify-between"
                    >
                      <div>
                        {/* Rating stars */}
                        <div className="flex gap-1 mb-4">
                          {[...Array(test.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-brand-accent text-brand-accent" />
                          ))}
                        </div>
                        
                        <p className="text-xs md:text-sm text-brand-text italic leading-relaxed mb-6 font-sans">
                          "{test.quote}"
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <div>
                          <div className="text-xs font-space font-bold text-brand-text">{test.name}</div>
                          <div className="text-[10px] text-brand-muted mt-0.5">{test.role}</div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-brand-accent/10 text-brand-glow border border-brand-accent/10">
                          📍 {test.location}, Nigeria
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
