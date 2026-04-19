import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, Search, X, Loader2, MapPinned, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  pincode: string;
  city: string;
  state: string;
  displayName: string;
}

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationData) => void;
  currentPincode?: string;
  currentAddress?: string;
  currentCoords?: { lat: number; lng: number } | null;
}

// Reverse geocode using free OpenStreetMap Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<LocationData> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const pincode = addr.postcode || '';
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';
    const road = addr.road || addr.neighbourhood || '';
    const suburb = addr.suburb || '';
    
    let displayParts = [];
    if (road) displayParts.push(road);
    if (suburb) displayParts.push(suburb);
    if (city) displayParts.push(city);
    
    return {
      lat,
      lng,
      address: data.display_name || '',
      pincode,
      city,
      state,
      displayName: displayParts.length > 0 ? displayParts.join(', ') : (data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`),
    };
  } catch {
    return {
      lat,
      lng,
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      pincode: '',
      city: '',
      state: '',
      displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  }
}

// Search for addresses/places
async function searchPlaces(query: string): Promise<Array<{ lat: number; lng: number; display_name: string }>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      display_name: item.display_name,
    }));
  } catch {
    return [];
  }
}

// Map click handler sub-component
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to fly map to a position
function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 1.2 });
    }
  }, [position, map]);
  return null;
}

export default function LocationPicker({
  isOpen,
  onClose,
  onLocationSelect,
  currentPincode,
  currentAddress,
  currentCoords,
}: LocationPickerProps) {
  const [step, setStep] = useState<'initial' | 'map'>('initial');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; display_name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [isGeocodingPin, setIsGeocodingPin] = useState(false);
  const [manualPincode, setManualPincode] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('initial');
      setDetectionError('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedLocation(null);
      setManualPincode('');
      if (currentCoords) {
        setMapCenter([currentCoords.lat, currentCoords.lng]);
        setMarkerPos([currentCoords.lat, currentCoords.lng]);
      } else {
        setMarkerPos(null);
      }
    }
  }, [isOpen, currentCoords]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const detectCurrentLocation = useCallback(async () => {
    setIsDetecting(true);
    setDetectionError('');
    if (!navigator.geolocation) {
      setDetectionError('Geolocation is not supported by your browser');
      setIsDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = await reverseGeocode(latitude, longitude);
        setSelectedLocation(loc);
        setMapCenter([latitude, longitude]);
        setMarkerPos([latitude, longitude]);
        setStep('map');
        setIsDetecting(false);
      },
      (error) => {
        let msg = 'Unable to detect your location.';
        if (error.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings.';
        else if (error.code === 2) msg = 'Location unavailable. Please try again.';
        else if (error.code === 3) msg = 'Location request timed out. Please try again.';
        setDetectionError(msg);
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setMarkerPos([lat, lng]);
    setIsGeocodingPin(true);
    const loc = await reverseGeocode(lat, lng);
    setSelectedLocation(loc);
    setIsGeocodingPin(false);
  }, []);

  const handleSearchSelect = useCallback(async (result: { lat: number; lng: number; display_name: string }) => {
    setSearchQuery('');
    setSearchResults([]);
    setMarkerPos([result.lat, result.lng]);
    setMapCenter([result.lat, result.lng]);
    setIsGeocodingPin(true);
    const loc = await reverseGeocode(result.lat, result.lng);
    setSelectedLocation(loc);
    setStep('map');
    setIsGeocodingPin(false);
  }, []);

  const handleManualPincode = useCallback(async () => {
    if (!manualPincode.match(/^\d{6}$/)) return;
    setIsSearching(true);
    const results = await searchPlaces(manualPincode + ' India');
    if (results.length > 0) {
      const first = results[0];
      setMarkerPos([first.lat, first.lng]);
      setMapCenter([first.lat, first.lng]);
      const loc = await reverseGeocode(first.lat, first.lng);
      // Override pincode with what user typed
      loc.pincode = manualPincode;
      setSelectedLocation(loc);
      setStep('map');
    } else {
      // Fallback: just set pincode without map
      setSelectedLocation({
        lat: 0, lng: 0,
        address: `Pincode: ${manualPincode}`,
        pincode: manualPincode,
        city: '', state: '',
        displayName: `Pincode ${manualPincode}`,
      });
    }
    setIsSearching(false);
  }, [manualPincode]);

  const handleConfirm = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  }, [selectedLocation, onLocationSelect, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[520px] max-h-[90vh] overflow-hidden"
        style={{ animation: 'locationModalIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#0D47A1] to-[#1565C0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white">Set Delivery Location</h2>
              <p className="text-[11px] text-white/70">Choose how you'd like to set your location</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 72px)' }}>
          
          {step === 'initial' && (
            <div className="p-5 space-y-4">
              {/* Auto-Detect Button */}
              <button
                onClick={detectCurrentLocation}
                disabled={isDetecting}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#0D47A1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {isDetecting ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className="text-[14px] font-bold text-gray-900">
                    {isDetecting ? 'Detecting location...' : 'Use My Current Location'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Auto-detect via GPS</div>
                </div>
                {!isDetecting && (
                  <div className="text-[11px] font-bold text-[#0D47A1] uppercase tracking-wide">Detect</div>
                )}
              </button>

              {detectionError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-[12px] text-red-600 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{detectionError}</span>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Search by Address */}
              <div className="relative">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#0D47A1] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Search className="w-4 h-4 text-gray-400 ml-3.5 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search area, street, city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-3 text-[13px] text-gray-800 bg-transparent focus:outline-none placeholder-gray-400"
                  />
                  {isSearching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin mr-3" />}
                </div>
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-[200px] overflow-y-auto">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearchSelect(result)}
                        className="w-full flex items-start gap-2.5 px-3.5 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <MapPinned className="w-4 h-4 text-[#0D47A1] shrink-0 mt-0.5" />
                        <span className="text-[12px] text-gray-700 leading-snug line-clamp-2">{result.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Pincode */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Enter Pincode Manually</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 110001"
                    value={manualPincode}
                    onChange={(e) => setManualPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualPincode()}
                    className="flex-1 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold text-gray-800 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#0D47A1] focus:ring-2 focus:ring-blue-100 transition-all"
                    maxLength={6}
                  />
                  <button
                    onClick={handleManualPincode}
                    disabled={!manualPincode.match(/^\d{6}$/)}
                    className="px-5 py-2.5 bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-lg transition-all uppercase tracking-wide"
                  >
                    Go
                  </button>
                </div>
              </div>

              {/* Pick on Map */}
              <button
                onClick={() => setStep('map')}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MapPinned className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-[13px] font-bold text-gray-800">Pick on Map</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Tap to place pin on map</div>
                </div>
              </button>

              {/* Current Location Info */}
              {currentAddress && (
                <div className="px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Location</div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#0D47A1] shrink-0" />
                    <span className="text-[12px] text-gray-700 font-medium">{currentAddress}</span>
                    {currentPincode && (
                      <span className="text-[11px] font-bold text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-full ml-auto shrink-0">{currentPincode}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'map' && (
            <div className="flex flex-col">
              {/* Map */}
              <div className="relative w-full" style={{ height: '300px' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={currentCoords ? 16 : 5}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {markerPos && <Marker position={markerPos} />}
                  <FlyToPosition position={markerPos} />
                </MapContainer>

                {/* Re-detect button on map */}
                <button
                  onClick={detectCurrentLocation}
                  disabled={isDetecting}
                  className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-all text-[12px] font-semibold text-gray-700"
                >
                  {isDetecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-[#0D47A1]" />
                  )}
                  My Location
                </button>

                {/* Geocoding indicator */}
                {isGeocodingPin && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-lg text-[11px] font-medium text-gray-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching address...
                  </div>
                )}

                {/* Search bar overlay on map */}
                <div className="absolute top-3 left-3 right-14 z-[1000]">
                  <div className="relative">
                    <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                      <Search className="w-3.5 h-3.5 text-gray-400 ml-3 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-2.5 py-2 text-[12px] text-gray-800 bg-transparent focus:outline-none placeholder-gray-400"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[150px] overflow-y-auto">
                        {searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                          >
                            <MapPinned className="w-3.5 h-3.5 text-[#0D47A1] shrink-0 mt-0.5" />
                            <span className="text-[11px] text-gray-700 leading-snug line-clamp-2">{result.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Location Info */}
              <div className="p-4 border-t border-gray-100">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Selected Location</div>
                {selectedLocation ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-gray-900 truncate">{selectedLocation.displayName}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{selectedLocation.address}</div>
                        {selectedLocation.pincode && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-bold text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-full">
                              📮 {selectedLocation.pincode}
                            </span>
                            {selectedLocation.city && (
                              <span className="text-[10px] font-medium text-gray-500">{selectedLocation.city}, {selectedLocation.state}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleConfirm}
                      className="w-full py-3 bg-gradient-to-r from-[#0D47A1] to-[#1565C0] hover:from-[#1565C0] hover:to-[#1976D2] text-white text-[13px] font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wide"
                    >
                      Confirm Location
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2">
                    <MapPin className="w-4 h-4" />
                    Tap on the map to select your delivery location
                  </div>
                )}

                <button
                  onClick={() => setStep('initial')}
                  className="w-full mt-2 py-2 text-[12px] font-semibold text-gray-500 hover:text-gray-700 transition-colors text-center"
                >
                  ← Back to options
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes locationModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>,
    document.body
  );
}
