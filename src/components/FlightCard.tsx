// src/components/FlightCard.tsx
import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Plane, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import { Flight } from '../types';

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

interface FlightCardProps {
  flight: Flight;
  onClick?: () => void;
  index: number;
}

const FlightCard = forwardRef<HTMLDivElement, FlightCardProps>(({ flight, onClick, index }, ref) => {
  const formatTime = (time: string) => {
    try {
      if (!time) return '--:--';
      const parts = time.split(' ');
      if (parts.length > 1) return parts[1].substring(0, 5);
      return time.substring(0, 5);
    } catch { return time; }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group relative bg-card rounded-[24px] p-6 border border-border/40 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
      dir="rtl"
    >
      <div className="absolute top-0 right-0 w-1.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/50 rounded-xl p-2 flex items-center justify-center">
              <img 
                src={`https://pics.avs.io/200/200/${AIRLINE_MAP[flight.airlineCode || flight.airline]?.iata || flight.airlineCode || flight.airline}.png`} 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }} 
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-none">{AIRLINE_MAP[flight.airlineCode || flight.airline]?.name || flight.airline}</h3>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold">
                {flight.stops === 0 ? 'رحلة مباشرة' : `${flight.stops} توقف`}
              </p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground font-medium">يبدأ من</p>
            <p className="text-xl font-bold text-primary">{flight.price.toLocaleString()} <span className="text-[10px]">{flight.currency === 'USD' ? '$' : 'د.ع'}</span></p>
          </div>
        </div>
        <div className="flex justify-between relative px-2 items-center" dir="ltr">
          <div className="text-center"><p className="text-lg font-bold">{formatTime(flight.departureTime)}</p></div>
          <div className="flex-1 flex flex-col items-center px-4">
             <div className="w-full h-[1px] bg-border relative flex items-center justify-center">
                <Plane className="w-3 h-3 text-primary/40 absolute" />
             </div>
          </div>
          <div className="text-center"><p className="text-lg font-bold">{formatTime(flight.arrivalTime)}</p></div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
           <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"><ShieldCheck className="w-3 h-3" /> أفضل سعر</div>
           <div className="text-primary text-xs font-bold flex items-center gap-1">التفاصيل <ChevronRight className="w-3 h-3 rotate-180" /></div>
        </div>
      </div>
    </motion.div>
  );
});

FlightCard.displayName = 'FlightCard';
export default FlightCard;
