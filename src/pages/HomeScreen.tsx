import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Plane, Building2, Globe, Users, Search, Bell, MapPin, Star,
  ArrowLeftRight, CalendarDays, TrendingUp, ChevronLeft, Sparkles,
  RefreshCw,
  Smartphone,
  Car,
  Clock,
} from "lucide-react";

import BottomNav from "@/components/BottomNav";
import DesktopHomeLayout from "@/components/DesktopHomeLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import OptimizedImage from "@/components/OptimizedImage";
import logo from "@/assets/logo.png";
import HotelSearchModule from "@/components/HotelSearchModule";
import FlightBookingModule from "@/components/FlightBookingModule";

const serviceTabs = [
  { id: "flights", icon: Plane, label: "طيران" },
  { id: "hotels", icon: Building2, label: "فنادق" },
  { id: "visa", icon: Globe, label: "تأشيرات" },
  { id: "groups", icon: Users, label: "كروبات" },
  { id: "esim", icon: Smartphone, label: "eSIM", disabled: true },
  { id: "taxi", icon: Car, label: "تكسي المطار" },
];

const promoBanners: { id: number; image: string; title: string; subtitle: string; gradient: string }[] = [];

const destinations: { name: string; country: string; image: string; price: string; flag: string }[] = [];

const trendingHotels: { id: number; name: string; city: string; price: string; rating: number; image: string; badge: string }[] = [];

const popularFlights = [
  { id: 1, from: "بغداد", fromCode: "BGW", to: "دبي", toCode: "DXB", price: "245", duration: "2h 15m" },
  { id: 2, from: "بغداد", fromCode: "BGW", to: "اسطنبول", toCode: "IST", price: "180", duration: "2h 45m" },
  { id: 3, from: "بغداد", fromCode: "BGW", to: "عمان", toCode: "AMM", price: "150", duration: "1h 10m" },
];

const PULL_THRESHOLD = 80;

