export interface SphericalPoint {
  pitch: number;
  yaw: number;
}

// Coordenadas esféricas (pitch, yaw) de las esquinas de cada lote sobre la toma 360° (rmju0q.JPG).
// Cuando traces los lotes en modo ?admin=1 y hagas clic en "Copiar polígonos", pega aquí el objeto generado
// para que todos tus clientes vean los lotes dibujados en 360° permanentemente.
export const POLIGONOS_360_LOTES: Record<string, SphericalPoint[]> = {
  // Ejemplo: '01': [{ pitch: -24.5, yaw: 12.1 }, { pitch: -25.1, yaw: 15.8 }, { pitch: -28.4, yaw: 14.9 }, { pitch: -27.8, yaw: 11.2 }],
};
