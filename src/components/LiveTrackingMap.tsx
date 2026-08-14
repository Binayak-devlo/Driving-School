import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import { TrackingStatus } from '../types';
import { DEFAULT_BHUBANESWAR_LOCATION, calculateDistanceKm, calculateEtaMinutes } from '../utils/geo';

interface LiveTrackingMapProps {
  trainerLat?: number;
  trainerLng?: number;
  trainerHeading?: number;
  trainerName: string;
  carPlate?: string; // Kept optional for backward compatibility, never rendered on map
  studentLat?: number;
  studentLng?: number;
  studentName: string;
  pickupLocationName?: string;
  status: TrackingStatus;
  locationUnavailable?: boolean;
  lastUpdatedAt?: string | number;
  onMetricsUpdate?: (distKm: number, etaMin: number) => void;
  onRefresh?: () => void;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  trainerLat,
  trainerLng,
  trainerName,
  studentLat = DEFAULT_BHUBANESWAR_LOCATION.lat,
  studentLng = DEFAULT_BHUBANESWAR_LOCATION.lng,
  studentName,
  status,
  locationUnavailable = false,
  lastUpdatedAt,
  onMetricsUpdate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainerMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const lastRoutedCoordsRef = useRef<{ tLat: number; tLng: number; sLat: number; sLng: number } | null>(null);
  const lastStudentIconKeyRef = useRef<string>('');
  const lastTrainerIconKeyRef = useRef<string>('');
  const hasInitialFitRef = useRef<boolean>(false);
  const userInteractedRef = useRef<boolean>(false);
  const [hasUserPanned, setHasUserPanned] = useState(false);

  // Live tick timer to detect stale location in real time
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isStale = (() => {
    if (locationUnavailable) return true;
    if (!lastUpdatedAt) return false;
    const lastMs = typeof lastUpdatedAt === 'string' ? new Date(lastUpdatedAt).getTime() : Number(lastUpdatedAt);
    if (isNaN(lastMs)) return false;
    return (nowMs - lastMs) > 60000; // 60 seconds stale threshold (2x the 30-second live GPS refresh cycle)
  })();

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = trainerLat || studentLat || DEFAULT_BHUBANESWAR_LOCATION.lat;
    const initialLng = trainerLng || studentLng || DEFAULT_BHUBANESWAR_LOCATION.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // Track user drag/zoom interaction to avoid interrupting smooth user exploration
    map.on('dragstart zoomstart', () => {
      userInteractedRef.current = true;
      setHasUserPanned(true);
    });

    // Dark sleek map tiles with reliable OSM fallback
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Multiple delayed size invalidation calls to ensure map renders fully after container layout mounts
    const t1 = setTimeout(() => {
      try { mapInstanceRef.current?.invalidateSize({ animate: false }); } catch (e) {}
    }, 50);

    const t2 = setTimeout(() => {
      try { mapInstanceRef.current?.invalidateSize({ animate: false }); } catch (e) {}
    }, 200);

