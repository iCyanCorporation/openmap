import { useEffect } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { GeoJSONFeature, Marker, MapComponentProps } from "../type/types";
import { useMapContext } from "../context/MapContext";

const MapComponent: React.FC<MapComponentProps> = ({ markers }) => {
  const { updateFeatures } = useMapContext();

  // Convert marker to GeoJSON feature
  const markerToFeature = (marker: Marker): GeoJSONFeature | null => {
    if (!marker.coordinates) return null;

    let geometry;
    if (Array.isArray(marker.coordinates) && marker.coordinates.length === 2) {
      // Point geometry
      geometry = {
        type: "Point" as const,
        coordinates: marker.coordinates as [number, number]
      };
    } else if (Array.isArray(marker.coordinates) && marker.coordinates.length > 2) {
      // Polygon geometry
      geometry = {
        type: "Polygon" as const,
        coordinates: [marker.coordinates as [number, number][]]
      };
    } else {
      console.error('Invalid coordinates format:', marker.coordinates);
      return null;
    }

    return {
      type: "Feature",
      geometry,
      properties: {
        name: marker.name || '',
        description: marker.description || '',
        ...marker.properties
      }
    };
  };

  // Update features when markers change
  useEffect(() => {
    const features = markers
      .map(markerToFeature)
      .filter((feature): feature is GeoJSONFeature => feature !== null);
  
    updateFeatures(features, "markers");
  }, [markers, updateFeatures]);

  return (
    <div className="relative w-full h-full">
      <div id="map" className="absolute inset-0" />
    </div>
  );
};

export default MapComponent;
