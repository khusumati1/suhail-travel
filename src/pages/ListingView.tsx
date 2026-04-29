// src/pages/ListingView.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Plane, Hotel, Info, X, Filter } from 'lucide-react';
import { useFlightSearch } from '@/hooks/useFlightSearch';
import { apiService } from '@/services/apiService';
import FlightCard from '@/components/FlightCard';
import HotelCard from '@/components/HotelCard';
import { FlightOffer, HotelOffer } from '@/types';
import BottomNav from '@/components/BottomNav';
import { Progress } from '@/components/ui/progress';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const ListingView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { offers: flightOffers, loading: flightLoading, progress: flightProgress, searchFlights } = useFlightSearch();
  
  const [hotelOffers, setHotelOffers] = useState<HotelOffer[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FlightOffer | HotelOffer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const queryType = (location.state as any)?.type || 'flights';
  const queryParams = (location.state as any)?.params;

  useEffect(() => {
    if (queryType === 'flights' && queryParams) {
      searchFlights(queryParams);
    } else if (queryType === 'hotels' && queryParams) {
      fetchHotels(queryParams);
    }
  }, [queryType, queryParams]);

  const fetchHotels = async (params: any) => {
    setHotelLoading(true);
    try {
      const results = await apiService.searchHotels(params);
      setHotelOffers(results);
    } finally {
      setHotelLoading(false);
    }
  };

  const handleSelect = (item: FlightOffer | HotelOffer) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-32" dir="rtl">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/home')} className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center border border-border/50 active:scale-95 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight">نتائج {queryType === 'flights' ? 'الطيران' : 'الفنادق'}</h1>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-0.5">مجمع سهيل للـسفر</p>
            </div>
          </div>
          <button className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center border border-border/50">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-10">
        <AnimatePresence>
          {flightLoading && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-8">
              <div className="bg-primary/5 rounded-[24px] p-6 border border-primary/10 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm font-bold">جاري البحث عن أفضل الأسعار...</span>
                  </div>
                  <span className="text-sm font-black text-primary">{flightProgress}%</span>
                </div>
                <Progress value={typeof flightProgress === 'number' ? flightProgress : (flightProgress as any)?.percentage} className="h-2" />
              </div>
            </motion.div>
          )}
          {hotelLoading && (
             <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <Hotel className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">جاري البحث عن أفضل الفنادق...</p>
             </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {queryType === 'flights' && (flightOffers as any[]).map((f, i) => (
            <FlightCard key={f.id || i} flight={f} index={i} onClick={() => handleSelect(f)} />
          ))}
          {queryType === 'hotels' && hotelOffers.map((h, i) => (
            <HotelCard key={h.hotelId} hotel={h} index={i} onClick={() => handleSelect(h)} />
          ))}
        </div>

        {((queryType === 'flights' && !flightLoading && flightOffers.length === 0) || 
          (queryType === 'hotels' && !hotelLoading && hotelOffers.length === 0)) && (
          <div className="py-20 text-center">
            <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
              {queryType === 'flights' ? <Plane className="w-10 h-10 opacity-20" /> : <Hotel className="w-10 h-10 opacity-20" />}
            </div>
            <h3 className="text-xl font-bold">لم يتم العثور على نتائج</h3>
            <p className="text-sm text-muted-foreground">حاول تغيير معايير البحث الخاصة بك</p>
          </div>
        )}
      </main>

      <Drawer open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DrawerContent className="max-w-lg mx-auto">
          <div className="p-6">
            <DrawerHeader className="px-0 pb-6">
              <DrawerTitle className="text-2xl font-black text-right">
                {selectedItem && ('airline' in selectedItem ? selectedItem.airline : selectedItem.name)}
              </DrawerTitle>
            </DrawerHeader>
            <div className="space-y-6 pb-10 overflow-y-auto max-h-[70vh]">
              {selectedItem && 'airline_name' in selectedItem ? (
                <div className="space-y-4">
                  <div className="flex justify-between p-5 bg-secondary/50 rounded-2xl border border-border/50">
                     <div className="text-center flex-1">
                       <p className="text-xs text-muted-foreground mb-1">من</p>
                       <p className="font-bold text-lg">بغداد (BGW)</p>
                     </div>
                     <div className="flex items-center px-4 opacity-30">
                       <Plane className="w-5 h-5 rotate-180" />
                     </div>
                     <div className="text-center flex-1">
                       <p className="text-xs text-muted-foreground mb-1">إلى</p>
                       <p className="font-bold text-lg">إسطنبول (IST)</p>
                     </div>
                  </div>
                  <div className="bg-secondary/30 rounded-2xl p-5 space-y-4">
                    <div className="space-y-2">
                       <p className="text-sm font-bold flex items-center gap-2 text-primary"><Info className="w-4 h-4" /> سياسة الأمتعة</p>
                       <p className="text-xs text-muted-foreground">مشمول: حقيبة شحن 23 كجم، حقيبة يد 7 كجم</p>
                    </div>
                    <div className="space-y-2 border-t border-border/50 pt-4">
                       <p className="text-sm font-bold flex items-center gap-2 text-primary"><Info className="w-4 h-4" /> قواعد الأجرة</p>
                       <p className="text-xs text-muted-foreground">• غير قابلة للاسترداد</p>
                       <p className="text-xs text-muted-foreground">• تغيير التاريخ مسموح مع دفع رسوم</p>
                    </div>
                  </div>
                </div>
              ) : selectedItem && (
                <div className="space-y-4">
                  <img src={(selectedItem as HotelOffer).image} className="w-full h-56 object-cover rounded-[2rem] shadow-lg" />
                  <div className="p-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      فندق فاخر يقدم خدمات متميزة في قلب المدينة. يوفر هذا الفندق غرفاً مريحة وتصميماً عصرياً يلبي كافة احتياجات المسافرين.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-6">
                       {['واي فاي مجاني', 'تكييف', 'خدمة غرف', 'موقف سيارات'].map(a => (
                         <div key={a} className="flex items-center gap-2 text-xs font-bold text-foreground bg-secondary/50 p-3 rounded-xl border border-border/50">{a}</div>
                       ))}
                    </div>
                  </div>
                </div>
              )}
              <button onClick={() => setIsDetailOpen(false)} className="btn-primary mt-4">إغلاق التفاصيل</button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </div>
  );
};

export default ListingView;
