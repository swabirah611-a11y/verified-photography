import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Edit, Image } from 'lucide-react';
import EditableText from './EditableText';

interface CustomSectionProps {
  sectionId: string;
  sectionData?: {
    title: string;
    heading: string;
    description: string;
    bgImage?: string;
    ctaText?: string;
    ctaLink?: string;
    alignment?: 'left' | 'center' | 'right';
    themeMode?: 'light' | 'dark' | 'ambient';
  };
  isVisualEditMode: boolean;
  onUpdateField: (field: string, val: string) => void;
  onTriggerImageReplacer: () => void;
}

export default function CustomSection({
  sectionId,
  sectionData,
  isVisualEditMode,
  onUpdateField,
  onTriggerImageReplacer
}: CustomSectionProps) {
  // Fallbacks
  const title = sectionData?.title || 'NEW EXPERIMENTAL PORTFOLIO';
  const heading = sectionData?.heading || 'Pristine Concept Narrative';
  const description = sectionData?.description || 'A brand-new custom dynamic section built entirely within the Verified Website Builder. Add copywriting, upload custom imagery, or wire actions.';
  const bgImage = sectionData?.bgImage || '';
  const ctaText = sectionData?.ctaText || 'Learn More';
  const ctaLink = sectionData?.ctaLink || '#';
  const alignment = sectionData?.alignment || 'left';
  const themeMode = sectionData?.themeMode || 'dark';

  const themeClasses = 
    themeMode === 'light' 
      ? 'bg-neutral-50 text-neutral-900 border-y border-neutral-200' 
      : themeMode === 'ambient'
      ? 'bg-gradient-to-b from-[#10261F] to-[#071A14] text-[#F8FFF9] border-y border-[#2EC4B6]/10'
      : 'bg-black/40 text-white border-y border-white/5';

  const alignmentClasses = 
    alignment === 'center' 
      ? 'text-center flex flex-col items-center justify-center' 
      : alignment === 'right'
      ? 'text-right flex flex-col items-end justify-end'
      : 'text-left flex flex-col items-start justify-start';

  return (
    <section className={`py-20 px-6 relative overflow-hidden transition-all duration-300 min-h-[50vh] flex items-center ${themeClasses}`}>
      {/* Background Image Layer if specified */}
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img 
            src={bgImage} 
            alt="Section background" 
            className="w-full h-full object-cover opacity-15 select-none" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-brand-bg" />
        </div>
      )}

      {/* Media Edit overlay in visual mode */}
      {isVisualEditMode && (
        <div className="absolute top-4 right-4 z-40 flex gap-2">
          <button
            onClick={onTriggerImageReplacer}
            className="p-2 rounded-xl bg-black/70 hover:bg-[#2EC4B6] hover:text-[#071A14] text-white border border-white/10 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
          >
            <Image className="w-3.5 h-3.5" />
            <span>Swap Background</span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className={`max-w-3xl ${alignmentClasses} gap-4`}>
          
          {/* Subheading tag */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-brand-glow text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <EditableText
              value={title}
              isEditable={isVisualEditMode}
              onSave={(val) => onUpdateField('title', val)}
            />
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-space font-bold tracking-tight leading-tight"
          >
            <EditableText
              value={heading}
              isEditable={isVisualEditMode}
              onSave={(val) => onUpdateField('heading', val)}
            />
          </motion.h2>

          {/* Paragraph description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base text-brand-muted leading-relaxed"
          >
            <EditableText
              value={description}
              isEditable={isVisualEditMode}
              multiline={true}
              onSave={(val) => onUpdateField('description', val)}
            />
          </motion.p>

          {/* Call To Action button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="pt-4"
          >
            <a
              href={ctaLink}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-accent to-brand-glow hover:from-brand-glow hover:to-brand-accent text-brand-bg font-space font-bold text-xs shadow-md hover:shadow-lg transition-all"
            >
              <EditableText
                value={ctaText}
                isEditable={isVisualEditMode}
                onSave={(val) => onUpdateField('ctaText', val)}
              />
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
