import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MapPin, Home, GraduationCap, ArrowLeft, Loader2, Star, Trash2 } from 'lucide-react';
import {
  searchPlaces,
  fetchSavedPlaces,
  savePlaceToDb,
  deleteSavedPlaceFromDb,
  fetchRecentPlaces,
  recordRecentPlaceToDb,
  deleteRecentPlaceFromDb,
  calculateDistance,
  type PlaceResult,
  type SavedPlace,
} from '../../services/placesService';
import { useNav } from '../../context/NavContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface GoogleMapsSearchCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleMapsSearchCard: React.FC<GoogleMapsSearchCardProps> = ({ isOpen, onClose }) => {
  const {
    isNavExpanded,
    coords,
    vehicleCoords,
    previewRouteTo,
    isAddStopMode,
    setIsAddStopMode,
    addWaypoint,
  } = useNav();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [recents, setRecents] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeCoords: [number, number] = vehicleCoords || coords || [55.419909, 25.362693];

  // Load Saved & Recent Places from SQLite on open
  useEffect(() => {
    if (isOpen) {
      fetchSavedPlaces().then((saved) => setSavedPlaces(saved));
      fetchRecentPlaces().then((rec) => {
        const enriched = rec.map((r) => ({
          ...r,
          distanceKm: calculateDistance(activeCoords, r.coordinates),
        }));
        setRecents(enriched);
      });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen, activeCoords]);

  // Real-time Autocomplete Search
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
        // Check saved state for each place
        const withSavedStatus = places.map((p) => ({
          ...p,
          isSaved: savedPlaces.some((s) => s.name.toLowerCase() === p.name.toLowerCase()),
        }));
        setResults(withSavedStatus);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Autocomplete search failed:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen, activeCoords, savedPlaces]);

  // Click outside & ESC listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsAddStopMode(false);
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddStopMode(false);
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
  }, [isOpen, onClose, setIsAddStopMode]);

  if (!isOpen) return null;

  const handleSelectPlace = async (place: { coordinates: [number, number]; name: string; address?: string }) => {
    // Record to SQLite Recent Destinations
    await recordRecentPlaceToDb({
      name: place.name,
      address: place.address || 'United Arab Emirates',
      coordinates: place.coordinates,
    });

    if (isAddStopMode) {
      addWaypoint(place.name, place.coordinates);
      setIsAddStopMode(false);
    } else {
      previewRouteTo(place.coordinates, place.name);
    }
    onClose();
  };

  const handleToggleFavorite = async (e: React.MouseEvent, place: PlaceResult) => {
    e.stopPropagation();
    const existingSaved = savedPlaces.find((s) => s.name.toLowerCase() === place.name.toLowerCase());

    if (existingSaved) {
      // Unfavorite
      await deleteSavedPlaceFromDb(existingSaved.id);
      setSavedPlaces((prev) => prev.filter((s) => s.id !== existingSaved.id));
    } else {
      // Favorite
      const newPlace = {
        name: place.name,
        address: place.address,
        coordinates: place.coordinates,
        category: 'favorite',
        icon: 'star',
      };
      await savePlaceToDb(newPlace);
      const reloaded = await fetchSavedPlaces();
      setSavedPlaces(reloaded);
    }
  };

  const handleDeleteRecent = async (e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    await deleteRecentPlaceFromDb(placeId);
    setRecents((prev) => prev.filter((r) => r.id !== placeId));
  };

  const handleClose = () => {
    setIsAddStopMode(false);
    onClose();
  };

  return (
    <div
      ref={cardRef}
      className={`absolute z-30 pointer-events-auto select-none font-sf transition-all duration-200 ${
        isNavExpanded
          ? 'top-3.5 left-3.5 w-[390px] max-h-[calc(100%-28px)]'
          : 'top-3.5 left-3.5 right-3.5 max-h-[calc(100%-28px)]'
      }`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-full rounded-2xl bg-[#13141a]/95 backdrop-blur-xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* Search Bar Header */}
        <div className="flex items-center px-3 py-2.5 border-b border-white/10 flex-shrink-0 bg-white/[0.04]">
          <button
            type="button"
            onClick={handleClose}
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
            placeholder={isAddStopMode ? 'Add a stop along route...' : 'Search places, streets, or POIs...'}
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
                className="w-8 h-8 rounded-full text-white/70 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto max-h-[380px] divide-y divide-white/[0.06] scrollbar-thin scrollbar-thumb-white/15">
          {query.trim() ? (
            /* Autocomplete Results */
            isLoading ? (
              <div className="py-8 flex items-center justify-center space-x-2 text-white/50">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span className="text-xs font-medium">Searching UAE knowledge base...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="py-1">
                {results.map((place) => {
                  const isSaved = savedPlaces.some(
                    (s) => s.name.toLowerCase() === place.name.toLowerCase()
                  );

                  return (
                    <div
                      key={place.id}
                      onClick={() => handleSelectPlace(place)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors flex items-center space-x-3 group cursor-pointer"
                    >
                      <div className="flex-shrink-0 text-sky-400 group-hover:scale-110 transition-transform">
                        <MapPin className="w-4 h-4" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                          {place.name}
                        </span>
                        <span className="text-xs text-white/45 truncate mt-0.5">
                          {place.address}
                        </span>
                      </div>

                      {typeof place.distanceKm === 'number' && (
                        <span className="text-[11px] font-semibold text-white/50 group-hover:text-white/80 tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] flex-shrink-0 ml-1">
                          {place.distanceKm} km
                        </span>
                      )}

                      {/* Favorite / Bookmark Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, place)}
                        className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                          isSaved
                            ? 'text-amber-400 bg-amber-400/15 hover:bg-amber-400/25'
                            : 'text-white/30 hover:text-white hover:bg-white/10'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save to Favorites'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-white/40 text-xs font-medium">
                No matching places found
              </div>
            )
          ) : (
            /* Saved Places Shortcuts + Recents History List */
            <div className="py-1">
              {/* Saved Places Section */}
              <div className="px-3.5 pt-2 pb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/40">
                <span>Saved Places</span>
                <span className="text-sky-400 text-[10px] font-semibold lowercase">
                  {savedPlaces.length} saved
                </span>
              </div>

              <div className="space-y-0.5 mb-1.5">
                {savedPlaces.map((saved) => (
                  <div
                    key={saved.id}
                    className="px-3.5 py-2 flex items-center justify-between hover:bg-white/[0.06] transition-colors group cursor-pointer"
                    onClick={() =>
                      handleSelectPlace({
                        coordinates: saved.coordinates,
                        name: saved.name,
                        address: saved.address,
                      })
                    }
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
                        {saved.category === 'home' ? (
                          <Home className="w-4 h-4" />
                        ) : saved.category === 'uni' ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <Star className="w-4 h-4 fill-sky-400 text-sky-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                          {saved.name}
                        </span>
                        <span className="text-xs text-white/45 truncate">
                          {saved.address}
                        </span>
                      </div>
                    </div>

                    {/* Delete Custom Saved Place */}
                    {saved.id !== 'home' && saved.id !== 'uni' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedPlaceFromDb(saved.id).then(() => {
                            setSavedPlaces((prev) => prev.filter((p) => p.id !== saved.id));
                          });
                        }}
                        className="p-1.5 text-white/30 hover:text-red-400 rounded-full hover:bg-white/10 transition-colors ml-2"
                        title="Remove Saved Place"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="h-[1px] bg-white/10 my-1 mx-3" />

              {/* Recents History Section */}
              <div className="px-3.5 pt-2 pb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/40">
                <span>Recent Destinations</span>
              </div>

              {recents.length > 0 ? (
                recents.map((recent) => {
                  const isSaved = savedPlaces.some(
                    (s) => s.name.toLowerCase() === recent.name.toLowerCase()
                  );

                  return (
                    <div
                      key={recent.id}
                      onClick={() => handleSelectPlace(recent)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors flex items-center space-x-3 group cursor-pointer"
                    >
                      <div className="flex-shrink-0 text-white/40 group-hover:text-white transition-colors">
                        <Clock className="w-4 h-4" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                          {recent.name}
                        </span>
                        <span className="text-xs text-white/45 truncate mt-0.5">
                          {recent.address}
                        </span>
                      </div>

                      {typeof recent.distanceKm === 'number' && (
                        <span className="text-[11px] font-semibold text-white/50 group-hover:text-white/80 tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] flex-shrink-0 ml-1">
                          {recent.distanceKm} km
                        </span>
                      )}

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, recent)}
                        className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                          isSaved
                            ? 'text-amber-400 bg-amber-400/15 hover:bg-amber-400/25'
                            : 'text-white/30 hover:text-white hover:bg-white/10'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save to Favorites'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400' : ''}`} />
                      </button>

                      {/* Delete from Recents Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRecent(e, recent.id)}
                        className="p-1.5 text-white/30 hover:text-red-400 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                        title="Delete from Recents"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-white/30 text-xs font-medium">
                  No recent destinations yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
