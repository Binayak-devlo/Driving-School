import React, { useState, useId } from "react";
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Lock, 
  ExternalLink, 
  QrCode, 
  Share2, 
  Download, 
  Sparkles, 
  ChevronRight, 
  X, 
  Star, 
  FileCheck, 
  Compass, 
  Car, 
  Info,
  Calendar,
  Check
} from "lucide-react";
import { Student } from "../types";

export interface BadgeTier {
  level: number;
  id: string;
  title: string;
  subtitle: string;
  category: string;
  minClasses: number;
  maxClasses: number;
  metal: 'bronze' | 'silver' | 'gold' | 'platinum' | 'royalGold';
  rimGradient: [string, string, string, string];
  bgGradient: [string, string];
  accentColor: string;
  darkAccent: string;
  starCount: number;
  description: string;
  skillsAcquired: string[];
  rtoBenchmark: string;
}

export const BADGE_TIERS: BadgeTier[] = [
  {
    level: 1,
    id: 'cadet',
    title: 'Novice Steer Cadet',
    subtitle: 'Dual-Control Foundation & Ergonomics',
    category: 'LEVEL 1 FOUNDATION',
    minClasses: 0,
    maxClasses: 2,
    metal: 'bronze',
    rimGradient: ['#F59E0B', '#B45309', '#78350F', '#FDE68A'],
    bgGradient: ['#291508', '#140A04'],
    accentColor: '#D97706',
    darkAccent: '#78350F',
    starCount: 1,
    description: 'Mastered cockpit drill, seat & mirror alignment, dual-pedal safety protocols, and introductory steering coordination.',
    skillsAcquired: [
      'Cockpit Drill & Blind-Spot Setup',
      'Dual-Pedal Emergency Braking Protocol',
      'Basic Steering Hand-over-Hand Technique'
    ],
    rtoBenchmark: 'Section 3 MV Act • Learner Induction Complete'
  },
  {
    level: 2,
    id: 'navigator',
    title: 'Urban Road Navigator',
    subtitle: 'City Traffic & Lane Discipline',
    category: 'LEVEL 2 TRAFFIC ACCREDITED',
    minClasses: 3,
    maxClasses: 6,
    metal: 'silver',
    rimGradient: ['#E2E8F0', '#94A3B8', '#475569', '#FFFFFF'],
    bgGradient: ['#1E293B', '#0F172A'],
    accentColor: '#94A3B8',
    darkAccent: '#334155',
    starCount: 2,
    description: 'Certified for public traffic flow, smooth clutch friction point modulation, intersection etiquette, and multi-lane positioning.',
    skillsAcquired: [
      'Clutch Friction-Point Modulation',
      'Urban Roundabout & Junction Flow',
      'Lane Positioning & Indicator Discipline'
    ],
    rtoBenchmark: 'Odisha RTO OD-02 City Arterial Navigation Standard'
  },
  {
    level: 3,
    id: 'specialist',
    title: 'Precision Maneuver Specialist',
    subtitle: 'Parallel Parking & Incline Hold',
    category: 'LEVEL 3 ADVANCED DYNAMICS',
    minClasses: 7,
    maxClasses: 10,
    metal: 'gold',
    rimGradient: ['#FDE047', '#EAB308', '#854D0E', '#FEF08A'],
    bgGradient: ['#291E05', '#161002'],
    accentColor: '#EAB308',
    darkAccent: '#713F12',
    starCount: 3,
    description: 'Certified in challenging vehicle maneuvers: tight parallel bay parking, reverse "H" track geometry, and handbrake hill starts without stall.',
    skillsAcquired: [
      'Tight Parallel & 90° Bay Parking',
      'Reverse "H" / "S" Track Precision',
      'Gradient Handbrake Hill-Start (Zero Rollback)'
    ],
    rtoBenchmark: 'RTO OD-02 Automated Driving Testing Track Standard'
  },
  {
    level: 4,
    id: 'master',
    title: 'Defensive Highway Master',
    subtitle: 'High-Speed Cruising & Hazard Radar',
    category: 'LEVEL 4 PRO DEFENSIVE',
    minClasses: 11,
    maxClasses: 14,
    metal: 'platinum',
    rimGradient: ['#38BDF8', '#0284C7', '#0369A1', '#E0F2FE'],
    bgGradient: ['#082032', '#03101C'],
    accentColor: '#38BDF8',
    darkAccent: '#0C4A6E',
    starCount: 4,
    description: 'Expert-grade vehicle control: expressway overtaking protocols, dynamic stopping distance management, wet-weather threshold braking, and night driving.',
    skillsAcquired: [
      'Expressway Merge & High-Speed Overtaking',
      'Threshold Emergency Braking & ABS Engagement',
      'Adverse Conditions & Night Hazard Anticipation'
    ],
    rtoBenchmark: 'National Highway Defensive Driving Certification'
  },
  {
    level: 5,
    id: 'certified',
    title: 'Certified Master Driver',
    subtitle: 'RTO OD-02 Practical Test Clearance',
    category: 'LEVEL 5 ELITE ACCREDITATION',
    minClasses: 15,
    maxClasses: 999,
    metal: 'royalGold',
    rimGradient: ['#FDE047', '#E11D48', '#881337', '#FFFBEB'],
    bgGradient: ['#200812', '#0F0307'],
    accentColor: '#F59E0B',
    darkAccent: '#881337',
    starCount: 5,
    description: 'Comprehensive driving excellence. Cleared all academy safety modules with zero-demerit rating. Fully prepared and accredited for independent driving license issuance.',
    skillsAcquired: [
      'Comprehensive RTO OD-02 Mock Practical Test (100% Pass)',
      'Independent Solo Highway & City Confidence',
      'Lifetime Safe Motorist Golden Hands Honor'
    ],
    rtoBenchmark: 'Final DL Practical Test Clearance Attestation'
  }
];

