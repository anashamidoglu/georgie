import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useNav } from "../../context/NavContext";

// Fallback style if Mapbox token is not set
const DEFAULT_MAPBOX_TOKEN = "pk.eyJ1IjoiYW5hc2hhbWlkb2dsdSIsImEiOiJjbTdia2F3cTQwMWt3MmxzZGg5MnRldTFsIn0.example";

export const MapboxContainer: React.FC<{ isVisible?: boolean }> = ({ isVisible = true }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const { navExpanded } = useNav();

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Single persistent instance initialization
    mapboxgl.accessToken = DEFAULT_MAPBOX_TOKEN;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [55.2708, 25.2048], // Dubai / Sheikh Zayed Rd
        zoom: 14.5,
        pitch: 50,
        bearing: -20,
        attributionControl: false,
        preserveDrawingBuffer: false, // Performance saving on Pi 4
        antialias: false // Reduce GPU overhead on ARM
      });

      map.on("load", () => {
        // Add 3D buildings layer
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === "symbol" && layer.layout?.["text-field"]
        )?.id;

        if (!map.getLayer("3d-buildings")) {
          map.addLayer(
            {
              id: "3d-buildings",
              source: "composite",
              "source-layer": "building",
              filter: ["==", "extrude", "true"],
              type: "fill-extrusion",
              minzoom: 13,
              paint: {
                "fill-extrusion-color": "#1f242d",
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "min_height"],
                "fill-extrusion-opacity": 0.6
              }
            },
            labelLayerId
          );
        }
      });

      mapInstanceRef.current = map;
    } catch (e) {
      console.warn("Mapbox initialization fallback:", e);
    }

    return () => {
      // Intentionally NOT destroying map instance across route shifts (persistent shell instance)
    };
  }, []);

  // Resize canvas when transitioning between docked and expanded nav
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    }, 320); // Sync with CSS transition
    return () => clearTimeout(timer);
  }, [navExpanded]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full relative transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        backgroundColor: "#121417"
      }}
    />
  );
};
