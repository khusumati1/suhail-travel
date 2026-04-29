// src/pages/FlightBooking.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plane, Clock, ShieldCheck, Briefcase, Info, ChevronLeft, MapPin } from 'lucide-react';
import { Flight } from '../types';
import { cn } from '@/lib/utils';

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

const FlightBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'info' | 'terms'>('info');
  
  const flight = location.state?.flight as Flight;

  // Safe data extraction helpers
  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return '--:--';
    const parts = dateStr.trim().split(' ');
    if (parts.length > 1) return parts[1].substring(0, 5); 
    return dateStr.substring(0, 5);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const parts = dateStr.trim().split(' ');
    return parts[0] || dateStr;
  };

  const formatDuration = (durationStr: string | undefined) => {
    if (!durationStr) return '';
    const mins = parseInt(durationStr);
    if (isNaN(mins)) return durationStr;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} ساعة ${m} دقيقة`;
  };

  if (!flight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background text-center" dir="rtl">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-8">
          <Plane className="w-12 h-12 text-muted-foreground opacity-30" />
        </div>
        <h2 className="text-xl font-black mb-4">بيانات الرحلة غير متوفرة</h2>
        <p className="text-sm text-muted-foreground mb-10">عذراً، لم نتمكن من العثور على معلومات الرحلة المطلوبة.</p>
        <button 
          onClick={() => navigate('/home')} 
          className="w-full max-w-xs h-14 bg-primary text-primary-foreground rounded-2xl font-black tracking-widest uppercase shadow-xl shadow-primary/20"
        >
          العودة للبحث
        </button>
      </div>
    );
  }

  const mappedAirline = AIRLINE_MAP[flight.airlineCode || flight.airline];
  const airlineName = mappedAirline?.name || flight.airline;
  const iataCode = mappedAirline?.iata || flight.airlineCode || flight.airline;
  const logoUrl = `https://pics.avs.io/200/200/${iataCode}.png`;

  return (
    <div className="min-h-screen bg-background pb-40" dir="rtl">
      {/* Premium White Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border/40 px-4 h-16 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/80 transition-colors"
        >
          <ArrowRight className="w-6 h-6 text-foreground" />
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tighter leading-none">تطبيق سهيل</h1>
          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1">حجز تذاكر الطيران</p>
        </div>

        <div className="w-10" /> {/* Balance */}
      </header>

      {/* Tabs System */}
      <div className="bg-white border-b border-border/40">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('info')}
            className={cn(
              "flex-1 py-4 text-xs font-black transition-all relative",
              activeTab === 'info' ? "text-primary" : "text-muted-foreground"
            )}
          >
            معلومات التذكرة
            {activeTab === 'info' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('terms')}
            className={cn(
              "flex-1 py-4 text-xs font-black transition-all relative",
              activeTab === 'terms' ? "text-primary" : "text-muted-foreground"
            )}
          >
            شروط الحجز والإلغاء
            {activeTab === 'terms' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      <main className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'info' ? (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Vertical Timeline */}
              <div className="relative pl-0 pr-8">
                {/* Vertical Line */}
                <div className="absolute top-8 bottom-8 right-3.5 w-[2px] bg-border/60" />

                {/* Departure Node */}
                <div className="relative mb-12">
                  <div className="absolute top-2 right-[-2.35rem] w-5 h-5 rounded-full bg-white border-4 border-primary z-10" />
                  <div className="flex justify-between items-start">
                    <div className="text-right">
                      <p className="text-2xl font-black tabular-nums leading-none">{formatTime(flight.departureTime)}</p>
                      <p className="text-xs font-bold text-muted-foreground mt-2">{formatDate(flight.departureTime)}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-primary leading-none uppercase tracking-widest">{flight.origin}</p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-2">مطار الإقلاع الدولي</p>
                    </div>
                  </div>
                </div>

                {/* Middle Info Block */}
                <div className="bg-secondary/30 rounded-[32px] p-6 my-10 border border-border/20 relative">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-white rounded-2xl p-2 border border-border/10 shadow-sm flex items-center justify-center">
                        <img 
                          src={logoUrl} 
                          alt={flight.airline} 
                          className="w-full h-full object-contain"
                          onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.svg'}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-black tracking-tight">{airlineName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">رقم الرحلة: {flight.id.split('@@')[0].substring(0, 8)}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-primary border border-border/40">
                           <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">المدة</p>
                          <p className="text-xs font-black">{formatDuration(flight.duration)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-primary border border-border/40">
                           <Plane className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">الدرجة</p>
                          <p className="text-xs font-black">الدرجة السياحية</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-primary border border-border/40">
                           <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">الأمتعة</p>
                          <p className="text-xs font-black">25 كغم</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-primary border border-border/40">
                           <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">التوقفات</p>
                          <p className="text-xs font-black">{flight.stops === 0 ? 'رحلة مباشرة' : `${flight.stops} توقف`}</p>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Arrival Node */}
                <div className="relative">
                  <div className="absolute top-2 right-[-2.35rem] w-5 h-5 rounded-full bg-white border-4 border-emerald-500 z-10" />
                  <div className="flex justify-between items-start">
                    <div className="text-right">
                      <p className="text-2xl font-black tabular-nums leading-none">{formatTime(flight.arrivalTime)}</p>
                      <p className="text-xs font-bold text-muted-foreground mt-2">{formatDate(flight.arrivalTime)}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-emerald-600 leading-none uppercase tracking-widest">{flight.destination}</p>
                      <p className="text-[10px] font-bold text-muted-foreground mt-2">مطار الوصول الدولي</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="terms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-secondary/30 rounded-3xl p-6 border border-border/20">
                <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  سياسة الإلغاء
                </h3>
                <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                  تطبق سياسات شركة الطيران على هذه التذكرة. الإلغاء قبل الإقلاع بـ 48 ساعة مسموح مع خصم رسوم الإدارة.
                </p>
              </div>
              <div className="bg-secondary/30 rounded-3xl p-6 border border-border/20">
                <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-primary">
                  <Info className="w-5 h-5" />
                  معلومات هامة
                </h3>
                <ul className="space-y-3">
                  <li className="text-[11px] font-bold text-muted-foreground leading-relaxed">• يرجى التواجد في المطار قبل 3 ساعات من موعد الإقلاع.</li>
                  <li className="text-[11px] font-bold text-muted-foreground leading-relaxed">• يجب التأكد من صلاحية جواز السفر (6 أشهر على الأقل).</li>
                  <li className="text-[11px] font-bold text-muted-foreground leading-relaxed">• التذكرة غير قابلة للتنازل لشخص آخر بعد الإصدار.</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky Bottom Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-border/40 p-6 z-50">
        <div className="max-w-xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Info className="w-3.5 h-3.5 text-primary" />
               </div>
               <p className="text-xs font-black text-muted-foreground">المبلغ الإجمالي</p>
            </div>
            <p className="text-2xl font-black text-foreground tabular-nums tracking-tighter">
              {flight.price.toLocaleString()} 
              <span className="text-sm font-bold mr-2 text-muted-foreground">
                {flight.currency === 'USD' ? 'دولار' : 'د.ع'}
              </span>
            </p>
          </div>
          
          <button 
            onClick={() => navigate('/passenger-details', { state: { flight } })}
            className="w-full h-16 bg-black text-white rounded-[24px] text-base font-black tracking-[0.2em] uppercase shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
          >
            التالي
            <ChevronLeft className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default FlightBooking;
