export interface BaseMapProps {
  id: string;
  url: string;
  name: string;
  opacity?: number;
}

export const baseMaps: BaseMapProps[] = [
  { 
    id: "1", 
    url: "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png", 
    name: "色別標高図" 
  },
  { 
    id: "2", 
    url: "https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_kuni_data/{z}/{x}/{y}.png", 
    name: "洪水浸水想定区域" 
  },
  { 
    id: "3", 
    url: "https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png", 
    name: "津波浸水想定" 
  },
  { 
    id: "4", 
    url: "https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png", 
    name: "土砂災害警戒区域（土石流）" 
  },
  { 
    id: "5", 
    url: "https://disaportaldata.gsi.go.jp/raster/05_nadarekikenkasyo/{z}/{x}/{y}.png", 
    name: "雪崩危険箇所" 
  }
];
