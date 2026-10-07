import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowDown, RefreshCw, CheckCircle2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  disabled?: boolean;
  id?: string;
  pullThreshold?: number;
  maxPull?: number;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  dark = false,
  disabled = false,
  id = "pull-to-refresh-container",
  pullThreshold = 65,
  maxPull = 120,
  onScroll,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const reachedThresholdRef = useRef(false);
  const refreshingHeight = 52;
  const isRefreshingRef = useRef(false);

  // Sync ref
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Handle start of touch/pointer
  const handleStart = useCallback((clientY: number, clientX: number, target?: EventTarget | null) => {
    if (disabled || isRefreshingRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    // If the touch or click originated inside a nested scrollable element or data-no-ptr, skip PTR
    if (target && target instanceof Element) {
      const nestedScrollable = target.closest('[data-no-ptr="true"], .overflow-y-auto, .overflow-y-scroll, textarea, input');
      if (nestedScrollable && nestedScrollable !== container) {
        isPullingRef.current = false;
        return;
      }
    }

    // Check if container is at or very near the top scroll position
    const scrollTop = container.scrollTop;
    if (scrollTop <= 4) {
      startYRef.current = clientY;
      startXRef.current = clientX;
      isPullingRef.current = true;
      reachedThresholdRef.current = false;
    } else {
      isPullingRef.current = false;
    }
  }, [disabled]);

  // Handle dragging / moving
  const handleMove = useCallback((clientY: number, clientX: number, e?: Event) => {
    if (disabled || isRefreshingRef.current || !isPullingRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    // If user has scrolled down, abort pull
    if (container.scrollTop > 4) {
      isPullingRef.current = false;
      setPullDistance(0);
      setIsDragging(false);
      return;
    }

    const deltaY = clientY - startYRef.current;
    const deltaX = clientX - startXRef.current;

    // If horizontal scroll is dominant at the beginning, cancel pull so carousels/swiping works smoothly
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8 && pullDistance === 0) {
      isPullingRef.current = false;
      return;
    }

    // Only handle downward pull
    if (deltaY > 0) {
      // Prevent browser native pull-to-refresh or outer scrolling
      if (e && e.cancelable) {
        e.preventDefault();
      }

      // Elastic rubber-band resistance curve
      const dampedDistance = Math.min(maxPull, Math.pow(deltaY, 0.84) * 0.85);
      setPullDistance(dampedDistance);
      setIsDragging(true);

      // Trigger subtle haptic vibration when crossing threshold
      if (dampedDistance >= pullThreshold && !reachedThresholdRef.current) {
        reachedThresholdRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch {
            // Ignore
          }
        }
      } else if (dampedDistance < pullThreshold && reachedThresholdRef.current) {
        reachedThresholdRef.current = false;
      }
    } else {
      setPullDistance(0);
      setIsDragging(false);
    }
  }, [disabled, maxPull, pullDistance, pullThreshold]);

  // Handle release / end
  const handleEnd = useCallback(async () => {
    if (disabled || isRefreshingRef.current || !isPullingRef.current) return;

    isPullingRef.current = false;
    setIsDragging(false);

    if (pullDistance >= pullThreshold) {
      // Threshold reached -> trigger active refresh
      setIsRefreshing(true);
      setPullDistance(refreshingHeight);

      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.warn("[PullToRefresh] Error during refresh execution:", err);
      }

      // Show completion confirmation state
      setIsCompleted(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([10, 30, 15]);
        } catch {
          // Ignore
        }
      }

      // Smoothly snap back after brief completion display
      setTimeout(() => {
        setIsCompleted(false);
        setIsRefreshing(false);
        setPullDistance(0);
      }, 550);
    } else {
      // Snap back smoothly without refresh
      setPullDistance(0);
    }
  }, [disabled, onRefresh, pullDistance, pullThreshold]);

  // Register non-passive native touch event listeners on container for reliable mobile capture
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientY, e.touches[0].clientX, e.target);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientY, e.touches[0].clientX, e);
      }
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    const onTouchCancel = () => {
      handleEnd();
    };

    // Important: { passive: false } allows preventDefault() when user pulls down at top of view
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchCancel, { passive: true });

    // Pointer events for desktop emulator & mouse testing
    let isPointerDown = false;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target instanceof Element) {
        const nested = e.target.closest('[data-no-ptr="true"], .overflow-y-auto, .overflow-y-scroll, textarea, input, button, select');
        if (nested && nested !== container) {
          return;
        }
      }
      isPointerDown = true;
      handleStart(e.clientY, e.clientX, e.target);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      handleMove(e.clientY, e.clientX, e);
    };

    const onPointerUp = () => {
      if (isPointerDown) {
        isPointerDown = false;
        handleEnd();
      }
    };

    const onPointerCancel = () => {
      if (isPointerDown) {
        isPointerDown = false;
        handleEnd();
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);

      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [handleStart, handleMove, handleEnd]);

  // Calculate pull progress (0.0 to 1.0)
  const progress = Math.min(1, pullDistance / pullThreshold);
  const isPastThreshold = pullDistance >= pullThreshold;

  // Active translation distance for content
  const activeTranslateY = isRefreshing ? refreshingHeight : pullDistance;

  return (
    <div
      id={id}
      ref={containerRef}
      onScroll={onScroll}
      style={{
        overscrollBehaviorY: "contain",
        touchAction: "pan-y pan-x",
      }}
      className={`relative w-full h-full overscroll-contain select-none ${className}`}
    >
      {/* Floating Refresh Indicator Pill */}
      <div
        id={`${id}-indicator`}
        style={{
          transform: `translateY(${Math.min(activeTranslateY, 68)}px)`,
          opacity: pullDistance > 8 || isRefreshing ? 1 : 0,
          transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className="absolute top-[-44px] left-0 right-0 z-40 flex items-center justify-center pointer-events-none"
      >
        <div
          style={{
            transform: `scale(${Math.min(1, 0.75 + progress * 0.25)})`,
            transition: isDragging ? "none" : "transform 0.25s ease-out",
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-xl border text-xs font-bold transition-all backdrop-blur-md ${
            dark
              ? isPastThreshold || isRefreshing
                ? "bg-slate-800/95 text-[#D4AF37] border-[#D4AF37]/50 shadow-black/70 ring-1 ring-[#D4AF37]/20"
                : "bg-slate-900/95 text-slate-300 border-white/10 shadow-black/60"
              : isPastThreshold || isRefreshing
              ? "bg-white/98 text-[#6D3BFF] border-[#6D3BFF]/40 shadow-[#6D3BFF]/15 ring-1 ring-[#6D3BFF]/20"
              : "bg-white/95 text-slate-700 border-slate-200 shadow-slate-300/50"
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
              <span className="text-[11px] font-extrabold tracking-tight">Syncing data...</span>
            </>
          ) : (
            <>
              <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                {/* SVG Radial Progress Ring */}
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeOpacity={0.25}
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
                {isPastThreshold ? "Release to sync" : "Pull down to refresh"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Child Content with physical rubber-band displacement */}
      <div
        ref={contentWrapperRef}
        style={{
          transform: `translateY(${activeTranslateY}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: isDragging || isRefreshing ? "transform" : "auto",
        }}
        className="w-full min-h-full flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}