    const t3 = setTimeout(() => {
      try { mapInstanceRef.current?.invalidateSize({ animate: false }); } catch (e) {}
    }, 500);

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current && mapContainerRef.current) {
        try {
          mapInstanceRef.current.invalidateSize({ animate: false });
        } catch (e) {}
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          if (trainerMarkerRef.current) {
            mapInstanceRef.current.removeLayer(trainerMarkerRef.current);
            trainerMarkerRef.current = null;
          }
          if (studentMarkerRef.current) {
            mapInstanceRef.current.removeLayer(studentMarkerRef.current);
            studentMarkerRef.current = null;
          }
          if (routePolylineRef.current) {
            mapInstanceRef.current.removeLayer(routePolylineRef.current);
            routePolylineRef.current = null;
          }
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('[LiveTrackingMap] Leaflet cleanup notice:', e);
        }
        mapInstanceRef.current = null;
      }
      lastStudentIconKeyRef.current = '';
      lastTrainerIconKeyRef.current = '';
    };
  }, []);

  // Update markers and route polyline when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapContainerRef.current) return;

    const hasTrainerCoords = typeof trainerLat === 'number' && typeof trainerLng === 'number' && !isNaN(trainerLat) && !isNaN(trainerLng);
    const hasStudentCoords = typeof studentLat === 'number' && typeof studentLng === 'number' && !isNaN(studentLat) && !isNaN(studentLng);

    // 1. Student Marker
    if (hasStudentCoords) {
      const studentNameShort = studentName ? studentName.split(' ')[0] : 'Pickup Spot';
      const studentIconKey = `student_${studentNameShort}`;

      const createStudentIcon = () => {
        return L.divIcon({
          className: 'custom-student-marker',
          html: `
            <div class="relative flex flex-col items-center group select-none" style="filter: drop-shadow(0 8px 12px rgba(0,0,0,0.35));">
              <div class="absolute -top-1 w-10 h-10 rounded-full bg-[#6D3BFF]/25 animate-ping pointer-events-none"></div>
              <div class="w-9 h-9 bg-gradient-to-tr from-[#6D3BFF] to-[#8F52FF] border-2 border-white rounded-2xl flex items-center justify-center shadow-lg text-white font-bold text-xs">
                📍
              </div>
              <div class="w-2 h-2 bg-[#6D3BFF] transform rotate-45 -mt-1 shadow-md"></div>
              <div class="bg-[#161623] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-lg mt-1 border border-white/20 whitespace-nowrap flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span>${studentNameShort}</span>
              </div>
            </div>
          `,
          iconSize: [44, 56],
          iconAnchor: [22, 28],
        });
      };

      if (!studentMarkerRef.current) {
        studentMarkerRef.current = L.marker([studentLat, studentLng], { icon: createStudentIcon() }).addTo(map);
        lastStudentIconKeyRef.current = studentIconKey;
      } else {
        studentMarkerRef.current.setLatLng([studentLat, studentLng]);
        if (lastStudentIconKeyRef.current !== studentIconKey) {
          studentMarkerRef.current.setIcon(createStudentIcon());
          lastStudentIconKeyRef.current = studentIconKey;
        }
      }
    }

    // 2. Custom Trainer Sports Car Location Marker
    if (hasTrainerCoords) {
      const isUnavailable = isStale || status === 'WAITING' || status === 'CLASS_COMPLETED';
      const trainerLabel = trainerName ? (trainerName.startsWith('Coach ') ? trainerName : `Coach ${trainerName}`) : 'Trainer';
      const trainerIconKey = `trainer_sportscar_${trainerLabel}_${isUnavailable}`;

      const createSportsCarTrainerIcon = () => {
        return L.divIcon({
          className: 'custom-trainer-marker',
          html: `
            <div class="relative flex flex-col items-center select-none" style="filter: drop-shadow(0 10px 16px rgba(0,0,0,0.4));">
              <!-- Live Radar Wave Pulse Rings for Active Location -->
              ${!isUnavailable ? `
                <div class="absolute -top-1.5 w-14 h-14 rounded-full bg-amber-400/25 animate-ping pointer-events-none"></div>
                <div class="absolute -top-0.5 w-12 h-12 rounded-full bg-amber-500/20 animate-pulse pointer-events-none"></div>
              ` : ''}

              <!-- Custom Trainer Sports Car Marker Badge -->
              <div class="relative z-10 w-12 h-12 rounded-2xl ${
                isUnavailable 
                  ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-slate-500 text-slate-400' 
                  : 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 border-amber-200 text-white'
              } border-2 flex items-center justify-center shadow-2xl transition-transform transform hover:scale-110">
                
                <!-- High-detail Sports Car Vector Graphic -->
                <svg viewBox="0 0 40 24" class="w-8 h-5 filter drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Aerodynamic Sports Car Chassis & Roofline -->
                  <path d="M4 15C4 13.5 5.5 12 8 12L13 12L19 7C20.5 5.5 25 5 29 5L32 6.5C35 8 37 10 38 12.5L38 15C38 16.5 37 17.5 35 17.5L33 17.5C32 15.5 29.5 14 27 14C24.5 14 22 15.5 21 17.5L16 17.5C15 15.5 12.5 14 10 14C7.5 14 5 15.5 4 17.5L3 17.5C2 17.5 1 16.5 1 15.5L1 14.5C1 14 1.5 13.5 2.5 13.5L4 15Z" fill="currentColor"/>
                  
                  <!-- Tinted Windshield & Side Windows -->
                  <path d="M15 11.5L20 7.5C21 6.5 24.5 6 27.5 6L30 7.5L32 11.5H15Z" fill="#38BDF8" opacity="0.95"/>
                  
                  <!-- Rear GT Sports Spoiler / Wing -->
                  <path d="M5 9.5L10 9.5L9 12L4 12Z" fill="#1E1B4B" opacity="0.85"/>
                  
                  <!-- Front LED Projector Headlights -->
                  <path d="M35 12.5L38.5 13.5L36 15Z" fill="#FEF08A"/>
                  
                  <!-- Sports Alloy Wheels -->
                  <circle cx="10" cy="18" r="3.2" fill="#0F172A" stroke="#FFFFFF" stroke-width="1.2"/>
                  <circle cx="27" cy="18" r="3.2" fill="#0F172A" stroke="#FFFFFF" stroke-width="1.2"/>
                  <circle cx="10" cy="18" r="1.3" fill="#F59E0B"/>
                  <circle cx="27" cy="18" r="1.3" fill="#F59E0B"/>
                </svg>

                <!-- Live Status Indicator -->
                <div class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${isUnavailable ? 'bg-slate-500' : 'bg-emerald-400'} border-2 border-slate-950 flex items-center justify-center">
                  <span class="w-1.5 h-1.5 rounded-full ${isUnavailable ? 'bg-slate-300' : 'bg-white'}"></span>
                </div>
              </div>

              <!-- Marker Arrow Pointer -->
              <div class="w-2.5 h-2.5 ${isUnavailable ? 'bg-slate-800' : 'bg-orange-600'} transform rotate-45 -mt-1 shadow-md"></div>

              <!-- Trainer Label Badge (Strictly NO car/registration numbers) -->
              <div class="bg-slate-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xl mt-1 border ${
                isUnavailable ? 'border-slate-700 text-slate-400' : 'border-amber-500/40 text-amber-300'
              } whitespace-nowrap flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full ${isUnavailable ? 'bg-slate-400' : 'bg-emerald-400 animate-pulse'}"></span>
                <span>${trainerLabel}</span>
              </div>
            </div>
          `,
          iconSize: [54, 66],
          iconAnchor: [27, 33],
        });
      };

      if (!trainerMarkerRef.current) {
        trainerMarkerRef.current = L.marker([trainerLat, trainerLng], { icon: createSportsCarTrainerIcon() }).addTo(map);
        lastTrainerIconKeyRef.current = trainerIconKey;
      } else {
        trainerMarkerRef.current.setLatLng([trainerLat, trainerLng]);
        if (lastTrainerIconKeyRef.current !== trainerIconKey) {
          trainerMarkerRef.current.setIcon(createSportsCarTrainerIcon());
          lastTrainerIconKeyRef.current = trainerIconKey;
        }
      }
    } else if (trainerMarkerRef.current) {
      map.removeLayer(trainerMarkerRef.current);
      trainerMarkerRef.current = null;
      lastTrainerIconKeyRef.current = '';
    }

    // 3. Draw Actual Driving Road Route
    if (hasTrainerCoords && hasStudentCoords && (status === 'PICKUP_STARTED' || status === 'ARRIVED')) {
      const lastR = lastRoutedCoordsRef.current;
      const movedDist = lastR ? calculateDistanceKm(trainerLat, trainerLng, lastR.tLat, lastR.tLng) : 999;

      // Only re-fetch driving route from OSRM if moved > 10 meters (0.01 km) or initial route
      if (!lastR || movedDist >= 0.01) {
        lastRoutedCoordsRef.current = { tLat: trainerLat, tLng: trainerLng, sLat: studentLat, sLng: studentLng };

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${trainerLng},${trainerLat};${studentLng},${studentLat}?overview=full&geometries=geojson`;

        let isCancelled = false;

        fetch(osrmUrl)
          .then((res) => {
            if (!res.ok) throw new Error('OSRM route failed');
            return res.json();
          })
          .then((data) => {
            if (isCancelled || !mapInstanceRef.current || !mapContainerRef.current) return;
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const distMeters = route.distance;
              const durationSec = route.duration;
              const distKm = Math.max(0.1, Math.round((distMeters / 1000) * 10) / 10);
              const etaMin = Math.max(1, Math.round(durationSec / 60));

              if (onMetricsUpdate) onMetricsUpdate(distKm, etaMin);

              const rawCoords: [number, number][] = route.geometry.coordinates;
              const leafletPoints: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

              if (!routePolylineRef.current) {
                routePolylineRef.current = L.polyline(leafletPoints, {
                  color: '#6D3BFF',
                  weight: 5,
                  opacity: 0.9,
                  lineJoin: 'round',
                  lineCap: 'round',
                }).addTo(mapInstanceRef.current);
              } else {
                routePolylineRef.current.setLatLngs(leafletPoints);
              }

              const bounds = L.latLngBounds(leafletPoints);
              if (!hasInitialFitRef.current) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
                hasInitialFitRef.current = true;
              } else if (!userInteractedRef.current) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 0.8 });
              }
            } else {
              throw new Error('No OSRM routes');
            }
          })
          .catch((err) => {
            console.warn('[LiveTrackingMap] OSRM fallback to Haversine route line:', err);
            if (isCancelled || !mapInstanceRef.current || !mapContainerRef.current) return;

            const haversineKm = calculateDistanceKm(trainerLat, trainerLng, studentLat, studentLng);
            const roadKm = Math.max(0.1, Math.round(haversineKm * 1.2 * 10) / 10);
            const etaMin = calculateEtaMinutes(roadKm, 25);

            if (onMetricsUpdate) onMetricsUpdate(roadKm, etaMin);

            const fallbackPoints: [number, number][] = [
              [trainerLat, trainerLng],
              [studentLat, studentLng],
            ];

            if (!routePolylineRef.current) {
              routePolylineRef.current = L.polyline(fallbackPoints, {
                color: '#6D3BFF',
                weight: 5,
                opacity: 0.9,
                dashArray: '8, 8',
              }).addTo(mapInstanceRef.current);
            } else {
              routePolylineRef.current.setLatLngs(fallbackPoints);
            }

            const bounds = L.latLngBounds(fallbackPoints);
            if (!hasInitialFitRef.current) {
              mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
              hasInitialFitRef.current = true;
            } else if (!userInteractedRef.current) {
              mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 0.8 });
            }
          });

        return () => {
          isCancelled = true;
        };
      }
    } else {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      lastRoutedCoordsRef.current = null;

      try {
        if (hasStudentCoords && hasTrainerCoords) {
          const bounds = L.latLngBounds([
            [trainerLat, trainerLng],
            [studentLat, studentLng]
          ]);
          if (!hasInitialFitRef.current) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
            hasInitialFitRef.current = true;
          } else if (!userInteractedRef.current) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 0.8 });
          }
        } else if (hasStudentCoords && !hasTrainerCoords) {
          map.setView([studentLat, studentLng], 15, { animate: false });
        } else if (hasTrainerCoords && !hasStudentCoords) {
          map.setView([trainerLat, trainerLng], 15, { animate: false });
        }
      } catch (e) {}
    }
  }, [trainerLat, trainerLng, studentLat, studentLng, trainerName, studentName, status, locationUnavailable, isStale, onMetricsUpdate]);

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner bg-slate-900">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Banner overlay for status */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10 shadow-lg flex items-center gap-1.5 pointer-events-auto">
          {(status === 'PICKUP_STARTED' || status === 'pickup_started' || status === 'en_route') && !isStale && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span className="text-emerald-400">Live GPS Tracking</span>
            </>
          )}
          {status === 'ARRIVED' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-amber-400">Trainer Arrived</span>
            </>
          )}
          {status === 'CLASS_STARTED' && (
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              <span className="text-indigo-400">Class In Session</span>
            </>
          )}
          {status !== 'PICKUP_STARTED' && status !== 'pickup_started' && status !== 'en_route' && status !== 'ARRIVED' && status !== 'CLASS_STARTED' && (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span className="text-slate-300">Map Inactive</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasUserPanned && (
            <button
              type="button"
              onClick={() => {
                userInteractedRef.current = false;
                setHasUserPanned(false);
                if (mapInstanceRef.current && routePolylineRef.current) {
                  mapInstanceRef.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50], maxZoom: 16, animate: true });
                } else if (mapInstanceRef.current && typeof trainerLat === 'number' && typeof studentLat === 'number') {
                  mapInstanceRef.current.fitBounds(L.latLngBounds([[trainerLat, trainerLng!], [studentLat, studentLng!]]), { padding: [50, 50], maxZoom: 16, animate: true });
                }
              }}
              className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/30 shadow-lg flex items-center gap-1.5 pointer-events-auto transition-colors"
            >
              <Navigation className="w-3 h-3" />
              Recenter
            </button>
          )}

          {isStale && status === 'PICKUP_STARTED' && (
            <div className="bg-rose-500/95 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-rose-400/30 shadow-lg animate-pulse pointer-events-auto">
              ⚠️ Location stale
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

