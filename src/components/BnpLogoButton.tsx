import React, { useState } from "react";
import { ExternalLink, ShieldAlert, ArrowRight, X, Globe, Sparkles } from "lucide-react";

interface BnpLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const BnpTechLogoSVG: React.FC<{ className?: string; inverted?: boolean }> = ({ 
  className = "w-full h-full",
  inverted = false
}) => {
  const darkColor = inverted ? "#FFFFFF" : "#0F172A";
  const blueColor = "#0052CC";

  return (
    <svg 
      viewBox="0 0 540 340" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BNP TECH Official Logo"
    >
      <defs>
        {/* Subtle drop shadow for premium vector fidelity */}
        <filter id="bnp-logo-subtle-glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.06" />
        </filter>
      </defs>

      <g filter="url(#bnp-logo-subtle-glow)">
        {/* ========================================================================= */}
        {/* 1. SIGNATURE CURSIVE "B" (Solid Deep Charcoal / Black)                    */}
        {/* ========================================================================= */}
        {/* Large sweeping entry loop from bottom-left swooping up to top ascender */}
        <path 
          d="M 102 228 C 122 216 160 190 190 156 C 218 124 238 88 238 58 C 238 34 218 20 188 22 C 146 25 110 68 84 122 C 64 162 52 208 52 242 C 52 258 64 266 82 258 C 114 244 162 206 208 152 C 220 138 214 126 194 136 C 154 156 112 188 88 212 C 82 218 78 214 82 206 C 98 174 134 104 168 56 C 182 36 196 28 206 32 C 214 36 218 48 212 68 C 196 116 142 200 102 228 Z" 
          fill={darkColor} 
        />

        {/* Dynamic 'B' Main Diagonal Spine & Double Head Loops */}
        <path 
          d="M 120 178 C 160 162 206 148 248 136 C 266 131 278 120 274 106 C 268 88 242 76 204 82 C 180 86 156 96 136 108 C 130 112 126 104 132 98 C 158 74 198 58 238 60 C 272 62 290 80 286 104 C 282 124 260 138 232 146 C 258 144 282 152 284 168 C 286 186 264 204 228 214 C 182 226 132 230 92 232 C 84 232 82 224 88 220 C 132 192 184 176 230 170 C 252 167 262 159 260 149 C 258 138 244 134 224 138 C 188 145 152 158 120 178 Z" 
          fill={darkColor} 
        />

        {/* Lower flourish sweep of the B tail */}
        <path 
          d="M 92 232 C 60 238 42 220 48 190 C 54 162 76 134 98 108 C 102 103 108 108 104 114 C 84 138 66 164 62 186 C 58 204 68 214 90 208 C 104 204 116 196 124 190 C 128 187 132 193 128 197 C 118 208 106 220 92 232 Z" 
          fill={darkColor} 
        />

        {/* ========================================================================= */}
        {/* 2. CURSIVE "n" (Signature Electric / Royal Blue)                          */}
        {/* ========================================================================= */}
        {/* Smooth calligraphic dual-arch cursive 'n' */}
        <path 
          d="M 234 174 C 242 154 252 136 264 124 C 274 114 284 112 292 118 C 300 124 300 138 294 154 L 284 180 C 282 185 288 189 292 184 C 304 168 316 142 328 126 C 336 116 346 114 354 120 C 362 126 362 140 354 158 C 344 182 334 198 344 200 C 352 202 366 186 376 166 C 379 160 386 163 384 169 C 372 194 352 214 336 210 C 320 206 324 184 334 160 C 340 146 344 136 340 132 C 336 128 328 132 320 144 C 306 164 294 194 280 208 C 272 216 262 210 264 196 L 274 168 C 278 156 280 144 276 140 C 272 136 264 142 256 154 C 246 169 238 186 230 200 C 226 206 218 202 222 194 C 226 187 230 180 234 174 Z" 
          fill={blueColor} 
        />

        {/* ========================================================================= */}
        {/* 3. BLUE HORIZONTAL UNDERLINE ACCENT                                       */}
        {/* ========================================================================= */}
        <path 
          d="M 216 226 C 248 224 286 224 322 226 C 326 226 326 230 322 230 C 286 230 248 230 216 228 C 212 228 212 226 216 226 Z" 
          fill={blueColor} 
          stroke={blueColor} 
          strokeWidth="3.5" 
          strokeLinecap="round" 
        />

        {/* ========================================================================= */}
        {/* 4. SIGNATURE CURSIVE "p" WITH LONG DESCENT & EXTENDED RIGHT FLOURISH      */}
        {/* ========================================================================= */}
        {/* 'p' Ascending loop and dramatic sharp downward spear stroke */}
        <path 
          d="M 374 168 C 382 144 394 122 410 108 C 424 96 438 98 444 110 C 450 124 446 144 432 166 C 418 188 398 204 382 208 L 340 300 C 336 308 326 304 328 296 L 372 196 C 366 186 364 172 374 168 Z M 428 128 C 424 118 416 118 406 128 C 394 140 384 158 378 176 C 390 172 406 160 418 146 C 426 138 430 132 428 128 Z" 
          fill={darkColor} 
        />

        {/* Dynamic sweeping right horizontal calligraphy flourish from the p */}
        <path 
          d="M 392 186 C 416 164 456 142 506 142 C 520 142 530 145 526 149 C 520 153 502 156 480 162 C 444 172 412 188 388 204 C 382 208 378 202 384 196 C 386 192 389 189 392 186 Z" 
          fill={darkColor} 
        />

        {/* ========================================================================= */}
        {/* 5. TYPOGRAPHY "B N P   T E C H" (Modern Geometric Font with 3-Bar E)     */}
        {/* ========================================================================= */}
        <g transform="translate(142, 286)">
          {/* 'B N P' in Royal Blue with wide letter spacing */}
          <text 
            x="0" 
            y="0" 
            fontFamily="'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif" 
            fontSize="26" 
            fontWeight="900" 
            letterSpacing="9" 
            fill={blueColor}
          >
            BNP
          </text>

          {/* 'T' in Solid Black */}
          <text 
            x="132" 
            y="0" 
            fontFamily="'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif" 
            fontSize="26" 
            fontWeight="900" 
            fill={darkColor}
          >
            T
          </text>

          {/* Stylized Futuristic 3-Bar 'E' (T ≡ C H) */}
          <g transform="translate(168, -20)">
            <line x1="0" y1="2.5" x2="20" y2="2.5" stroke={darkColor} strokeWidth="4.2" strokeLinecap="square" />
            <line x1="0" y1="10.5" x2="16.5" y2="10.5" stroke={darkColor} strokeWidth="4.2" strokeLinecap="square" />
            <line x1="0" y1="18.5" x2="20" y2="18.5" stroke={darkColor} strokeWidth="4.2" strokeLinecap="square" />
          </g>

          {/* 'C' in Solid Black */}
          <text 
            x="212" 
            y="0" 
            fontFamily="'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif" 
            fontSize="26" 
            fontWeight="900" 
            fill={darkColor}
          >
            C
          </text>

          {/* 'H' in Solid Black */}
          <text 
            x="254" 
            y="0" 
            fontFamily="'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif" 
            fontSize="26" 
            fontWeight="900" 
            fill={darkColor}
          >
            H
          </text>
        </g>
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
