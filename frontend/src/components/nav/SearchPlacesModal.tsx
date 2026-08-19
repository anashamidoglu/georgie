import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Navigation, MapPin, Loader2 } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { searchPlaces, CATEGORIES, type PlaceResult } from '../../services/placesService';
import { useNav } from '../../context/NavContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface SearchPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchPlacesModal: React.FC<SearchPlacesModalProps> = ({ isOpen, onClose }) => {
  const { coords, vehicleCoords, previewRouteTo } = useNav();
  const [query, setQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeCoords = vehicleCoords || coords;

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setSelectedCategory(null);
      setResults([]);
    }
  }, [isOpen]);

  // Execute search when query or category changes
  useEffect(() => {
    if (!isOpen) return;

    const searchTerm = query.trim() || (selectedCategory ? CATEGORIES.find((c) => c.id === selectedCategory)?.query || '' : '');
    if (!searchTerm) {
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
    const debounceTimer = setTimeout(async () => {
      try {
        const places = await searchPlaces(searchTerm, activeCoords, MAPBOX_TOKEN, controller.signal);
        setResults(places);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('Place search error:', e);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [query, selectedCategory, isOpen, activeCoords]);

  if (!isOpen) return null;

  const handleSelectPlace = (place: PlaceResult) => {
    previewRouteTo(place.coordinates, place.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sf animate-in fade-in duration-150">
      {/* Semi-transparent Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Floating Search Card */}
      <div
        className="relative z-50 w-full max-w-[560px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <LiquidGlassCard
          padding="lg"
          className="w-full flex flex-col max-h-[85vh] shadow-2xl border border-white/20 overflow-hidden"
        >
          {/* Top Header: Search Bar & Close Button */}
          <div className="flex items-center space-x-3 pb-3 border-b border-white/10 flex-shrink-0">
            <div className="flex-1 relative flex items-center bg-white/[0.08] border border-white/15 rounded-2xl px-3.5 py-2.5 focus-within:border-sky-400/80 focus-within:bg-white/[0.12] transition-all">
              <Search className="w-5 h-5 text-white/50 mr-2.5 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selectedCategory) setSelectedCategory(null);
                }}
                placeholder="Search destination, mall, or landmark..."
                className="w-full bg-transparent text-white placeholder-white/40 text-sm font-medium focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Close Search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center space-x-2 py-2.5 overflow-x-auto scrollbar-none flex-shrink-0 border-b border-white/10">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCategory(null);
                    } else {
                      setSelectedCategory(cat.id);
                      setQuery('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all flex-shrink-0 active:scale-95 ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Results / Suggestions List */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-white/50 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <span className="text-xs font-medium">Searching places...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full text-left p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                        {place.name}
                      </span>
                      <span className="text-xs text-white/50 truncate mt-0.5">
                        {place.address}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {typeof place.distanceKm === 'number' && (
                      <span className="text-xs font-semibold text-white/60 tabular-nums">
                        {place.distanceKm} km
                      </span>
                    )}

                    <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 group-hover:text-black font-bold text-xs flex items-center space-x-1 transition-colors">
                      <Navigation className="w-3.5 h-3.5 fill-current" />
                      <span>Route</span>
                    </div>
                  </div>
                </button>
              ))
            ) : query || selectedCategory ? (
              <div className="py-12 flex flex-col items-center justify-center text-white/40 text-center">
                <span className="text-sm font-semibold text-white/60">No places found</span>
                <span className="text-xs mt-1">Try another search term or category</span>
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center justify-center text-white/40 text-center space-y-1">
                <Search className="w-8 h-8 text-white/20 mb-2" />
                <span className="text-sm font-semibold text-white/60">Search any place in UAE</span>
                <span className="text-xs">Type a destination or pick a category above</span>
              </div>
            )}
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
};
