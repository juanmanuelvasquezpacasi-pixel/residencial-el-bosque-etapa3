export interface SphericalPoint {
  pitch: number;
  yaw: number;
}

// Estructura base alineada y recta para los 46 lotes de Residencial El Bosque - Etapa 3
export const POLIGONOS_360_LOTES: Record<string, SphericalPoint[]> = {
  // BLOQUE ESTE (Lotes 01 al 06 - Columna derecha alineada)
  '01': [{ pitch: -22.0, yaw: 12.0 }, { pitch: -22.0, yaw: 16.0 }, { pitch: -25.0, yaw: 16.0 }, { pitch: -25.0, yaw: 12.0 }],
  '02': [{ pitch: -25.0, yaw: 12.0 }, { pitch: -25.0, yaw: 16.0 }, { pitch: -28.0, yaw: 16.0 }, { pitch: -28.0, yaw: 12.0 }],
  '03': [{ pitch: -28.0, yaw: 12.0 }, { pitch: -28.0, yaw: 16.0 }, { pitch: -31.0, yaw: 16.0 }, { pitch: -31.0, yaw: 12.0 }],
  '04': [{ pitch: -31.0, yaw: 12.0 }, { pitch: -31.0, yaw: 16.0 }, { pitch: -34.0, yaw: 16.0 }, { pitch: -34.0, yaw: 12.0 }],
  '05': [{ pitch: -34.0, yaw: 12.0 }, { pitch: -34.0, yaw: 16.0 }, { pitch: -37.0, yaw: 16.0 }, { pitch: -37.0, yaw: 12.0 }],
  '06': [{ pitch: -37.0, yaw: 12.0 }, { pitch: -37.0, yaw: 16.0 }, { pitch: -40.0, yaw: 16.0 }, { pitch: -40.0, yaw: 12.0 }],

  // BLOQUE NORTE (Lotes 07 al 16 - Fila superior recta)
  '07': [{ pitch: -20.0, yaw: 2.0 }, { pitch: -20.0, yaw: 6.0 }, { pitch: -23.0, yaw: 6.0 }, { pitch: -23.0, yaw: 2.0 }],
  '08': [{ pitch: -20.0, yaw: 6.0 }, { pitch: -20.0, yaw: 10.0 }, { pitch: -23.0, yaw: 10.0 }, { pitch: -23.0, yaw: 6.0 }],
  '09': [{ pitch: -20.0, yaw: 10.0 }, { pitch: -20.0, yaw: 14.0 }, { pitch: -23.0, yaw: 14.0 }, { pitch: -23.0, yaw: 10.0 }],
  '10': [{ pitch: -20.0, yaw: 14.0 }, { pitch: -20.0, yaw: 18.0 }, { pitch: -23.0, yaw: 18.0 }, { pitch: -23.0, yaw: 14.0 }],
  '11': [{ pitch: -20.0, yaw: 18.0 }, { pitch: -20.0, yaw: 22.0 }, { pitch: -23.0, yaw: 22.0 }, { pitch: -23.0, yaw: 18.0 }],
  '12': [{ pitch: -20.0, yaw: 22.0 }, { pitch: -20.0, yaw: 26.0 }, { pitch: -23.0, yaw: 26.0 }, { pitch: -23.0, yaw: 22.0 }],
  '13': [{ pitch: -20.0, yaw: 26.0 }, { pitch: -20.0, yaw: 30.0 }, { pitch: -23.0, yaw: 30.0 }, { pitch: -23.0, yaw: 26.0 }],
  '14': [{ pitch: -20.0, yaw: 30.0 }, { pitch: -20.0, yaw: 34.0 }, { pitch: -23.0, yaw: 34.0 }, { pitch: -23.0, yaw: 30.0 }],
  '15': [{ pitch: -20.0, yaw: 34.0 }, { pitch: -20.0, yaw: 38.0 }, { pitch: -23.0, yaw: 38.0 }, { pitch: -23.0, yaw: 34.0 }],
  '16': [{ pitch: -20.0, yaw: 38.0 }, { pitch: -20.0, yaw: 42.0 }, { pitch: -23.0, yaw: 42.0 }, { pitch: -23.0, yaw: 38.0 }],

  // ÁREA VERDE (Lote 17)
  '17': [{ pitch: -30.0, yaw: -15.0 }, { pitch: -30.0, yaw: -5.0 }, { pitch: -40.0, yaw: -5.0 }, { pitch: -40.0, yaw: -15.0 }],

  // BLOQUE SUR (Lotes 18 al 28 - Fila inferior recta)
  '18': [{ pitch: -35.0, yaw: 2.0 }, { pitch: -35.0, yaw: 6.0 }, { pitch: -38.0, yaw: 6.0 }, { pitch: -38.0, yaw: 2.0 }],
  '19': [{ pitch: -35.0, yaw: 6.0 }, { pitch: -35.0, yaw: 10.0 }, { pitch: -38.0, yaw: 10.0 }, { pitch: -38.0, yaw: 6.0 }],
  '20': [{ pitch: -35.0, yaw: 10.0 }, { pitch: -35.0, yaw: 14.0 }, { pitch: -38.0, yaw: 14.0 }, { pitch: -38.0, yaw: 10.0 }],
  '21': [{ pitch: -35.0, yaw: 14.0 }, { pitch: -35.0, yaw: 18.0 }, { pitch: -38.0, yaw: 18.0 }, { pitch: -38.0, yaw: 14.0 }],
  '22': [{ pitch: -35.0, yaw: 18.0 }, { pitch: -35.0, yaw: 22.0 }, { pitch: -38.0, yaw: 22.0 }, { pitch: -38.0, yaw: 18.0 }],
  '23': [{ pitch: -35.0, yaw: 22.0 }, { pitch: -35.0, yaw: 26.0 }, { pitch: -38.0, yaw: 26.0 }, { pitch: -38.0, yaw: 22.0 }],
  '24': [{ pitch: -35.0, yaw: 26.0 }, { pitch: -35.0, yaw: 30.0 }, { pitch: -38.0, yaw: 30.0 }, { pitch: -38.0, yaw: 26.0 }],
  '25': [{ pitch: -35.0, yaw: 30.0 }, { pitch: -35.0, yaw: 34.0 }, { pitch: -38.0, yaw: 34.0 }, { pitch: -38.0, yaw: 30.0 }],
  '26': [{ pitch: -35.0, yaw: 34.0 }, { pitch: -35.0, yaw: 38.0 }, { pitch: -38.0, yaw: 38.0 }, { pitch: -38.0, yaw: 34.0 }],
  '27': [{ pitch: -35.0, yaw: 38.0 }, { pitch: -35.0, yaw: 42.0 }, { pitch: -38.0, yaw: 42.0 }, { pitch: -38.0, yaw: 38.0 }],
  '28': [{ pitch: -35.0, yaw: 42.0 }, { pitch: -35.0, yaw: 46.0 }, { pitch: -38.0, yaw: 46.0 }, { pitch: -38.0, yaw: 42.0 }],

  // ISLA CENTRAL (Lotes 29 al 46 - Zona central simétrica)
  '29': [{ pitch: -27.0, yaw: 4.0 }, { pitch: -27.0, yaw: 8.0 }, { pitch: -30.0, yaw: 8.0 }, { pitch: -30.0, yaw: 4.0 }],
  '30': [{ pitch: -27.0, yaw: 8.0 }, { pitch: -27.0, yaw: 12.0 }, { pitch: -30.0, yaw: 12.0 }, { pitch: -30.0, yaw: 8.0 }],
  '31': [{ pitch: -27.0, yaw: 12.0 }, { pitch: -27.0, yaw: 16.0 }, { pitch: -30.0, yaw: 16.0 }, { pitch: -30.0, yaw: 12.0 }],
  '32': [{ pitch: -27.0, yaw: 16.0 }, { pitch: -27.0, yaw: 20.0 }, { pitch: -30.0, yaw: 20.0 }, { pitch: -30.0, yaw: 16.0 }],
  '33': [{ pitch: -27.0, yaw: 20.0 }, { pitch: -27.0, yaw: 24.0 }, { pitch: -30.0, yaw: 24.0 }, { pitch: -30.0, yaw: 20.0 }],
  '34': [{ pitch: -27.0, yaw: 24.0 }, { pitch: -27.0, yaw: 28.0 }, { pitch: -30.0, yaw: 28.0 }, { pitch: -30.0, yaw: 24.0 }],
  '35': [{ pitch: -27.0, yaw: 28.0 }, { pitch: -27.0, yaw: 32.0 }, { pitch: -30.0, yaw: 32.0 }, { pitch: -30.0, yaw: 28.0 }],
  '36': [{ pitch: -27.0, yaw: 32.0 }, { pitch: -27.0, yaw: 36.0 }, { pitch: -30.0, yaw: 36.0 }, { pitch: -30.0, yaw: 32.0 }],
  '37': [{ pitch: -27.0, yaw: 36.0 }, { pitch: -27.0, yaw: 40.0 }, { pitch: -30.0, yaw: 40.0 }, { pitch: -30.0, yaw: 36.0 }],
  '38': [{ pitch: -31.0, yaw: 4.0 }, { pitch: -31.0, yaw: 8.0 }, { pitch: -34.0, yaw: 8.0 }, { pitch: -34.0, yaw: 4.0 }],
  '39': [{ pitch: -31.0, yaw: 8.0 }, { pitch: -31.0, yaw: 12.0 }, { pitch: -34.0, yaw: 12.0 }, { pitch: -34.0, yaw: 8.0 }],
  '40': [{ pitch: -31.0, yaw: 12.0 }, { pitch: -31.0, yaw: 16.0 }, { pitch: -34.0, yaw: 16.0 }, { pitch: -34.0, yaw: 12.0 }],
  '41': [{ pitch: -31.0, yaw: 16.0 }, { pitch: -31.0, yaw: 20.0 }, { pitch: -34.0, yaw: 20.0 }, { pitch: -34.0, yaw: 16.0 }],
  '42': [{ pitch: -31.0, yaw: 20.0 }, { pitch: -31.0, yaw: 24.0 }, { pitch: -34.0, yaw: 24.0 }, { pitch: -34.0, yaw: 20.0 }],
  '43': [{ pitch: -31.0, yaw: 24.0 }, { pitch: -31.0, yaw: 28.0 }, { pitch: -34.0, yaw: 28.0 }, { pitch: -34.0, yaw: 24.0 }],
  '44': [{ pitch: -31.0, yaw: 28.0 }, { pitch: -31.0, yaw: 32.0 }, { pitch: -34.0, yaw: 32.0 }, { pitch: -34.0, yaw: 30.0 }],
  '45': [{ pitch: -31.0, yaw: 32.0 }, { pitch: -31.0, yaw: 36.0 }, { pitch: -34.0, yaw: 36.0 }, { pitch: -34.0, yaw: 32.0 }],
  '46': [{ pitch: -31.0, yaw: 36.0 }, { pitch: -31.0, yaw: 40.0 }, { pitch: -34.0, yaw: 40.0 }, { pitch: -34.0, yaw: 36.0 }],
};
