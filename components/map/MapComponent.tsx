import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import React from 'react';
import { useMapContext } from '../context/MapContext';

const MapComponent: React.FC = () => {

  return (
    <div className="relative w-full h-full">
      <div id="map" className="absolute inset-0" />
    </div>
  );
};

export default MapComponent;
