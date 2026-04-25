import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Plane, Filter, ArrowUpDown, Clock, Zap, MapPin, CalendarDays, Search, ArrowLeftRight, TrendingUp, Shield, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFlightSearch, DuffelOffer } from "@/hooks/useFlightSearch";
import { useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";


function formatTime(isoString: string) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return isoString;
  }
}

function formatDuration(duration: string) {
  if (!duration) return "";
  // PT2H30M → 2 س 30 د
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return duration;
  const h = match[1] ? `${match[1]} س` : "";
  const m = match[2] ? `${match[2]} د` : "";
  return `${h} ${m}`.trim();
}

function getStopsLabel(stops: number) {
  if (stops === 0) return "مباشر";
  if (stops === 1) return "توقف واحد";
  return `${stops} توقفات`;
}

const FlightCard = ({ f, i, onClick }: { f: DuffelOffer; i: number; onClick: () => void }) => (
  <motion.div
    key={f.id}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
    onClick={onClick}
    className="bg-card rounded-2xl p-5 lg:p-6 shadow-card border border-border/50 cursor-pointer relative overflow-hidden group hover:shadow-card-hover hover:border-primary/20 transition-all duration-300"
  >
    <div className="absolute top-0 end-0 w-1 h-full bg-gradient-to-b from-primary via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-e-full" />

    {i === 0 && (
      <span className="absolute top-0 start-0 text-[10px] font-bold gradient-purple-vibrant text-primary-foreground px-3 py-1.5 rounded-br-xl">
        أفضل سعر
      </span>
    )}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {f.airline_logo ? (
          <img src={f.airline_logo} alt={f.airline} className="w-8 h-8 rounded-lg object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plane className="w-4 h-4 text-primary" />
          </div>
        )}
        <span className="font-bold text-sm text-foreground">{f.airline}</span>
      </div>
      <span className="text-[11px] font-semibold bg-success/10 text-success rounded-full px-3 py-1">
        {getStopsLabel(f.stops)}
      </span>
    </div>
    <div className="flex items-center justify-between" dir="ltr">
      <div className="text-center">
        <p className="text-2xl lg:text-3xl font-bold text-foreground">{formatTime(f.depart)}</p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{f.from}</p>
      </div>
      <div className="flex-1 mx-6 flex flex-col items-center">
        <p className="text-[11px] text-muted-foreground mb-2 font-medium">{formatDuration(f.duration)}</p>
        <div className="w-full flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/20" />
          <div className="flex-1 border-t-2 border-dashed border-border" />
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mx-1">
            <Plane className="w-4 h-4 text-primary" strokeWidth={1.8} />
          </div>
          <div className="flex-1 border-t-2 border-dashed border-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground ring-2 ring-muted/40" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-2xl lg:text-3xl font-bold text-foreground">{formatTime(f.arrive)}</p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{f.to}</p>
      </div>
    </div>
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
      <div className="text-start">
        <p className="text-[10px] text-muted-foreground">يبدأ من</p>
        <p className="text-2xl font-bold text-primary">
          {parseFloat(f.price).toFixed(0)} <span className="text-xs text-muted-foreground font-medium">{f.currency}</span>
        </p>
      </div>
      <button className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
        <ArrowRight className="w-3 h-3 rotate-180" />
        عرض التفاصيل
      </button>
    </div>
  </motion.div>
);

const FlightResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { offers, loading, error, isSimulated, searchFlights } = useFlightSearch();

  const searchState = location.state as {
    origin?: string;
    destination?: string;
    originName?: string;
    destinationName?: string;
    departure_date?: string;
    return_date?: string;
    passengers?: { adults: number; children: number; infants: number };
    cabin_class?: string;
  } | null;

  useEffect(() => {
    if (searchState?.origin && searchState?.destination && searchState?.departure_date) {
      searchFlights({
        origin: searchState.origin,
        destination: searchState.destination,
        departure_date: searchState.departure_date,
        return_date: searchState.return_date,
        passengers: searchState.passengers || { adults: 1, children: 0, infants: 0 },
        cabin_class: searchState.cabin_class || "economy",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const originLabel = searchState?.originName || searchState?.origin || "بغداد";
  const destLabel = searchState?.destinationName || searchState?.destination || "";
  const dateLabel = searchState?.departure_date
    ? format(new Date(searchState.departure_date), "d MMM yyyy", { locale: ar })
    : "";

  const content = (
    <>
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">جاري البحث عن أفضل الرحلات...</p>
        </div>
      )}

      {error && !error.includes('الطيران متوقف') && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center mb-4">
          <p className="text-destructive font-bold mb-2">حدث خطأ</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/home")}
            className="mt-4 text-sm text-primary font-bold hover:underline"
          >
            العودة للبحث
          </button>
        </div>
      )}



      {!loading && (!error || error.includes('الطيران متوقف')) && offers.length === 0 && (
        <div className="text-center py-20">
          <Plane className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium text-lg mb-2">
            {error && error.includes('الطيران متوقف') 
              ? error 
              : (searchState ? "لم يتم العثور على رحلات لهذه الوجهة" : "ابحث عن رحلة للبدء")}
          </p>
          <button
            onClick={() => navigate("/home")}
            className="mt-4 text-sm text-primary font-bold hover:underline"
          >
            العودة للبحث
          </button>
        </div>
      )}

      {!loading && offers.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl gradient-purple-vibrant text-primary-foreground text-xs font-bold shadow-sm">
                <Zap className="w-3.5 h-3.5" /> الأفضل
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-card text-xs font-medium text-foreground border border-border hover:bg-secondary hover:border-primary/20 transition-all">
                <Filter className="w-3.5 h-3.5" /> تصفية
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-card text-xs font-medium text-foreground border border-border hover:bg-secondary hover:border-primary/20 transition-all">
                <ArrowUpDown className="w-3.5 h-3.5" /> السعر
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              تم العثور على <span className="text-primary font-bold">{offers.length}</span> رحلات
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {offers.map((f, i) => (
              <FlightCard key={f.id} f={f} i={i} onClick={() => navigate(`/flights/${f.id}`)} />
            ))}
          </div>
        </>
      )}
    </>
  );

  if (isMobile === undefined) return null;

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="نتائج البحث عن رحلات"
        subtitle={destLabel ? `${originLabel} → ${destLabel}` : "أفضل العروض المتاحة"}
        heroImage="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1400&h=300&fit=crop"
      >
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-card mb-8">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5 border border-border">
                  <MapPin className="w-4 h-4 text-primary" strokeWidth={2} />
                  <span className="text-sm font-bold text-foreground">{originLabel}</span>
                </div>
                <div className="w-10 h-10 rounded-full gradient-purple-vibrant flex items-center justify-center shadow-sm">
                  <ArrowLeftRight className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5 border border-border">
                  <MapPin className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                  <span className="text-sm font-bold text-foreground">{destLabel || "—"}</span>
                </div>
              </div>
              {dateLabel && (
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5 border border-border">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground font-medium">{dateLabel}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate("/home")}
              className="gradient-purple-vibrant text-primary-foreground font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm hover:opacity-90 transition-opacity shadow-sm"
            >
              <Search className="w-4 h-4" />
              تعديل البحث
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-success" />
              <span className="text-[11px] font-medium">حجز مضمون</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-medium">ضمان أفضل سعر</span>
            </div>
          </div>
        </div>
        {content}
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-background pb-24">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center border border-border">
            <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={2} />
          </button>
          <h1 className="text-foreground font-bold text-lg">نتائج البحث</h1>
          <div className="w-9" />
        </div>
        {destLabel && (
          <div className="bg-primary/5 rounded-2xl p-3.5 flex items-center justify-between border border-primary/10">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{dateLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-foreground font-bold text-sm">{destLabel}</span>
              <Plane className="w-4 h-4 text-primary rotate-180" strokeWidth={2} />
              <span className="text-foreground font-bold text-sm">{originLabel}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-5">
        {content}
      </div>

      <BottomNav />
    </div>
  );
};

export default FlightResults;
