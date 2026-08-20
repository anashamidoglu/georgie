import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Home, GraduationCap, ArrowLeft, Loader2, Star, Trash2 } from 'lucide-react';
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
      await deleteSavedPlaceFromDb(existingSaved.id);
      setSavedPlaces((prev) => prev.filter((s) => s.id !== existingSaved.id));
    } else {
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
      className={`absolute z-30 pointer-events-auto select-none font-sf transition-all duration-200 flex flex-col ${
        isNavExpanded
          ? 'top-4 left-4 w-[440px] sm:w-[460px] bottom-4'
          : 'top-4 left-4 right-4 bottom-4'
      }`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-full h-full rounded-3xl bg-[#13141a]/95 backdrop-blur-2xl border border-white/20 shadow-[0_16px_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* Search Bar Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/15 flex-shrink-0 bg-white/[0.05]">
          <button
            type="button"
            onClick={handleClose}
            className="w-11 h-11 rounded-full text-white/80 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors mr-2 flex-shrink-0 active:scale-90"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAddStopMode ? 'Add a stop along route...' : 'Search places, streets, or POIs...'}
            className="flex-1 bg-transparent text-white placeholder-white/40 text-base sm:text-lg font-bold focus:outline-none px-2"
          />

          <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="w-11 h-11 rounded-full text-white/60 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors active:scale-90"
                aria-label="Clear query"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="w-11 h-11 rounded-full text-white/80 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors active:scale-90"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Fully Scrollable Dropdown Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-white/[0.08] scrollbar-thin scrollbar-thumb-white/20 pb-8">
          {query.trim() ? (
            /* Autocomplete Results */
            isLoading ? (
              <div className="py-10 flex items-center justify-center space-x-3 text-white/60">
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                <span className="text-sm font-bold">Searching UAE knowledge base...</span>
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
                      className="w-full text-left px-4 py-3.5 hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors flex items-center space-x-3.5 group cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 text-sky-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-md">
                        <MapPin className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-base sm:text-lg font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                          {place.name}
                        </span>
                        <span className="text-sm text-white/55 truncate mt-0.5">
                          {place.address}
                        </span>
                      </div>

                      {typeof place.distanceKm === 'number' && (
                        <span className="text-xs font-bold text-white/80 tabular-nums px-3 py-1 rounded-full bg-white/10 border border-white/15 flex-shrink-0 ml-1">
                          {place.distanceKm} km
                        </span>
                      )}

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, place)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors flex-shrink-0 active:scale-90 ${
                          isSaved
                            ? 'text-amber-400 bg-amber-400/20 hover:bg-amber-400/30'
                            : 'text-white/40 hover:text-white hover:bg-white/15'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save to Favorites'}
                      >
                        <Star className={`w-5 h-5 ${isSaved ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-white/45 text-sm font-semibold">
                No matching places found
              </div>
            )
          ) : (
            /* Saved Places Shortcuts + Recents History List */
            <div className="py-1">
              {/* Saved Places Section */}
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between text-xs font-bold text-white/50">
                <span>Saved Places</span>
                <span className="text-sky-400 text-xs font-bold">
                  {savedPlaces.length} saved
                </span>
              </div>

              <div className="space-y-1 mb-2">
                {savedPlaces.map((saved) => (
                  <div
                    key={saved.id}
                    className="px-4 py-3 hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors flex items-center justify-between group cursor-pointer"
                    onClick={() =>
                      handleSelectPlace({
                        coordinates: saved.coordinates,
                        name: saved.name,
                        address: saved.address,
                      })
                    }
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 flex-shrink-0 shadow-md">
                        {saved.category === 'home' ? (
                          <Home className="w-6 h-6" />
                        ) : saved.category === 'uni' ? (
                          <GraduationCap className="w-6 h-6" />
                        ) : (
                          <Star className="w-6 h-6 fill-sky-400 text-sky-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-base sm:text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                          {saved.name}
                        </span>
                        <span className="text-sm text-white/55 truncate">
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
                        className="w-11 h-11 text-white/40 hover:text-red-400 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors ml-2 active:scale-90"
                        title="Remove Saved Place"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="h-[1px] bg-white/15 my-1.5 mx-4" />

              {/* Recents History Section */}
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between text-xs font-bold text-white/50">
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
                      className="w-full text-left px-4 py-3.5 hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      {/* Clean Text without Clock Icon */}
                      <div className="flex flex-col min-w-0 flex-1 pr-3">
                        <span className="text-base sm:text-lg font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                          {recent.name}
                        </span>
                        <span className="text-sm text-white/55 truncate mt-0.5">
                          {recent.address}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {typeof recent.distanceKm === 'number' && (
                          <span className="text-xs font-bold text-white/80 tabular-nums px-3 py-1 rounded-full bg-white/10 border border-white/15">
                            {recent.distanceKm} km
                          </span>
                        )}

                        {/* Favorite Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, recent)}
                          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
                            isSaved
                              ? 'text-amber-400 bg-amber-400/20 hover:bg-amber-400/30'
                              : 'text-white/40 hover:text-white hover:bg-white/15'
                          }`}
                          title={isSaved ? 'Remove from Saved' : 'Save to Favorites'}
                        >
                          <Star className={`w-5 h-5 ${isSaved ? 'fill-amber-400' : ''}`} />
                        </button>

                        {/* Delete from Recents Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecent(e, recent.id)}
                          className="w-11 h-11 text-white/40 hover:text-red-400 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors active:scale-90"
                          title="Delete from Recents"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-white/40 text-sm font-semibold">
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
