export interface SphericalPoint {
  pitch: number;
  yaw: number;
}

export const POLIGONOS_360_LOTES: Record<string, SphericalPoint[]> = {
  '01': [{ pitch: -64.25, yaw: 92.86 }, { pitch: -58.16, yaw: 89.35 }, { pitch: -58.32, yaw: 91.92 }, { pitch: -64.22, yaw: 98.2 }],
  '02': [{ pitch: -58.07, yaw: 85.79 }, { pitch: -58.23, yaw: 89.46 }, { pitch: -64.29, yaw: 92.78 }, { pitch: -64.28, yaw: 87.34 }],
  '03': [{ pitch: -57.84, yaw: 81.65 }, { pitch: -58.04, yaw: 85.7 }, { pitch: -64.24, yaw: 87.33 }, { pitch: -63.94, yaw: 82.05 }],
  '04': [{ pitch: -57.87, yaw: 81.58 }, { pitch: -63.98, yaw: 81.95 }, { pitch: -63.43, yaw: 76.45 }, { pitch: -57.24, yaw: 77.46 }],
  '05': [{ pitch: -62.74, yaw: 71.05 }, { pitch: -56.53, yaw: 73.32 }, { pitch: -57.31, yaw: 77.46 }, { pitch: -63.43, yaw: 76.45 }],
  '06': [{ pitch: -55.52, yaw: 68.86 }, { pitch: -56.53, yaw: 73.32 }, { pitch: -62.79, yaw: 71.13 }, { pitch: -61.73, yaw: 64.64 }],
};
