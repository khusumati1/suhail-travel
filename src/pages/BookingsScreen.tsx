import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, PackageSearch, Frown, Plane, UserPlus, Clock, MapPin, CalendarDays, Star, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { getPlaceholder } from "@/utils/imagePlaceholder";
import { apiService } from "@/services/apiService";

const tabs = ["القادمة", "المكتملة", "الملغاة"];

const sampleBookings = {
  upcoming: [
    { id: 1, type: "flight", title: "بغداد → إسطنبول", date: "١٥ آذار ٢٠٢٦", status: "مؤكد", price: "٣٥٠ $", airline: "الخطوط الجوية العراقية", code: "IA-204" },
    { id: 2, type: "hotel", title: "فندق بابل روتانا", date: "١٥-١٨ آذار ٢٠٢٦", status: "بانتظار التأكيد", price: "٥٤٠ $", airline: "٣ ليالٍ", code: "HTL-892" },
  ],
  completed: [
    { id: 3, type: "flight", title: "بغداد → أربيل", date: "١٠ شباط ٢٠٢٦", status: "مكتمل", price: "١٢٠ $", airline: "فلاي بغداد", code: "FB-110" },
  ],
  cancelled: [
    { id: 4, type: "flight", title: "بغداد → دبي", date: "٥ كانون ٢٠٢٦", status: "ملغي", price: "٢٨٠ $", airline: "طيران الشرق الأوسط", code: "ME-401" },
  ],
};

const BookingsScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [realBookings, setRealBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showAuth, requireAuth, closeAuth } = useAuthGate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiService.getBookings();
        if (res.success) {
          setRealBookings(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (isMobile === undefined) return null;

  // Simple filtering (can be improved later with real status logic)
  const upcoming = realBookings.filter(b => b.status !== "مكتمل" && b.status !== "ملغي");
  const completed = realBookings.filter(b => b.status === "مكتمل");
  const cancelled = realBookings.filter(b => b.status === "ملغي");

  const currentBookings = activeTab === 0 ? upcoming : activeTab === 1 ? completed : cancelled;

  const statusColor = (status: string) => {
    if (status === "مؤكد" || status === "مكتمل") return "text-green-600 bg-green-50";
    if (status === "ملغي") return "text-red-600 bg-red-50";
    return "text-blue-600 bg-blue-50";
  };

  const BookingCard = ({ booking, i }: { booking: any; i: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08 }}
      className="bg-card rounded-[32px] p-6 shadow-sm border border-border/40 hover:border-primary/20 hover:shadow-xl transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h3 className="font-black text-foreground text-lg group-hover:text-primary transition-colors">{booking.title}</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{booking.airline} · {booking.code}</p>
        </div>
        <span className={`text-[10px] font-black px-4 py-1.5 rounded-xl ${statusColor(booking.status)}`}>
          {booking.status}
        </span>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold">{booking.date}</span>
        </div>
        <p className="text-xl font-black text-primary">{booking.price}</p>
      </div>
    </motion.div>
  );

  const TabBar = () => (
    <div className="flex gap-2 bg-secondary/50 rounded-2xl p-1.5">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => setActiveTab(i)}
          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-200 relative ${activeTab === i ? "text-primary" : "text-muted-foreground"
            }`}
        >
          {activeTab === i && (
            <motion.div
              layoutId="bookingTab"
              className="absolute inset-0 bg-white rounded-xl shadow-sm border border-border/20"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  );

  const EmptyState = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-dashed border-border/80 mt-8">
      <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
        <PackageSearch className="w-10 h-10 text-primary/20" strokeWidth={1.5} />
      </div>
      <h3 className="font-black text-foreground text-xl">لا توجد حجوزات {tabs[activeTab]}</h3>
      <p className="text-sm font-bold text-muted-foreground mt-2 text-center max-w-[280px]">
        ابدأ بحجز رحلتك القادمة الآن لتظهر هنا
      </p>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-3 bg-primary text-white rounded-2xl px-10 py-4 mt-8 font-black text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-all"
      >
        <Plane className="w-4 h-4" />
        استكشف الفنادق والرحلات
      </button>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-black text-muted-foreground">جاري جلب حجوزاتك...</p>
         </div>
      </div>
    );
  }

  // Desktop layout
  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="حجوزاتي"
        subtitle="إدارة ومتابعة جميع حجوزاتك الحقيقية"
        heroImage={getPlaceholder(1400, 300)}
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 mb-12">
            {[
              { label: "حجوزات قادمة", value: String(upcoming.length), icon: CalendarDays, color: "text-primary", bg: "bg-primary/5" },
              { label: "مكتملة", value: String(completed.length), icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
              { label: "ملغاة", value: String(cancelled.length), icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${stat.bg} rounded-[32px] p-8 text-center border border-white/50 shadow-sm`}
                >
                  <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-4`} strokeWidth={2} />
                  <p className="text-4xl font-black text-foreground">{stat.value}</p>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-2">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="max-w-md mx-auto mb-10">
            <TabBar />
          </div>

          {currentBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentBookings.map((booking, i) => (
                <BookingCard key={booking.id} booking={booking} i={i} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
        <AuthModal open={showAuth} onClose={closeAuth} />
      </DesktopPageLayout>
    );
  }

  // Mobile layout
  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32" dir="rtl">
      <div className="px-6 pt-16 pb-8 bg-white border-b border-border/40">
        <h1 className="text-2xl font-black text-foreground text-center mb-8">حجوزاتي</h1>
        <TabBar />
      </div>

      <div className="px-6 mt-8">
        {currentBookings.length > 0 ? (
          <div className="space-y-4">
            {currentBookings.map((booking, i) => (
              <BookingCard key={booking.id} booking={booking} i={i} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <AuthModal open={showAuth} onClose={closeAuth} />
      <BottomNav />
    </div>
  );
};

export default BookingsScreen;
