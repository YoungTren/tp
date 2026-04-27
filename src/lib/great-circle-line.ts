const d2r = (d: number) => (d * Math.PI) / 180;
const r2d = (r: number) => (r * 180) / Math.PI;

const toCart = (lat: number, lon: number): [number, number, number] => {
  const φ = d2r(lat);
  const λ = d2r(lon);
  return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
};

/**
 * Сферическая интерполяция между двумя точками (дуга большого круга) в WGS84.
 * Удобно для линии «маршрута» перелёта на картographic проекции.
 */
export const greatCirclePoints = (lat1: number, lon1: number, lat2: number, lon2: number, segments: number): [number, number][] => {
  if (segments < 1) {
    return [
      [lat1, lon1],
      [lat2, lon2],
    ];
  }
  if (Math.abs(lat1 - lat2) < 1e-7 && Math.abs(lon1 - lon2) < 1e-7) {
    return [[lat1, lon1]];
  }
  const c1 = toCart(lat1, lon1);
  const c2 = toCart(lat2, lon2);
  const dot = c1[0] * c2[0] + c1[1] * c2[1] + c1[2] * c2[2];
  const w = Math.acos(Math.max(-1, Math.min(1, dot)));
  if (w < 1e-6) {
    return [[lat1, lon1]];
  }
  const res: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = Math.sin((1 - t) * w) / Math.sin(w);
    const b = (Math.sin(t * w) / Math.sin(w)) as number;
    const x = a * c1[0] + b * c2[0];
    const y = a * c1[1] + b * c2[1];
    const z = a * c1[2] + b * c2[2];
    const horiz = Math.hypot(x, y);
    const lat = r2d(Math.atan2(z, horiz));
    const lon = r2d(Math.atan2(y, x));
    res.push([lat, lon]);
  }
  return res;
};
