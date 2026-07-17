import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Mail, Lock, X, AlertTriangle, Clock, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { signInAdmin } from '../lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { email: string; role: string }) => void;
}

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShake, setShouldShake] = useState(false);

  // Rate Limiting States
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Load initial email from rememberMe if available
  useEffect(() => {
    const savedEmail = localStorage.getItem('verified_admin_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check if there is an active lockout on mount
    const lockoutUntil = localStorage.getItem('verified_admin_lockout_until');
    if (lockoutUntil) {
      const remaining = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTimeLeft(remaining);
      }
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem('verified_admin_lockout_until');
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  // Dismiss modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForgotPassword = () => {
    setError('Please contact the head studio administrator to reset your credentials.');
    triggerShake();
  };

  const triggerShake = () => {
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Guard rate-limit lockout
    if (lockoutTimeLeft > 0) {
      setError(`Too many failed attempts. Try again in ${lockoutTimeLeft}s.`);
      triggerShake();
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all security fields.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      const response = await signInAdmin(email, password);

      if (response.success && response.user) {
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('verified_admin_remember_email', email);
        } else {
          localStorage.removeItem('verified_admin_remember_email');
        }

        // Reset fail counter
        setFailedAttempts(0);
        localStorage.removeItem('verified_admin_failed_attempts');

        onLoginSuccess(response.user);
      } else {
        // Failed attempt logic
        const nextFailedCount = failedAttempts + 1;
        setFailedAttempts(nextFailedCount);
        
        if (nextFailedCount >= 5) {
          const lockoutDuration = 30; // 30 seconds lockout for failed security checks
          const lockoutUntil = Date.now() + lockoutDuration * 1000;
          localStorage.setItem('verified_admin_lockout_until', lockoutUntil.toString());
          setLockoutTimeLeft(lockoutDuration);
          setError(`Too many failed attempts. System locked for ${lockoutDuration} seconds.`);
        } else {
          setError(response.error || 'Authentication failed. Please check credentials.');
        }
        triggerShake();
      }
    } catch (err) {
      setError('A system communication error occurred.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // Glassmorphism and shaking Framer Motion configs
  const shakeVariants = {
    idle: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' }
    },
    shake: {
      x: [0, -8, 8, -8, 8, -5, 5, -3, 3, 0],
      transition: { duration: 0.45, ease: 'easeInOut' }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background glass blur and dim backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#040e0b]/80 backdrop-blur-md z-40"
      />

      {/* Main Login Modal Card */}
      <motion.div
        variants={shakeVariants}
        animate={shouldShake ? 'shake' : 'idle'}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        render-id="admin-login-modal-card"
        className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-[#102a22]/90 via-[#071d17]/95 to-[#040f0c]/98 border border-[#2EC4B6]/30 shadow-[0_0_50px_rgba(46,196,182,0.15)] overflow-hidden p-8 z-50 text-brand-text"
      >
        {/* Subtle decorative color orb inside */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2EC4B6]/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#6EE7B7]/5 blur-3xl rounded-full pointer-events-none" />

        {/* Header Block */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#2EC4B6]/10 flex items-center justify-center border border-[#2EC4B6]/20">
              <Shield className="w-4.5 h-4.5 text-[#2EC4B6]" />
            </div>
            <div>
              <h3 className="font-space font-bold text-base tracking-wide text-white">
                Admin Gateway
              </h3>
              <p className="text-[10px] font-mono text-[#A7C4B8] uppercase tracking-wider">
                Authorized Personnel Only
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#A7C4B8] hover:text-white border border-white/5 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] text-red-300 font-sans leading-relaxed">
              {error}
            </span>
          </motion.div>
        )}

        {/* Locked message screen banner */}
        {lockoutTimeLeft > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-[#2ea2c4]/5 border border-[#2EC4B6]/15 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#2EC4B6] animate-pulse" />
            <div className="text-xs">
              <p className="font-semibold text-[#2EC4B6]">Temporary Security Lock</p>
              <p className="text-[10px] text-[#A7C4B8] mt-0.5">Please wait {lockoutTimeLeft}s before attempting sign in.</p>
            </div>
          </div>
        )}

        {/* Credentials form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Email field */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-widest uppercase text-[#A7C4B8] block">
              Administrative Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-muted/70">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                disabled={isLoading || lockoutTimeLeft > 0}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@verifiedphotography.com"
                className="w-full pl-10 pr-4 py-3 bg-[#040e0b]/55 border border-white/10 rounded-xl text-xs font-sans text-white focus:outline-none focus:border-[#2EC4B6]/80 focus:ring-1 focus:ring-[#2EC4B6]/30 transition-all placeholder:text-brand-muted/40"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono tracking-widest uppercase text-[#A7C4B8]">
                Security Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] text-[#2EC4B6] hover:text-[#6EE7B7] transition-colors font-mono uppercase font-semibold"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-muted/70">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading || lockoutTimeLeft > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-3 bg-[#040e0b]/55 border border-white/10 rounded-xl text-xs font-sans text-white focus:outline-none focus:border-[#2EC4B6]/80 focus:ring-1 focus:ring-[#2EC4B6]/30 transition-all placeholder:text-brand-muted/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-muted/70 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me block */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-[11px] text-[#A7C4B8] cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/10 bg-[#040e0b]/55 text-[#2EC4B6] focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember administrator email</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-white/5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-space font-semibold transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || lockoutTimeLeft > 0}
              className="flex-1 py-3 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(46,196,182,0.25)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>

        {/* Disclaimer footer */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center relative z-10">
          <span className="text-[9px] font-mono text-[#A7C4B8]/40 uppercase tracking-widest block">
            System coordinates logging is active
          </span>
        </div>
      </motion.div>
    </div>
  );
}
