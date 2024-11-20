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
  addLayer: (layer: Layer) => void;
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
  addLayer: () => {},
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
            attribution: '&copy; OpenStreetMap Contributors',
          }
        },
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          paint: {
            'raster-opacity': 1
          }
        }]
      },
      center: centerLocation,
      zoom: 4,
    });

    const newPopup = new maplibregl.Popup({
      closeButton: true,
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

        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;

        newPopup.setLngLat(coordinates)
          .setHTML(`
            <div style="max-height: 500px; overflow-y: auto; max-width: 300px; overflow-x: hidden;">
              <table style="border-collapse: collapse; width: 100%;">
                <tbody>
                  ${Object.entries(properties)
                    .filter(([key]) => key !== 'name')
                    .map(([key, value]) => `
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 4px; color: #6b7280; font-size: 12px;">${key}</td>
                        <td style="padding: 4px; font-size: 12px;">${value}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          `)
          .addTo(newMap);
      };

      const handleMouseLeave = () => {
        newPopup.remove();
      };

      // Add event listeners for points
      newMap.on("click", "points", handleMouseEnter);

      // Add click listener for map to close popup when clicking empty space
      newMap.on("click", (e) => {
        const features = newMap.queryRenderedFeatures(e.point, { layers: ["points"] });
        if (features.length === 0) {
          newPopup.remove();
        }
      });

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

  const addLayer = useCallback((layer: Layer) => {
    if (!map) return;

    // Remove existing layer and source if they exist
    if (map.getLayer(layer.id)) {
      map.removeLayer(layer.id);
    }
    if (map.getSource(layer.id)) {
      map.removeSource(layer.id);
    }

    // Add source
    map.addSource(layer.id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: layer.data
      }
    });

    // Find the highest layer ID that starts with 'layer-' (base maps)
    const baseMapLayers = map.getStyle().layers
      .filter(l => l.id.startsWith('layer-'))
      .map(l => l.id);
    
    const beforeId = baseMapLayers.length > 0 ? baseMapLayers[0] : undefined;

    // Add layer before the first base map layer (if any exist)
    map.addLayer({
      id: layer.id,
      type: 'circle',
      source: layer.id,
      paint: {
        'circle-radius': 6,
        'circle-color': '#007cbf',
        'circle-opacity': layer.visible ? 0.7 : 0
      }
    }, beforeId);

    setLayers(prevLayers => [...prevLayers, layer]);
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

  const updateLayersOrder = useCallback((newOrder: Layer[]) => {
    if (!map) return;

    // Find the highest layer ID that starts with 'layer-' (base maps)
    const baseMapLayers = map.getStyle().layers
      .filter(l => l.id.startsWith('layer-'))
      .map(l => l.id);
    
    const beforeId = baseMapLayers.length > 0 ? baseMapLayers[0] : undefined;

    // Reorder layers in the map
    newOrder.forEach((layer) => {
      if (map.getLayer(layer.id)) {
        map.moveLayer(layer.id, beforeId);
      }
    });

    setLayers(newOrder);
  }, [map]);

  const valueList = {
    map,
    updateFeatures,
    addFeature,
    layers,
    toggleLayerVisibility,
    deleteLayer,
    updateLayersOrder,
    addLayer
  };

  return (
    <MapContext.Provider value={valueList}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => useContext(MapContext);

export default MapContext;