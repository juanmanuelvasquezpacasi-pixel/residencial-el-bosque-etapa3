export type LotStatus = 'disponible' | 'reservado' | 'vendido' | 'area_verde';

export type LotSector =
  | 'Bloque Este'
  | 'Bloque Norte'
  | 'Bloque Sur'
  | 'Isla Central'
  | 'Área Verde';

export interface Lote {
  id: string;
  num: string;
  sector: LotSector;
  area: string;
  estado: LotStatus;
  px: number;
  py: number;
  pixelX: number;
  pixelY: number;
  ax: number;
  ay: number;
}

export interface Asesor {
  nombre: string;
  whatsapp: string;
}

export const AERIAL_MAP_URL = 'https://files.catbox.moe/ef0u68.jpg';
export const PANORAMA_360_URL = 'https://files.catbox.moe/rmju0q.JPG';
export const PLAN_MAP_URL = 'https://files.catbox.moe/hwg12k.jpg';
export const PRESENTATION_AUDIO_URL = 'https://files.catbox.moe/1dxlm2.mp3';
// Reemplaza esta cadena vacía con la URL directa de tu logo cuando lo tengas alojado
export const TAUREN_LOGO_URL = 'https://files.catbox.moe/rz4mpm.png';
export const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Av.+Sesquicentenario,+Andahuaylas,+Apurimac,+Peru';
export const AERIAL_HIT_RADIUS_PX = 25;

// ============================================================================
// CONTROL RÁPIDO DE ESTADOS COMERCIALES DE LOS 46 LOTES
// Cambia cualquier lote residencial a: 'disponible' | 'reservado' | 'vendido'
// Nota: El Lote '17' tiene estado fijo 'area_verde' (no disponible para venta)
// ============================================================================
export const ESTADOS_LOTES: Record<string, LotStatus> = {
  '01': 'disponible', '02': 'disponible', '03': 'disponible', '04': 'disponible', '05': 'disponible', '06': 'disponible',
  '07': 'disponible', '08': 'disponible', '09': 'disponible', '10': 'disponible', '11': 'disponible', '12': 'disponible',
  '13': 'disponible', '14': 'disponible', '15': 'disponible', '16': 'disponible', '17': 'area_verde', '18': 'disponible',
  '19': 'disponible', '20': 'disponible', '21': 'disponible', '22': 'disponible', '23': 'disponible', '24': 'disponible',
  '25': 'disponible', '26': 'disponible', '27': 'disponible', '28': 'disponible', '29': 'disponible', '30': 'disponible',
  '31': 'disponible', '32': 'disponible', '33': 'disponible', '34': 'disponible', '35': 'disponible', '36': 'disponible',
  '37': 'disponible', '38': 'disponible', '39': 'disponible', '40': 'disponible', '41': 'disponible', '42': 'disponible',
  '43': 'disponible', '44': 'disponible', '45': 'disponible', '46': 'disponible',
};

export const ASESORES: Record<string, Asesor> = {
  default: { nombre: 'Inmobiliaria Tauren', whatsapp: '51985825162' },
  beder: { nombre: 'Beder', whatsapp: '51985825162' },
  juan: { nombre: 'Juan Manuel', whatsapp: '51942244818' },
};

export function resolveAsesorFromUrl(): Asesor {
  if (typeof window === 'undefined') return ASESORES.default;
  const params = new URLSearchParams(window.location.search);
  const key = (params.get('asesor') || 'default').toLowerCase();
  return ASESORES[key] || ASESORES.default;
}

