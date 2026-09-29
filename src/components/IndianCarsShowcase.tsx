import React, { useState } from "react";
import { 
  Car, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  CheckCircle2, 
  Sliders,
  Award
} from "lucide-react";

export interface IndianCar {
  id: string;
  name: string;
  make: string;
  category: string;
  badge: string;
  slogan: string;
  subSlogan: string;
  trainingBenefit: string;
  spec: string;
  specsList: string[];
  themeColor: string;
  accentBg: string;
  imageUrl: string;
  backupImageUrl: string;
}

export const INDIAN_CARS: IndianCar[] = [
  {
    id: "swift",
    name: "Swift",
    make: "Maruti Suzuki",
    category: "Agile City Hatchback",
    badge: "Most Popular Learner Car",
    slogan: "Master the Streets: Nimble Control in Every Corner",
    subSlogan: "India's favorite hatchback with ultra-smooth clutch travel and feather-light steering — ideal for new drivers mastering Bhubaneswar traffic.",
    trainingBenefit: "Perfect for 3-point turns, tight alleys, and RTO 'H' track maneuvers.",
    spec: "1.2L DualJet Manual • Dual-Control Pedals",
    specsList: ["Dual-Control Pedals", "Light Clutch Modulation", "High Visibility Cockpit", "OD-02 Track Tested"],
    themeColor: "#EF4444",
    accentBg: "rgba(239, 68, 68, 0.15)",
    imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800",
    backupImageUrl: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "nexon",
    name: "Nexon",
    make: "Tata Motors",
    category: "5-Star Safety Compact SUV",
    badge: "5-Star NCAP Safety Standard",
    slogan: "Safety First, Power Ahead: Built for Every Indian Road",
    subSlogan: "Conquer flyovers, uneven surfaces, and monsoon roads with 209mm ground clearance and fortified steel safety cage.",
    trainingBenefit: "Exceptional hill-hold assist and anti-stall torque for confident slope driving.",
    spec: "Turbo Revotron • Fortified Steel Chassis",
    specsList: ["5-Star Safety Cage", "High Ground Clearance", "Hill-Hold Assist", "ABS with EBD"],
    themeColor: "#3B82F6",
    accentBg: "rgba(59, 130, 246, 0.15)",
    imageUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800",
    backupImageUrl: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "i20",
    name: "i20",
    make: "Hyundai",
    category: "Premium Urban Cruiser",
    badge: "Effortless Precision",
    slogan: "Smooth Elegance: Glide Through City Flow with Ease",
    subSlogan: "Ultra-refined transmission and responsive motor-driven power steering designed for effortless parallel parking and lane changes.",
    trainingBenefit: "Crisp short-throw gear shifts and wide-angle side mirrors for zero blind spots.",
    spec: "Kappa Manual • Electronic Power Steering",
    specsList: ["Short-Throw Shifter", "Motor Power Steering", "Wide Rear Cameras", "Refined Clutch"],
    themeColor: "#06B6D4",
    accentBg: "rgba(6, 182, 212, 0.15)",
    imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
    backupImageUrl: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "thar",
    name: "Thar",
    make: "Mahindra",
    category: "Rugged Indian 4x4",
    badge: "Commanding Road Presence",
    slogan: "Conquer the Gradient: Fearless Driving Confidence",
    subSlogan: "Elevated high-seat driving position that gives you full panoramic vision over traffic, heavy torque control, and unshakable stability.",
    trainingBenefit: "Master heavy clutch engagement, steep inclines, and commanding road authority.",
    spec: "mStallion High Torque • Dual Airbags",
    specsList: ["Elevated Cockpit View", "High Low-End Torque", "Heavy Duty Suspension", "Full Terrain Mastery"],
    themeColor: "#F59E0B",
    accentBg: "rgba(245, 158, 11, 0.15)",
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800",
    backupImageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "dzire",
    name: "Dzire",
    make: "Maruti Suzuki",
    category: "Executive Compact Sedan",
    badge: "Top Sedan Comfort",
    slogan: "Highway Poise & Balance: Master the Long Wheelbase",
    subSlogan: "Learn precise reverse parking with boot overhang and experience superior highway cruising stability on India's best-selling sedan.",
    trainingBenefit: "Master boot clearance estimation and high-speed expressway lane discipline.",
    spec: "DualJet Engine • Sedan Wheelbase Balance",
    specsList: ["Extended Wheelbase", "Boot Overhang Control", "Expressway Stability", "Dual Instructor Brake"],
    themeColor: "#8B5CF6",
    accentBg: "rgba(139, 92, 246, 0.15)",
    imageUrl: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=800",
    backupImageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800"
  }
];

interface IndianCarsShowcaseProps {
  onBookClass?: (carName?: string) => void;
  onRtoTest?: () => void;
}

