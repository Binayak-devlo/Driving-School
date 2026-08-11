import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TrackingStatus } from '../types';
import { DEFAULT_BHUBANESWAR_LOCATION } from '../utils/geo';

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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainerMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

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
      const isUnavailable = locationUnavailable || status === 'WAITING' || status === 'CLASS_COMPLETED';
      
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

    // 3. Route Line connecting Trainer and Student
    if (hasTrainerCoords && hasStudentCoords && (status === 'PICKUP_STARTED' || status === 'ARRIVED')) {
      const points: [number, number][] = [
        [trainerLat, trainerLng],
        [studentLat, studentLng],
      ];

      if (!routePolylineRef.current) {
        routePolylineRef.current = L.polyline(points, {
          color: '#6D3BFF',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
        }).addTo(map);
      } else {
        routePolylineRef.current.setLatLngs(points);
      }

      // Auto-fit bounds to show both markers smoothly
      const bounds = L.latLngBounds([
        [trainerLat, trainerLng],
        [studentLat, studentLng],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }

      if (hasStudentCoords && !hasTrainerCoords) {
        map.setView([studentLat, studentLng], 15);
      } else if (hasTrainerCoords && !hasStudentCoords) {
        map.setView([trainerLat, trainerLng], 15);
      }
    }
  }, [trainerLat, trainerLng, studentLat, studentLng, trainerName, carPlate, studentName, status, locationUnavailable]);

  return (
    <div className="relative w-full h-[340px] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Banner overlay for status */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/10 shadow-lg flex items-center gap-1.5">
          {status === 'PICKUP_STARTED' && (
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

        {locationUnavailable && status === 'PICKUP_STARTED' && (
          <div className="bg-rose-500/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-extrabold border border-rose-400/30 shadow-lg animate-pulse">
            ⚠️ Location temporarily unavailable
          </div>
        )}
      </div>
    </div>
  );
};
