// src/components/FlightResultCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Plane, Luggage, ChevronLeft, Zap, Info, MoveLeft } from 'lucide-react';
import { Flight } from '../types';
import { cn } from '@/lib/utils';

interface FlightResultCardProps {
  flight: Flight;
  onClick?: () => void;
  index: number;
}

/**
 * Mapping for internal provider codes to standard IATA codes and Arabic names
 */
const AIRLINE_MAP: Record<string, { iata: string, name: string }> = {
  'IA': { iata: 'IA', name: 'الخطوط الجوية العراقية' },
  'AMD': { iata: 'IA', name: 'الخطوط الجوية العراقية' },
  'RJ': { iata: 'RJ', name: 'الملكية الأردنية' },
  'TRP': { iata: 'RJ', name: 'الملكية الأردنية' },
  'FZ': { iata: 'FZ', name: 'فلاي دبي' },
  'FZE': { iata: 'FZ', name: 'فلاي دبي' },
  'MS': { iata: 'MS', name: 'مصر للطيران' },
  'UBD': { iata: 'MS', name: 'مصر للطيران' },
  'G9': { iata: 'G9', name: 'العربية للطيران' },
  'ABY': { iata: 'G9', name: 'العربية للطيران' },
  'TK': { iata: 'TK', name: 'الخطوط التركية' },
  'QR': { iata: 'QR', name: 'الخطوط القطرية' },
  'EK': { iata: 'EK', name: 'طيران الإمارات' },
  'UAE': { iata: 'EK', name: 'طيران الإمارات' },
  'EY': { iata: 'EY', name: 'الاتحاد للطيران' },
  'SV': { iata: 'SV', name: 'الخطوط السعودية' },
  'KU': { iata: 'KU', name: 'الخطوط الكويتية' },
  'GF': { iata: 'GF', name: 'طيران الخليج' },
  'OV': { iata: 'OV', name: 'طيران السلام' },
  'WY': { iata: 'WY', name: 'الطيران العماني' },
  'ME': { iata: 'ME', name: 'طيران الشرق الأوسط' },
  'PC': { iata: 'PC', name: 'طيران بيغاسوس' },
  'SQ': { iata: 'SQ', name: 'الخطوط السنغافورية' },
  'SIA': { iata: 'SQ', name: 'الخطوط السنغافورية' }
};

const FlightResultCard: React.FC<FlightResultCardProps> = ({ flight, onClick, index }) => {
  
  const mappedData = AIRLINE_MAP[flight.airlineCode || flight.airline];
  const airlineName = mappedData?.name || flight.airline;
  const iataCode = mappedData?.iata || flight.airlineCode || flight.airline;
  const logoUrl = `https://pics.avs.io/200/200/${iataCode}.png`;
  
  /**
   * Extract HH:mm from date string "YYYY-MM-DD HH:mm"
   */
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--';
    const parts = dateStr.trim().split(' ');
    if (parts.length > 1) return parts[1].substring(0, 5); 
    const timeMatch = dateStr.match(/\d{2}:\d{2}/);
    return timeMatch ? timeMatch[0] : dateStr.substring(0, 5);
  };

  /**
   * Convert duration string (e.g. "435 min") to readable format
   */
  const formatDurationReadable = (durationStr: string) => {
    const mins = parseInt(durationStr);
    if (isNaN(mins)) return durationStr;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    
    let result = '';
    if (h > 0) result += `${h}س `;
    if (m > 0) result += `${m}د`;
    return result || 'مباشر';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={onClick}
      className="bg-card rounded-[24px] p-4 mb-3 border border-border/40 shadow-sm active:scale-[0.98] transition-all duration-200 overflow-hidden relative"
      dir="rtl"
    >
      <div className="flex flex-col gap-4">
        {/* Row 1: Airline & Tags */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 max-w-[70%]">
            <div className="w-8 h-8 bg-white rounded-lg p-1 border border-border/10 flex items-center justify-center shrink-0">
              <img 
                src={logoUrl} 
                alt={flight.airline} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <h3 className="text-sm font-bold text-foreground truncate leading-none">{airlineName}</h3>
          </div>
          
          <div className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight",
            flight.stops === 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
          )}>
            {flight.stops === 0 ? 'مباشر' : `${flight.stops} توقف`}
          </div>
        </div>

        {/* Row 2: The Timeline (Core Content) */}
        <div className="flex items-center justify-between relative px-1 py-1">
          {/* Departure */}
          <div className="text-right">
            <p className="text-2xl font-black text-foreground tabular-nums leading-none tracking-tighter">{formatTime(flight.departureTime)}</p>
            <p className="text-xs font-bold text-muted-foreground mt-1 tracking-tight">{flight.origin}</p>
          </div>

          {/* Timeline Decoration */}
          <div className="flex-1 flex flex-col items-center gap-1.5 px-3 relative">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1">
              <span>{formatDurationReadable(flight.duration)}</span>
              {flight.stops > 0 && <span className="w-1 h-1 rounded-full bg-orange-400" />}
            </div>
            <div className="w-full h-[1px] bg-border/40 relative flex items-center justify-center">
              <div className="absolute inset-0 border-t border-dashed border-border/60" />
              <div className="absolute bg-card px-1 transition-transform group-active:translate-x-[-10px]">
                <Plane className="w-3.5 h-3.5 text-primary rotate-180" strokeWidth={3} />
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-border" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
                 <MoveLeft className="w-3 h-3 text-muted-foreground/40" strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Arrival */}
          <div className="text-left">
            <p className="text-2xl font-black text-foreground tabular-nums leading-none tracking-tighter">{formatTime(flight.arrivalTime)}</p>
            <p className="text-xs font-bold text-muted-foreground mt-1 tracking-tight">{flight.destination}</p>
          </div>
        </div>

        {/* Row 3: Price Info */}
        <div className="flex justify-end items-baseline gap-1 mt-1">
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">السعر يبدأ من</span>
           <p className="text-xl font-black text-primary tabular-nums tracking-tighter">
             {flight.price.toLocaleString()} 
             <span className="text-xs font-bold mr-1 text-primary">
               {flight.currency === 'USD' ? 'دولار' : 'د.ع'}
             </span>
           </p>
        </div>

        {/* Row 4: Action Button (Full Width Mobile) */}
        <button className="w-full h-12 rounded-[16px] bg-primary text-primary-foreground text-sm font-black tracking-[0.1em] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.96] transition-all">
          حجز الرحلة
          <ChevronLeft className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    </motion.div>
  );
};

export default FlightResultCard;
