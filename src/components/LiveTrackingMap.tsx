import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RefreshCw, Navigation } from 'lucide-react';
import { TrackingStatus } from '../types';
import { DEFAULT_BHUBANESWAR_LOCATION, calculateDistanceKm, calculateEtaMinutes } from '../utils/geo';

interface LiveTrackingMapProps {
  trainerLat?: number;
  trainerLng?: number;
  trainerHeading?: number;
  trainerName: string;
  carPlate?: string;
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
  carPlate,
  studentLat = DEFAULT_BHUBANESWAR_LOCATION.lat,
  studentLng = DEFAULT_BHUBANESWAR_LOCATION.lng,
  studentName,
  status,
  locationUnavailable = false,
  lastUpdatedAt,
  onMetricsUpdate,
  onRefresh,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainerMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const lastRoutedCoordsRef = useRef<{ tLat: number; tLng: number; sLat: number; sLng: number } | null>(null);
  const lastStudentIconKeyRef = useRef<string>('');
  const lastTrainerIconKeyRef = useRef<string>('');

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live tick timer to detect stale location in real time
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isStale = (() => {
    if (locationUnavailable) return true;
    if (!lastUpdatedAt) return false;
    const lastMs = typeof lastUpdatedAt === 'string' ? new Date(lastUpdatedAt).getTime() : lastUpdatedAt;
    return (nowMs - lastMs) > 45000; // 45 seconds stale threshold
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

    // Dark sleek map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapInstanceRef.current = map;

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

      if (!studentMarkerRef.current) {
        const studentIcon = L.divIcon({
          className: 'custom-student-marker',
          html: `
            <div class="relative flex flex-col items-center group">
              <div class="w-8 h-8 bg-[#6D3BFF] border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white font-bold text-xs animate-pulse">
                📍
              </div>
              <div class="bg-[#161623] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md mt-1 border border-white/20 whitespace-nowrap">
                ${studentNameShort}
              </div>
            </div>
          `,
          iconSize: [40, 50],
          iconAnchor: [20, 25],
        });
        studentMarkerRef.current = L.marker([studentLat, studentLng], { icon: studentIcon }).addTo(map);
        lastStudentIconKeyRef.current = studentIconKey;
      } else {
        studentMarkerRef.current.setLatLng([studentLat, studentLng]);
        if (lastStudentIconKeyRef.current !== studentIconKey) {
          const studentIcon = L.divIcon({
            className: 'custom-student-marker',
            html: `
              <div class="relative flex flex-col items-center group">
                <div class="w-8 h-8 bg-[#6D3BFF] border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white font-bold text-xs animate-pulse">
                  📍
                </div>
                <div class="bg-[#161623] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md mt-1 border border-white/20 whitespace-nowrap">
                  ${studentNameShort}
                </div>
              </div>
            `,
            iconSize: [40, 50],
            iconAnchor: [20, 25],
          });
          studentMarkerRef.current.setIcon(studentIcon);
          lastStudentIconKeyRef.current = studentIconKey;
        }
      }
    }

    // 2. Trainer Marker
    if (hasTrainerCoords) {
      const isUnavailable = isStale || status === 'WAITING' || status === 'CLASS_COMPLETED';
      const vehicleLabel = carPlate || trainerName || 'Vehicle';
      const trainerIconKey = `trainer_${vehicleLabel}_${isUnavailable}`;

      if (!trainerMarkerRef.current) {
        const carIcon = L.divIcon({
          className: 'custom-trainer-marker',
          html: `
            <div class="relative flex flex-col items-center">
              <div class="w-10 h-10 ${isUnavailable ? 'bg-slate-700 border-slate-400' : 'bg-amber-500 border-slate-900'} border-2 rounded-2xl flex items-center justify-center shadow-xl text-lg animate-bounce">
                🚗
              </div>
              <div class="bg-slate-900 text-amber-400 text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-md mt-1 border border-amber-500/30 whitespace-nowrap">
                ${vehicleLabel}
              </div>
            </div>
          `,
          iconSize: [44, 55],
          iconAnchor: [22, 28],
        });
        trainerMarkerRef.current = L.marker([trainerLat, trainerLng], { icon: carIcon }).addTo(map);
        lastTrainerIconKeyRef.current = trainerIconKey;
      } else {
        trainerMarkerRef.current.setLatLng([trainerLat, trainerLng]);
        if (lastTrainerIconKeyRef.current !== trainerIconKey) {
          const carIcon = L.divIcon({
            className: 'custom-trainer-marker',
            html: `
              <div class="relative flex flex-col items-center">
                <div class="w-10 h-10 ${isUnavailable ? 'bg-slate-700 border-slate-400' : 'bg-amber-500 border-slate-900'} border-2 rounded-2xl flex items-center justify-center shadow-xl text-lg animate-bounce">
                  🚗
                </div>
                <div class="bg-slate-900 text-amber-400 text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-md mt-1 border border-amber-500/30 whitespace-nowrap">
                  ${vehicleLabel}
                </div>
              </div>
            `,
            iconSize: [44, 55],
            iconAnchor: [22, 28],
          });
          trainerMarkerRef.current.setIcon(carIcon);
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
              mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
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
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
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
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
        } else if (hasStudentCoords && !hasTrainerCoords) {
          map.setView([studentLat, studentLng], 15, { animate: false });
        } else if (hasTrainerCoords && !hasStudentCoords) {
          map.setView([trainerLat, trainerLng], 15, { animate: false });
        }
      } catch (e) {}
    }
  }, [trainerLat, trainerLng, studentLat, studentLng, trainerName, carPlate, studentName, status, locationUnavailable, isStale, onMetricsUpdate]);

  const handleRefreshMap = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsRefreshing(true);
    
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.invalidateSize({ animate: true });
        const hasStudentCoords = Boolean(studentLat && studentLng);
        const hasTrainerCoords = Boolean(trainerLat && trainerLng);

        if (hasTrainerCoords && hasStudentCoords) {
          const bounds = L.latLngBounds([
            [trainerLat!, trainerLng!],
            [studentLat!, studentLng!]
          ]);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
        } else if (hasTrainerCoords) {
          mapInstanceRef.current.setView([trainerLat!, trainerLng!], 15, { animate: true });
        } else if (hasStudentCoords) {
          mapInstanceRef.current.setView([studentLat!, studentLng!], 15, { animate: true });
        }
      } catch (err) {
        console.warn("Map refresh view error:", err);
      }
    }

    if (onRefresh) {
      onRefresh();
    }

    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <div className="relative w-full h-[340px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Banner overlay for status and controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
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
              <span className="text-slate-300">Tracking Inactive</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isStale && status === 'PICKUP_STARTED' && (
            <div className="bg-rose-500/95 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-rose-400/30 shadow-lg animate-pulse">
              ⚠️ Location stale
            </div>
          )}

          {/* Refresh Map Icon Button */}
          <button
            onClick={handleRefreshMap}
            disabled={isRefreshing}
            title="Refresh map bounds & sync GPS signal"
            className="bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white px-2.5 py-1.5 rounded-full text-[11px] font-bold border border-white/15 shadow-xl transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md group"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-200 group-hover:text-emerald-400 transition-colors ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline text-[10px]">Refresh</span>
          </button>
        </div>
      </div>

      {/* Floating Recenter / Fit Map Button at Bottom Right */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-auto">
        <button
          onClick={handleRefreshMap}
          title="Recenter map"
          className="bg-slate-900/90 hover:bg-slate-800 active:scale-90 text-white p-2 rounded-xl border border-white/15 shadow-2xl backdrop-blur-md transition-all flex items-center justify-center cursor-pointer group"
        >
          <Navigation className={`w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform ${isRefreshing ? 'animate-pulse' : ''}`} />
        </button>
      </div>
    </div>
  );
};