export const SECTOR_FILTERS: Array<{
  value: 'todos' | LotSector;
  label: string;
  shortLabel: string;
  mobileLabel: string;
}> = [
  { value: 'todos', label: 'Todos los lotes (01 - 46)', shortLabel: 'Todos (46)', mobileLabel: 'Todos' },
  { value: 'Bloque Este', label: 'Lotes 01 - 06', shortLabel: 'Bloque Este', mobileLabel: 'Bloque Este' },
  { value: 'Bloque Norte', label: 'Lotes 07 - 16', shortLabel: 'Bloque Norte', mobileLabel: 'Bloque Norte' },
  { value: 'Bloque Sur', label: 'Lotes 18 - 28', shortLabel: 'Bloque Sur', mobileLabel: 'Bloque Sur' },
  { value: 'Isla Central', label: 'Lotes 29 - 46 (Centro)', shortLabel: 'Isla Central', mobileLabel: 'Isla Central' },
  { value: 'Área Verde', label: 'Lote 17 (Área Verde)', shortLabel: 'Área Verde', mobileLabel: 'Área Verde' },
];

const LOTES_BASE: Lote[] = [
  // BLOQUE ESTE (01 al 06 — Columna derecha, de abajo hacia arriba)
  { id: '01', num: '01', sector: 'Bloque Este', area: '237.35 m²', estado: 'disponible', px: 60.5, py: 18.8, pixelX: 2070, pixelY: 1233, ax: 47.2, ay: 81.2 },
  { id: '02', num: '02', sector: 'Bloque Este', area: '237.35 m²', estado: 'disponible', px: 54.6, py: 17.8, pixelX: 2048, pixelY: 1199, ax: 46.9, ay: 78.6 },
  { id: '03', num: '03', sector: 'Bloque Este', area: '237.35 m²', estado: 'disponible', px: 48.8, py: 16.8, pixelX: 2042, pixelY: 1168, ax: 46.6, ay: 75.9 },
  { id: '04', num: '04', sector: 'Bloque Este', area: '237.35 m²', estado: 'disponible', px: 43.3, py: 15.8, pixelX: 2036, pixelY: 1137, ax: 46.3, ay: 73.3 },
  { id: '05', num: '05', sector: 'Bloque Este', area: '237.35 m²', estado: 'disponible', px: 37.8, py: 14.8, pixelX: 2030, pixelY: 1103, ax: 46.0, ay: 70.6 },
  { id: '06', num: '06', sector: 'Bloque Este', area: '237.35 m²', estado: 'disponible', px: 32.3, py: 13.8, pixelX: 2021, pixelY: 1075, ax: 45.7, ay: 68.0 },

  // BLOQUE NORTE (07 al 16 — Fila superior del terreno amarillo, de derecha a izquierda)
  { id: '07', num: '07', sector: 'Bloque Norte', area: '99.84 m²', estado: 'disponible', px: 31.3, py: 26.8, pixelX: 1943, pixelY: 1097, ax: 43.2, ay: 69.8 },
  { id: '08', num: '08', sector: 'Bloque Norte', area: '100.79 m²', estado: 'disponible', px: 30.8, py: 31.4, pixelX: 1897, pixelY: 1106, ax: 41.4, ay: 70.0 },
  { id: '09', num: '09', sector: 'Bloque Norte', area: '100.79 m²', estado: 'disponible', px: 29.8, py: 35.8, pixelX: 1844, pixelY: 1115, ax: 39.6, ay: 70.2 },
  { id: '10', num: '10', sector: 'Bloque Norte', area: '100.79 m²', estado: 'disponible', px: 28.0, py: 40.3, pixelX: 1789, pixelY: 1115, ax: 37.7, ay: 70.5 },
  { id: '11', num: '11', sector: 'Bloque Norte', area: '100.79 m²', estado: 'disponible', px: 25.0, py: 44.5, pixelX: 1742, pixelY: 1115, ax: 35.9, ay: 70.7 },
  { id: '12', num: '12', sector: 'Bloque Norte', area: '100.79 m²', estado: 'disponible', px: 26.8, py: 49.0, pixelX: 1690, pixelY: 1106, ax: 34.1, ay: 70.9 },
  { id: '13', num: '13', sector: 'Bloque Norte', area: '100.79 m²', estado: 'disponible', px: 23.5, py: 53.3, pixelX: 1650, pixelY: 1097, ax: 32.3, ay: 71.1 },
  { id: '14', num: '14', sector: 'Bloque Norte', area: '100.79 m²', estado: 'disponible', px: 24.5, py: 57.6, pixelX: 1612, pixelY: 1112, ax: 30.4, ay: 71.4 },
  { id: '15', num: '15', sector: 'Bloque Norte', area: '100.96 m²', estado: 'disponible', px: 24.5, py: 61.9, pixelX: 1560, pixelY: 1109, ax: 28.6, ay: 71.6 },
  { id: '16', num: '16', sector: 'Bloque Norte', area: '127.65 m²', estado: 'disponible', px: 23.0, py: 67.2, pixelX: 1501, pixelY: 1115, ax: 26.8, ay: 71.8 },

  // ÁREA VERDE (Lote 17 — Área verde grande a la izquierda, estado fijo no vendible)
  { id: '17', num: '17', sector: 'Área Verde', area: '1,022.16 m²', estado: 'area_verde', px: 37.5, py: 84.5, pixelX: 1275, pixelY: 1205, ax: 16.5, ay: 78.2 },

  // BLOQUE SUR (18 al 28 — Fila inferior del terreno amarillo, de izquierda a derecha)
  { id: '18', num: '18', sector: 'Bloque Sur', area: '127.48 m²', estado: 'disponible', px: 49.0, py: 78.6, pixelX: 1313, pixelY: 1285, ax: 18.8, ay: 83.2 },
  { id: '19', num: '19', sector: 'Bloque Sur', area: '114.88 m²', estado: 'disponible', px: 50.2, py: 74.6, pixelX: 1365, pixelY: 1301, ax: 21.2, ay: 83.8 },
  { id: '20', num: '20', sector: 'Bloque Sur', area: '115.12 m²', estado: 'disponible', px: 52.5, py: 70.8, pixelX: 1421, pixelY: 1304, ax: 23.6, ay: 84.3 },
  { id: '21', num: '21', sector: 'Bloque Sur', area: '115.36 m²', estado: 'disponible', px: 53.5, py: 66.8, pixelX: 1473, pixelY: 1313, ax: 26.0, ay: 84.5 },
  { id: '22', num: '22', sector: 'Bloque Sur', area: '115.27 m²', estado: 'disponible', px: 54.5, py: 62.6, pixelX: 1535, pixelY: 1313, ax: 28.3, ay: 84.7 },
  { id: '23', num: '23', sector: 'Bloque Sur', area: '114.57 m²', estado: 'disponible', px: 55.5, py: 58.2, pixelX: 1585, pixelY: 1319, ax: 30.7, ay: 84.8 },
  { id: '24', num: '24', sector: 'Bloque Sur', area: '114.45 m²', estado: 'disponible', px: 56.5, py: 53.8, pixelX: 1646, pixelY: 1304, ax: 33.0, ay: 85.0 },
  { id: '25', num: '25', sector: 'Bloque Sur', area: '200.00 m²', estado: 'disponible', px: 59.5, py: 47.8, pixelX: 1733, pixelY: 1310, ax: 35.4, ay: 85.2 },
  { id: '26', num: '26', sector: 'Bloque Sur', area: '95.34 m²', estado: 'disponible', px: 60.5, py: 42.2, pixelX: 1810, pixelY: 1307, ax: 38.2, ay: 84.5 },
  { id: '27', num: '27', sector: 'Bloque Sur', area: '142.03 m²', estado: 'disponible', px: 63.0, py: 37.5, pixelX: 1878, pixelY: 1298, ax: 41.0, ay: 83.9 },
  { id: '28', num: '28', sector: 'Bloque Sur', area: '161.66 m²', estado: 'disponible', px: 64.5, py: 32.0, pixelX: 1962, pixelY: 1295, ax: 43.8, ay: 83.2 },

  // ISLA CENTRAL (29 al 46 — Pares arriba, Impares abajo, de derecha a izquierda)
  { id: '29', num: '29', sector: 'Isla Central', area: '200.00 m²', estado: 'disponible', px: 51.8, py: 32.0, pixelX: 1922, pixelY: 1224, ax: 42.3, ay: 78.8 },
  { id: '30', num: '30', sector: 'Isla Central', area: '200.00 m²', estado: 'disponible', px: 44.5, py: 30.8, pixelX: 1915, pixelY: 1180, ax: 42.1, ay: 75.3 },
  { id: '31', num: '31', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 49.8, py: 39.2, pixelX: 1841, pixelY: 1230, ax: 38.9, ay: 78.7 },
  { id: '32', num: '32', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 42.8, py: 38.0, pixelX: 1838, pixelY: 1190, ax: 38.9, ay: 75.2 },
  { id: '33', num: '33', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 48.2, py: 43.8, pixelX: 1776, pixelY: 1230, ax: 36.6, ay: 78.7 },
  { id: '34', num: '34', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 41.0, py: 42.5, pixelX: 1770, pixelY: 1180, ax: 36.6, ay: 75.2 },
  { id: '35', num: '35', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 46.5, py: 48.2, pixelX: 1718, pixelY: 1230, ax: 34.3, ay: 78.6 },
  { id: '36', num: '36', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 39.2, py: 47.0, pixelX: 1711, pixelY: 1183, ax: 34.4, ay: 75.1 },
  { id: '37', num: '37', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 44.8, py: 52.8, pixelX: 1646, pixelY: 1227, ax: 32.0, ay: 78.5 },
  { id: '38', num: '38', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 37.5, py: 51.5, pixelX: 1650, pixelY: 1187, ax: 32.1, ay: 75.1 },
  { id: '39', num: '39', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 43.5, py: 57.2, pixelX: 1594, pixelY: 1224, ax: 29.7, ay: 78.4 },
  { id: '40', num: '40', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 36.2, py: 55.8, pixelX: 1597, pixelY: 1193, ax: 29.9, ay: 75.0 },
  { id: '41', num: '41', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 42.0, py: 61.8, pixelX: 1520, pixelY: 1227, ax: 27.3, ay: 78.4 },
  { id: '42', num: '42', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 34.8, py: 60.5, pixelX: 1529, pixelY: 1190, ax: 27.7, ay: 74.9 },
  { id: '43', num: '43', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 40.5, py: 66.5, pixelX: 1461, pixelY: 1227, ax: 25.0, ay: 78.3 },
  { id: '44', num: '44', sector: 'Isla Central', area: '100.00 m²', estado: 'disponible', px: 33.5, py: 65.2, pixelX: 1467, pixelY: 1183, ax: 25.4, ay: 74.9 },
  { id: '45', num: '45', sector: 'Isla Central', area: '90.00 m²', estado: 'disponible', px: 39.2, py: 71.0, pixelX: 1405, pixelY: 1221, ax: 22.8, ay: 78.2 },
  { id: '46', num: '46', sector: 'Isla Central', area: '90.00 m²', estado: 'disponible', px: 32.2, py: 69.8, pixelX: 1415, pixelY: 1183, ax: 23.3, ay: 74.8 },
];

