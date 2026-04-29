// src/pages/HomeScreen.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Sparkles, MapPin, Globe } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import FlightBookingModule from "@/components/FlightBookingModule";
import HotelSearchModule from "@/components/HotelSearchModule";
import DesktopHomeLayout from "@/components/DesktopHomeLayout";
import { getPlaceholder } from "@/utils/imagePlaceholder";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo.png";
import OfferSlider from "@/components/OfferSlider";

const HomeScreen = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'taxi' | 'esim'>("flights");
  const navigate = useNavigate();

  const handleHotelSearch = (regionId: string, checkin: string, checkout: string, adults: number, cityName: string) => {
    navigate('/hotels', { 
      state: { 
        regionId, 
        checkin, 
        checkout, 
        adults, 
        cityName 
      } 
    });
  };

  if (isMobile === undefined) return null;

  if (!isMobile) {
    return <DesktopHomeLayout />;
  }

  return (
    <div className="mobile-container bg-background pb-24 relative overflow-y-auto min-h-screen" dir="rtl">
      {/* Premium Header Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent h-[400px] pointer-events-none" />
      
      <div className="relative px-6 pt-14 pb-10">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={logo} alt="سهيل" className="w-12 h-12 rounded-2xl shadow-2xl border border-white/20" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-white" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">استكشف</p>
              <h1 className="text-xl font-black tracking-tight text-primary">سهيل للـسفر</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-11 h-11 rounded-2xl bg-secondary/80 backdrop-blur-xl flex items-center justify-center border border-border/50 shadow-sm">
              <Bell className="w-5 h-5" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero Section */}
        <section className="mb-8">
          <h2 className="text-3xl font-black leading-[1.1] mb-2 tracking-tight">
            ابحث عن <span className="text-primary">وجهتك</span> <br /> 
            المثالية للسفر.
          </h2>
          <p className="text-sm text-muted-foreground font-medium">قارن الأسعار من مئات المزودين في مكان واحد.</p>
        </section>

        {/* Search Tabs */}
        <div className="flex gap-2 mb-6 bg-secondary/50 p-1 rounded-2xl border border-border/40 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('flights')}
            className={`flex-1 min-w-[70px] py-3 rounded-xl text-[11px] font-bold transition-all ${activeTab === 'flights' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
          >
            طيران
          </button>
          <button 
            onClick={() => setActiveTab('hotels')}
            className={`flex-1 min-w-[70px] py-3 rounded-xl text-[11px] font-bold transition-all ${activeTab === 'hotels' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
          >
            فنادق
          </button>
          <button 
            onClick={() => navigate('/taxi')}
            className={`flex-1 min-w-[70px] py-3 rounded-xl text-[11px] font-bold transition-all ${activeTab === 'taxi' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
          >
            تكسي
          </button>
          <button 
            disabled
            className="flex-1 min-w-[70px] py-3 rounded-xl text-[11px] font-bold text-muted-foreground/50 flex items-center justify-center gap-1 cursor-not-allowed opacity-60"
          >
            <Sparkles className="w-3 h-3" /> eSIM
          </button>
        </div>

        {/* Aggregator Search Section */}
        <div className="relative z-10">
          {activeTab === 'flights' ? (
            <FlightBookingModule variant="full" />
          ) : (
            <HotelSearchModule onSearch={handleHotelSearch} />
          )}
        </div>

        {/* Professional Ad Slider */}
        <OfferSlider />

        {/* Quick Discovery Cards */}
        <section className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-black tracking-tight">وجهات شائعة</h3>
            </div>
            <button className="text-xs font-bold text-primary">عرض الكل</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="h-48 rounded-[32px] bg-secondary/50 overflow-hidden relative group cursor-pointer" onClick={() => navigate('/flights')}>
                <img src={getPlaceholder(400,400)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
                   <p className="text-white font-bold text-lg">دبي</p>
                   <p className="text-white/70 text-xs">تبدأ من $240</p>
                </div>
             </div>
             <div className="h-48 rounded-[32px] bg-secondary/50 overflow-hidden relative group cursor-pointer" onClick={() => navigate('/flights')}>
                <img src={getPlaceholder(400,400)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
                   <p className="text-white font-bold text-lg">إسطنبول</p>
                   <p className="text-white/70 text-xs">تبدأ من $180</p>
                </div>
             </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomeScreen;

