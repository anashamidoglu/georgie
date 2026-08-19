import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MapPin, Home, GraduationCap, CornerUpRight, ArrowLeft, Loader2 } from 'lucide-react';
import {
  searchPlaces,
  SAVED_PLACES,
  INITIAL_RECENTS,
  type PlaceResult,
} from '../../services/placesService';
import { useNav } from '../../context/NavContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface GoogleMapsSearchCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleMapsSearchCard: React.FC<GoogleMapsSearchCardProps> = ({ isOpen, onClose }) => {
  const { isNavExpanded, coords, vehicleCoords, previewRouteTo } = useNav();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [recents, setRecents] = useState<PlaceResult[]>(INITIAL_RECENTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeCoords = vehicleCoords || coords;

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Real-time Autocomplete Debounce
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(trimmed, activeCoords, MAPBOX_TOKEN, controller.signal);
        setResults(places);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Autocomplete search failed:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen, activeCoords]);

  // Click outside detection strictly within NavDockedViewport
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectPlace = (place: { coordinates: [number, number]; name: string; address?: string }) => {
    // Add to recents if not already present
    setRecents((prev) => {
      const exists = prev.some((p) => p.name.toLowerCase() === place.name.toLowerCase());
      if (exists) return prev;
      return [
        {
          id: `rec-${Date.now()}`,
          name: place.name,
          address: place.address || 'United Arab Emirates',
          coordinates: place.coordinates,
          category: 'history',
          isHistory: true,
        },
        ...prev.slice(0, 4),
      ];
    });

    previewRouteTo(place.coordinates, place.name);
    onClose();
  };

  return (
    <div
      ref={cardRef}
      className={`absolute z-30 pointer-events-auto select-none font-sf transition-all duration-200 ${
        isNavExpanded
          ? 'top-3.5 left-3.5 w-[380px] max-h-[calc(100%-28px)]'
          : 'top-3.5 left-3.5 right-3.5 max-h-[calc(100%-28px)]'
      }`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-full rounded-2xl bg-[#13141a]/95 backdrop-blur-xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* Google Maps Style Search Bar Header */}
        <div className="flex items-center px-3 py-2.5 border-b border-white/10 flex-shrink-0 bg-white/[0.04]">
          {/* Functional Back Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors mr-1 flex-shrink-0"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-white placeholder-white/45 text-sm font-medium focus:outline-none px-1"
          />

          <div className="flex items-center space-x-1.5 ml-2 flex-shrink-0">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="w-8 h-8 rounded-full text-white/50 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="w-8 h-8 rounded-full text-white/50 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <div className="w-[1px] h-4 bg-white/20 mx-0.5" />

            <button
              type="button"
              onClick={() => {
                if (results[0]) {
                  handleSelectPlace(results[0]);
                }
              }}
              className="w-8 h-8 rounded-full text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 flex items-center justify-center transition-colors"
              title="Directions"
            >
              <CornerUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dropdown Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto max-h-[380px] divide-y divide-white/[0.06] scrollbar-thin scrollbar-thumb-white/15">
          {query.trim() ? (
            /* Autocomplete Suggestions (Screenshot 2 style) */
            isLoading ? (
              <div className="py-8 flex items-center justify-center space-x-2 text-white/50">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span className="text-xs font-medium">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="py-1">
                {results.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors flex items-center space-x-3.5 group"
                  >
                    <div className="flex-shrink-0 text-white/50 group-hover:text-white transition-colors">
                      {place.isHistory ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <MapPin className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                        {place.name}
                      </span>
                      <span className="text-xs text-white/45 truncate mt-0.5">
                        {place.address}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-white/40 text-xs font-medium">
                No matching places found
              </div>
            )
          ) : (
            /* Default State with Home, Uni & Recents (Screenshot 1 style) */
            <div className="py-1">
              {/* Home & Uni Shortcuts */}
              {SAVED_PLACES.map((saved) => (
                <div
                  key={saved.id}
                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-white/[0.06] transition-colors group cursor-pointer"
                  onClick={() =>
                    handleSelectPlace({
                      coordinates: saved.coordinates,
                      name: saved.label,
                      address: saved.address,
                    })
                  }
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
                      {saved.id === 'home' ? (
                        <Home className="w-4 h-4" />
                      ) : (
                        <GraduationCap className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                        {saved.label}
                      </span>
                      <span className="text-xs text-white/45 font-mono truncate">
                        {saved.address}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="h-[1px] bg-white/10 my-1 mx-3" />

              {/* Recents History List */}
              {recents.map((recent) => (
                <button
                  key={recent.id}
                  type="button"
                  onClick={() => handleSelectPlace(recent)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors flex items-start space-x-3.5 group"
                >
                  <div className="pt-0.5 flex-shrink-0 text-white/40 group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                      {recent.name}
                    </span>
                    <span className="text-xs text-white/45 truncate mt-0.5">
                      {recent.address}
                    </span>
                    {recent.subtitle && (
                      <span className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                        {recent.subtitle}
                      </span>
                    )}
                  </div>
                </button>
              ))}

              <div className="py-2 text-center">
                <span className="text-xs text-sky-400/90 font-medium hover:underline cursor-pointer">
                  More from recent history
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
