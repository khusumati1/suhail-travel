// src/components/FlightSearchForm.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, Search, ArrowRightLeft, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchParams } from '../hooks/useFlightSearch';
import CitySearchModal from './CitySearchModal';

interface FlightSearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
  className?: string;
}

const FlightSearchForm: React.FC<FlightSearchFormProps> = ({ onSearch, isLoading, className }) => {
  const [fromCode, setFromCode] = useState('BGW');
  const [fromCity, setFromCity] = useState('Baghdad');
  const [toCode, setToCode] = useState('IST');
  const [toCity, setToCity] = useState('Istanbul');
  const [date, setDate] = useState('2026-05-15');
  const [adults, setAdults] = useState(1);
  const [fromSearchOpen, setFromSearchOpen] = useState(false);
  const [toSearchOpen, setToSearchOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      origin: fromCode,
      destination: toCode,
      departure_date: date,
      return_date: '',
      passengers: {
        adults: adults,
        children: 0,
        infants: 0,
      },
      cabin_class: 'economy',
    });
  };

  const swapCities = () => {
    const tempCode = fromCode;
    const tempCity = fromCity;
    setFromCode(toCode);
    setFromCity(toCity);
    setToCode(tempCode);
    setToCity(tempCity);
  };

  return (
    <div className={cn("bg-card/40 backdrop-blur-2xl rounded-[40px] p-6 lg:p-8 shadow-2xl border border-border/40 relative overflow-hidden", className)}>
      {/* Decorative Blur */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      
      <form onSubmit={handleSubmit} className="relative z-10">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
          {/* Location Inputs Group */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* From */}
            <div className="relative group">
              <label className="absolute top-3 left-6 text-[10px] font-black text-primary uppercase tracking-[0.2em] z-10">من أين؟</label>
              <button
                type="button"
                onClick={() => setFromSearchOpen(true)}
                className="w-full bg-secondary/60 border border-border/40 rounded-[24px] px-6 pt-9 pb-4 text-left hover:bg-secondary/80 hover:border-primary/30 transition-all outline-none"
              >
                <div className="flex items-center gap-4">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xl font-black text-foreground leading-none">{fromCode}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">{fromCity}</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Swap Button (Desktop Center) */}
            <button
              type="button"
              onClick={swapCities}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all z-20 border-4 border-card hidden md:flex"
            >
              <ArrowRightLeft className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
            </button>

            {/* To */}
            <div className="relative group">
              <label className="absolute top-3 left-6 text-[10px] font-black text-primary uppercase tracking-[0.2em] z-10">إلى أين؟</label>
              <button
                type="button"
                onClick={() => setToSearchOpen(true)}
                className="w-full bg-secondary/60 border border-border/40 rounded-[24px] px-6 pt-9 pb-4 text-left hover:bg-secondary/80 hover:border-primary/30 transition-all outline-none"
              >
                <div className="flex items-center gap-4">
                  <MapPin className="w-5 h-5 text-muted-foreground/40" />
                  <div>
                    <p className="text-xl font-black text-foreground leading-none">{toCode}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">{toCity}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Date & Passengers Group */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="absolute top-3 left-6 text-[10px] font-black text-primary uppercase tracking-[0.2em] z-10">تاريخ السفر</label>
              <div className="flex items-center bg-secondary/60 border border-border/40 rounded-[24px] px-6 pt-9 pb-4 hover:border-primary/30 transition-all">
                <Calendar className="w-5 h-5 text-primary/60 mr-4" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-lg font-black text-foreground outline-none w-full"
                />
              </div>
            </div>

            <div className="relative">
              <label className="absolute top-3 left-6 text-[10px] font-black text-primary uppercase tracking-[0.2em] z-10">المسافرون</label>
              <div className="flex items-center bg-secondary/60 border border-border/40 rounded-[24px] px-6 pt-9 pb-4 hover:border-primary/30 transition-all">
                <Users className="w-5 h-5 text-primary/60 mr-4" />
                <select
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="bg-transparent text-lg font-black text-foreground outline-none w-full appearance-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'بالغ' : 'بالغين'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="lg:w-20 h-20 bg-primary text-primary-foreground rounded-[24px] shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Search className="w-8 h-8" strokeWidth={3} />
            )}
          </button>
        </div>
      </form>

      <CitySearchModal
        open={fromSearchOpen}
        onOpenChange={setFromSearchOpen}
        onSelect={(name, code) => { setFromCity(name); setFromCode(code); }}
        label="مدينة الإقلاع"
      />
      <CitySearchModal
        open={toSearchOpen}
        onOpenChange={setToSearchOpen}
        onSelect={(name, code) => { setToCity(name); setToCode(code); }}
        label="مدينة الوصول"
      />
    </div>
  );
};

export default FlightSearchForm;
