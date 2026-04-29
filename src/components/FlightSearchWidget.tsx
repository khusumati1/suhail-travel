// src/components/FlightSearchWidget.tsx
import React, { useState } from 'react';
import { MapPin, Calendar, Search, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface FlightSearchWidgetProps {
  onSearch: (params: any) => void;
  isLoading?: boolean;
}

const FlightSearchWidget: React.FC<FlightSearchWidgetProps> = ({ onSearch, isLoading }) => {
  const [from, setFrom] = useState('BGW');
  const [to, setTo] = useState('IST');
  const [date, setDate] = useState('2026-06-10');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ origin: from, destination: to, departure_date: date });
  };

  return (
    <motion.form 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onSubmit={handleSubmit} 
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full bg-secondary/40 border border-border/50 rounded-[24px] p-5">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">From</label>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary/60" />
            <input value={from} onChange={e => setFrom(e.target.value)} className="bg-transparent text-lg font-bold outline-none w-full" />
          </div>
        </div>
        <button type="button" className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary -my-6 md:my-0">
          <ArrowRightLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 w-full bg-secondary/40 border border-border/50 rounded-[24px] p-5">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">To</label>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground/40" />
            <input value={to} onChange={e => setTo(e.target.value)} className="bg-transparent text-lg font-bold outline-none w-full" />
          </div>
        </div>
      </div>
      <div className="bg-secondary/40 border border-border/50 rounded-[24px] p-5">
        <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Departure Date</label>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary/60" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-lg font-bold outline-none w-full" />
        </div>
      </div>
      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground font-black py-5 rounded-[24px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
      >
        <Search className="w-5 h-5" />
        {isLoading ? 'Searching...' : 'Find Flights'}
      </button>
    </motion.form>
  );
};

export default FlightSearchWidget;
