export interface MapScanPosition { lat?: number | null; lon?: number | null; scanid: number }

export const normalizeLongitude = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;

export const hasStartCoordinates = (value: MapScanPosition): value is MapScanPosition & { lat: number; lon: number } =>
  typeof value.lat === "number" && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
  && typeof value.lon === "number" && Number.isFinite(value.lon);
