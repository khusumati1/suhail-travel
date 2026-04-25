import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FlightInfo {
  flight_number: string;
  airline: string;
  departure: {
    airport: string;
    iata: string;
    scheduled: string;
    estimated?: string;
    actual?: string;
    terminal?: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    iata: string;
    scheduled: string;
    estimated?: string;
    actual?: string;
    terminal?: string;
    gate?: string;
  };
  status: string;
}

interface FetchFlightsParams {
  type?: 'timetable' | 'status';
  iataCode?: string;
  mode?: 'departure' | 'arrival';
  flight_number?: string;
  airline?: string;
}

const fetchFlights = async (params: FetchFlightsParams): Promise<FlightInfo[]> => {
  const queryParams: Record<string, string> = {
    type: params.type || 'timetable',
    iataCode: params.iataCode || 'AMM',
    mode: params.mode || 'departure',
  };
  
  if (params.flight_number) queryParams.flight_number = params.flight_number;
  if (params.airline) queryParams.airline = params.airline;

  const queryString = new URLSearchParams(queryParams).toString();

  const { data, error } = await supabase.functions.invoke(`flights?${queryString}`, {
    method: 'GET',
  });

  if (error) throw new Error(error.message || 'Failed to fetch flights');
  if (!data?.success) throw new Error(data?.error || 'Failed to fetch flights');

  return data.flights;
};

export function useFlightTimetable(iataCode: string = 'AMM', mode: 'departure' | 'arrival' = 'departure') {
  return useQuery({
    queryKey: ['flights', 'timetable', iataCode, mode],
    queryFn: () => fetchFlights({ type: 'timetable', iataCode, mode }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
  });
}

export function useFlightStatus(flightNumber: string) {
  return useQuery({
    queryKey: ['flights', 'status', flightNumber],
    queryFn: () => fetchFlights({ type: 'status', flight_number: flightNumber }),
    enabled: !!flightNumber,
    staleTime: 1 * 60 * 1000, // 1 minute for live status
  });
}
