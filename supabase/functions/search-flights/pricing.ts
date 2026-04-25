import { generateDeterministicHash } from "./distance.ts";

export function calculateFlightMetrics(distance: number, seed: string) {
  // Duration based on average speed 800 km/h + 45 min buffer (takeoff/landing)
  const durationMinutes = Math.round((distance / 800) * 60 + 45);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const isoDuration = `PT${hours}H${minutes}M`;

  // Base price
  let baseFare = 50; // USD
  let dynamicRate = 0.08;

  if (distance > 3000) {
    baseFare = 100;
    dynamicRate = 0.06;
  } else if (distance < 1000) {
    baseFare = 40;
    dynamicRate = 0.12;
  }

  const hash = generateDeterministicHash(seed);
  // Add deterministic price variation (-15% to +15%)
  const variation = ((hash % 30) - 15) / 100;
  
  let price = baseFare + (distance * dynamicRate);
  price = price * (1 + variation);

  // Safeguard caps
  price = Math.max(price, 45); // Min $45
  price = Math.min(price, 5000); // Max $5000

  return {
    price: Math.round(price),
    duration: isoDuration,
    durationMinutes
  };
}