export const LOTES: Lote[] = LOTES_BASE.map((lote) => ({
  ...lote,
  estado: lote.id === '17' ? 'area_verde' : ESTADOS_LOTES[lote.id] ?? lote.estado,
}));

export function formatEstadosLotesSnippet(lotes: Lote[]): string {
  const lines: string[] = [];
  for (let i = 0; i < lotes.length; i += 6) {
    const chunk = lotes
      .slice(i, i + 6)
      .map((l) => `'${l.id}': '${l.id === '17' ? 'area_verde' : l.estado}'`)
      .join(', ');
    lines.push(`  ${chunk},`);
  }
  return `export const ESTADOS_LOTES: Record<string, LotStatus> = {\n${lines.join('\n')}\n};`;
}

export function buildWhatsappUrl(asesor: Asesor, lote: Lote): string {
  const texto =
    lote.estado === 'reservado'
      ? encodeURIComponent(
          `Hola ${asesor.nombre}, quiero consultar la disponibilidad del Lote ${lote.num} (${lote.sector} · ${lote.area}) en Residencial El Bosque - 3ra Etapa.`
        )
      : encodeURIComponent(
          `Hola ${asesor.nombre}, quiero reservar el Lote ${lote.num} (${lote.sector}) con un área total de ${lote.area} en Residencial El Bosque - 3ra Etapa.`
        );
  return `https://wa.me/${asesor.whatsapp}?text=${texto}`;
}

