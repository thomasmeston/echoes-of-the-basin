export type MapPoint = [number, number];

export interface MapGridDef {
  cols: number;
  rows: number;
  insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  originNote?: string;
}

export interface MapLandmarkDef {
  id: string;
  name: string;
  icon: string;
  /** % within focus viewport */
  x: number;
  y: number;
  /** Index along region.riverPath where the boat stops */
  pathIndex: number;
  costBatteries: number;
  once: boolean;
  onDiscover: string[];
}

export interface MapRegionDef {
  id: string;
  col: number;
  row: number;
  label: string;
  title: string;
  /** Polyline points as % of focus viewport */
  riverPath: MapPoint[];
  landmarks: MapLandmarkDef[];
}

export interface MapRegionsFile {
  grid: MapGridDef;
  travelCostBatteries: number;
  regions: MapRegionDef[];
}
