import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowDown, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  disabled?: boolean;
  id?: string;
  pullThreshold?: number;
  maxPull?: number;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  dark = false,
  disabled = false,
  id = "pull-to-refresh-container",
  pullThreshold = 65,
  maxPull = 110,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const reachedThresholdRef = useRef(false);
  const refreshingHeight = 52;

  // Track touch starts
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only allow pull-down if container (or window) is at top scroll position
    const scrollTop = container.scrollTop;
    if (scrollTop <= 2) {
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = true;
      reachedThresholdRef.current = false;
    } else {
      isPullingRef.current = false;
    }
  };

  // Track touch move with rubber-band damping
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing || !isPullingRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    // Check if still at top
    if (container.scrollTop > 2) {
      isPullingRef.current = false;
      setPullDistance(0);
      setIsDragging(false);
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startYRef.current;
    const deltaX = currentX - startXRef.current;

    // If horizontal scroll is dominant, cancel pull-to-refresh so carousels work smoothly
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10 && pullDistance === 0) {
      isPullingRef.current = false;
      return;
    }

    // Only handle downward drag
    if (deltaY > 0) {
      // Elastic rubber-banding formula
      const dampedDistance = Math.min(maxPull, Math.pow(deltaY, 0.82) * 0.75);
      setPullDistance(dampedDistance);
      setIsDragging(true);

      // Trigger light haptic when crossing the threshold
      if (dampedDistance >= pullThreshold && !reachedThresholdRef.current) {
        reachedThresholdRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch {
            // Ignore if vibration is disallowed
          }
        }
      } else if (dampedDistance < pullThreshold && reachedThresholdRef.current) {
        reachedThresholdRef.current = false;
      }
    } else {
      setPullDistance(0);
      setIsDragging(false);
    }
  };

  // Handle touch end / release
  const handleTouchEnd = async () => {
    if (disabled || isRefreshing || !isPullingRef.current) return;

    isPullingRef.current = false;
    setIsDragging(false);

    if (pullDistance >= pullThreshold) {
      // Threshold reached -> trigger refresh action
      setIsRefreshing(true);
      setPullDistance(refreshingHeight);

      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.warn("[PullToRefresh] Error during refresh handler:", err);
      }

      // Show completed state briefly
      setIsCompleted(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([10, 30, 15]);
        } catch {
          // Ignore
        }
      }

      setTimeout(() => {
        setIsCompleted(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      // Revert smoothly without refresh
      setPullDistance(0);
    }
  };

  // Progress percentage (0 to 1)
  const progress = Math.min(1, pullDistance / pullThreshold);
  const isPastThreshold = pullDistance >= pullThreshold;

  return (
    <div
      id={id}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative flex flex-col w-full h-full overscroll-y-contain ${className}`}
    >
      {/* Pull-down Visual Indicator Pill */}
      <div
        id={`${id}-indicator`}
        style={{
          height: `${pullDistance}px`,
          transition: isDragging ? "none" : "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="w-full overflow-hidden shrink-0 flex items-center justify-center pointer-events-none select-none z-30"
      >
        <div
          style={{
            opacity: pullDistance > 12 ? Math.min(1, (pullDistance - 10) / 25) : 0,
            transform: `scale(${Math.min(1, 0.7 + progress * 0.3)})`,
            transition: isDragging ? "none" : "all 0.25s ease-out",
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-lg border text-xs font-bold transition-colors ${
            dark
              ? isPastThreshold || isRefreshing
                ? "bg-slate-800/95 text-[#D4AF37] border-[#D4AF37]/40 shadow-black/50"
                : "bg-slate-900/90 text-slate-300 border-white/10 shadow-black/40"
              : isPastThreshold || isRefreshing
              ? "bg-white/95 text-[#6D3BFF] border-[#6D3BFF]/30 shadow-[#6D3BFF]/10"
              : "bg-white/90 text-slate-600 border-slate-200 shadow-slate-200/50"
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-scaleIn shrink-0" />
              <span className="text-[11px] font-extrabold text-emerald-600">Updated!</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6D3BFF] shrink-0" />
              <span className="text-[10.5px] font-extrabold tracking-tight">Syncing with Cloud...</span>
            </>
          ) : (
            <>
              <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                {/* SVG Progress Ring */}
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeOpacity={0.2}
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke={dark ? "#D4AF37" : "#6D3BFF"}
                    strokeWidth="2.5"
                    strokeDasharray={56.5}
                    strokeDashoffset={56.5 * (1 - progress)}
                    strokeLinecap="round"
                    className="transition-all duration-75"
                  />
                </svg>
                <ArrowDown
                  className={`w-2.5 h-2.5 absolute transition-transform duration-200 ${
                    isPastThreshold ? "rotate-180 text-[#D4AF37]" : "text-current"
                  }`}
                />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                {isPastThreshold ? "Release to sync" : "Pull to refresh"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Child Scrollable Content */}
      <div className="flex-1 flex flex-col min-h-0 w-full relative">
        {children}
      </div>
    </div>
  );
}