export function getStudentBadgeTier(completedClasses: number): BadgeTier {
  if (completedClasses >= 15) return BADGE_TIERS[4];
  if (completedClasses >= 11) return BADGE_TIERS[3];
  if (completedClasses >= 7) return BADGE_TIERS[2];
  if (completedClasses >= 3) return BADGE_TIERS[1];
  return BADGE_TIERS[0];
}

interface RealBadgeMedallionProps {
  tier: BadgeTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showAnimation?: boolean;
}

/**
 * Realistic 3D Medallion SVG component:
 * Crafted with multi-point specular metallic bevels, coin serrations,
 * micro-engraved circular typography, heraldic laurel branches, and security guilloche.
 */
export function RealBadgeMedallion({ tier, size = 'md', showAnimation = true }: RealBadgeMedallionProps) {
  const uid = useId().replace(/[:]/g, '_');
  
  const dim = size === 'sm' ? 68 : size === 'md' ? 96 : size === 'lg' ? 140 : 180;
  
  // Metallic palettes based on tier metal
  const getMetalTheme = () => {
    switch (tier.metal) {
      case 'bronze':
        return {
          rimOuter: '#B45309',
          rimMid: '#F59E0B',
          rimHighlight: '#FDE68A',
          rimDark: '#78350F',
          innerFillStart: '#2A1406',
          innerFillEnd: '#130802',
          centerShield: '#D97706',
          textStroke: '#FDE68A',
          laurelColor: '#D97706',
          ribbonFill: '#92400E'
        };
      case 'silver':
        return {
          rimOuter: '#64748B',
          rimMid: '#CBD5E1',
          rimHighlight: '#FFFFFF',
          rimDark: '#334155',
          innerFillStart: '#1E293B',
          innerFillEnd: '#0F172A',
          centerShield: '#E2E8F0',
          textStroke: '#FFFFFF',
          laurelColor: '#CBD5E1',
          ribbonFill: '#475569'
        };
      case 'gold':
        return {
          rimOuter: '#B45309',
          rimMid: '#F59E0B',
          rimHighlight: '#FEF08A',
          rimDark: '#78350F',
          innerFillStart: '#2B1E05',
          innerFillEnd: '#140D01',
          centerShield: '#FDE047',
          textStroke: '#FEF08A',
          laurelColor: '#F59E0B',
          ribbonFill: '#854D0E'
        };
      case 'platinum':
        return {
          rimOuter: '#0369A1',
          rimMid: '#38BDF8',
          rimHighlight: '#F0F9FF',
          rimDark: '#082F49',
          innerFillStart: '#0C2B42',
          innerFillEnd: '#04131F',
          centerShield: '#BAE6FD',
          textStroke: '#E0F2FE',
          laurelColor: '#38BDF8',
          ribbonFill: '#0369A1'
        };
      case 'royalGold':
      default:
        return {
          rimOuter: '#9F1239',
          rimMid: '#F59E0B',
          rimHighlight: '#FEF08A',
          rimDark: '#4C0519',
          innerFillStart: '#2D0A18',
          innerFillEnd: '#14020A',
          centerShield: '#FDE047',
          textStroke: '#FEF08A',
          laurelColor: '#F59E0B',
          ribbonFill: '#881337'
        };
    }
  };

  const theme = getMetalTheme();

  return (
    <div 
      className="relative flex items-center justify-center shrink-0" 
      style={{ width: dim, height: dim }}
    >
      <svg 
        width={dim} 
        height={dim} 
        viewBox="0 0 200 200" 
        className={`drop-shadow-xl select-none ${showAnimation ? 'transition-transform duration-500 hover:scale-105' : ''}`}
        aria-label={`${tier.title} Medal`}
      >
        <defs>
          {/* Outer Coin Rim Gradient */}
          <linearGradient id={`rimGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.rimHighlight} />
            <stop offset="25%" stopColor={theme.rimMid} />
            <stop offset="50%" stopColor={theme.rimOuter} />
            <stop offset="75%" stopColor={theme.rimDark} />
            <stop offset="100%" stopColor={theme.rimHighlight} />
          </linearGradient>

          {/* Reverse Bevel Gradient for depth */}
          <linearGradient id={`bevelGrad_${uid}`} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={theme.rimHighlight} stopOpacity="0.8" />
            <stop offset="50%" stopColor={theme.rimOuter} />
            <stop offset="100%" stopColor={theme.rimDark} />
          </linearGradient>

          {/* Medallion Core Radial Gradient */}
          <radialGradient id={`coreGrad_${uid}`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={theme.innerFillStart} />
            <stop offset="70%" stopColor={theme.innerFillEnd} />
            <stop offset="100%" stopColor="#050508" />
          </radialGradient>

          {/* Shield Metallic Gradient */}
          <linearGradient id={`shieldGrad_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.rimHighlight} />
            <stop offset="40%" stopColor={theme.centerShield} />
            <stop offset="100%" stopColor={theme.rimOuter} />
          </linearGradient>

          {/* Circular Text Path */}
          <path
            id={`textRing_${uid}`}
            d="M 100,100 m -64,0 a 64,64 0 1,1 128,0 a 64,64 0 1,1 -128,0"
          />

          {/* Holographic Specular Sweep */}
          <linearGradient id={`holoShine_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Realistic Shadow */}
          <filter id={`badgeShadow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Outer Serrated Coin Edge (Milled Coin Rim) */}
        <g filter={`url(#badgeShadow_${uid})`}>
          <circle cx="100" cy="100" r="92" fill={`url(#rimGrad_${uid})`} />
          {/* Milled coin teeth */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 10 * Math.PI) / 180;
            const x1 = 100 + Math.cos(angle) * 88;
            const y1 = 100 + Math.sin(angle) * 88;
            const x2 = 100 + Math.cos(angle) * 92;
            const y2 = 100 + Math.sin(angle) * 92;
            return (
              <line 
                key={i} 
                x1={x1} 
                y1={y1} 
                x2={x2} 
                y2={y2} 
                stroke={theme.rimDark} 
                strokeWidth="1.5" 
                strokeOpacity="0.65" 
              />
            );
          })}
        </g>

        {/* Step-down Outer Bevel Ring */}
        <circle cx="100" cy="100" r="86" fill={`url(#bevelGrad_${uid})`} />
        <circle cx="100" cy="100" r="82" fill={`url(#rimGrad_${uid})`} />
        <circle cx="100" cy="100" r="77" fill={theme.rimDark} stroke={theme.rimHighlight} strokeWidth="1" />

        {/* Medallion Inner Face */}
        <circle cx="100" cy="100" r="75" fill={`url(#coreGrad_${uid})`} />

        {/* Guilloché Security Rays Pattern */}
        <g opacity="0.18">
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 22.5 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={100 + Math.cos(angle) * 74}
                y2={100 + Math.sin(angle) * 74}
                stroke={theme.rimHighlight}
                strokeWidth="1"
              />
            );
          })}
          <circle cx="100" cy="100" r="55" fill="none" stroke={theme.rimHighlight} strokeWidth="0.8" strokeDasharray="2,3" />
          <circle cx="100" cy="100" r="42" fill="none" stroke={theme.rimHighlight} strokeWidth="0.8" />
        </g>

        {/* Micro-engraved Circular Official Text Ring */}
        <text fontSize="7.5" fontWeight="900" letterSpacing="2.2" fill={theme.textStroke} opacity="0.95">
          <textPath href={`#textRing_${uid}`} startOffset="50%" textAnchor="middle">
            ★ GOLDEN HANDS DRIVING ACADEMY • BHUBANESWAR ★
          </textPath>
        </text>

        {/* Heraldic Laurel Wreath Branches */}
        <g opacity="0.85">
          {/* Left Laurel Leaves */}
          <path
            d="M 64,124 C 54,108 55,88 66,74 C 64,82 66,94 72,102 C 67,108 65,116 64,124 Z"
            fill={theme.laurelColor}
          />
          <path d="M 52,95 C 48,90 53,84 57,86 C 56,92 53,94 52,95 Z" fill={theme.rimHighlight} />
          <path d="M 57,110 C 53,106 56,99 61,101 C 60,107 58,109 57,110 Z" fill={theme.laurelColor} />

          {/* Right Laurel Leaves */}
          <path
            d="M 136,124 C 146,108 145,88 134,74 C 136,82 134,94 128,102 C 133,108 135,116 136,124 Z"
            fill={theme.laurelColor}
          />
          <path d="M 148,95 C 152,90 147,84 143,86 C 144,92 147,94 148,95 Z" fill={theme.rimHighlight} />
          <path d="M 143,110 C 147,106 144,99 139,101 C 140,107 142,109 143,110 Z" fill={theme.laurelColor} />
        </g>

        {/* Centerpiece Heraldic Shield */}
        <g filter={`url(#badgeShadow_${uid})`}>
          {/* Outer Shield Bevel */}
          <path
            d="M 100,56 L 126,67 C 126,93 115,116 100,126 C 85,116 74,93 74,67 Z"
            fill={`url(#rimGrad_${uid})`}
          />
          {/* Inner Shield Body */}
          <path
            d="M 100,60 L 123,70 C 123,92 113,112 100,121 C 87,112 77,92 77,70 Z"
            fill={`url(#coreGrad_${uid})`}
            stroke={theme.rimHighlight}
            strokeWidth="0.8"
          />

          {/* Center Emblem: Steering Wheel & Certification Crown/Wings */}
          <g transform="translate(100, 88)">
            {/* Steering Wheel Rim */}
            <circle cx="0" cy="0" r="16" fill="none" stroke={`url(#shieldGrad_${uid})`} strokeWidth="3" />
            <circle cx="0" cy="0" r="13" fill="none" stroke={theme.rimDark} strokeWidth="0.8" />
            <circle cx="0" cy="0" r="4.5" fill={`url(#shieldGrad_${uid})`} />
            
            {/* Steering Spokes */}
            <line x1="0" y1="4.5" x2="0" y2="15" stroke={`url(#shieldGrad_${uid})`} strokeWidth="2.5" />
            <line x1="-4" y1="-2" x2="-14" y2="-6" stroke={`url(#shieldGrad_${uid})`} strokeWidth="2.5" />
            <line x1="4" y1="-2" x2="14" y2="-6" stroke={`url(#shieldGrad_${uid})`} strokeWidth="2.5" />

            {/* Emblem Center Core Star */}
            <polygon
              points="0,-3.5 1,-1 3.5,-1 1.5,0.5 2.2,3 0,1.5 -2.2,3 -1.5,0.5 -3.5,-1 -1,-1"
              fill={theme.rimHighlight}
            />
          </g>

          {/* Star Rank Tiers Display (1-5 Embossed Stars) */}
          <g transform="translate(100, 112)">
            {Array.from({ length: 5 }).map((_, idx) => {
              const offset = (idx - 2) * 6.5;
              const isFilled = idx < tier.starCount;
              return (
                <polygon
                  key={idx}
                  points="0,-3 0.9,-0.9 3.2,-0.9 1.4,0.4 2.1,2.6 0,1.3 -2.1,2.6 -1.4,0.4 -3.2,-0.9 -0.9,-0.9"
                  transform={`translate(${offset}, 0)`}
                  fill={isFilled ? theme.rimHighlight : '#475569'}
                  opacity={isFilled ? 1 : 0.4}
                />
              );
            })}
          </g>
        </g>

        {/* Bottom Engraved Metal Ribbon / Banner */}
        <g filter={`url(#badgeShadow_${uid})`}>
          {/* Ribbon Tail Left */}
          <path d="M 46,140 L 36,152 L 46,164 L 56,154 Z" fill={theme.rimDark} />
          {/* Ribbon Tail Right */}
          <path d="M 154,140 L 164,152 L 154,164 L 144,154 Z" fill={theme.rimDark} />

          {/* Ribbon Main Bar */}
          <path
            d="M 44,144 Q 100,140 156,144 L 152,160 Q 100,156 48,160 Z"
            fill={`url(#rimGrad_${uid})`}
            stroke={theme.rimDark}
            strokeWidth="0.8"
          />

          {/* Engraved Ribbon Text */}
          <text
            x="100"
            y="154"
            textAnchor="middle"
            fill={theme.rimDark}
            fontSize="7"
            fontWeight="900"
            letterSpacing="0.8"
          >
            {tier.category}
          </text>
        </g>

        {/* Holographic Security Sheen Overlay */}
        <circle cx="100" cy="100" r="92" fill={`url(#holoShine_${uid})`} pointerEvents="none" />
      </svg>
    </div>
  );
}

