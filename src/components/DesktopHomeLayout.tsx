import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Plane, Building2, Globe, Users, Search, MapPin, Star,
  ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight,
  Phone, Mail, Shield, Award, Heart, Clock, Sparkles, User,
  TrendingUp, Zap, ArrowUpLeft,
} from "lucide-react";
import logo from "@/assets/logo.png";
import ThemeToggle from "@/components/ThemeToggle";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import OptimizedImage from "@/components/OptimizedImage";
import FlightBookingModule from "@/components/FlightBookingModule";

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1400&h=600&fit=crop",
    title: "اكتشف العالم مع سهيل",
    subtitle: "أفضل عروض الطيران والفنادق من العراق إلى العالم",
    cta: "احجز رحلتك الآن",
    badge: "عروض حصرية",
  },
  {
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&h=600&fit=crop",
    title: "فنادق فاخرة بأسعار مميزة",
    subtitle: "أكثر من ١٠٠ ألف فندق حول العالم بتقييمات موثوقة",
    cta: "تصفح الفنادق",
    badge: "خصم ٤٠٪",
  },
  {
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&h=600&fit=crop",
    title: "مجموعات سفر حصرية",
    subtitle: "انضم لرحلات جماعية مع مرشدين عرب متخصصين",
    cta: "استعرض المجموعات",
    badge: "أماكن محدودة",
  },
];