const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState("flights");
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, isLoggedIn } = useAuth();
  const pullY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const pullProgress = useTransform(pullY, [0, PULL_THRESHOLD], [0, 1]);
  const pullRotation = useTransform(pullY, [0, PULL_THRESHOLD], [0, 360]);
  const pullOpacity = useTransform(pullY, [0, 30, PULL_THRESHOLD], [0, 0.6, 1]);
  const pullScale = useTransform(pullY, [0, PULL_THRESHOLD], [0.5, 1]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise((r) => setTimeout(r, 1200));
    setCurrentBanner(0);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (promoBanners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % promoBanners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollEl = containerRef.current;
    if (scrollEl && scrollEl.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const scrollEl = containerRef.current;
    if (scrollEl && scrollEl.scrollTop > 0) {
      isPulling.current = false;
      pullY.set(0);
      return;
    }
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      if (e.cancelable) e.preventDefault();
      pullY.set(Math.min(delta * 0.4, PULL_THRESHOLD * 1.3));
    } else {
      isPulling.current = false;
      pullY.set(0);
    }
  }, [isRefreshing, pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    const currentPull = pullY.get();
    if (currentPull >= PULL_THRESHOLD && !isRefreshing) {
      pullY.set(PULL_THRESHOLD * 0.6);
      await handleRefresh();
      pullY.set(0);
    } else {
      pullY.set(0);
    }
  }, [pullY, isRefreshing, handleRefresh]);

  if (isMobile === undefined) return null;
  if (!isMobile) {
    return <DesktopHomeLayout />;
  }

  return (
    <div
      ref={containerRef}
      className="mobile-container bg-background pb-24 relative overflow-y-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
        style={{ height: pullY, opacity: pullOpacity }}
      >
        <motion.div
          className="flex flex-col items-center gap-1.5"
          style={{ scale: pullScale }}
        >
          <motion.div
            style={{ rotate: isRefreshing ? undefined : pullRotation }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}
          >
            <RefreshCw className="w-6 h-6 text-primary" strokeWidth={2} />
          </motion.div>
          <span className="text-[11px] font-bold text-primary">
            {isRefreshing ? "جارِ التحديث..." : "اسحب للتحديث"}
          </span>
        </motion.div>
      </motion.div>

      {/* Content */}
      <div>
      {/* Header with gradient background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent h-[280px]" />
        
        <div className="relative px-5 pt-14 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="سهيل" className="w-10 h-10 rounded-xl shadow-card" />
              <div>
                <p className="text-muted-foreground text-xs font-medium">أهلاً بك 👋</p>
                <h2 className="text-foreground font-bold text-lg">{isLoggedIn ? user?.name : "زائر"}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative w-10 h-10 rounded-xl bg-card/80 backdrop-blur-sm flex items-center justify-center border border-border/50 shadow-card">
                <Bell className="w-5 h-5 text-foreground" strokeWidth={1.8} />
                <span className="absolute -top-0.5 -start-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
              </button>
              <ThemeToggle />
            </div>
          </div>

          {/* Promo Banner Slider */}
          {promoBanners.length > 0 && (
            <div className="relative h-[160px] rounded-2xl overflow-hidden mb-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentBanner}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <OptimizedImage
                    src={promoBanners[currentBanner].image}
                    alt=""
                    className="w-full h-full object-cover"
                    wrapperClassName="w-full h-full"
                    loading="eager"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-l ${promoBanners[currentBanner].gradient}`} />
                  <div className="absolute inset-0 flex flex-col justify-center px-5">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                    >
                      <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white rounded-full px-3 py-1 mb-2 inline-block">
                        <Sparkles className="w-3 h-3 inline ml-1" />
                        عرض حصري
                      </span>
                      <h3 className="text-white font-bold text-xl mb-1">{promoBanners[currentBanner].title}</h3>
                      <p className="text-white/80 text-sm">{promoBanners[currentBanner].subtitle}</p>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Banner dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {promoBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentBanner(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentBanner ? "w-5 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search Card */}
          <motion.div
            className="bg-card rounded-3xl p-5 shadow-card border border-border/50"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex gap-1 mb-5 bg-secondary rounded-2xl p-1">
              {serviceTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === "esim") {
                        alert("سيتم إطلاق هذه الخدمة قريباً");
                        return;
                      }
                      if (tab.id === "taxi") {
                        navigate("/taxi");
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 relative ${
                      activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground"
                    } ${tab.disabled ? "opacity-50 cursor-default" : ""}`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="tabBg"
                        className="absolute inset-0 bg-primary rounded-xl"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className="relative z-10">
                      <Icon className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>




            {activeTab === "flights" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <FlightBookingModule />
              </motion.div>
            )}

            {activeTab === "hotels" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <HotelSearchModule 
                  onSearch={(regionId, checkin, checkout, adults, cityName) => {
                    navigate("/hotels", { state: { regionId, checkin, checkout, adults, cityName } });
                  }}
                />
              </motion.div>
            )}

            {(activeTab === "visa" || activeTab === "groups") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button
                  onClick={() => navigate(activeTab === "visa" ? "/visa" : "/groups/1")}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  <span>استعراض {activeTab === "visa" ? "التأشيرات" : "الكروبات"}</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Popular Destinations */}
      {destinations.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" strokeWidth={2} />
              <h3 className="font-bold text-foreground text-base">وجهات مميزة</h3>
            </div>
            <button className="flex items-center gap-1 text-xs text-primary font-bold">
              الكل
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide" style={{ direction: "rtl" }}>
            {destinations.map((dest, i) => (
              <motion.div
                key={dest.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                className="min-w-[120px] cursor-pointer group"
              >
                <div className="relative h-[150px] rounded-2xl overflow-hidden mb-2">
                  <OptimizedImage
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    wrapperClassName="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 right-2.5 left-2.5" dir="rtl">
                    <p className="text-white font-bold text-[13px]">{dest.name}</p>
                    <p className="text-white/70 text-[10px]">{dest.country} {dest.flag}</p>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-bold bg-card/90 backdrop-blur-sm text-primary rounded-full px-2 py-0.5">
                      {dest.price}$
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Hotels */}
      {trendingHotels.length > 0 && (
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" strokeWidth={2} />
              <h3 className="font-bold text-foreground text-base">فنادق رائجة</h3>
            </div>
            <button onClick={() => navigate("/hotels")} className="flex items-center gap-1 text-xs text-primary font-bold">
              المزيد
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ direction: "rtl" }}>
            {trendingHotels.map((hotel, i) => (
              <motion.div
                key={hotel.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                onClick={() => navigate("/hotels/1")}
                className="min-w-[200px] bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 cursor-pointer group"
              >
                <div className="relative">
                  <OptimizedImage
                    src={hotel.image}
                    alt={hotel.name}
                    className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-105"
                    wrapperClassName="w-full h-32"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 shadow-sm">
                      {hotel.badge}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <Star className="w-3 h-3 text-accent fill-accent" />
                    <span className="text-[11px] font-bold text-foreground">{hotel.rating}</span>
                  </div>
                </div>
                <div className="p-3" dir="rtl">
                  <h4 className="font-bold text-[13px] text-foreground truncate">{hotel.name}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
                    <p className="text-[11px] text-muted-foreground">{hotel.city}</p>
                  </div>
                  <p className="text-sm font-bold text-primary mt-2">
                    {hotel.price} <span className="text-[10px] text-muted-foreground font-medium">$ / ليلة</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Flights */}
      {popularFlights.length > 0 && (
        <div className="px-5 mt-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-primary -rotate-45" strokeWidth={2} />
              <h3 className="font-bold text-foreground text-base">رحلات شائعة</h3>
              <button 
                onClick={() => navigate("/flight-status")}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold animate-pulse"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                مباشر
              </button>
            </div>
            <button onClick={() => navigate("/flights")} className="flex items-center gap-1 text-xs text-primary font-bold">
              المزيد
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {popularFlights.map((flight, i) => (
              <motion.div
                key={flight.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                onClick={() => navigate("/flights/1")}
                className="bg-card rounded-2xl p-4 shadow-card border border-border/50 cursor-pointer flex items-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="text-start flex-shrink-0">
                  <p className="text-base font-bold text-primary">{flight.price}</p>
                  <p className="text-[10px] text-muted-foreground">$</p>
                </div>

                <div className="flex-1" dir="ltr">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{flight.fromCode}</span>
                    <div className="flex-1 mx-2 flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <div className="flex-1 border-t border-dashed border-border mx-1" />
                      <Plane className="w-3.5 h-3.5 text-primary -rotate-45" strokeWidth={1.8} />
                      <div className="flex-1 border-t border-dashed border-border mx-1" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{flight.toCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{flight.from}</span>
                    <span className="text-[10px] text-muted-foreground">{flight.duration}</span>
                    <span className="text-[10px] text-muted-foreground">{flight.to}</span>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-primary" strokeWidth={1.8} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      </div>

      <BottomNav />
    </div>
  );
};

export default HomeScreen;