export default function IndianCarsShowcase({ onBookClass, onRtoTest }: IndianCarsShowcaseProps) {
  const [activeCarIndex, setActiveCarIndex] = useState(0);

  const car = INDIAN_CARS[activeCarIndex] || INDIAN_CARS[0];

  const handlePrev = () => {
    setActiveCarIndex((prev) => (prev === 0 ? INDIAN_CARS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveCarIndex((prev) => (prev === INDIAN_CARS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-gradient-to-br from-[#161623] via-[#1D1D30] to-[#25253F] text-white rounded-3xl p-3.5 sm:p-5 relative overflow-hidden border border-slate-800/80 shadow-xl group transition-all duration-300">
      {/* Dynamic Ambient Glow matching the car's theme */}
      <div 
        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: car.themeColor }}
      />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#6D3BFF]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar: Academy Badge & 5 Interactive Indian Car Tabs */}
      <div className="relative z-10 flex flex-col gap-2.5 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/15 px-2 py-0.5 rounded-full border border-[#D4AF37]/20 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" /> Golden Hands Fleet
            </span>
            <span className="text-[9px] text-slate-400 font-bold hidden xs:inline">• Indian Training Vehicles</span>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dual-Control Certified</span>
          </div>
        </div>

        {/* 5 Tab Options for Indian Cars */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollable-touch pb-0.5 custom-scrollbar">
          {INDIAN_CARS.map((c, idx) => {
            const isActive = idx === activeCarIndex;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCarIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                  isActive
                    ? "bg-white text-[#161623] shadow-md scale-102 border-white ring-1 ring-white/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/5 hover:border-white/15"
                }`}
              >
                <Car 
                  className={`w-3.5 h-3.5 ${
                    isActive ? "text-[#6D3BFF]" : "text-slate-400"
                  }`} 
                />
                <span>{c.name}</span>
                {isActive && (
                  <span 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: c.themeColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Side-by-Side Area */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 pt-3.5">
        {/* Left Side: Slogan, Information, Specs, Action Buttons */}
        <div className="flex-1 w-full md:pr-4 text-left">
          {/* Car Make & Category */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {car.make}
            </span>
            <span className="text-slate-600">•</span>
            <span 
              className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ backgroundColor: car.accentBg, color: car.themeColor }}
            >
              {car.category}
            </span>
          </div>

          {/* Bold Slogan */}
          <h2 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight">
            "{car.slogan}"
          </h2>

          {/* Sub-slogan / Description */}
          <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
            {car.subSlogan}
          </p>

          {/* Training Benefit Note */}
          <div className="mt-2.5 p-2 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2 text-[10px] text-slate-300">
            <Award className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              <strong className="text-white font-bold">Trainer Tip: </strong>
              {car.trainingBenefit}
            </span>
          </div>

          {/* Spec Pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-0.5">
            {car.specsList.map((spec, i) => (
              <span 
                key={i} 
                className="text-[9px] font-bold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1"
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                {spec}
              </span>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 mt-3.5 pt-1">
            <button
              onClick={() => onBookClass && onBookClass(`${car.make} ${car.name}`)}
              className="bg-[#6D3BFF] hover:bg-[#8F52FF] text-white text-[10.5px] font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-[#6D3BFF]/30 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Book in {car.name}</span>
            </button>

            <button
              onClick={onRtoTest}
              className="bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-[10.5px] font-bold px-3 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>RTO Test</span>
            </button>
          </div>
        </div>

        {/* Right Side: Car Photo & Controls (Side-by-Side Presentation) */}
        <div className="w-full md:w-auto shrink-0 flex flex-col items-center">
          <div className="relative w-full sm:w-72 md:w-64 h-40 sm:h-44 rounded-2xl bg-gradient-to-tr from-white/5 to-white/10 p-1.5 border border-white/15 backdrop-blur-md shadow-2xl overflow-hidden group/img">
            {/* Indian Flag Strip Overlay */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-bold text-white shadow-xs">
              <span className="text-[10px]">🇮🇳</span>
              <span>{car.name}</span>
            </div>

            {/* Badge Tag Top Right */}
            <div className="absolute top-2 right-2 z-20 bg-[#6D3BFF]/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15 text-[8.5px] font-extrabold text-white shadow-xs">
              {car.badge}
            </div>

            {/* Car Photo with multi-tier fallback */}
            <img 
              key={car.id}
              src={car.imageUrl} 
              alt={`${car.make} ${car.name}`} 
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.triedBackup) {
                  target.dataset.triedBackup = "1";
                  target.src = car.backupImageUrl;
                } else if (target.dataset.triedBackup === "1") {
                  target.dataset.triedBackup = "2";
                  target.src = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800";
                }
              }}
              className="w-full h-full object-cover rounded-xl drop-shadow-2xl transform group-hover/img:scale-105 transition-transform duration-500 animate-fadeIn"
            />

            {/* Subtle Gradient Shadow Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl pointer-events-none" />

            {/* Bottom Image Caption */}
            <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between text-[9px] font-mono text-slate-200">
              <span className="truncate">{car.spec}</span>
            </div>
          </div>

          {/* Interactive Navigation Chevrons & Dots */}
          <div className="flex items-center justify-between w-full max-w-[260px] mt-2 px-1 text-slate-400">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Previous Car"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 5 Dots Indicator */}
            <div className="flex items-center gap-1.5">
              {INDIAN_CARS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveCarIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    i === activeCarIndex 
                      ? "w-5 bg-[#D4AF37]" 
                      : "w-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to car ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Next Car"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
