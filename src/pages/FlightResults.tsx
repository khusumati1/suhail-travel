// src/pages/FlightResults.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Plane, AlertCircle, SlidersHorizontal, Search as SearchIcon, Pencil, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import FlightSearchForm from '@/components/FlightSearchForm';
import FlightResultCard from '@/components/FlightResultCard';
import FlightFilters from '@/components/FlightFilters';
import { useFlightSearch } from '@/hooks/useFlightSearch';
import BottomNav from '@/components/BottomNav';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const FlightResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSearchForm, setShowSearchForm] = useState(false);
  const { offers, loading, progress, error, searchFlights } = useFlightSearch();

  useEffect(() => {
    const state = location.state as any;
    if (state?.origin && state?.destination && state?.departure_date) {
      searchFlights({
        origin: state.origin,
        destination: state.destination,
        departure_date: state.departure_date,
        return_date: state.return_date,
        passengers: state.passengers || { adults: 1, children: 0, infants: 0 },
        cabin_class: state.cabin_class || 'economy',
      });
    }
  }, [location.state, searchFlights]);

  const handleFlightSelect = (flight: any) => {
    navigate('/flights/booking', { state: { flight } });
  };

  const currentSearch = location.state as any;

  return (
    <div className="min-h-screen bg-secondary/30 pb-40" dir="rtl">
      {/* Mobile-First Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button 
            onClick={() => navigate('/home')} 
            className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-secondary/80 rounded-full"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Compact Search Summary */}
          <div 
            onClick={() => setShowSearchForm(!showSearchForm)}
            className="flex-1 flex items-center justify-center gap-2 bg-secondary/50 rounded-2xl py-2 px-4 border border-border/10 cursor-pointer active:scale-95 transition-transform"
          >
             <p className="text-[11px] font-black tracking-tight leading-none">
               {currentSearch?.origin} ✈️ {currentSearch?.destination}
               <span className="mx-2 text-muted-foreground/40">|</span>
               {currentSearch?.departure_date?.split('-')?.slice(1)?.join('/')}
               <span className="mx-2 text-muted-foreground/40">|</span>
               {currentSearch?.passengers?.adults || 1} مسافر
             </p>
             <Pencil className="w-3 h-3 text-primary" />
          </div>

          <div className="w-10" /> {/* Placeholder for balance */}
        </div>

        {/* Collapsible Search Form Overlay */}
        <AnimatePresence>
          {showSearchForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-0 w-full bg-background border-b border-border shadow-2xl p-4 z-50"
            >
              <FlightSearchForm 
                onSearch={(params) => {
                  searchFlights(params);
                  setShowSearchForm(false);
                }} 
                isLoading={loading} 
              />
              <button 
                onClick={() => setShowSearchForm(false)}
                className="w-full py-3 text-[11px] font-black text-muted-foreground uppercase tracking-widest"
              >
                إغلاق
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 mb-6"
            >
              <div className="bg-primary/5 rounded-[24px] p-5 border border-primary/10">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-[11px] font-black">جاري جلب الأسعار...</span>
                  </div>
                  <span className="text-sm font-black text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/5 border border-destructive/10 rounded-[24px] p-8 text-center mb-6">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-sm font-bold text-destructive mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-destructive text-white rounded-xl text-xs font-black">إعادة المحاولة</button>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-2">
          {offers.length > 0 ? (
            offers.map((flight, index) => (
              <FlightResultCard 
                key={flight.id || index} 
                flight={flight} 
                index={index}
                onClick={() => handleFlightSelect(flight)}
              />
            ))
          ) : (
            !loading && !error && (
              <div className="py-20 text-center opacity-40">
                <Plane className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm font-black">لا توجد رحلات متاحة</p>
              </div>
            )
          )}
        </div>
      </main>

      {/* Floating Filter Pill - Mobile Only */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <button className="bg-foreground text-background px-8 py-3 rounded-full shadow-2xl shadow-black/20 flex items-center gap-3 active:scale-95 transition-transform">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-xs font-black tracking-widest uppercase">تصفية</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-[40px] border-t-0 p-0 overflow-hidden">
             <SheetHeader className="p-6 pb-0 text-right">
                <SheetTitle className="text-xl font-black">تصفية النتائج</SheetTitle>
             </SheetHeader>
             <div className="h-full overflow-y-auto p-6 pb-20">
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8" />
                <FlightFilters />
             </div>
          </SheetContent>
        </Sheet>
      </div>

      <BottomNav />
    </div>
  );
};

export default FlightResults;
