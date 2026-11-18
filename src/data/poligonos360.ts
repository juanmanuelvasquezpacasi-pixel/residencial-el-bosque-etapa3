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

  // BLOQUE NORTE (07 al 16 — Fila superior, de derecha a izquierda)
  '07': [{ pitch: -18.0, yaw: 2.0 }, { pitch: -18.0, yaw: 5.5 }, { pitch: -21.0, yaw: 5.5 }, { pitch: -21.0, yaw: 2.0 }],
  '08': [{ pitch: -18.0, yaw: 5.5 }, { pitch: -18.0, yaw: 9.0 }, { pitch: -21.0, yaw: 9.0 }, { pitch: -21.0, yaw: 5.5 }],
  '09': [{ pitch: -18.0, yaw: 9.0 }, { pitch: -18.0, yaw: 12.5 }, { pitch: -21.0, yaw: 12.5 }, { pitch: -21.0, yaw: 9.0 }],
  '10': [{ pitch: -18.0, yaw: 12.5 }, { pitch: -18.0, yaw: 16.0 }, { pitch: -21.0, yaw: 16.0 }, { pitch: -21.0, yaw: 12.5 }],
  '11': [{ pitch: -18.0, yaw: 16.0 }, { pitch: -18.0, yaw: 19.5 }, { pitch: -21.0, yaw: 19.5 }, { pitch: -21.0, yaw: 16.0 }],
  '12': [{ pitch: -18.0, yaw: 19.5 }, { pitch: -18.0, yaw: 23.0 }, { pitch: -21.0, yaw: 23.0 }, { pitch: -21.0, yaw: 19.5 }],
  '13': [{ pitch: -18.0, yaw: 23.0 }, { pitch: -18.0, yaw: 26.5 }, { pitch: -21.0, yaw: 26.5 }, { pitch: -21.0, yaw: 23.0 }],
  '14': [{ pitch: -18.0, yaw: 26.5 }, { pitch: -18.0, yaw: 30.0 }, { pitch: -21.0, yaw: 30.0 }, { pitch: -21.0, yaw: 26.5 }],
  '15': [{ pitch: -18.0, yaw: 30.0 }, { pitch: -18.0, yaw: 33.5 }, { pitch: -21.0, yaw: 33.5 }, { pitch: -21.0, yaw: 30.0 }],
  '16': [{ pitch: -18.0, yaw: 33.5 }, { pitch: -18.0, yaw: 37.0 }, { pitch: -21.0, yaw: 37.0 }, { pitch: -21.0, yaw: 33.5 }],

  // ÁREA VERDE (Lote 17 — Lado izquierdo)
  '17': [{ pitch: -22.0, yaw: -18.0 }, { pitch: -22.0, yaw: -8.0 }, { pitch: -36.0, yaw: -8.0 }, { pitch: -36.0, yaw: -18.0 }],

  // BLOQUE SUR (18 al 28 — Fila inferior, de izquierda a derecha)
  '18': [{ pitch: -34.0, yaw: -4.0 }, { pitch: -34.0, yaw: -0.5 }, { pitch: -37.0, yaw: -0.5 }, { pitch: -37.0, yaw: -4.0 }],
  '19': [{ pitch: -34.0, yaw: -0.5 }, { pitch: -34.0, yaw: 3.0 }, { pitch: -37.0, yaw: 3.0 }, { pitch: -37.0, yaw: -0.5 }],
  '20': [{ pitch: -34.0, yaw: 3.0 }, { pitch: -34.0, yaw: 6.5 }, { pitch: -37.0, yaw: 6.5 }, { pitch: -37.0, yaw: 3.0 }],
  '21': [{ pitch: -34.0, yaw: 6.5 }, { pitch: -34.0, yaw: 10.0 }, { pitch: -37.0, yaw: 10.0 }, { pitch: -37.0, yaw: 6.5 }],
  '22': [{ pitch: -34.0, yaw: 10.0 }, { pitch: -34.0, yaw: 13.5 }, { pitch: -37.0, yaw: 13.5 }, { pitch: -37.0, yaw: 10.0 }],
  '23': [{ pitch: -34.0, yaw: 13.5 }, { pitch: -34.0, yaw: 17.0 }, { pitch: -37.0, yaw: 17.0 }, { pitch: -37.0, yaw: 13.5 }],
  '24': [{ pitch: -34.0, yaw: 17.0 }, { pitch: -34.0, yaw: 20.5 }, { pitch: -37.0, yaw: 20.5 }, { pitch: -37.0, yaw: 17.0 }],
  '25': [{ pitch: -34.0, yaw: 20.5 }, { pitch: -34.0, yaw: 24.0 }, { pitch: -37.0, yaw: 24.0 }, { pitch: -37.0, yaw: 20.5 }],
  '26': [{ pitch: -34.0, yaw: 24.0 }, { pitch: -34.0, yaw: 27.5 }, { pitch: -37.0, yaw: 27.5 }, { pitch: -37.0, yaw: 24.0 }],
  '27': [{ pitch: -34.0, yaw: 27.5 }, { pitch: -34.0, yaw: 31.0 }, { pitch: -37.0, yaw: 31.0 }, { pitch: -37.0, yaw: 27.5 }],
  '28': [{ pitch: -34.0, yaw: 31.0 }, { pitch: -34.0, yaw: 34.5 }, { pitch: -37.0, yaw: 34.5 }, { pitch: -37.0, yaw: 31.0 }],

  // ISLA CENTRAL (29 al 46 — Bloque intermedio simétrico)
  '29': [{ pitch: -25.0, yaw: 2.0 }, { pitch: -25.0, yaw: 5.5 }, { pitch: -28.0, yaw: 5.5 }, { pitch: -28.0, yaw: 2.0 }],
  '30': [{ pitch: -25.0, yaw: 5.5 }, { pitch: -25.0, yaw: 9.0 }, { pitch: -28.0, yaw: 9.0 }, { pitch: -28.0, yaw: 5.5 }],
  '31': [{ pitch: -25.0, yaw: 9.0 }, { pitch: -25.0, yaw: 12.5 }, { pitch: -28.0, yaw: 12.5 }, { pitch: -28.0, yaw: 9.0 }],
  '32': [{ pitch: -25.0, yaw: 12.5 }, { pitch: -25.0, yaw: 16.0 }, { pitch: -28.0, yaw: 16.0 }, { pitch: -28.0, yaw: 12.5 }],
  '33': [{ pitch: -25.0, yaw: 16.0 }, { pitch: -25.0, yaw: 19.5 }, { pitch: -28.0, yaw: 19.5 }, { pitch: -28.0, yaw: 16.0 }],
  '34': [{ pitch: -25.0, yaw: 19.5 }, { pitch: -25.0, yaw: 23.0 }, { pitch: -28.0, yaw: 23.0 }, { pitch: -28.0, yaw: 19.5 }],
  '35': [{ pitch: -25.0, yaw: 23.0 }, { pitch: -25.0, yaw: 26.5 }, { pitch: -28.0, yaw: 26.5 }, { pitch: -28.0, yaw: 23.0 }],
  '36': [{ pitch: -25.0, yaw: 26.5 }, { pitch: -25.0, yaw: 30.0 }, { pitch: -28.0, yaw: 30.0 }, { pitch: -28.0, yaw: 26.5 }],
  '37': [{ pitch: -25.0, yaw: 30.0 }, { pitch: -25.0, yaw: 33.5 }, { pitch: -28.0, yaw: 33.5 }, { pitch: -28.0, yaw: 30.0 }],
  '38': [{ pitch: -29.0, yaw: 2.0 }, { pitch: -29.0, yaw: 5.5 }, { pitch: -32.0, yaw: 5.5 }, { pitch: -32.0, yaw: 2.0 }],
  '39': [{ pitch: -29.0, yaw: 5.5 }, { pitch: -29.0, yaw: 9.0 }, { pitch: -32.0, yaw: 9.0 }, { pitch: -32.0, yaw: 5.5 }],
  '40': [{ pitch: -29.0, yaw: 9.0 }, { pitch: -29.0, yaw: 12.5 }, { pitch: -32.0, yaw: 12.5 }, { pitch: -32.0, yaw: 9.0 }],
  '41': [{ pitch: -29.0, yaw: 12.5 }, { pitch: -29.0, yaw: 16.0 }, { pitch: -32.0, yaw: 16.0 }, { pitch: -32.0, yaw: 12.5 }],
  '42': [{ pitch: -29.0, yaw: 16.0 }, { pitch: -29.0, yaw: 19.5 }, { pitch: -32.0, yaw: 19.5 }, { pitch: -32.0, yaw: 16.0 }],
  '43': [{ pitch: -29.0, yaw: 19.5 }, { pitch: -29.0, yaw: 23.0 }, { pitch: -32.0, yaw: 23.0 }, { pitch: -32.0, yaw: 19.5 }],
  '44': [{ pitch: -29.0, yaw: 23.0 }, { pitch: -29.0, yaw: 26.5 }, { pitch: -32.0, yaw: 26.5 }, { pitch: -32.0, yaw: 23.0 }],
  '45': [{ pitch: -29.0, yaw: 26.5 }, { pitch: -29.0, yaw: 30.0 }, { pitch: -32.0, yaw: 30.0 }, { pitch: -32.0, yaw: 30.0 }],
  '46': [{ pitch: -29.0, yaw: 30.0 }, { pitch: -29.0, yaw: 33.5 }, { pitch: -32.0, yaw: 33.5 }, { pitch: -32.0, yaw: 30.0 }],
};
