import AirportTaxiModule from "@/components/AirportTaxiModule";
import { ChevronRight, Car, Shield, Clock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { motion } from "framer-motion";

const TRUST_BADGES = [
  { icon: Shield, label: "سائقون موثوقون", sub: "معتمدون ومرخّصون" },
  { icon: Clock, label: "التزام بالمواعيد", sub: "وصول قبل الموعد" },
  { icon: Star, label: "تقييم 4.9/5", sub: "+2,000 رحلة ناجحة" },
];

export default function AirportTaxiPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile === undefined) return null;

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="تكسي المطار"
        subtitle="خدمة توصيل احترافية ومريحة من وإلى كافة المطارات العراقية"
        heroImage="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1400&h=400&fit=crop"
      >
        <div className="max-w-4xl mx-auto pb-20">
          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {TRUST_BADGES.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-5 bg-card rounded-2xl border border-border/30 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-black text-sm">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground">{b.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="bg-card rounded-3xl p-10 shadow-premium border border-border/30">
            <AirportTaxiModule />
          </div>
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-background pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border/50 px-5 py-4 flex items-center gap-3 sticky top-0 z-10 backdrop-blur-md bg-card/80">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black">تكسي المطار</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Airport Transfer</p>
        </div>
        <div className="w-10 h-10 rounded-xl gradient-purple-vibrant flex items-center justify-center">
          <Car className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Trust Strip */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {TRUST_BADGES.map((b, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 flex-shrink-0">
            <b.icon className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold whitespace-nowrap">{b.label}</span>
          </div>
        ))}
      </div>

      <div className="py-6 px-4">
        <AirportTaxiModule />
      </div>

      <BottomNav />
    </div>
  );
}
