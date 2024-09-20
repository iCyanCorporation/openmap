import { useEffect, useState } from "react";
import maplibregl, { GeoJSONSource, Map, Popup } from "maplibre-gl";

interface Marker {
  lng: number;
  lat: number;
  content: string;
  name: string;
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    name: string;
    // content: string;
    description: string;
  };
}

const MapComponent = ({ markers }: { markers: Marker[] }) => {
  const [myMap, setMyMap] = useState<Map | null>(null);

  // Initialize the map only once
  useEffect(() => {
    const centerLocation: [number, number] = [139.7675, 35.6811]; // Center over Tokyo

    const map = new maplibregl.Map({
      container: "map",
      style: {
        version: 8,
        sources: {
          main: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              "<a href='https://www.openstreetmap.org' target='_blank'>© OpenStreetMap</a>",
          },
        },
        layers: [
          {
            id: "base",
            type: "raster",
            source: "main",
            minzoom: 3,
            maxzoom: 22,
          },
        ],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center: centerLocation,
      zoom: 7,
      minZoom: 4,
      maxZoom: 22,
      bearing: 0,
      pitch: 0,
      attributionControl: false,
    });

    map.on("load", () => {
      setMyMap(map);

      // Add GeoJSON source for places
      map.addSource("places", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [], // Initialize with empty data, will update later
        },
      });

      // Add a circle layer showing the places
      map.addLayer({
        id: "places",
        type: "circle",
        source: "places",
        paint: {
          "circle-color": "#ff6347",
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
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

      // Create a popup, but don't add it to the map yet.
      map.resize();
    });

    return () => {
      map.remove(); // Clean up the map instance on component unmount
    };
  }, []);

  // Update the GeoJSON source with the marker data
  useEffect(() => {
    if (myMap && myMap.getSource("places")) {
      const features: GeoJSONFeature[] = markers.map((marker) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [marker.lng, marker.lat],
        },
        properties: {
          name: marker.name,
          description: marker.content,
        },
      }));

      const source = myMap.getSource("places") as GeoJSONSource;
      source.setData({
        type: "FeatureCollection",
        features: features,
      });

      // Create a popup, but don't add it to the map yet.
      const popup = new Popup({
        closeButton: true,
        closeOnClick: false,
        anchor: "bottom",
        offset: [4, 0],
      });
      //   const popup = new Popup({ offset: 25 }).setText("");

      ["places"].forEach((layer) => {
        myMap.on("mouseenter", layer, (e) => {
          // Change the cursor style as a UI indicator.
          myMap.getCanvas().style.cursor = "pointer";
          popup.remove();

          if (!e.features) return;

          try {
            const feature = e.features[0];
            if (feature.geometry.type === "Point") {
              const coordinates = feature.geometry.coordinates.slice() as [
                number,
                number
              ];
              const description = `${feature.properties.description}`;

              // Ensure that if the map is zoomed out such that multiple
              // copies of the feature are visible, the popup appears
              // over the copy being pointed to.
              while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
              }

              // Populate the popup and set its coordinates
              // based on the feature found.
              popup.setLngLat(coordinates).setHTML(description).addTo(myMap);
            }
          } catch (e) {
            console.error(e);
          }
        });

        // myMap.on("mouseenter", layer, () => {
        //   // Change the cursor style as a UI indicator.
        //   myMap.getCanvas().style.cursor = "pointer";
        // });

        myMap.on("mouseleave", layer, () => {
          myMap.getCanvas().style.cursor = "";
        });
      });
    }
  }, [markers, myMap]);

  return <div id="map" />;
};

export default MapComponent;
