const AIRPORT_COORDS: Record<string, { lat: number; lon: number }> = {
  BGW: { lat: 33.2625, lon: 44.2346 },
  IST: { lat: 41.2753, lon: 28.7519 },
  DXB: { lat: 25.2532, lon: 55.3657 },
  DOH: { lat: 25.2731, lon: 51.6081 },
  AMM: { lat: 31.7226, lon: 35.9932 },
  LHR: { lat: 51.4700, lon: -0.4543 },
  CDG: { lat: 49.0097, lon: 2.5479 },
  JFK: { lat: 40.6413, lon: -73.7781 },
  SYD: { lat: -33.9399, lon: 151.1753 },
  BKK: { lat: 13.6900, lon: 100.7501 },
  MAD: { lat: 40.4839, lon: -3.5680 },
  FRA: { lat: 50.0379, lon: 8.5622 },
  EBL: { lat: 36.2370, lon: 43.9575 },
  CAI: { lat: 30.1219, lon: 31.4056 },
  BEY: { lat: 33.8209, lon: 35.4884 }
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateDeterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getDistance(origin: string, destination: string): number {
  if (origin === destination) return 0;

  const originCoords = AIRPORT_COORDS[origin];
  const destCoords = AIRPORT_COORDS[destination];

  if (originCoords && destCoords) {
    const dist = haversineDistance(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon);
    return Math.max(dist, 100); // Minimum 100km to avoid ultra-short flights
  }

  // Fallback for unknown IATAs using deterministic hashing
  const hash = generateDeterministicHash(`${origin}-${destination}`);
  // Generate a realistic distance between 400km and 6000km
  return 400 + (hash % 5600);
}
