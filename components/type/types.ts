export type Point = {
  type: 'Point';
  coordinates: [number, number];
};

export type Polygon = {
  type: 'Polygon';
  coordinates: [number, number][][];
};

export type MultiPolygon = {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
};

export type Geometry = Point | Polygon | MultiPolygon;

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: Geometry;
  properties: Record<string, unknown>;
}

export interface Marker {
  lat?: number | null;
  lng?: number | null;
  name?: string;
  content?: string;
  properties?: Record<string, unknown>;
  geometry?: Geometry;
  coordinates?: [number, number] | [number, number][];
  description?: string;
}

export interface UploadPanelProps {
 
}


export interface MapComponentProps {
  markers: (Marker | GeoJSONFeature)[];
}
