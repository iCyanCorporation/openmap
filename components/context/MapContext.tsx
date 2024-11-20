"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import maplibregl, { Map, GeoJSONSource, Popup } from 'maplibre-gl';
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
  // const [popup, setPopup] = useState<Popup | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [lastClickedCoords, setLastClickedCoords] = useState<[number, number] | null>(null);
  const [hoveredPointId, setClickedPointId] = useState<string | null>(null);

  // Function to reset hover state
  const resetHoverState = useCallback(() => {
    if (map && hoveredPointId) {
      map.setFeatureState(
        { source: 'places', id: hoveredPointId },
        { hover: false }
      );
      setClickedPointId(null);
    }
  }, [map, hoveredPointId]);

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
            attribution: '&copy; OpenStreetMap',
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

    // setPopup(newPopup);
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

      // Add a layer for points
      newMap.addLayer({
        id: "points",
        type: "circle",
        source: "places",
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            8,
            ['boolean', ['feature-state', 'active'], false],
            7,
            6
          ],
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#ff8800',
            ['boolean', ['feature-state', 'active'], false],
            '#ff0000',
            '#4264fb'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            ['boolean', ['feature-state', 'active'], false],
            1,
            0.7
          ]
        },
        filter: ["==", "$type", "Point"]
      });

      // Add a text layer for point labels
      newMap.addLayer({
        id: `places-label`,
        type: "symbol",
        source: "places",
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        8,
        20,
        24, 
          ],
          "text-max-width": 12,
          "text-allow-overlap": false,
          "text-anchor": "left",
          "text-offset": [1.0, 0.0],
        },
        paint: {
          "text-color": "#000",
          "text-halo-color": "#fff",
          "text-halo-width": 2,
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
    const handleClick = (e: any) => {
      if (e.features.length === 0) return;

      const coordinates = e.features[0].geometry.coordinates.slice();
      const properties = e.features[0].properties;

      const popupContent = `
        <div style="max-width: 300px; font-family: Arial, sans-serif;">
          <table style="width: 100%; border-collapse: collapse;">
            ${Object.entries(properties)
              .filter(([key]) => key !== 'icon' && key !== 'id')
              .map(([key, value]) => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 4px; font-size: 12px; font-weight: bold; width: 30%;">${key}</td>
                  <td style="padding: 4px; font-size: 12px; word-wrap: break-word; word-break: break-all; max-width: 200px;">${value}</td>
                </tr>
              `).join('')}
          </table>
        </div>
      `;

      newPopup.setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(newMap);
    };

    const handleMouseLeave = () => {
      newPopup.remove();
    };

    // Add event listeners for points
    newMap.on("click", "points", handleClick);

    // Add click listener for map to close popup when clicking empty space
    newMap.on("click", (e) => {
      const features = newMap.queryRenderedFeatures(e.point, { layers: ["points"] });
      if (features.length === 0) {
        newPopup.remove();
      }
    });

    // Change cursor on hover
    newMap.on("click", "points", () => {
      newMap.getCanvas().style.cursor = "pointer";
    });

    newMap.on("mouseleave", "points", () => {
      newMap.getCanvas().style.cursor = "";
    });

    const handlePointClick = (e: maplibregl.MapMouseEvent) => {
      const features = newMap.queryRenderedFeatures(e.point, { layers: ['points'] });
      if (features && features.length > 0) {
        const clickedFeature = features[0];
        
        if (clickedFeature.geometry.type !== 'Point') return;
        
        const clickedCoords = (clickedFeature.geometry as GeoJSON.Point).coordinates as [number, number];
        
        // Reset the previous clicked point's state
        if (lastClickedCoords) {
          newMap.setFeatureState(
            { source: 'places', id: lastClickedCoords.join('-') },
            { active: false }
          );
        }

        // Set the new clicked point's state
        newMap.setFeatureState(
          { source: 'places', id: clickedCoords.join('-') },
          { active: true }
        );
        
        setLastClickedCoords(clickedCoords);
      }
    };

    // Add event listener for point clicks
    newMap.on('click', 'points', handlePointClick);

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
        newMap.off('click', 'points', handleClick);
        newMap.off('mouseleave', 'points', handleMouseLeave);
        newMap.off('click', 'polygons', handleClick);
        newMap.off('mouseleave', 'polygons', handleMouseLeave);
        newMap.off('click', 'points', handlePointClick);
      }
      
      newMap.remove();
    };

  }, []);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['points'] });
      if (features && features.length > 0) {
        
        const feature = features[0];
        const featureId = (feature.id?.toString() || (feature.geometry as GeoJSON.Point).coordinates.join('-'));
        
        // Reset previous hover state
        resetHoverState();
        
        // Set new hover state
        map.setFeatureState(
          { source: 'places', id: featureId },
          { hover: true }
        );
        setClickedPointId(featureId);
      }
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      resetHoverState();
    };

    // Change cursor to pointer when hovering over points
    map.on('click', 'points', handleClick);
    map.on('mouseenter', 'points', handleMouseEnter);
    map.on('mouseleave', 'points', handleMouseLeave);

    return () => {
      if (map) {
        map.off('click', 'points', handleClick);
        map.off('mouseenter', 'points', handleMouseEnter);
        map.off('mouseleave', 'points', handleMouseLeave);
      }
    };
  }, [map, resetHoverState]);

  // Update features when they change
  const updateFeatures = useCallback((features: GeoJSONFeature[], layerName: string = 'Uploaded Data') => {
    if (!map) return;

    const newLayer: Layer = {
      id: Date.now().toString(),
      name: layerName,
      data: features.map(feature => ({
        ...feature,
        id: (feature.geometry as GeoJSON.Point).coordinates.join('-')
      })),
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