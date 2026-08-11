import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainerMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const lastRoutedCoordsRef = useRef<{ tLat: number; tLng: number; sLat: number; sLng: number } | null>(null);

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
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers and route polyline when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasTrainerCoords = typeof trainerLat === 'number' && typeof trainerLng === 'number' && !isNaN(trainerLat) && !isNaN(trainerLng);
    const hasStudentCoords = typeof studentLat === 'number' && typeof studentLng === 'number' && !isNaN(studentLat) && !isNaN(studentLng);

    // 1. Student Marker
    if (hasStudentCoords) {
      const studentIcon = L.divIcon({
        className: 'custom-student-marker',
        html: `
          <div class="relative flex flex-col items-center group">
            <div class="w-8 h-8 bg-[#6D3BFF] border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white font-bold text-xs animate-pulse">
              📍
            </div>
            <div class="bg-[#161623] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md mt-1 border border-white/20 whitespace-nowrap">
              ${studentName ? studentName.split(' ')[0] : 'Pickup Spot'}
            </div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 25],
      });

      if (!studentMarkerRef.current) {
        studentMarkerRef.current = L.marker([studentLat, studentLng], { icon: studentIcon }).addTo(map);
      } else {
        studentMarkerRef.current.setLatLng([studentLat, studentLng]);
        studentMarkerRef.current.setIcon(studentIcon);
      }
    }

    // 2. Trainer Marker
    if (hasTrainerCoords) {
      const isUnavailable = isStale || status === 'WAITING' || status === 'CLASS_COMPLETED';
      
      const carIcon = L.divIcon({
        className: 'custom-trainer-marker',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="w-10 h-10 ${isUnavailable ? 'bg-slate-700 border-slate-400' : 'bg-amber-500 border-slate-900'} border-2 rounded-2xl flex items-center justify-center shadow-xl text-lg animate-bounce">
              🚗
            </div>
            <div class="bg-slate-900 text-amber-400 text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-md mt-1 border border-amber-500/30 whitespace-nowrap">
              ${carPlate || trainerName || 'Vehicle'}
            </div>
          </div>
        `,
        iconSize: [44, 55],
        iconAnchor: [22, 28],
      });

      if (!trainerMarkerRef.current) {
        trainerMarkerRef.current = L.marker([trainerLat, trainerLng], { icon: carIcon }).addTo(map);
      } else {
        trainerMarkerRef.current.setLatLng([trainerLat, trainerLng]);
        trainerMarkerRef.current.setIcon(carIcon);
      }
    } else if (trainerMarkerRef.current) {
      map.removeLayer(trainerMarkerRef.current);
      trainerMarkerRef.current = null;
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
            if (isCancelled) return;
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
                }).addTo(map);
              } else {
                routePolylineRef.current.setLatLngs(leafletPoints);
              }

              const bounds = L.latLngBounds(leafletPoints);
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            } else {
              throw new Error('No OSRM routes');
            }
          })
          .catch((err) => {
            console.warn('[LiveTrackingMap] OSRM fallback to Haversine route line:', err);
            if (isCancelled) return;

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
              }).addTo(map);
            } else {
              routePolylineRef.current.setLatLngs(fallbackPoints);
            }

            const bounds = L.latLngBounds(fallbackPoints);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
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

      if (hasStudentCoords && !hasTrainerCoords) {
        map.setView([studentLat, studentLng], 15);
      } else if (hasTrainerCoords && !hasStudentCoords) {
        map.setView([trainerLat, trainerLng], 15);
      }
    }
  }, [trainerLat, trainerLng, studentLat, studentLng, trainerName, carPlate, studentName, status, locationUnavailable, isStale, onMetricsUpdate]);

  return (
    <div className="relative w-full h-[340px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Banner overlay for status */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10 shadow-lg flex items-center gap-1.5">
          {status === 'PICKUP_STARTED' && !isStale && (
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
          {(status === 'WAITING' || status === 'CLASS_COMPLETED') && (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span className="text-slate-300">Tracking Inactive</span>
            </>
          )}
        </div>

        {isStale && status === 'PICKUP_STARTED' && (
          <div className="bg-rose-500/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-extrabold border border-rose-400/30 shadow-lg animate-pulse">
            ⚠️ Trainer location temporarily unavailable
          </div>
        )}
      </div>
    </div>
  );
};

