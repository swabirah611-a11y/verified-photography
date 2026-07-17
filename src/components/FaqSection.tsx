import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
import { CmsConfig } from '../lib/supabase';

interface FaqSectionProps {
  cmsConfig: CmsConfig;
}

export default function FaqSection({ cmsConfig }: FaqSectionProps) {
  const faqs = cmsConfig.faq || [];
  const [openId, setOpenId] = useState<string | null>(null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section id="faq" className="py-24 bg-brand-bg relative overflow-hidden">
      {/* Visual Ambient Backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/5 rounded-full filter blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-glow/5 rounded-full filter blur-[120px] -z-10 animate-pulse" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center space-y-3 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-mono tracking-widest text-brand-accent uppercase font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resolving Enquiries</span>
          </span>
          <h2 className="text-3xl md:text-4xl font-space font-bold tracking-tight text-brand-text">
            Frequently Asked <span className="text-brand-accent">Questions</span>
          </h2>
          <p className="text-xs text-brand-muted max-w-lg mx-auto leading-relaxed">
            Everything you need to know about our scheduling rates, delivery timelines, framing options, and travel logistics.
          </p>
        </div>

        {/* FAQ list */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openId === faq.id;
            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden bg-white/[0.005] ${
                  isOpen ? 'border-brand-accent/30 bg-white/[0.02]' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5">
                    <HelpCircle className={`w-4.5 h-4.5 transition-colors ${isOpen ? 'text-brand-accent' : 'text-brand-muted'}`} />
                    <span className="font-space font-semibold text-sm text-brand-text leading-snug">{faq.question}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-brand-muted transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-brand-accent' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 pt-1 border-t border-white/5 pl-[46px]">
                        <p className="text-xs text-brand-muted leading-relaxed font-sans">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
