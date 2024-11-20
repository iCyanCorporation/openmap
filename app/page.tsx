"use client";

import MapComponent from "@/components/map/MapComponent";
import UploadPanel from "@/components/map/UploadPanel";
import LayerPanel from "@/components/map/LayerPanel";

const HomePage = () => {

  return (
    <div style={{
      width: "100vw",
      height: "100vh"
    }}>
      <div className="absolute top-4 left-4 z-10 gap-2 flex flex-col">
      <UploadPanel />
      <LayerPanel />
      </div>
      <MapComponent />
    </div>
  );
};

export default HomePage;
