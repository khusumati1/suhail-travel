import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, Plane, Luggage, Utensils, Wifi, Armchair, Clock, Info, Shield, CheckCircle2, QrCode, Loader2 } from "lucide-react";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import AuthModal from "@/components/AuthModal";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

const amenities = [
  { icon: Luggage, label: "حقيبة ٢٣ كجم", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  { icon: Utensils, label: "وجبة مجانية", color: "text-accent-foreground", bg: "bg-accent/10", border: "border-accent/20" },
  { icon: Wifi, label: "واي فاي مجاني", color: "text-info", bg: "bg-info/10", border: "border-info/20" },
  { icon: Armchair, label: "اختيار المقعد", color: "text-success", bg: "bg-success/10", border: "border-success/20" },
];

function parseFlightId(id: string | undefined) {
  const defaultData = {
    id: id || "UNKNOWN",
    origin: "BGW",
    dest: "EBL",
    date: new Date(),
    airline: "الخطوط الجوية العراقية",
    airlineCode: "IA",
    price: 120,
    flightNum: "IA 204",
    departTime: "08:30",
    arriveTime: "09:30",
    duration: "١ ساعة"
  };

  if (!id) return defaultData;

  // Handle SIM-BGW-CAI-2026-04-30-4 format
  if (id.startsWith("SIM-")) {
    const parts = id.split("-");
    if (parts.length >= 7) {
      const origin = parts[1];
      const dest = parts[2];
      const dateStr = `${parts[3]}-${parts[4]}-${parts[5]}`;
      const index = parseInt(parts[6]);
      
      const price = 150 + (index * 15);
      
      let airline = "طيران محاكى";
      let airlineCode = "TK";
      if (index % 3 === 0) { airline = "الخطوط الجوية التركية"; airlineCode = "TK"; }
      else if (index % 3 === 1) { airline = "طيران الإمارات"; airlineCode = "EK"; }
      else { airline = "الخطوط الجوية القطرية"; airlineCode = "QR"; }

      const deptHour = 6 + (index % 12);
      const arrHour = deptHour + 2;

      return {
        id,
        origin,
        dest,
        date: new Date(dateStr),
        airline,
        airlineCode,
        price,
        flightNum: `${airlineCode} ${100 + index * 13}`,
        departTime: `${deptHour.toString().padStart(2, '0')}:30`,
        arriveTime: `${arrHour.toString().padStart(2, '0')}:15`,
        duration: "٢ س ٤٥ د"
      };
    }
  }

  // Handle non-simulated real flight fallback gracefully if needed
  return { ...defaultData, id };
}

const FlightRouteCard = ({ flight }: { flight: ReturnType<typeof parseFlightId> }) => (
  <div className="relative overflow-hidden rounded-[2rem] border border-border/50 shadow-2xl bg-card transition-all duration-500 hover:shadow-primary/10">
    {/* Premium Boarding Pass Top Section */}
    <div className="gradient-purple p-8 text-primary-foreground relative overflow-hidden" dir="ltr">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
            <Plane className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest">{flight.airlineCode}</span>
          </div>
          <span className="text-sm font-semibold opacity-80">{format(flight.date, "dd MMM yyyy")}</span>
        </div>

        <div className="flex items-center justify-between relative">
          <div className="text-center w-20">
            <p className="text-4xl font-black tracking-tighter">{flight.origin}</p>
            <p className="text-xs font-medium opacity-70 mt-1 uppercase tracking-widest">Origin</p>
            <p className="text-xl font-bold mt-2">{flight.departTime}</p>
          </div>
          
          <div className="flex-1 mx-4 flex flex-col items-center relative">
            <div className="absolute top-1/2 left-0 w-full flex items-center -translate-y-1/2">
              <div className="w-2 h-2 rounded-full border-2 border-white/50" />
              <div className="flex-1 border-t-2 border-dashed border-white/30" />
              <Plane className="w-5 h-5 opacity-90 mx-2 text-white" />
              <div className="flex-1 border-t-2 border-dashed border-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/50" />
            </div>
            <div className="absolute -top-6 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
              {flight.duration}
            </div>
          </div>

          <div className="text-center w-20">
            <p className="text-4xl font-black tracking-tighter">{flight.dest}</p>
            <p className="text-xs font-medium opacity-70 mt-1 uppercase tracking-widest">Dest</p>
            <p className="text-xl font-bold mt-2">{flight.arriveTime}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Notch Details */}
    <div className="relative bg-card px-8 py-6 flex items-center justify-between border-t border-dashed border-border/60">
      {/* Left and Right Notches for boarding pass realism */}
      <div className="absolute top-0 left-0 w-6 h-6 bg-background rounded-full -translate-x-3 -translate-y-3 border-r border-b border-border/50" />
      <div className="absolute top-0 right-0 w-6 h-6 bg-background rounded-full translate-x-3 -translate-y-3 border-l border-b border-border/50" />
      
      <div className="flex-1 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Flight</p>
          <p className="text-sm font-bold text-foreground">{flight.flightNum}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Gate</p>
          <p className="text-sm font-bold text-foreground">TBD</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Seat</p>
          <p className="text-sm font-bold text-foreground">12A</p>
        </div>
      </div>
      
      <div className="ml-6 pl-6 border-l border-border/50 hidden sm:block">
        <QrCode className="w-12 h-12 text-primary opacity-80" />
      </div>
    </div>
  </div>
);

const FlightDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isMobile = useIsMobile();
  const { showAuth, requireAuth, closeAuth } = useAuthGate();
  const { user } = useAuth();
  const [isBooking, setIsBooking] = useState(false);

  const flight = parseFlightId(id);

  const handleBooking = async () => {

    // 2. Perform actual booking
    setIsBooking(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-flight", {
        body: {
          user_id: user?.phone || user?.name || "guest",
          flight: flight,
          price: flight.price
        }
      });

      if (error || data?.error) {
        toast.error(`${data?.error || ''} ${data?.details || error?.message || ''}`.trim() || "فشل الحجز. يرجى المحاولة مرة أخرى.");
        return;
      }

      toast.success("تم تأكيد الحجز وحفظه بنجاح!");
      navigate(`/invoice/${data.booking.id}`);
    } catch (err: any) {
      toast.error("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsBooking(false);
    }
  };

  const flightInfo = [
    { label: "شركة الطيران", value: flight.airline },
    { label: "رقم الرحلة", value: flight.flightNum },
    { label: "الطائرة", value: "Airbus A320neo" },
    { label: "الدرجة", value: "اقتصادية (Premium)" },
    { label: "التاريخ", value: format(flight.date, "dd MMMM yyyy", { locale: ar }) },
  ];

  if (isMobile === undefined) return null;

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="تفاصيل الحجز"
        subtitle={`${flight.airline} — ${flight.flightNum}`}
        heroImage="https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1400&h=300&fit=crop"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                <FlightRouteCard flight={flight} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card/80 backdrop-blur-xl rounded-3xl p-7 shadow-card border border-border/40">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Info className="w-5 h-5 text-primary" strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-foreground text-xl">معلومات الرحلة</h3>
                </div>
                <div className="space-y-1">
                  {flightInfo.map((item, idx) => (
                    <div key={item.label} className={`flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-secondary/50 transition-colors ${idx !== flightInfo.length - 1 ? 'border-b border-border/30' : ''}`}>
                       <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                       <span className="text-sm font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card/80 backdrop-blur-xl rounded-3xl p-7 shadow-card border border-border/40">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                    <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-foreground text-xl">المميزات المضمنة</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {amenities.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-4 bg-secondary/50 rounded-2xl p-4 border border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-sm cursor-default">
                        <div className={`w-12 h-12 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                          <Icon className={`w-5 h-5 ${item.color}`} strokeWidth={2} />
                        </div>
                        <span className="text-sm font-bold text-foreground">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Sidebar - Booking */}
            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-[2rem] shadow-2xl border border-border/50 sticky top-24 overflow-hidden flex flex-col">
                <div className="bg-secondary/50 p-6 border-b border-border/50 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="font-bold text-foreground text-xl">تفاصيل الدفع</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4 text-sm mb-6">
                    <div className="flex justify-between items-center p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                      <span className="text-muted-foreground font-medium">سعر التذكرة (x1)</span>
                      <span className="font-bold text-foreground">{flight.price - 15} $</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                      <span className="text-muted-foreground font-medium">الضرائب والرسوم</span>
                      <span className="font-bold text-foreground">15 $</span>
                    </div>
                    
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-dashed border-border/60"></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-primary/5 rounded-2xl p-4 border border-primary/10">
                      <span className="font-bold text-foreground text-lg">الإجمالي</span>
                      <span className="font-black text-primary text-2xl">{flight.price} $</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => requireAuth(handleBooking)}
                    disabled={isBooking}
                    className="w-full py-4 rounded-2xl gradient-purple-vibrant text-primary-foreground font-black text-lg hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all duration-300 relative overflow-hidden group disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {isBooking && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span className="relative z-10">{isBooking ? "جاري الحجز..." : "تأكيد الحجز"}</span>
                    {!isBooking && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 mt-5 text-muted-foreground bg-success/5 py-2.5 rounded-xl border border-success/10">
                    <Shield className="w-4 h-4 text-success" />
                    <span className="text-xs font-bold text-success/90">حجز آمن ومشفر بـ 256-bit</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          <AuthModal open={showAuth} onClose={closeAuth} />
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-background pb-32">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center border border-border shadow-sm active:scale-95 transition-transform">
            <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={2} />
          </button>
          <h1 className="text-foreground font-black text-xl">تذكرة السفر</h1>
          <div className="w-10" />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <FlightRouteCard flight={flight} />
        </motion.div>
      </div>

      <div className="px-5 mt-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-[2rem] p-6 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Info className="w-4 h-4 text-primary" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-foreground text-lg">معلومات الرحلة</h3>
          </div>
          <div className="space-y-1">
            {flightInfo.map((item, idx) => (
              <div key={item.label} className={`flex items-center justify-between py-3 ${idx !== flightInfo.length - 1 ? 'border-b border-border/30' : ''}`}>
                <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                <span className="text-sm font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-[2rem] p-6 shadow-card border border-border/50">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center border border-success/20">
              <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-foreground text-lg">المميزات المضمنة</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {amenities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex flex-col items-center gap-2.5 bg-secondary/60 rounded-2xl p-4 border border-border/50">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center shadow-inner`}>
                    <Icon className={`w-4 h-4 ${item.color}`} strokeWidth={2} />
                  </div>
                  <span className="text-xs font-bold text-foreground text-center">{item.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-0 inset-inline-start-0 inset-inline-end-0 flex justify-center z-40 pb-6 pt-10 bg-gradient-to-t from-background via-background/95 to-transparent px-5">
        <div className="w-full max-w-md bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-3xl p-4 flex items-center justify-between">
          <div className="px-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">الإجمالي</p>
            <p className="text-2xl font-black text-primary">{flight.price} <span className="text-sm text-muted-foreground">$</span></p>
          </div>
          <button 
            onClick={() => requireAuth(handleBooking)} 
            disabled={isBooking}
            className="flex-1 ms-6 py-3.5 rounded-2xl gradient-purple-vibrant text-primary-foreground font-black text-lg active:scale-95 transition-transform shadow-lg shadow-primary/20 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            <span>{isBooking ? "جاري الحجز..." : "احجز الآن"}</span>
          </button>
        </div>
      </div>

      <AuthModal open={showAuth} onClose={closeAuth} />
    </div>
  );
};

export default FlightDetails;
