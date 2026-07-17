import React from 'react';
import { motion } from 'motion/react';
import { Instagram, Camera, Sparkles } from 'lucide-react';
import { CmsConfig } from '../lib/supabase';

interface TeamSectionProps {
  cmsConfig: CmsConfig;
}

export default function TeamSection({ cmsConfig }: TeamSectionProps) {
  const team = cmsConfig.team || [];

  if (!team || team.length === 0) return null;

  return (
    <section id="team" className="py-24 bg-brand-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center space-y-3 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-mono tracking-widest text-brand-accent uppercase font-bold">
            <Camera className="w-3.5 h-3.5" />
            <span>Creative Visionaries</span>
          </span>
          <h2 className="text-3xl md:text-4xl font-space font-bold tracking-tight text-brand-text">
            Meet the <span className="text-brand-accent">Exhibition Crew</span>
          </h2>
          <p className="text-xs text-brand-muted max-w-lg mx-auto leading-relaxed">
            The professional team behind the high-definition lenses, artistic grades, and digital curation systems.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
          {team.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group rounded-2xl border border-white/5 bg-white/[0.005] hover:border-brand-accent/20 transition-all duration-300 overflow-hidden"
            >
              <div className="aspect-square relative w-full overflow-hidden bg-black/40">
                <img 
                  src={member.photo} 
                  alt={member.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual Cover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h3 className="font-space font-bold text-sm text-brand-text">{member.name}</h3>
                    <span className="text-[10px] font-mono text-brand-accent uppercase font-bold tracking-wider block mt-0.5">{member.role}</span>
                  </div>
                  
                  {member.socialLinks?.instagram && (
                    <a 
                      href={member.socialLinks.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/10 hover:bg-brand-accent hover:text-brand-bg transition-colors duration-300 text-white"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs text-brand-muted font-sans leading-relaxed">{member.bio}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
