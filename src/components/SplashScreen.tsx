import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Compass, ExternalLink } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [step, setStep] = useState(0);
  const [logoError, setLogoError] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Phase 1: Activate initial ambient glow and logo
    const t1 = setTimeout(() => setStep(1), 100);
    // Phase 2: Fade in main texts
    const t2 = setTimeout(() => setStep(2), 600);
    // Phase 3: Divine energy surges
    const t3 = setTimeout(() => setStep(3), 1400);
    
    // Phase 4: Initiate elegant exit fade out slightly before 5 seconds
    // to ensure the screen is completely cleared at exactly 5.0 seconds
    const exitTimer = setTimeout(() => setStep(4), 4600);
    
    // Complete callback and unmount at exactly 5.0 seconds
    const completeTimer = setTimeout(() => {
      onCompleteRef.current();
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  // Generate 15 premium floating background stars/sparkles with random positions
  const sparklesList = [
    { id: 1, top: "15%", left: "12%", delay: 0.1, duration: 2.2, scale: 0.7 },
    { id: 2, top: "10%", left: "85%", delay: 0.4, duration: 2.8, scale: 0.9 },
    { id: 3, top: "35%", left: "88%", delay: 0.2, duration: 1.8, scale: 0.5 },
    { id: 4, top: "70%", left: "8%", delay: 0.6, duration: 3.2, scale: 0.8 },
    { id: 5, top: "78%", left: "82%", delay: 0.3, duration: 2.4, scale: 0.6 },
    { id: 6, top: "25%", left: "20%", delay: 0.8, duration: 2.6, scale: 0.5 },
    { id: 7, top: "60%", left: "78%", delay: 0.2, duration: 2.0, scale: 0.7 },
    { id: 8, top: "18%", left: "48%", delay: 0.5, duration: 2.5, scale: 0.6 },
    { id: 9, top: "85%", left: "30%", delay: 0.7, duration: 2.1, scale: 1.0 },
    { id: 10, top: "45%", left: "10%", delay: 0.1, duration: 3.0, scale: 0.6 },
    { id: 11, top: "52%", left: "92%", delay: 0.4, duration: 2.3, scale: 0.5 },
    { id: 12, top: "22%", left: "94%", delay: 0.6, duration: 1.9, scale: 0.7 },
    { id: 13, top: "40%", left: "30%", delay: 0.3, duration: 2.5, scale: 0.6 },
    { id: 14, top: "68%", left: "62%", delay: 0.5, duration: 2.2, scale: 0.7 },
    { id: 15, top: "50%", left: "50%", delay: 0.2, duration: 3.0, scale: 0.8 }
  ];

  return (
    <AnimatePresence>
      {step < 4 && (
        <motion.div
          id="premium-splash-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-between py-12 px-6 overflow-hidden bg-gradient-to-b from-black via-[#040406] to-[#0a0a0f]"
        >
          {/* Subtle Divine Light Rays (Ambient Background Pulse) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            {/* Deep gold ambient core */}
            <div className="absolute w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#D4AF37]/8 via-transparent to-[#D4AF37]/3 blur-[100px] animate-pulse" style={{ animationDuration: "5s" }} />
            <div className="absolute w-[350px] h-[350px] rounded-full bg-[#D4AF37]/4 blur-[80px] animate-pulse" style={{ animationDuration: "3s" }} />
            
            {/* Thin majestic light streaks simulating divine rays */}
            <div className="absolute w-[1px] h-[90%] bg-gradient-to-b from-transparent via-[#D4AF37]/10 to-transparent rotate-[25deg] transform origin-center animate-pulse" style={{ animationDuration: "4s" }} />
            <div className="absolute w-[1px] h-[90%] bg-gradient-to-b from-transparent via-[#D4AF37]/8 to-transparent rotate-[-35deg] transform origin-center animate-pulse" style={{ animationDuration: "6s" }} />
          </div>

          {/* Sparkles / Divine Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {sparklesList.map((sparkle) => (
              <motion.div
                key={sparkle.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0, sparkle.scale, 0],
                  y: [0, -25, 0],
                }}
                transition={{
                  duration: sparkle.duration,
                  repeat: Infinity,
                  delay: sparkle.delay,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  top: sparkle.top,
                  left: sparkle.left,
                }}
                className="text-[#D4AF37]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFE073] drop-shadow-[0_0_5px_#D4AF37]" />
              </motion.div>
            ))}
          </div>

          {/* Top Spacer */}
          <div className="h-4" />

          {/* Central Logo & Divine Circular Energy Rings Section */}
          <div className="flex flex-col items-center justify-center relative my-auto">
            
            {/* Halo Backdrop Glow */}
            <motion.div
              animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-64 h-64 rounded-full bg-gradient-to-r from-[#D4AF37]/25 via-[#FFE073]/15 to-[#D4AF37]/25 blur-[45px]"
            />

            {/* Ripple Wave 1 (Divine Energy Expanding Outwards) */}
            <motion.div
              animate={{
                scale: [0.8, 2.2],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute w-28 h-28 rounded-full border border-[#D4AF37]/25 pointer-events-none"
            />

            {/* Ripple Wave 2 (Staggered Stardust Divine Wave) */}
            <motion.div
              animate={{
                scale: [0.8, 2.2],
                opacity: [0.4, 0],
              }}
              transition={{
                duration: 2.8,
                delay: 1.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute w-28 h-28 rounded-full border border-double border-[#FFE073]/15 pointer-events-none"
            />

            {/* Rotating Outer Glowing Circular Energy Ring (Clockwise) */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              className="absolute w-48 h-48 rounded-full border border-dashed border-[#D4AF37]/45 flex items-center justify-center"
            >
              {/* Star focal points on energy ring */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-[#FFE073] shadow-[0_0_10px_#D4AF37]" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#FFE073] shadow-[0_0_10px_#D4AF37]" />
            </motion.div>

            {/* Rotating Inner Glowing Energy Ring (Counter-Clockwise) */}
            <motion.div
              initial={{ rotate: 180 }}
              animate={{ rotate: -180 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute w-40 h-40 rounded-full border border-double border-[#FFE073]/30 flex items-center justify-center"
            >
              <div className="absolute top-1/2 -right-2 w-2 h-2 rounded-full bg-[#FFE073] shadow-[0_0_8px_#D4AF37]" />
              <div className="absolute top-1/2 -left-2 w-2 h-2 rounded-full bg-[#FFE073] shadow-[0_0_8px_#D4AF37]" />
            </motion.div>

            {/* Core Golden Core Aura circle */}
            <motion.div
              animate={{ scale: [0.96, 1.04, 0.96], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-[#121217] via-[#231F14] to-[#121217] border border-[#D4AF37]/50 shadow-[0_0_35px_rgba(212,175,55,0.35)]"
            />

            {/* Golden Hands Premium App Logo Container */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 120, 
                damping: 14,
                duration: 0.8
              }}
              className="relative z-10 w-24 h-24 bg-gradient-to-b from-[#181822] to-[#0c0c12] rounded-3xl flex items-center justify-center border border-[#D4AF37]/50 shadow-2xl overflow-hidden group"
            >
              {/* Internal sweeping laser shine animation */}
              <motion.div 
                animate={{ x: ["-150%", "250%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.0 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none"
              />

              {!logoError ? (
                /* High-Fidelity Golden Hands Vector Logo */
                <svg 
                  className="w-16 h-16 drop-shadow-[0_0_10px_rgba(212,175,55,0.75)]" 
                  viewBox="0 0 100 100" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  onError={() => setLogoError(true)}
                >
                  {/* Steering wheel outer ring */}
                  <circle cx="50" cy="46" r="26" stroke="#D4AF37" strokeWidth="2.5" />
                  
                  {/* Steering wheel inner details */}
                  <circle cx="50" cy="46" r="5" fill="#FFE073" />
                  <path d="M50 46 L50 20" stroke="#FFE073" strokeWidth="2" />
                  <path d="M50 46 L30 58" stroke="#FFE073" strokeWidth="2" />
                  <path d="M50 46 L70 58" stroke="#FFE073" strokeWidth="2" />

                  {/* Golden Hands Left */}
                  <path d="M12 75 C 22 68, 28 50, 41 46 C 36 54, 30 65, 26 78 Z" fill="url(#splashGoldGrad)" />
                  <circle cx="34" cy="48" r="1.5" fill="#FFF" />

                  {/* Golden Hands Right */}
                  <path d="M88 75 C 78 68, 72 50, 59 46 C 64 54, 70 65, 74 78 Z" fill="url(#splashGoldGrad)" />
                  <circle cx="66" cy="48" r="1.5" fill="#FFF" />

                  {/* Star crown embellishment */}
                  <path d="M50 6 L52 11 L57 12 L52 13 L50 18 L48 13 L43 12 L48 11 Z" fill="#FFE073" />

                  <defs>
                    <linearGradient id="splashGoldGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFF7D1" />
                      <stop offset="50%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#8A670F" />
                    </linearGradient>
                  </defs>
                </svg>
              ) : (
                /* Premium Fallback Launcher Icon */
                <div className="flex flex-col items-center justify-center text-[#D4AF37] relative">
                  <Compass className="w-12 h-12 animate-spin-slow drop-shadow-[0_0_8px_#D4AF37]" style={{ animationDuration: "12s" }} />
                  <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-[#FFE073] animate-pulse" />
                </div>
              )}
            </motion.div>

            {/* Swirling celestial sparkle around core logo */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute w-32 h-32 pointer-events-none"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <motion.div 
                  animate={{ scale: [0.7, 1.3, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-[#FFE073] drop-shadow-[0_0_8px_#D4AF37]" />
                </motion.div>
              </div>
            </motion.div>

          </div>

          {/* Typography Text Layout Section */}
          <div className="flex flex-col items-center text-center gap-2.5 z-10 select-none my-auto">
            {/* "WELCOME TO" in pure white */}
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-xs font-black tracking-[0.35em] uppercase text-white"
            >
              WELCOME TO
            </motion.span>

            {/* "Golden Hands" with a premium gold gradient */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
              className="relative"
            >
              <h1 className="text-[34px] sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FFF9D6] via-[#D4AF37] to-[#F3CE63] drop-shadow-[0_2px_15px_rgba(212,175,55,0.3)] select-none">
                Golden Hands
              </h1>
              
              {/* Subtle Gold Gradient Underline Divider */}
              <div className="w-20 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto mt-3" />
            </motion.div>

            {/* Premium driving tag */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-[9px] uppercase tracking-[0.3em] text-[#FFE073] font-bold mt-1"
            >
              Premium Driving Academy
            </motion.p>
          </div>

          {/* Bottom Footer Creator Section - Permanent, never hidden, safe-area padded */}
          <div className="z-10 select-none mt-auto pb-4">
            <a 
              href="https://bnpt.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-center block hover:opacity-80 transition-opacity cursor-pointer group"
              title="Visit BNP Tech (Binayak)"
            >
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 font-medium">
                Created by
              </p>
              <p className="text-[11px] font-bold text-[#D4AF37] tracking-[0.15em] mt-0.5 inline-flex items-center gap-1 group-hover:underline">
                <span>BNP Tech (Binayak)</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </p>
            </a>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
