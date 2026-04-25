import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Users, CalendarDays, Star, Check, MapPin, Shield, Clock, Heart, Camera, Utensils, Bus, Plane, ChevronLeft, Award } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopPageLayout from "@/components/DesktopPageLayout";

const itinerary = [
  { day: "اليوم ١", title: "الوصول إلى إسطنبول", desc: "استقبال في المطار ونقل للفندق، جولة مسائية في ميدان تقسيم", icon: Plane },
  { day: "اليوم ٢", title: "السلطان أحمد", desc: "زيارة آيا صوفيا، المسجد الأزرق، وقصر توبكابي", icon: Camera },
  { day: "اليوم ٣", title: "رحلة البوسفور", desc: "جولة بحرية في مضيق البوسفور مع غداء على متن السفينة", icon: Heart },
  { day: "اليوم ٤", title: "بورصة الخضراء", desc: "رحلة يومية لمدينة بورصة والتلفريك والجامع الكبير", icon: Bus },
  { day: "اليوم ٥", title: "التسوق والأسواق", desc: "جولة في البازار الكبير ومول جواهر وأسواق إسطنبول", icon: Heart },
  { day: "اليوم ٦", title: "يوم حر", desc: "يوم حر للاستكشاف الشخصي مع توصيات من المرشد", icon: MapPin },
  { day: "اليوم ٧", title: "المغادرة", desc: "إفطار وداعي ونقل للمطار", icon: Plane },
];