export function resolveInitialLotIdFromUrl(): string {
  if (typeof window === 'undefined') return '01';
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('lote');
  if (!raw) return '01';
  const normalized = raw.trim().padStart(2, '0');
  const found = LOTES.find((l) => l.id === normalized || l.num === raw.trim());
  return found ? found.id : '01';
}

export function buildShareLotUrl(lotId: string): string {
  if (typeof window === 'undefined') return `?lote=${lotId}`;
  const url = new URL(window.location.href);
  url.searchParams.set('lote', lotId);
  return url.toString();
}

export function isAdminModeFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('admin') === '1';
}

export type LotTagKind = 'corner' | 'green' | 'large';

export interface LotCommercialTag {
  kind: LotTagKind;
  label: string;
}

const CORNER_LOT_IDS = new Set(['01', '06', '07', '16', '18', '28', '29', '30', '45', '46']);
const GREEN_FRONT_LOT_IDS = new Set(['15', '16', '17', '18', '19', '45', '46']);

export function parseLotAreaNumeric(area: string): number {
  const clean = area.replace(/,/g, '').replace(/[^\d.]/g, '');
  return parseFloat(clean) || 0;
}

export function getLotCommercialTags(lote: Lote): LotCommercialTag[] {
  const tags: LotCommercialTag[] = [];
  if (CORNER_LOT_IDS.has(lote.id)) {
    tags.push({ kind: 'corner', label: 'Esquina' });
  }
  if (GREEN_FRONT_LOT_IDS.has(lote.id)) {
    tags.push({
      kind: 'green',
      label: lote.id === '17' ? 'Parque Central' : 'Frente a Área Verde',
    });
  }
  if (lote.id !== '17' && parseLotAreaNumeric(lote.area) >= 200) {
    tags.push({ kind: 'large', label: '+200 m²' });
  }
  return tags;
}

