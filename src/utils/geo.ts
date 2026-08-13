/**
 * Geolocation & Distance Helper Utilities
 */

// Calculate distance between two GPS coordinates using Haversine formula
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place e.g., 2.4 km
}

// Calculate ETA in minutes based on distance and average driving speed
export function calculateEtaMinutes(
  distanceKm: number,
  speedKmH: number = 25
): number {
  if (distanceKm <= 0.05) return 0;
  
  // Default city driving speed if trainer is stationary or speed is low
  const effectiveSpeed = speedKmH > 5 ? speedKmH : 25;
  const timeInHours = distanceKm / effectiveSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  return Math.max(1, timeInMinutes);
}

// Format relative time e.g., "Just now", "10s ago", "2m ago"
export function formatTimeAgo(timestamp: number | string | undefined): string {
  if (!timestamp) return "Unknown";
  
  const timeMs = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  const diffSec = Math.floor((Date.now() - timeMs) / 1000);
  
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

// Default Bhubaneswar coordinates (Rasulgarh Square)
export const DEFAULT_BHUBANESWAR_LOCATION = {
  lat: 20.2961,
  lng: 85.8245,
  name: "Rasulgarh Square, Bhubaneswar"
};

// Map Bhubaneswar location landmark string to coordinates
export function getCoordinatesFromLocation(locationStr?: string): { lat: number; lng: number } {
  if (!locationStr) return DEFAULT_BHUBANESWAR_LOCATION;
  
  const locLower = locationStr.toLowerCase();
  
  if (locLower.includes("patia") || locLower.includes("kiit")) {
    return { lat: 20.3533, lng: 85.8188 };
  }
  if (locLower.includes("jaydev") || locLower.includes("jaidev")) {
    return { lat: 20.3010, lng: 85.8190 };
  }
  if (locLower.includes("saheed")) {
    return { lat: 20.2885, lng: 85.8390 };
  }
  if (locLower.includes("rasulgarh")) {
    return { lat: 20.2961, lng: 85.8245 };
  }
  if (locLower.includes("khandagiri")) {
    return { lat: 20.2520, lng: 85.7870 };
  }
  if (locLower.includes("nayapalli")) {
    return { lat: 20.2980, lng: 85.8080 };
  }
  if (locLower.includes("chandrasekharpur") || locLower.includes("cs pur")) {
    return { lat: 20.3250, lng: 85.8150 };
  }
  if (locLower.includes("master canteen") || locLower.includes("station")) {
    return { lat: 20.2650, lng: 85.8400 };
  }
  if (locLower.includes("old town")) {
    return { lat: 20.2400, lng: 85.8330 };
  }
  
  return DEFAULT_BHUBANESWAR_LOCATION;
}