const gallery = [
  { src: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=500&fit=crop", label: "آيا صوفيا" },
  { src: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&h=500&fit=crop", label: "مضيق البوسفور" },
  { src: "https://images.unsplash.com/photo-1572204097183-e1ab140342ed?w=600&h=500&fit=crop", label: "المسجد الأزرق" },
  { src: "https://images.unsplash.com/photo-1604941582648-2e7528c80e9a?w=600&h=500&fit=crop", label: "البازار الكبير" },
  { src: "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=600&h=500&fit=crop", label: "برج غلطة" },
];

const ParallaxGalleryCard = ({ item, index }: { item: typeof gallery[0]; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [25, -25]);
  const isLarge = index === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ opacity: 1, clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-2xl overflow-hidden group cursor-pointer ${isLarge ? "row-span-2 h-full min-h-[300px]" : "h-[145px]"}`}
    >
      <motion.img
        src={item.src}
        alt={item.label}
        className="w-full h-[120%] object-cover -mt-[10%]"
        style={{ y }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent group-hover:from-primary/40 transition-all duration-500" />
      <div className="absolute bottom-3 right-4 left-4">
        <span className="text-white text-sm font-bold drop-shadow-lg">{item.label}</span>
      </div>
    </motion.div>
  );
};

const includes = [
  "تذاكر الطيران ذهاب وإياب من بغداد",
  "إقامة فندق ٤ نجوم - ٦ ليالٍ",
  "وجبة إفطار يومية",
  "جولات سياحية مع مرشد عربي",
  "تأمين سفر شامل",
  "نقل من وإلى المطار",
  "رحلة البوسفور البحرية",
  "رحلة بورصة اليومية",
];

const TravelGroupDetails = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile === undefined) return null;

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="رحلة إسطنبول الجماعية"
        subtitle="٧ أيام من المغامرة مع مرشد عربي متخصص"
        heroImages={[
          "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1920&h=600&fit=crop&q=85",
          "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1920&h=600&fit=crop&q=85",
          "https://images.unsplash.com/photo-1572204097183-e1ab140342ed?w=1920&h=600&fit=crop&q=85",
          "https://images.unsplash.com/photo-1604941582648-2e7528c80e9a?w=1920&h=600&fit=crop&q=85",
          "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1920&h=600&fit=crop&q=85",
        ]}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: CalendarDays, label: "المدة", value: "٧ أيام", sub: "١٥-٢٢ نيسان", color: "text-primary" },
                { icon: Users, label: "المقاعد", value: "١٢/٢٠", sub: "متبقي ٨ مقاعد", color: "text-foreground" },
                { icon: Star, label: "التقييم", value: "٤.٨", sub: "٤٥٠ تقييم", color: "text-accent" },
                { icon: MapPin, label: "الوجهة", value: "إسطنبول", sub: "تركيا 🇹🇷", color: "text-primary" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="bg-card rounded-2xl p-4 text-center border border-border/50 shadow-card hover:border-primary/20 hover:shadow-card-hover transition-all duration-300"
                  >
                    <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} strokeWidth={1.8} />
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                معرض الصور
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {gallery.map((item, i) => (
                  <ParallaxGalleryCard key={i} item={item} index={i} />
                ))}
              </div>
            </motion.div>

            {/* About */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card rounded-2xl p-7 border border-border/50 shadow-card"
            >
              <h3 className="text-xl font-bold text-foreground mb-4">عن الرحلة</h3>
              <p className="text-sm text-muted-foreground leading-[2]">
                انضم لمجموعة سهيل في رحلة استثنائية من بغداد إلى إسطنبول. تشمل الرحلة زيارة أهم المعالم التاريخية والسياحية، جولات بحرية في مضيق البوسفور، رحلة يومية لمدينة بورصة الخضراء، وتجارب تسوق فريدة في أشهر أسواق إسطنبول. يرافقكم مرشد عربي متخصص طوال الرحلة لضمان تجربة ممتعة ومريحة.
              </p>
            </motion.div>

            {/* Itinerary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                برنامج الرحلة
              </h3>
              <div className="space-y-4">
                {itinerary.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.day}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.5 }}
                      className="flex gap-4 group"
                    >
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:shadow-glow transition-all duration-300">
                          <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors duration-300" strokeWidth={1.8} />
                        </div>
                        {i < itinerary.length - 1 && (
                          <div className="w-[2px] flex-1 bg-border mt-2 group-hover:bg-primary/30 transition-colors duration-300" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="bg-card rounded-2xl p-5 border border-border/50 flex-1 mb-2 group-hover:border-primary/20 group-hover:shadow-card transition-all duration-300">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{item.day}</span>
                        <h4 className="font-bold text-foreground mt-2 text-[15px]">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Booking Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-5">
              {/* Price Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-card"
              >
                <div className="gradient-purple p-6 text-center relative overflow-hidden">
                  <div className="particles-overlay" />
                  <p className="text-primary-foreground/70 text-sm">سعر الشخص الواحد</p>
                  <p className="text-4xl font-bold text-primary-foreground mt-1">٨٥٠ <span className="text-lg">$</span></p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-primary-foreground/60 text-xs">
                    <Clock className="w-3 h-3" />
                    متبقي ٨ مقاعد فقط
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <button
                    onClick={() => navigate("/payment")}
                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:shadow-premium hover:scale-[1.02] transition-all duration-300"
                  >
                    انضم للمجموعة
                  </button>
                  <button className="w-full py-3 rounded-xl border-2 border-primary/20 text-primary font-semibold text-sm hover:bg-primary/5 transition-colors">
                    استفسار عن الرحلة
                  </button>
                </div>
              </motion.div>

              {/* Includes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="bg-card rounded-2xl p-6 border border-border/50 shadow-card"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-success" strokeWidth={1.8} />
                  <h3 className="font-bold text-foreground">يشمل السعر</h3>
                </div>
                <div className="space-y-3">
                  {includes.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-success/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
                      </div>
                      <span className="text-[13px] text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="bg-card rounded-2xl p-5 border border-border/50 shadow-card"
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Shield, label: "دفع آمن", color: "text-primary" },
                    { icon: Award, label: "ضمان الجودة", color: "text-accent" },
                    { icon: Users, label: "مرشد عربي", color: "text-success" },
                    { icon: Clock, label: "دعم ٢٤/٧", color: "text-info" },
                  ].map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div key={badge.label} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <Icon className={`w-4 h-4 ${badge.color}`} strokeWidth={1.8} />
                        {badge.label}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </DesktopPageLayout>
    );
  }

  // Mobile layout
  return (
    <div className="mobile-container bg-background pb-28">
      <div className="relative">
        <img
          src="https://images.unsplash.com/photo-1539768942893-daf53e736b68?w=600&h=350&fit=crop"
          alt="Travel Group"
          className="w-full h-56 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute top-14 right-5 w-9 h-9 rounded-xl bg-card/90 backdrop-blur-sm flex items-center justify-center border border-border/50">
          <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={2} />
        </button>
        <div className="absolute bottom-5 right-5 left-5">
          <span className="text-[10px] font-bold bg-accent text-accent-foreground px-2.5 py-1 rounded-full mb-2 inline-block">مجموعة حصرية</span>
          <h1 className="text-xl font-bold text-card">رحلة إسطنبول الجماعية</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-card/70" strokeWidth={2} />
            <p className="text-card/70 text-sm">من بغداد إلى إسطنبول · ٧ أيام</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 relative z-10">
        <div className="flex gap-2.5">
          {[
            { icon: CalendarDays, label: "١٥-٢٢ نيسان", sub: "٧ أيام", color: "text-primary" },
            { icon: Users, label: "١٢/٢٠", sub: "متبقي ٨", color: "text-foreground" },
            { icon: Star, label: "٤.٨", sub: "٤٥٠ تقييم", color: "text-accent-foreground" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex-1 bg-card rounded-2xl p-3 text-center shadow-card border border-border/50">
                <Icon className={`w-5 h-5 ${item.color} mx-auto mb-1`} strokeWidth={1.8} />
                <p className="text-sm font-bold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card border border-border/50">
          <h3 className="font-bold text-foreground mb-3">عن الرحلة</h3>
          <p className="text-[13px] text-muted-foreground leading-[1.8]">
            انضم لمجموعة سهيل في رحلة استثنائية من بغداد إلى إسطنبول. تشمل الرحلة زيارة المعالم التاريخية، جولات بحرية في البوسفور، وتجارب تسوق فريدة مع مرشد عربي متخصص.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="bg-card rounded-2xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-success" strokeWidth={1.8} />
            <h3 className="font-bold text-foreground">يشمل السعر</h3>
          </div>
          <div className="space-y-2.5">
            {["تذاكر الطيران ذهاب وإياب من بغداد", "إقامة فندق ٤ نجوم", "وجبة إفطار يومية", "جولات سياحية مع مرشد", "تأمين سفر شامل"].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-success" strokeWidth={2.5} />
                </div>
                <span className="text-[13px] text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center z-40">
        <div className="w-full max-w-md bg-card/95 backdrop-blur-md border-t border-border px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/payment")}
            className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold transition-all active:scale-[0.98]"
          >
            انضم للمجموعة
          </button>
          <div className="mr-5 text-right">
            <p className="text-[10px] text-muted-foreground">للشخص الواحد</p>
            <p className="text-2xl font-bold text-primary">٨٥٠ <span className="text-sm">$</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelGroupDetails;
