import React, { useState } from "react";
import { ExternalLink, ShieldAlert, ArrowRight, X, Globe, Sparkles } from "lucide-react";

interface BnpLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const BnpTechLogoSVG: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => {
  return (
    <svg 
      viewBox="0 0 400 240" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BNP TECH Logo"
    >
      {/* Background glow / container */}
      <rect width="100%" height="100%" fill="transparent" />

      {/* Signature Cursive 'Bnp' */}
      <g transform="translate(40, 115)">
        {/* 'B' Calligraphy Main Loop & Stem */}
        <path 
          d="M 38,-75 C 22,-35 8,-5 0,38 C -2,44 4,47 10,43 C 25,35 46,12 52,-15 C 55,-28 42,-32 30,-28 C 45,-42 62,-65 52,-78 C 42,-88 30,-80 38,-75 Z" 
          fill="#0F172A" 
        />
        <path 
          d="M 12,-72 C 38,-65 92,-42 89,-12 C 86,10 52,18 20,24 C 62,22 105,10 112,-18 C 118,-42 82,-78 20,-82 C 10,-83 5,-75 12,-72 Z" 
          fill="#0F172A" 
        />
        
        {/* 'n' in Electric Royal Blue */}
        <path 
          d="M 96,6 C 100,-18 116,-35 130,-35 C 144,-35 148,-18 144,8 C 140,32 126,45 136,45 C 146,45 160,25 168,-2 C 170,-8 163,-12 158,-6 C 150,12 140,22 136,18 C 132,14 138,-12 142,-24 C 148,-46 128,-52 113,-38 C 100,-26 93,2 90,18 C 88,26 94,30 100,28 C 100,20 98,10 96,6 Z" 
          fill="#0052CC" 
        />
        
        {/* Blue Accent Underline */}
        <line x1="82" y1="56" x2="162" y2="56" stroke="#0052CC" strokeWidth="5" strokeLinecap="round" />

        {/* 'p' in Black with Descender */}
        <path 
          d="M 170,-15 C 176,-35 190,-48 204,-48 C 218,-48 226,-32 220,-8 C 213,18 193,34 180,32 C 170,30 166,12 168,-15 L 153,75 C 151,84 160,88 166,82 L 178,18 C 188,22 206,12 214,-10 C 222,-32 210,-60 190,-58 C 173,-56 160,-35 156,-12 C 153,2 163,4 170,-15 Z" 
          fill="#0F172A" 
        />
        
        {/* Extended Signature Flourish */}
        <path 
          d="M 192,5 C 218,-15 258,-28 312,-12 C 319,-9 321,-18 313,-20 C 254,-38 208,-22 182,-2 C 177,3 185,10 192,5 Z" 
          fill="#0F172A" 
        />
      </g>

      {/* 'BNP TECH' Base Typography */}
      <g transform="translate(195, 205)" textAnchor="middle">
        {/* BNP in Royal Blue */}
        <text x="-65" y="0" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fontSize="22" fontWeight="900" letterSpacing="6" fill="#0052CC">BNP</text>
        
        {/* T */}
        <text x="35" y="0" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fontSize="22" fontWeight="900" fill="#0F172A">T</text>
        
        {/* Stylized 3-bar E */}
        <g transform="translate(68, -17)">
          <line x1="0" y1="2" x2="16" y2="2" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="0" y1="9" x2="14" y2="9" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="0" y1="16" x2="16" y2="16" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round"/>
        </g>
        
        {/* C */}
        <text x="108" y="0" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fontSize="22" fontWeight="900" fill="#0F172A">C</text>
        
        {/* H */}
        <text x="142" y="0" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fontSize="22" fontWeight="900" fill="#0F172A">H</text>
      </g>
    </svg>
  );
};

export default function BnpLogoButton({ 
  className = "",
  size = "md",
  showLabel = false
}: BnpLogoProps) {
  const [showExitModal, setShowExitModal] = useState(false);
  const CREATOR_URL = "https://bnpt.vercel.app/";

  const handleOpenCreator = () => {
    setShowExitModal(false);
    // Open in separate browser / new tab window
    try {
      window.open(CREATOR_URL, "_blank", "noopener,noreferrer");
    } catch (e) {
      window.location.href = CREATOR_URL;
    }
  };

  const sizeClasses = {
    sm: "h-8 px-2 min-w-[38px]",
    md: "h-9.5 px-2.5 min-w-[44px]",
    lg: "h-11 px-3 min-w-[52px]"
  };

  return (
    <>
      {/* Interactive BNP TECH Logo Badge / Button */}
      <button
        id="btn-bnp-tech-creator-logo"
        type="button"
        onClick={() => setShowExitModal(true)}
        className={`group relative flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-[#0052CC]/40 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-95 overflow-hidden ${sizeClasses[size]} ${className}`}
        title="Creator Profile: BNP TECH (Click to visit https://bnpt.vercel.app/)"
        aria-label="BNP TECH Creator Logo - Click to visit creator website"
      >
        {/* Subtle hover gradient indicator */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Crisp BNP TECH Vector Logo */}
        <div className="h-6 sm:h-7 w-auto aspect-[5/3] flex items-center justify-center shrink-0">
          <BnpTechLogoSVG className="w-full h-full object-contain filter drop-shadow-xs" />
        </div>

        {showLabel && (
          <span className="text-[10px] font-black tracking-wider text-[#0052CC] uppercase hidden xs:inline-block">
            BNP TECH
          </span>
        )}

        {/* Small External Link indicator */}
        <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-[#0052CC] transition-colors shrink-0 -ml-0.5" />
      </button>

      {/* Exit & Redirect Confirmation Modal */}
      {showExitModal && (
        <div 
          id="modal-bnp-exit-confirmation"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExitModal(false);
          }}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center relative animate-scaleUp overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-modal-title"
          >
            {/* Top Decorative Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0052CC] via-[#0B63E5] to-[#6D3BFF]" />

            {/* Close Button */}
            <button
              id="btn-close-exit-modal"
              type="button"
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cancel and stay"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Centered BNP Tech Logo Branding */}
            <div className="w-24 h-14 mx-auto mb-3 p-1 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-center shadow-inner">
              <BnpTechLogoSVG className="w-full h-full object-contain" />
            </div>

            {/* Modal Title */}
            <h3 
              id="exit-modal-title" 
              className="text-lg font-black text-slate-900 tracking-tight mb-2"
            >
              Exit to Creator Page?
            </h3>

            {/* User Prompt Message */}
            <p className="text-xs text-slate-600 leading-relaxed mb-4 px-2">
              Are you sure you want to exit from this app and go to the creator page?
            </p>

            {/* Destination URL Box */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3 mb-5 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#0052CC] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">BNP TECH Official Site</p>
                  <p className="text-xs font-extrabold text-[#0052CC] truncate">https://bnpt.vercel.app/</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#0052CC] shrink-0 ml-2" />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-cancel-exit"
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                No, Stay Here
              </button>

              <button
                id="btn-confirm-exit"
                type="button"
                onClick={handleOpenCreator}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0052CC] to-[#0B63E5] hover:from-[#0041a3] hover:to-[#0052CC] text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
              >
                <span>Yes, Proceed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Footer note */}
            <p className="text-[9.5px] text-slate-400 mt-4">
              The creator portfolio will open in your device's default browser.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
