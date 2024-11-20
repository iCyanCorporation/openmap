"use client";

import { useState } from "react";
import MapComponent from "@/components/map/MapComponent";
import UploadPanel from "@/components/map/UploadPanel";
import LayerPanel from "@/components/map/LayerPanel";

const HomePage = () => {
  const [markers, setMarkers] = useState<
    Array<{ lat: number; lng: number; content: string; name: string }>
  >([]);

  const handleFileUpload = (data: Array<Record<string, unknown>>) => {
    const formattedMarkers = data.map((row) => ({
      lat: parseFloat(row["lat"] as string),
      lng: parseFloat(row["lng"] as string),
      content: row["content"] as string,
      name: row["name"] as string,
    }));
    setMarkers(formattedMarkers);
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh"
    }}>
      <div className="absolute top-4 left-4 z-10 gap-2 flex flex-col">
      <UploadPanel onFileUpload={handleFileUpload} />
      <LayerPanel />
      </div>
      <MapComponent markers={markers} />
    </div>
  );
};

export default HomePage;
