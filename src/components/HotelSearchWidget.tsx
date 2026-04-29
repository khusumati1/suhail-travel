// src/components/HotelSearchWidget.tsx
import React, { useState } from 'react';
import { MapPin, Calendar, Users, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface HotelSearchWidgetProps {
  onSearch: (params: any) => void;
  isLoading?: boolean;
}

const HotelSearchWidget: React.FC<HotelSearchWidgetProps> = ({ onSearch, isLoading }) => {
  const [city, setCity] = useState('Dubai');
  const [dates, setDates] = useState({ checkIn: '2026-06-15', checkOut: '2026-06-20' });
  const [guests, setGuests] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ city, ...dates, guests });
  };

  return (
    <motion.form 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onSubmit={handleSubmit} 
      className="space-y-6"
    >
      <div className="bg-secondary/40 border border-border/50 rounded-[24px] p-5">
        <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">City or Hotel</label>
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary/60" />
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="Where to?" className="bg-transparent text-lg font-bold outline-none w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/40 border border-border/50 rounded-[24px] p-5">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Check-in</label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary/60" />
            <input type="date" value={dates.checkIn} onChange={e => setDates({...dates, checkIn: e.target.value})} className="bg-transparent text-sm font-bold outline-none w-full" />
          </div>
        </div>
        <div className="bg-secondary/40 border border-border/50 rounded-[24px] p-5">
          <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Check-out</label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary/60" />
            <input type="date" value={dates.checkOut} onChange={e => setDates({...dates, checkOut: e.target.value})} className="bg-transparent text-sm font-bold outline-none w-full" />
          </div>
        </div>
      </div>
      <div className="bg-secondary/40 border border-border/50 rounded-[24px] p-5">
        <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Guests</label>
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary/60" />
          <select value={guests} onChange={e => setGuests(Number(e.target.value))} className="bg-transparent text-lg font-bold outline-none w-full">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
          </select>
        </div>
      </div>
      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground font-black py-5 rounded-[24px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
      >
        <Search className="w-5 h-5" />
        {isLoading ? 'Finding Hotels...' : 'Find Hotels'}
      </button>
    </motion.form>
  );
};

export default HotelSearchWidget;
