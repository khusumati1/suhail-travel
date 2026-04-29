import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock, FileCheck, Filter, ArrowUpDown, Globe, Sparkles, Shield, ChevronLeft, Plane, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { getPlaceholder } from "@/utils/imagePlaceholder"; // Imported for placeholder usage
import { useIsMobile } from "@/hooks/use-mobile";

const countries: { id: number; name: string; flag: string; type: string; duration: string; processing: string; price: string; popular: boolean; image: string; requirements: string[] }[] = [];

const MobileVisaCard = ({ c, i }: { c: typeof countries[0]; i: number }) => (
  <motion.div
    key={c.id}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05 }}
    className="bg-card rounded-2xl p-4 shadow-card border border-border/50 cursor-pointer relative overflow-hidden hover:shadow-card-hover transition-shadow"
  >
    {c.popular && (
      <span className="absolute top-0 start-0 text-[10px] font-bold bg-accent text-accent-foreground px-2.5 py-1 rounded-ee-xl">
        رائج
      </span>
    )}
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary rounded-full px-2.5 py-1 border border-border">
            <Clock className="w-3 h-3" strokeWidth={2} /> {c.processing}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary rounded-full px-2.5 py-1 border border-border">
            <FileCheck className="w-3 h-3" strokeWidth={2} /> {c.type}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">صلاحية {c.duration}</span>
          <p className="font-bold text-primary text-lg">{c.price} <span className="text-xs text-muted-foreground font-medium">$</span></p>
        </div>
      </div>
      <div className="text-center flex-shrink-0">
        <span className="text-4xl block">{c.flag}</span>
        <h3 className="font-bold text-foreground text-sm mt-1">{c.name}</h3>
      </div>
    </div>
  </motion.div>
);

const DesktopVisaCard = ({ c, i }: { c: typeof countries[0]; i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 cursor-pointer group hover:shadow-premium hover:border-primary/20 hover:-translate-y-2 transition-all duration-400 relative"
  >
    {/* Image */}
    <div className="relative h-44 overflow-hidden">
      <motion.img
        src={c.image}
        alt={c.name}
        className="w-full h-full object-cover"
        whileHover={{ scale: 1.08 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-primary/50 transition-all duration-500" />
      
      {/* Flag & Country */}
      <div className="absolute bottom-3 end-4 flex items-center gap-2">
        <h3 className="text-white font-bold text-lg">{c.name}</h3>
        <span className="text-3xl">{c.flag}</span>
      </div>

      {/* Popular badge */}
      {c.popular && (
        <div className="absolute top-3 start-3 flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
          <Sparkles className="w-3 h-3" />
          رائج
        </div>
      )}

      {/* Type badge */}
      <div className="absolute top-3 end-3 bg-card/90 backdrop-blur-sm text-[10px] font-bold text-primary px-2.5 py-1 rounded-full border border-border/50">
        {c.type}
      </div>
    </div>

    {/* Content */}
    <div className="p-5">
      {/* Info chips */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-lg px-3 py-1.5 border border-border/50">
          <Clock className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
          {c.processing}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-lg px-3 py-1.5 border border-border/50">
          <FileCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
          {c.duration}
        </span>
      </div>

      {/* Requirements preview */}
      <div className="space-y-1.5 mb-4">
        {c.requirements.slice(0, 2).map((req) => (
          <div key={req} className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" strokeWidth={2} />
            <span className="text-[12px] text-muted-foreground">{req}</span>
          </div>
        ))}
        {c.requirements.length > 2 && (
          <span className="text-[11px] text-primary font-medium">+{c.requirements.length - 2} متطلبات أخرى</span>
        )}
      </div>

      {/* Price & CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50 group-hover:border-primary/20 transition-colors duration-300">
        <div className="text-start">
          <p className="text-[10px] text-muted-foreground">يبدأ من</p>
          <p className="text-xl font-bold text-primary">{c.price} <span className="text-xs text-muted-foreground">$</span></p>
        </div>
        <button className="bg-primary/10 text-primary text-xs font-bold px-5 py-2 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          تقديم طلب
        </button>
      </div>
    </div>

    {/* Hover accent line */}
    <div className="absolute top-0 start-0 w-1 h-full bg-gradient-to-b from-primary via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  </motion.div>
);

const VisaList = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile === undefined) return null;
  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="التأشيرات"
        subtitle={`${countries.length} دول متاحة للمواطنين العراقيين`}
        heroImage={getPlaceholder(1400,300)} // Replaced Unsplash URL with placeholder
      >
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: Globe, label: "دول متاحة", value: `${countries.length}+`, color: "bg-primary/10 text-primary" },
            { icon: Shield, label: "نسبة القبول", value: "٩٨٪", color: "bg-success/10 text-success" },
            { icon: Clock, label: "أسرع معالجة", value: "يوم واحد", color: "bg-accent/10 text-accent-foreground" },
          ].map((stat, i) => {
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
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-card text-xs font-semibold text-foreground border border-border hover:bg-secondary hover:border-primary/30 transition-all duration-200">
              <Filter className="w-3.5 h-3.5 text-primary" /> تصفية
            </button>
            <button className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-card text-xs font-semibold text-foreground border border-border hover:bg-secondary hover:border-primary/30 transition-all duration-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" /> السعر
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            عرض <span className="text-primary font-bold">{countries.length}</span> تأشيرات متاحة
          </p>
        </motion.div>

        {/* Visa Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {countries.map((c, i) => (
            <DesktopVisaCard key={c.id} c={c} i={i} />
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 border border-primary/10 flex items-center justify-between"
        >
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">لم تجد تأشيرتك؟</h3>
            <p className="text-sm text-muted-foreground">فريقنا جاهز لمساعدتك في الحصول على تأشيرة أي دولة</p>
          </div>
          <button className="bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-xl text-sm hover:scale-105 hover:shadow-premium transition-all duration-300 flex items-center gap-2 flex-shrink-0">
            <Plane className="w-4 h-4" />
            تواصل معنا
          </button>
        </motion.div>
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-background pb-24">
      <div className="px-5 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center border border-border">
            <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={2} />
          </button>
          <h1 className="text-foreground font-bold text-lg">التأشيرات</h1>
          <div className="w-9" />
        </div>
        <p className="text-muted-foreground text-xs text-center mt-2">{countries.length} دول متاحة</p>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {countries.map((c, i) => (
          <MobileVisaCard key={c.id} c={c} i={i} />
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default VisaList;