export const GUIDED_TOUR_LOT_IDS: string[] = LOTES_BASE.map((lote) => lote.id);



export const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQUjh1LwQ1NhQWAtGzSjGpW3ASy4GU3fMlq-54xc9q0oBRvIDpTtVQdfjCA6dnAyDw3oirl0e_7ZqSu/pub?gid=0&single=true&output=csv';

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export async function fetchSheetLotStatuses(): Promise<Record<string, LotStatus>> {
  const url = `${GOOGLE_SHEET_CSV_URL}&_t=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const csvText = await response.text();
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return {};

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const loteIdx = headers.indexOf('lote');
  const estadoIdx = headers.indexOf('estado');

  if (loteIdx === -1 || estadoIdx === -1) return {};

  const updates: Record<string, LotStatus> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const rawLote = (cols[loteIdx] || '').trim();
    const rawEstado = (cols[estadoIdx] || '').trim().toLowerCase();
    if (!rawLote) continue;

    const normalizedId = rawLote.padStart(2, '0');
    if (normalizedId === '17') {
      updates[normalizedId] = 'area_verde';
      continue;
    }

    if (
      rawEstado === 'disponible' ||
      rawEstado === 'reservado' ||
      rawEstado === 'vendido' ||
      rawEstado === 'area_verde'
    ) {
      updates[normalizedId] = rawEstado;
    }
  }
  return updates;
}
