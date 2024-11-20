"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import maplibregl, { Map, GeoJSONSource, LngLatBounds, Popup } from 'maplibre-gl';
import { GeoJSONFeature } from '../type/types';

interface MapContextType {
  map: Map | null;
  updateFeatures: (features: GeoJSONFeature[], layerName: string) => void;
  addFeature: (feature: GeoJSONFeature) => void;
  layers: Layer[];
  toggleLayerVisibility: (id: string) => void;
  deleteLayer: (id: string) => void;
  updateLayersOrder: (newLayers: Layer[]) => void;
}

interface Layer {
  id: string;
  name: string;
  data: GeoJSONFeature[];
  visible: boolean;
}

const MapContext = createContext<MapContextType>({
  map: null,
  updateFeatures: () => {},
  addFeature: () => {},
  layers: [],
  toggleLayerVisibility: () => {},
  deleteLayer: () => {},
  updateLayersOrder: () => {},
});

interface MapProviderProps {
  children: ReactNode;
}

export const MapContextProvider: React.FC<MapProviderProps> = ({ children }:{children: React.ReactNode}) => {
  const [map, setMap] = useState<Map | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);

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
        glyphs: "https://fonts.openmaptiles.org/fonts/{fontstack}/{range}.pbf",
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
      const handleMouseEnter = (e: any) => {
        if (e.features.length === 0) return;

        const coordinates = e.lngLat;
        const properties = e.features[0].properties;
  
        const tableContent = Object.entries(properties)
          .filter(([key]) => key !== 'description') // Exclude description field if you don't want it in the table
          .map(([key, value]) => `
            <tr class="border-b border-gray-200">
              <td class="py-2 px-2 font-medium text-gray-700">${key}</td>
              <td class="py-2 px-2 text-gray-600">${value}</td>
            </tr>
          `).join('');

        const popupContent = `
          <div class="min-w-[200px] max-w-[300px]">
            <table class="w-full border-collapse">
              <tbody>
                ${tableContent}
              </tbody>
            </table>
          </div>
        `;
  
        newPopup
          .setLngLat(coordinates)
          .setHTML(popupContent)
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
  const updateFeatures = useCallback((features: GeoJSONFeature[], layerName: string = 'Uploaded Data') => {
    if (!map) return;

    const newLayer: Layer = {
      id: Date.now().toString(),
      name: layerName,
      data: features,
      visible: true
    };

    setLayers(prevLayers => {
      const updatedLayers = [...prevLayers, newLayer];
      const source = map.getSource("places") as GeoJSONSource;
      if (source) {
        const visibleLayers = updatedLayers.filter(layer => layer.visible);
        const allFeatures = visibleLayers.flatMap(layer => layer.data);
        source.setData({
          type: "FeatureCollection",
          features: allFeatures,
        });
      }
      return updatedLayers;
    });
  }, [map]);

  const addFeature = useCallback((feature: GeoJSONFeature) => {
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
  }, [map]);

  const toggleLayerVisibility = useCallback((id: string) => {
    if (!map) return;
    
    setLayers(prevLayers => {
      const updatedLayers = prevLayers.map(layer => 
        layer.id === id 
          ? { ...layer, visible: !layer.visible }
          : layer
      );
      
      const source = map.getSource("places") as GeoJSONSource;
      if (source) {
        const visibleLayers = updatedLayers.filter(layer => layer.visible);
        const allVisibleFeatures = visibleLayers.flatMap(layer => layer.data);
        source.setData({
          type: "FeatureCollection",
          features: allVisibleFeatures,
        });
      }
      
      return updatedLayers;
    });
  }, [map]);

  const deleteLayer = useCallback((id: string) => {
    if (!map) return;
    
    setLayers(prevLayers => {
      const updatedLayers = prevLayers.filter(layer => layer.id !== id);
      
      const source = map.getSource("places") as GeoJSONSource;
      if (source) {
        const remainingVisibleLayers = updatedLayers.filter(layer => layer.visible);
        const remainingFeatures = remainingVisibleLayers.flatMap(layer => layer.data);
        source.setData({
          type: "FeatureCollection",
          features: remainingFeatures,
        });
      }
      
      return updatedLayers;
    });
  }, [map]);

  const updateLayersOrder = useCallback((newLayers: Layer[]) => {
    if (!map) return;

    setLayers(newLayers);
    const source = map.getSource("places") as GeoJSONSource;
    if (source) {
      const visibleLayers = newLayers.filter(layer => layer.visible);
      const allFeatures = visibleLayers.flatMap(layer => layer.data);
      source.setData({
        type: "FeatureCollection",
        features: allFeatures,
      });
    }
  }, [map]);

  const valueList = {
    map,
    updateFeatures,
    addFeature,
    layers,
    toggleLayerVisibility,
    deleteLayer,
    updateLayersOrder,
  };

  return (
    <MapContext.Provider value={valueList}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => useContext(MapContext);

export default MapContext;