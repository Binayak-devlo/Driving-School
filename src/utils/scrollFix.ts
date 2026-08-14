/**
 * Prevents accidental pull-to-refresh / page reloads in Android WebView, 
 * Capacitor, and mobile browsers while preserving silky smooth two-way scrolling.
 */
export function setupScrollFix() {
  if (typeof window === 'undefined') return;

  let startY = 0;
  let startX = 0;

  // Helper to determine if an element is vertically scrollable
  const isScrollable = (el: HTMLElement): boolean => {
    const hasScrollableContent = el.scrollHeight > el.clientHeight;
    if (!hasScrollableContent) return false;
    const overflowY = window.getComputedStyle(el).overflowY;
    return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  };

  // Find if any scrollable parent can scroll upwards (has scrollTop > 0)
  const canParentScrollUp = (target: HTMLElement | null): boolean => {
    let current: HTMLElement | null = target;
    while (current && current !== document.body && current !== document.documentElement) {
      if (isScrollable(current) && current.scrollTop > 0) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  };

  window.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches && e.touches.length === 1) {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (!e.touches || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;

      // Only handle predominantly vertical downward swipes (finger moving down = scrolling up)
      if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        const target = e.target as HTMLElement | null;
        
        // If an ancestor has scrollTop > 0, normal upward scrolling is underway; do not block
        if (canParentScrollUp(target)) {
          return;
        }

        // If window itself has scroll
        const windowScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        if (windowScrollY > 0) {
          return;
        }

        // At this point, the user is already at the very top (scrollTop === 0)
        // and continuing to drag downward would trigger Android WebView pull-to-refresh.
        // We cancel this overscroll event to prevent the browser/WebView reload.
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );
}