interface RealDriverBadgeCardProps {
  student: Student;
  completedClasses: number;
  totalClasses?: number;
  onBookClass?: () => void;
}

/**
 * Authentic Driving Badge Card component:
 * Rendered below "Keep Learning, Keep Growing!" on the Home Dashboard.
 * Displays the verified tier, authentic metallic badge, real progress bar,
 * live security seal, and opens the official credential certificate viewer.
 */
export default function RealDriverBadgeCard({
  student,
  completedClasses,
  totalClasses = 15,
  onBookClass
}: RealDriverBadgeCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTierLevel, setSelectedTierLevel] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const currentTier = getStudentBadgeTier(completedClasses);
  const maxClasses = totalClasses || 15;

  // Next tier calculation
  const nextTier = BADGE_TIERS.find(t => t.level === currentTier.level + 1);
  const classesNeededForNext = nextTier ? Math.max(0, nextTier.minClasses - completedClasses) : 0;
  
  // Progress inside current tier milestone
  const milestoneTarget = nextTier ? nextTier.minClasses : maxClasses;
  const milestoneStart = currentTier.minClasses;
  const milestoneProgress = nextTier 
    ? Math.min(100, Math.max(0, Math.round(((completedClasses - milestoneStart) / (milestoneTarget - milestoneStart)) * 100)))
    : 100;

  // Authentic serial credential number
  const studentShortId = (student.id || "STU").slice(-4).toUpperCase();
  const credentialSerial = `GH-OD02-${studentShortId}-${String(completedClasses).padStart(2, '0')}`;
  const issueDate = student.joinedDate || new Date().toISOString().split('T')[0];

  const handleCopySerial = () => {
    navigator.clipboard?.writeText(credentialSerial);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const activeInspectTier = selectedTierLevel 
    ? (BADGE_TIERS.find(t => t.level === selectedTierLevel) || currentTier)
    : currentTier;

  return (
    <div className="w-full">
      {/* Container: Premium Verified Driver Badge Card */}
      <div className="bg-gradient-to-br from-[#161623] via-[#1A1A2B] to-[#12121E] text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-white/10 relative overflow-hidden">
        {/* Ambient Backlight Glow */}
        <div 
          className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: currentTier.accentColor }}
        />
        <div 
          className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full blur-2xl opacity-15 pointer-events-none"
          style={{ backgroundColor: currentTier.darkAccent }}
        />

        {/* Card Header: Official Accreditation Indicator */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              CURRENT OFFICIAL BADGE
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{credentialSerial}</span>
          </div>
        </div>

        {/* Main Badge Content: 3D Medallion + Dynamic Student Credentials */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-3.5 relative z-10">
          {/* Left: Realistic 3D Medallion with Click-to-Inspect trigger */}
          <div 
            onClick={() => {
              setSelectedTierLevel(currentTier.level);
              setIsModalOpen(true);
            }}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div className="relative p-1">
              <RealBadgeMedallion tier={currentTier} size="md" />
              {/* Subtle hover inspect chip */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-extrabold text-white bg-black/70 px-2 py-0.5 rounded-full border border-white/20">
                  Inspect
                </span>
              </div>
            </div>
            <span className="text-[9px] text-[#D4AF37] font-bold mt-1 tracking-tight flex items-center gap-0.5 group-hover:underline">
              Tap to verify <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </div>

          {/* Right: Badge Meta, Title, Status & Competencies */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1">
              <span 
                className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider font-mono text-white shadow-xs"
                style={{ backgroundColor: currentTier.darkAccent }}
              >
                LEVEL {currentTier.level} of 5
              </span>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Real Verified Status
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              {currentTier.title}
            </h3>
            <p className="text-[10.5px] font-semibold text-slate-300 mt-0.5">
              {currentTier.subtitle}
            </p>

            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
              {currentTier.description}
            </p>

            {/* Real Progress to Next Tier */}
            <div className="mt-3 pt-2.5 border-t border-white/5">
              <div className="flex items-center justify-between text-[9.5px] mb-1">
                <span className="text-slate-400 font-medium">
                  {nextTier 
                    ? `Next: ${nextTier.title}`
                    : "Maximum Accreditation Tier Achieved"}
                </span>
                <span className="font-bold text-white font-mono">
                  {completedClasses} / {nextTier ? nextTier.minClasses : maxClasses} Classes
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ 
                    width: `${milestoneProgress}%`,
                    backgroundColor: currentTier.accentColor
                  }}
                />
              </div>

              {nextTier && (
                <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
                  <span>
                    {classesNeededForNext > 0 
                      ? `${classesNeededForNext} more ${classesNeededForNext === 1 ? 'class' : 'classes'} to unlock Level ${nextTier.level}`
                      : "Ready for advancement!"}
                  </span>
                  {onBookClass && classesNeededForNext > 0 && (
                    <button
                      onClick={onBookClass}
                      className="text-[#6D3BFF] hover:text-[#8F52FF] font-bold cursor-pointer transition-colors"
                    >
                      Book Slot →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer Actions: Inspect Credential & Academy Seal */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
          <div className="flex items-center gap-2 text-[9px] text-slate-400">
            <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-[#D4AF37] font-bold">
              ★
            </span>
            <span className="truncate">
              Issued by Golden Hands Driving Academy • Odisha RTO OD-02 Standard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedTierLevel(currentTier.level);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-[#6D3BFF] to-[#8F52FF] hover:from-[#5C2EEB] hover:to-[#7E3EF2] text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl shadow-md shadow-[#6D3BFF]/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>View Real Credential</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL OFFICIAL CREDENTIAL CERTIFICATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#12121E] text-white rounded-3xl max-w-lg w-full border border-white/15 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#6D3BFF] flex items-center justify-center text-white font-black text-xs shadow-xs">
                  GH
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Official Digital Driver Credential
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ODISHA TRANSPORT RTO OD-02 ACCREDITATION
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar-dark flex-1">
              
              {/* Level Selector Tabs: All 5 Realistic Tiers */}
              <div>
                <p className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  ACCREDITATION PATHWAY & BADGE TIERS:
                </p>
                <div className="grid grid-cols-5 gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5">
                  {BADGE_TIERS.map((tier) => {
                    const isUnlocked = completedClasses >= tier.minClasses;
                    const isSelected = activeInspectTier.level === tier.level;
                    return (
                      <button
                        key={tier.id}
                        onClick={() => setSelectedTierLevel(tier.level)}
                        className={`p-1.5 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer relative ${
                          isSelected 
                            ? 'bg-[#6D3BFF] text-white shadow-md' 
                            : isUnlocked 
                              ? 'text-slate-300 hover:bg-white/10' 
                              : 'text-slate-500 opacity-60 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-[10px] font-black">Lvl {tier.level}</span>
                        {isUnlocked ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Lock className="w-3 h-3 text-slate-400" />
                        )}
                        {tier.level === currentTier.level && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#D4AF37]" title="Current Active" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Physical Certificate Style Box */}
              <div className="bg-gradient-to-b from-[#1C1C2E] to-[#141422] rounded-2xl p-4 sm:p-5 border-2 border-[#D4AF37]/30 relative shadow-inner text-center">
                {/* Guilloché Watermark Background */}
                <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none rounded-2xl" />

                {/* Big Realistic Medallion */}
                <div className="flex justify-center mb-2 relative z-10">
                  <RealBadgeMedallion tier={activeInspectTier} size="lg" />
                </div>

                {/* Certificate Title */}
                <span className="inline-block text-[9px] font-mono font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/15 px-3 py-1 rounded-full border border-[#D4AF37]/30 mb-2">
                  {activeInspectTier.category}
                </span>

                <h4 className="text-xl font-black text-white">
                  {activeInspectTier.title}
                </h4>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {activeInspectTier.subtitle}
                </p>

                {/* Recipient Information */}
                <div className="mt-4 pt-3 border-t border-white/10 text-left bg-black/30 rounded-xl p-3">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 block text-[9px]">CREDENTIAL HOLDER:</span>
                      <span className="font-bold text-white text-xs">{student.name || "Student Driver"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">STUDENT ID:</span>
                      <span className="font-mono font-bold text-slate-200">{student.id || "GH-TEMP"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">STATUS:</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {completedClasses >= activeInspectTier.minClasses ? "Accredited & Earned" : "In Progress"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">ACCREDITATION CODE:</span>
                      <span className="font-mono text-slate-300">{credentialSerial}</span>
                    </div>
                  </div>
                </div>

                {/* Verified Competencies */}
                <div className="mt-3 text-left">
                  <p className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                    VERIFIED DRIVING SKILLS:
                  </p>
                  <div className="space-y-1">
                    {activeInspectTier.skillsAcquired.map((skill, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-slate-200 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RTO Standard & Signature Block */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-white/5 p-1 border border-white/10 flex items-center justify-center shrink-0">
                      <QrCode className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-[8.5px] text-slate-400 uppercase font-mono">DIGITAL SIGNATURE</p>
                      <p className="text-[10px] font-serif italic text-white">B. Patri, Chief Instructor</p>
                      <p className="text-[8px] text-slate-400">{activeInspectTier.rtoBenchmark}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[8.5px] text-slate-400 block">ISSUED DATE</span>
                    <span className="text-[10px] font-bold text-white font-mono">{issueDate}</span>
                  </div>
                </div>
              </div>

              {/* Anti-Counterfeit Notice */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9.5px] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  This digital credential is tied directly to your practical training attendance logs and instructor sign-offs at Golden Hands Academy. Verifiable by RTO testing officials and academy management.
                </span>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={handleCopySerial}
                className="bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{copiedId ? "ID Copied!" : "Copy Credential ID"}</span>
              </button>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${student.name} - ${activeInspectTier.title}`,
                      text: `I earned the ${activeInspectTier.title} Driving Badge at Golden Hands Driving Academy! Credential ID: ${credentialSerial}`,
                      url: window.location.href
                    }).catch(() => {});
                  } else {
                    handleCopySerial();
                  }
                }}
                className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Credential</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
