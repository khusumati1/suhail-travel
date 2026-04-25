import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Building2, Globe, ArrowLeft } from "lucide-react";

const slides = [
  {
    icon: Plane,
    title: "احجز رحلتك بذكاء",
    desc: "اكتشف أفضل العروض على الرحلات الجوية حول العالم مع خوارزمية ذكية تضمن لك أقل الأسعار",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Building2,
    title: "فنادق فاخرة حول العالم",
    desc: "أكثر من ١٠٠ ألف فندق بتقييمات حقيقية من المسافرين العرب وصور بدقة عالية",
    color: "bg-accent/10 text-accent-foreground",
  },
  {
    icon: Globe,
    title: "تأشيرات وخدمات سفر",
    desc: "تأشيرات فورية ومجموعات سفر حصرية مع مرشدين محليين لتجربة لا تُنسى",
    color: "bg-success/10 text-success",
  },
];

const OnboardingScreen = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else navigate("/login");
  };

  return (
    <div className="mobile-container bg-background flex flex-col">
      <div className="flex justify-between items-center px-5 pt-14">
        <div />
        <button
          onClick={() => navigate("/login")}
          className="text-muted-foreground text-sm font-medium"
        >
          تخطي
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center gap-8"
          >
            <div className={`w-28 h-28 rounded-3xl ${slides[current].color} flex items-center justify-center`}>
              {(() => {
                const Icon = slides[current].icon;
                return <Icon className="w-12 h-12" strokeWidth={1.5} />;
              })()}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground leading-tight mb-3">
                {slides[current].title}
              </h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed max-w-[280px]">
                {slides[current].desc}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-14 flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === current ? 28 : 8,
                backgroundColor: i === current ? "hsl(var(--primary))" : "hsl(var(--border))",
              }}
              className="h-2 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          ))}
        </div>

        <button onClick={next} className="btn-primary flex items-center justify-center gap-2">
          {current === slides.length - 1 ? (
            <span className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              ابدأ الآن
            </span>
          ) : (
            "التالي"
          )}
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
