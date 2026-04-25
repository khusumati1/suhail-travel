// Iranian airlines fallback mapping and helper

export const IRANIAN_AIRLINES: Record<string, { name: string; logo: string }> = {
  IR: { name: "Iran Air", logo: "https://logo.clearbit.com/iranair.com" },
  W5: { name: "Mahan Air", logo: "https://logo.clearbit.com/mahan.aero" },
  // Add more Iranian carriers as needed
};

/**
 * Resolve airline metadata (name and logo) with priority:
 * 1. Use provided Duffel data (if name matches known IATA code)
 * 2. Fallback to IRANIAN_AIRLINES mapping
 * 3. Default to "Unknown"
 */
export function getAirlineMeta(iataCode: string): { name: string; logo?: string } {
  // If the IATA code matches a known Iranian airline, return its data
  const fallback = IRANIAN_AIRLINES[iataCode];
  if (fallback) {
    return { name: fallback.name, logo: fallback.logo };
  }
  // Otherwise, return generic unknown
  return { name: iataCode || "Unknown" };
}
