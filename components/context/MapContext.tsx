"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import maplibregl, { Map, GeoJSONSource, LngLatBounds, Popup } from 'maplibre-gl';
import { GeoJSONFeature } from '../map/types';

interface MapContextType {
  map: Map | null;
  updateFeatures: (features: GeoJSONFeature[]) => void;
  addFeature: (feature: GeoJSONFeature) => void;
}

const MapContext = createContext<MapContextType>({
  map: null,
  updateFeatures: () => {},
  addFeature: () => {},
});

interface MapProviderProps {
  children: ReactNode;
}

export const MapContextProvider: React.FC<MapProviderProps> = ({ children }:{children: React.ReactNode}) => {
  const [map, setMap] = useState<Map | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);

  // Initialize map
  useEffect(() => {
    const centerLocation: [number, number] = [139.7675, 35.6811]; // Center over Tokyo
    const newMap = new maplibregl.Map({
      container: "map",
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }]
      },
      center: centerLocation,
      zoom: 4,
    });

    const newPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    setPopup(newPopup);
    newMap.addControl(new maplibregl.NavigationControl());

    // Add GeoJSON source and layers
    const setupMap = () => {
      // Add the GeoJSON source
      newMap.addSource("places", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // Add a layer for point features
      newMap.addLayer({
        id: "points",
        type: "circle",
        source: "places",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#007cbf",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Add a text layer for point labels
      newMap.addLayer({
        id: `places-label`,
        type: "symbol",
        source: "places",
        layout: {
          "text-field": ["get", "name"], // Use the 'name' property from your source features
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            8, // At zoom level 0, text size will be 8px
            20,
            24, // At zoom level 20, text size will be 24px
          ],
          "text-max-width": 12, // Adjust this value to control wrapping
          "text-allow-overlap": false,
          "text-anchor": "left", // Anchor the text above the circle
          "text-offset": [1.0, 0.0], // Offset text vertically so it appears above the circle
        },
        paint: {
          "text-color": "#000", // Text color
          "text-halo-color": "#fff", // Halo (background) color
          "text-halo-width": 2, // Halo width in pixels
          // "text-halo-blur": 1, // Optionally, add blur to the halo for a softer effect
        },
      });


      // Add a layer for polygon features
      newMap.addLayer({
        id: "polygons",
        type: "fill",
        source: "places",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["length", ["get", "data"]],
            0, "#383539", 
          ],
          "fill-opacity": 0.3,
          "fill-outline-color": "#000",
        },
      });

      };
  
      // Add popup handlers
      const handleMouseEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || !e.features[0]) return;
        
        const coordinates = e.features[0].geometry.type === 'Point' 
          ? (e.features[0].geometry.coordinates as [number, number])
          : e.lngLat;
          
        const properties = e.features[0].properties;
        const description = properties?.description || "No description available";
  
        newPopup
          .setLngLat(coordinates)
          .setHTML(description)
          .addTo(newMap);
      };
  
      const handleMouseLeave = () => {
        newPopup.remove();
      };
  
      // Add event listeners for points
      newMap.on("mouseenter", "points", handleMouseEnter);
      newMap.on("mouseleave", "points", handleMouseLeave);

      // Add event listeners for polygons
      // newMap.on("mouseenter", "polygons", handleMouseEnter);
      // newMap.on("mouseleave", "polygons", handleMouseLeave);

      // Change cursor on hover
      newMap.on("mouseenter", "points", () => {
        newMap.getCanvas().style.cursor = "pointer";
      });

      newMap.on("mouseleave", "points", () => {
        newMap.getCanvas().style.cursor = "";
      });

      newMap.on("load", setupMap);
    setMap(newMap);
    newMap.resize();

    // Cleanup function
    return () => {
      if (newPopup) {
        newPopup.remove();
      }
      
      // Remove event listeners
      if (newMap.loaded()) {
        newMap.off('mouseenter', 'points', handleMouseEnter);
        newMap.off('mouseleave', 'points', handleMouseLeave);
        newMap.off('mouseenter', 'polygons', handleMouseEnter);
        newMap.off('mouseleave', 'polygons', handleMouseLeave);
      }
      
      newMap.remove();
    };

    
  }, []);

  // Update features when they change
  const updateFeatures = (features: GeoJSONFeature[]) => {
    if (!map) return;

    const source = map.getSource("places") as GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features,
      });

      // Calculate bounds
      if (features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        let hasValidGeometry = false;

        features.forEach((feature) => {
          if (!feature.geometry) return;

          switch (feature.geometry.type) {
            case "Point":
              console.log("Add point to bounds", feature.geometry.coordinates);
              if (Array.isArray(feature.geometry.coordinates)) {
                bounds.extend(feature.geometry.coordinates as [number, number]);
                hasValidGeometry = true;
              }
              break;
            case "Polygon":
              console.log("Add polygon to bounds", feature.geometry.coordinates);
              feature.geometry.coordinates[0].forEach((coord) => {
                bounds.extend(coord as [number, number]);
                hasValidGeometry = true;
              });
              break;
          }
        });

        if (hasValidGeometry) {
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
          });
        }
      }
    }
  };

  const addFeature = (feature: GeoJSONFeature) => {
    if (!map) return;

    const source = map.getSource("places") as GeoJSONSource;
    if (source) {
      const currentData = (source.getData() as any);
      const currentFeatures = currentData.features || [];
      
      source.setData({
        type: "FeatureCollection",
        features: [...currentFeatures, feature],
      });
    }
  };

  // const createPolygonColor = (): maplibregl.PropertyValueSpecification<string> => {
  //   const colorData = ["interpolate",
  //     ["linear"],
  //     ["length", ["get", "data"]], 500, "#e8f5a9", 600, "#e8f5a9"];

  //   // for (let i = 0; i < 1000; i++) {
  //   //   colorData.push(String(i));
  //   //   // create a ramdom color ex #FF0000 #E8F5E9
  //   //   const color = Math.floor(Math.random() * 16777215).toString(16);
  //   //   colorData.push(`#${color}`);
  //   // }
    
  //   return colorData;

  //   // return [
  //   //   "interpolate",
  //   //   ["linear"],
  //   //   ["length", ["get", "data"]],
  //   //   0, "#E8F5E9",  // Very light green
  //   //   500, "#C8E6C9",
  //   //   1000, "#A5D6A7",
  //   //   1500, "#81C784",
  //   //   2000, "#66BB6A",
  //   //   2500, "#4CAF50",
  //   //   3000, "#43A047",
  //   //   3500, "#388E3C",
  //   //   4000, "#2E7D32",
  //   //   4500, "#1B5E20"  // Dark green
  //   // ];
  // };

  const valueList = { map, updateFeatures, addFeature };

  return (
    <MapContext.Provider value={valueList}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => useContext(MapContext);

export default MapContext;