const destinations = [
  { name: "إسطنبول", country: "تركيا", image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=500&fit=crop", price: "٣٥٠", flag: "🇹🇷", flights: "١٢ رحلة يومياً" },
  { name: "دبي", country: "الإمارات", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop", price: "٢٨٠", flag: "🇦🇪", flights: "٨ رحلات يومياً" },
  { name: "القاهرة", country: "مصر", image: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=500&fit=crop", price: "٢٢٠", flag: "🇪🇬", flights: "٥ رحلات يومياً" },
  { name: "كوالالمبور", country: "ماليزيا", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=500&fit=crop", price: "٤٥٠", flag: "🇲🇾", flights: "٣ رحلات أسبوعياً" },
  { name: "بيروت", country: "لبنان", image: "https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=400&h=500&fit=crop", price: "١٩٠", flag: "🇱🇧", flights: "٤ رحلات يومياً" },
  { name: "لندن", country: "بريطانيا", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=500&fit=crop", price: "٦٥٠", flag: "🇬🇧", flights: "رحلتان يومياً" },
];

const topHotels = [
  { name: "فندق بابل روتانا", city: "بغداد", rating: 4.7, reviews: 1240, price: "١٨٠", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&h=350&fit=crop", tag: "الأكثر حجزاً" },
  { name: "فندق أربيل إنترناشونال", city: "أربيل", rating: 4.8, reviews: 890, price: "٢٢٠", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&h=350&fit=crop", tag: "فاخر" },
  { name: "فندق البصرة بالاس", city: "البصرة", rating: 4.5, reviews: 650, price: "١٢٠", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=500&h=350&fit=crop", tag: "أفضل قيمة" },
  { name: "فندق كربلاء الدولي", city: "كربلاء", rating: 4.6, reviews: 2100, price: "٩٥", image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=500&h=350&fit=crop", tag: "الأعلى تقييماً" },
];

const stats = [
  { number: "٥٠,٠٠٠+", label: "مسافر سعيد", icon: Heart },
  { number: "١٠٠,٠٠٠+", label: "فندق حول العالم", icon: Building2 },
  { number: "٢٤/٧", label: "دعم فني متاح", icon: Clock },
  { number: "٤.٩", label: "تقييم المستخدمين", icon: Star },
];

const features = [
  { icon: Shield, title: "حجز آمن ومضمون", desc: "جميع المعاملات مشفرة بتقنية SSL مع حماية كاملة لبياناتك", color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
  { icon: Award, title: "ضمان أفضل سعر", desc: "نضمن لك أقل سعر متاح أو نعيد الفرق", color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
  { icon: Zap, title: "حجز فوري", desc: "تأكيد فوري للحجز مع إرسال التذاكر خلال دقائق", color: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500" },
  { icon: Clock, title: "دعم على مدار الساعة", desc: "فريق متخصص يخدمك باللغة العربية ٢٤/٧", color: "from-sky-500/20 to-sky-500/5", iconColor: "text-sky-500" },
];

const ParallaxCard = ({ dest, i, navigate }: { dest: typeof destinations[0]; i: number; navigate: any }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const isLarge = i === 0;
  const isMedium = i === 1;

  return (
    <motion.div
      ref={ref}
      key={dest.name}
      initial={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ opacity: 1, clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate("/flights")}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer ${
        isLarge ? "col-span-2 row-span-2" : isMedium ? "col-span-2" : ""
      }`}
    >
      <motion.img
        src={dest.image}
        alt={dest.name}
        className="w-full h-[120%] object-cover -mt-[10%]"
        style={{ y }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-primary/60 group-hover:via-primary/15 transition-all duration-500" />
      <div className="absolute inset-0 border-2 border-transparent rounded-2xl group-hover:border-primary/40 transition-colors duration-300 pointer-events-none" />
      <div className="absolute top-3 start-3 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1 border border-border/50 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
        <span className="text-sm font-bold text-primary">من {dest.price}$</span>
      </div>
      <div className="absolute bottom-0 inset-x-0 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{dest.flag}</span>
          <h3 className={`text-white font-bold ${isLarge ? "text-2xl" : "text-base"}`}>{dest.name}</h3>
        </div>
        <p className="text-white/70 text-sm">{dest.country}</p>
        {isLarge && (
          <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
            <Plane className="w-3 h-3" />
            {dest.flights}
          </p>
        )}
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 translate-y-8 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-400 mt-2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-lg">
              احجز الآن
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ParallaxGrid = ({ destinations, navigate }: { destinations: typeof import("./DesktopHomeLayout").default extends never ? never : any; navigate: any }) => (
  <div className="grid grid-cols-4 grid-rows-2 gap-4 h-[520px]">
    {destinations.slice(0, 6).map((dest: any, i: number) => (
      <ParallaxCard key={dest.name} dest={dest} i={i} navigate={navigate} />
    ))}
  </div>
);

const DesktopHomeLayout = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState("flights");
  const { user, isLoggedIn, logout } = useAuth();
  const { showAuth, requireAuth, closeAuth } = useAuthGate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <nav className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <button onClick={logout} className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium">خروج</button>
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2 border border-border">
                  <span className="text-sm font-bold text-foreground">{user?.name}</span>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" strokeWidth={2} />
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => requireAuth()} className="text-sm font-semibold bg-primary text-primary-foreground rounded-xl px-6 py-2.5 hover:opacity-90 transition-all shadow-sm">
                تسجيل الدخول
              </button>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium" dir="ltr" style={{ unicodeBidi: "isolate" }}>+964 770 000 0000</span>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-foreground">
              <button onClick={() => navigate("/groups/1")} className="hover:text-primary transition-colors relative group">
                كروبات سياحية
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
              <button onClick={() => navigate("/visa")} className="hover:text-primary transition-colors relative group">
                التأشيرات
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
              <button onClick={() => navigate("/hotels")} className="hover:text-primary transition-colors relative group">
                الفنادق
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
              <button onClick={() => navigate("/flights")} className="hover:text-primary transition-colors relative group">
                الطيران
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
            </div>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/home")}>
              <h1 className="text-xl font-bold text-primary group-hover:opacity-80 transition-opacity">سهيل</h1>
              <img src={logo} alt="سهيل" className="w-10 h-10 rounded-xl shadow-sm" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section — Full viewport impact */}
      <div className="relative h-[600px] overflow-hidden">
        {/* All slides rendered simultaneously for crossfade */}
        {heroSlides.map((slide, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              opacity: i === currentSlide ? 1 : 0,
              zIndex: i === currentSlide ? 1 : 0,
            }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            <motion.img
              src={slide.image}
              alt=""
              className="w-full h-[120%] object-cover -mt-[10%]"
              animate={{
                scale: i === currentSlide ? [1.08, 1] : 1,
              }}
              transition={{ duration: 8, ease: "easeOut" }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-foreground/80 via-foreground/50 to-foreground/20" />
          </motion.div>
        ))}

        <div className="absolute inset-0 flex items-center z-10">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={`text-${currentSlide}`}
                initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -30, filter: "blur(6px)" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl mr-auto text-right"
              >
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-bold rounded-full px-4 py-1.5 mb-5 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  {heroSlides[currentSlide].badge}
                </span>
                <h2 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-5">
                  {heroSlides[currentSlide].title}
                </h2>
                <p className="text-lg lg:text-xl text-white/80 mb-8 leading-relaxed">
                  {heroSlides[currentSlide].subtitle}
                </p>
                <button className="bg-primary text-primary-foreground font-bold px-10 py-4 rounded-2xl text-base hover:scale-105 hover:shadow-premium transition-all duration-300 flex items-center gap-2">
                  <ArrowUpLeft className="w-5 h-5" />
                  {heroSlides[currentSlide].cta}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Slider Controls */}
        <button onClick={nextSlide} className="absolute start-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-2xl bg-primary/30 backdrop-blur-xl flex items-center justify-center border border-primary/40 hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-300 group shadow-premium">
          <ChevronLeft className="w-6 h-6 text-primary-foreground" />
        </button>
        <button onClick={prevSlide} className="absolute end-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-2xl bg-primary/30 backdrop-blur-xl flex items-center justify-center border border-primary/40 hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-300 group shadow-premium">
          <ChevronRight className="w-6 h-6 text-primary-foreground" />
        </button>

        {/* Bottom navigation panel */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {/* Progress bar */}
          <div className="h-[3px] bg-primary/20">
            <motion.div
              key={currentSlide}
              className="h-full bg-gradient-to-r from-primary via-primary to-accent"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </div>

          {/* Slide indicators with titles */}
          <div className="bg-primary/20 backdrop-blur-xl border-t border-primary/15">
            <div className="max-w-7xl mx-auto px-6 py-0 flex">
              {heroSlides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`flex-1 relative py-4 px-5 text-right transition-all duration-400 group ${
                    i !== heroSlides.length - 1 ? "border-l border-primary/15" : ""
                  }`}
                >
                  {i === currentSlide && (
                    <motion.div
                      layoutId="activeSlideIndicator"
                      className="absolute top-0 left-0 right-0 h-[3px] bg-accent"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <div className="flex items-center gap-3 justify-end">
                    <div>
                      <p className={`text-sm font-bold transition-colors duration-300 ${
                        i === currentSlide ? "text-primary-foreground" : "text-primary-foreground/60 group-hover:text-primary-foreground/80"
                      }`}>
                        {slide.title}
                      </p>
                      <p className={`text-[11px] mt-0.5 transition-colors duration-300 ${
                        i === currentSlide ? "text-primary-foreground/70" : "text-primary-foreground/35 group-hover:text-primary-foreground/55"
                      }`}>
                        {slide.badge}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      i === currentSlide 
                        ? "bg-primary text-primary-foreground shadow-glow" 
                        : "bg-primary/15 text-primary-foreground/50 group-hover:bg-primary/30 group-hover:text-primary-foreground/70"
                    }`}>
                      <span className="text-sm font-bold">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search Box — overlapping hero */}
      <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-card rounded-3xl p-7 shadow-premium border border-border/30"
        >
          <div className="flex gap-1 mb-6 bg-secondary rounded-2xl p-1 max-w-md mx-auto">
            {[
              { id: "flights", icon: Plane, label: "طيران" },
              { id: "hotels", icon: Building2, label: "فنادق" },
              { id: "visa", icon: Globe, label: "تأشيرات" },
              { id: "groups", icon: Users, label: "مجموعات" },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative ${
                    activeTab === tab.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div layoutId="desktopTab" className="absolute inset-0 bg-primary rounded-xl shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <Icon className="w-4 h-4 relative z-10" strokeWidth={1.8} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === "flights" && (
            <FlightBookingModule variant="compact" />
          )}

          {activeTab === "hotels" && (
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-[2] min-w-[200px]">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">الوجهة</label>
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3.5 border border-border hover:border-primary/30 transition-colors cursor-pointer">
                  <Building2 className="w-4 h-4 text-primary" strokeWidth={2} />
                  <span className="text-sm text-muted-foreground">المدينة أو اسم الفندق</span>
                </div>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">الوصول</label>
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3.5 border border-border hover:border-primary/30 transition-colors cursor-pointer">
                  <CalendarDays className="w-4 h-4 text-primary" strokeWidth={2} />
                  <span className="text-sm text-muted-foreground">اختر</span>
                </div>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">المغادرة</label>
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3.5 border border-border hover:border-primary/30 transition-colors cursor-pointer">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                  <span className="text-sm text-muted-foreground">اختر</span>
                </div>
              </div>
              <button onClick={() => navigate("/hotels")} className="bg-primary text-primary-foreground font-bold px-10 py-3.5 rounded-xl flex items-center gap-2 hover:shadow-premium hover:scale-[1.02] transition-all whitespace-nowrap">
                <Search className="w-5 h-5" strokeWidth={2} />
                بحث
              </button>
            </div>
          )}

          {(activeTab === "visa" || activeTab === "groups") && (
            <div className="flex justify-center">
              <button
                onClick={() => navigate(activeTab === "visa" ? "/visa" : "/groups/1")}
                className="bg-primary text-primary-foreground font-bold px-12 py-3.5 rounded-xl flex items-center gap-2 hover:shadow-premium hover:scale-[1.02] transition-all"
              >
                <Sparkles className="w-5 h-5" />
                استعراض {activeTab === "visa" ? "التأشيرات المتاحة" : "كروبات سياحية"}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Stats Strip */}
      <section className="max-w-7xl mx-auto px-6 mt-16">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card rounded-2xl p-5 border border-border/50 flex items-center gap-4 hover:border-primary/30 hover:shadow-card transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.number}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="max-w-7xl mx-auto px-6 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-10"
        >
          <button onClick={() => navigate("/flights")} className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            <ChevronLeft className="w-4 h-4" />
            عرض الكل
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}>
                <Globe className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-3xl font-bold text-foreground">وجهات مميزة من العراق</h2>
            </div>
            <p className="text-muted-foreground">اكتشف أفضل الوجهات بأسعار تنافسية</p>
          </div>
        </motion.div>

        {/* Bento Grid Layout */}
        <ParallaxGrid destinations={destinations} navigate={navigate} />
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-foreground mb-2">لماذا سهيل؟</h2>
          <p className="text-muted-foreground">نقدم لك تجربة سفر لا مثيل لها</p>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card rounded-2xl p-6 border border-border/50 text-center group hover:border-primary/30 hover:-translate-y-2 hover:shadow-card-hover transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${feat.iconColor}`} strokeWidth={1.8} />
                </div>
                <h3 className="font-bold text-foreground mb-2">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Top Hotels */}
      <section className="max-w-7xl mx-auto px-6 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-10"
        >
          <button onClick={() => navigate("/hotels")} className="text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            <ChevronLeft className="w-4 h-4" />
            عرض الكل
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}>
                <TrendingUp className="w-5 h-5 text-primary" />
              </motion.div>
              <h2 className="text-3xl font-bold text-foreground">أفضل الفنادق في العراق</h2>
            </div>
            <p className="text-muted-foreground">فنادق مختارة بعناية بأفضل التقييمات</p>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {topHotels.map((hotel, i) => (
            <motion.div
              key={hotel.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate("/hotels/1")}
              className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 cursor-pointer group hover:shadow-premium hover:border-primary/20 hover:-translate-y-2 transition-all duration-400"
            >
              <div className="relative overflow-hidden">
                <motion.img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-52 object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-primary/10 transition-colors duration-500" />
                {/* Tag */}
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-sm">
                    {hotel.tag}
                  </span>
                </div>
                {/* Hover CTA */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="bg-primary text-primary-foreground font-bold text-sm px-6 py-2.5 rounded-xl shadow-premium scale-90 group-hover:scale-100 transition-transform duration-300">
                    عرض التفاصيل
                  </span>
                </div>
                {/* Rating */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-border/50 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <Star className="w-3.5 h-3.5 text-accent fill-accent group-hover:text-primary-foreground group-hover:fill-primary-foreground transition-colors duration-300" />
                  <span className="text-xs font-bold text-foreground group-hover:text-primary-foreground transition-colors duration-300">{hotel.rating}</span>
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/70 transition-colors duration-300">({hotel.reviews.toLocaleString()})</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300 text-[15px]">{hotel.name}</h3>
                <div className="flex items-center gap-1 mt-1.5">
                  <MapPin className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
                  <span className="text-xs text-muted-foreground">{hotel.city}، العراق</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 group-hover:border-primary/20 transition-colors duration-300">
                  <span className="text-[11px] text-muted-foreground">لليلة الواحدة</span>
                  <p className="text-xl font-bold text-primary">{hotel.price} <span className="text-xs text-muted-foreground">$</span></p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-6 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden h-[320px]"
        >
          <OptimizedImage src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1400&h=400&fit=crop" alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-l from-primary/90 via-primary/80 to-primary/60" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-10 w-full flex items-center justify-between">
              <div className="flex gap-3">
                <button className="bg-card text-foreground font-bold px-8 py-3.5 rounded-xl text-sm hover:scale-105 transition-all flex items-center gap-2 shadow-card">
                  App Store
                  <span className="text-lg">🍎</span>
                </button>
                <button className="bg-card text-foreground font-bold px-8 py-3.5 rounded-xl text-sm hover:scale-105 transition-all flex items-center gap-2 shadow-card">
                  Google Play
                  <span className="text-lg">▶️</span>
                </button>
              </div>
              <div className="text-right max-w-lg">
                <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-3">حمّل تطبيق سهيل</h2>
                <p className="text-primary-foreground/80 text-lg leading-relaxed">احجز رحلاتك بسهولة من هاتفك في أي وقت ومن أي مكان</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8 }}
        className="bg-card border-t border-border mt-20"
      >
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0, duration: 0.5 }}>
              <div className="flex items-center gap-3 mb-5">
                <img src={logo} alt="سهيل" className="w-12 h-12 rounded-xl shadow-card" />
                <h3 className="text-2xl font-bold text-primary">سهيل</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                منصة حجز السفر الأولى في العراق. نقدم أفضل العروض على الطيران والفنادق والتأشيرات مع ضمان أفضل الأسعار.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5 }}>
              <h4 className="font-bold text-foreground mb-5 text-base">خدماتنا</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/flights")}>حجز الطيران</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/hotels")}>حجز الفنادق</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/visa")}>التأشيرات</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/groups/1")}>كروبات سياحية</li>
            </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.5 }}>
              <h4 className="font-bold text-foreground mb-5 text-base">الشركة</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors">عن سهيل</li>
                <li className="hover:text-primary cursor-pointer transition-colors">سياسة الخصوصية</li>
                <li className="hover:text-primary cursor-pointer transition-colors">الشروط والأحكام</li>
                <li className="hover:text-primary cursor-pointer transition-colors">الأسئلة الشائعة</li>
            </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.5 }}>
              <h4 className="font-bold text-foreground mb-5 text-base">تواصل معنا</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5 hover:text-primary transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <span dir="ltr" style={{ unicodeBidi: "isolate" }}>+964 770 000 0000</span>
                </li>
                <li className="flex items-center gap-2.5 hover:text-primary transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span>info@suhail.iq</span>
                </li>
                <li className="flex items-center gap-2.5 hover:text-primary transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span>بغداد، العراق</span>
                </li>
            </ul>
            </motion.div>
          </div>
          <div className="border-t border-border mt-10 pt-6 text-center">
            <p className="text-xs text-muted-foreground">© ٢٠٢٦ سهيل. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </motion.footer>
      <AuthModal open={showAuth} onClose={closeAuth} />
    </div>
  );
};

export default DesktopHomeLayout;
