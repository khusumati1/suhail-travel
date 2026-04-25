import { getDistance, generateDeterministicHash } from "./distance.ts";
import { calculateFlightMetrics } from "./pricing.ts";

const AIRLINES_ME = [
  { name: "Turkish Airlines", iata: "TK" },
  { name: "Qatar Airways", iata: "QR" },
  { name: "Emirates", iata: "EK" },
  { name: "Iraqi Airways", iata: "IA" },
  { name: "Royal Jordanian", iata: "RJ" },
  { name: "FlyDubai", iata: "FZ" },
  { name: "Middle East Airlines", iata: "ME" }
];

const AIRLINES_GLOBAL = [
  { name: "Lufthansa", iata: "LH" },
  { name: "Air France", iata: "AF" },
  { name: "British Airways", iata: "BA" },
  { name: "KLM", iata: "KL" }
];

function selectAirlines(origin: string, destination: string, seedHash: number) {
  // Simple geo detection for Middle East (crude heuristic based on common IATAs in region)
  const meRegions = ["BGW", "EBL", "BSR", "IST", "DXB", "DOH", "AMM", "CAI", "BEY", "KWI", "RUH", "JED", "MCT", "BAH"];
  const isME = meRegions.includes(origin) || meRegions.includes(destination);
  
  const pool = isME ? [...AIRLINES_ME, ...AIRLINES_GLOBAL.slice(0, 2)] : [...AIRLINES_GLOBAL, ...AIRLINES_ME.slice(0, 2)];
  
  // Return two unique airlines from the pool deterministically
  const first = pool[seedHash % pool.length];
  const second = pool[(seedHash + 7) % pool.length];
  return [first, second];
}

function generateTime(baseDateStr: string, hourOffset: number): string {
  const d = new Date(baseDateStr);
  d.setUTCHours(hourOffset, 0, 0, 0);
  return d.toISOString().replace('.000Z', '');
}

function addMinutes(dateStr: string, minutes: number): string {
  const d = new Date(dateStr + "Z"); // Parse as UTC
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().replace('.000Z', '');
}

export function simulateFlights(origin: string, destination: string, departureDate: string, adults: number) {
  const distance = getDistance(origin, destination);
  if (distance === 0) return []; // Invalid route
  
  const baseSeed = `${origin}-${destination}-${departureDate}`;
  const baseHash = generateDeterministicHash(baseSeed);
  
  const airlines = selectAirlines(origin, destination, baseHash);
  
  const optionsCount = 3 + (baseHash % 3); // 3 to 5 options
  const results = [];
  
  for (let i = 0; i < optionsCount; i++) {
    const flightSeed = `${baseSeed}-${i}`;
    const { price, duration, durationMinutes } = calculateFlightMetrics(distance, flightSeed);
    
    const airline = airlines[i % airlines.length];
    
    // Deterministic departure hour (e.g. 6AM to 22PM)
    const deptHour = 6 + ((baseHash + i * 5) % 17);
    const departureTime = generateTime(departureDate, deptHour);
    const arrivalTime = addMinutes(departureTime, durationMinutes);
    
    const flightNumber = `${airline.iata}${100 + ((baseHash + i * 13) % 899)}`;
    
    const totalPrice = (price * adults).toFixed(2);
    
    results.push({
      type: "flight-offer",
      id: `SIM-${flightSeed}`,
      source: "SIMULATOR",
      instantTicketingRequired: false,
      nonHomogeneous: false,
      oneWay: true,
      lastTicketingDate: departureDate,
      numberOfBookableSeats: 9,
      itineraries: [
        {
          duration: duration,
          segments: [
            {
              departure: {
                iataCode: origin,
                at: departureTime
              },
              arrival: {
                iataCode: destination,
                at: arrivalTime
              },
              carrierCode: airline.iata,
              number: flightNumber.replace(airline.iata, ''),
              aircraft: {
                code: "320"
              },
              operating: {
                carrierCode: airline.iata
              },
              duration: duration,
              id: "1",
              numberOfStops: 0,
              blacklistedInEU: false
            }
          ]
        }
      ],
      price: {
        currency: "USD",
        total: totalPrice,
        base: (parseFloat(totalPrice) * 0.8).toFixed(2),
        fees: [
          {
            amount: "0.00",
            type: "SUPPLIER"
          },
          {
            amount: "0.00",
            type: "TICKETING"
          }
        ],
        grandTotal: totalPrice
      },
      pricingOptions: {
        fareType: ["PUBLISHED"],
        includedCheckedBagsOnly: true
      },
      validatingAirlineCodes: [airline.iata],
      travelerPricings: Array(adults).fill(null).map((_, idx) => ({
        travelerId: (idx + 1).toString(),
        fareOption: "STANDARD",
        travelerType: "ADULT",
        price: {
          currency: "USD",
          total: price.toFixed(2),
          base: (price * 0.8).toFixed(2)
        },
        fareDetailsBySegment: [
          {
            segmentId: "1",
            cabin: "ECONOMY",
            fareBasis: "YBASIC",
            class: "Y",
            includedCheckedBags: {
              weight: 20,
              weightUnit: "KG"
            }
          }
        ]
      })),
      meta: {
        simulated: true
      }
    });
  }
  
  // Sort by price
  results.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
  return results;
}
