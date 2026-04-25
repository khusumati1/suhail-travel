import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, PackageSearch, Frown, Plane, UserPlus, Clock, MapPin, CalendarDays, Star, CheckCircle2, XCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopPageLayout from "@/components/DesktopPageLayout";

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
  const navigate = useNavigate();
  const { showAuth, requireAuth, closeAuth } = useAuthGate();
  const isMobile = useIsMobile();

  if (isMobile === undefined) return null;

  const currentBookings = activeTab === 0 ? sampleBookings.upcoming : activeTab === 1 ? sampleBookings.completed : sampleBookings.cancelled;

  const statusColor = (status: string) => {
    if (status === "مؤكد" || status === "مكتمل") return "text-success bg-success/10";
    if (status === "ملغي") return "text-destructive bg-destructive/10";
    return "text-accent-foreground bg-accent/10";
  };

  const BookingCard = ({ booking, i }: { booking: typeof sampleBookings.upcoming[0]; i: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08 }}
      className="bg-card rounded-2xl p-5 lg:p-6 shadow-card border border-border/50 hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{booking.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{booking.airline} · {booking.code}</p>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${statusColor(booking.status)}`}>
          {booking.status}
        </span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="text-xs">{booking.date}</span>
        </div>
        <p className="text-lg font-bold text-primary">{booking.price}</p>
      </div>
    </motion.div>
  );

  const TabBar = () => (
    <div className="flex gap-1 bg-secondary rounded-2xl p-1">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => setActiveTab(i)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 relative ${
            activeTab === i ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {activeTab === i && (
            <motion.div
              layoutId="bookingTab"
              className="absolute inset-0 bg-card rounded-xl shadow-card border border-border/50"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  );

  const EmptyState = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
        <PackageSearch className="w-10 h-10 text-primary/40" strokeWidth={1.5} />
      </div>
      <h3 className="font-bold text-foreground text-lg">لا توجد حجوزات {tabs[activeTab]}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 text-center max-w-[250px]">
        ابدأ بحجز رحلتك القادمة واستمتع بتجربة سفر مميزة
      </p>
      <button
        onClick={() => navigate("/flights")}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-8 py-3 mt-6 font-bold text-sm hover:opacity-90 transition-opacity"
      >
        <Plane className="w-4 h-4" strokeWidth={2} />
        ابحث عن رحلة
      </button>
    </motion.div>
  );

  // Desktop layout
  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="حجوزاتي"
        subtitle="إدارة ومتابعة جميع حجوزاتك"
        heroImage="https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1400&h=300&fit=crop"
      >
        <div className="max-w-4xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "حجوزات قادمة", value: String(sampleBookings.upcoming.length), icon: CalendarDays, color: "text-primary" },
              { label: "مكتملة", value: String(sampleBookings.completed.length), icon: CheckCircle2, color: "text-success" },
              { label: "ملغاة", value: String(sampleBookings.cancelled.length), icon: XCircle, color: "text-destructive" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl p-5 text-center border border-border/50 shadow-card"
                >
                  <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} strokeWidth={1.8} />
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="max-w-md mx-auto mb-8">
            <TabBar />
          </div>

          {/* Bookings List */}
          {currentBookings.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
    <div className="mobile-container bg-background pb-24">
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-foreground font-bold text-lg text-center mb-5">حجوزاتي</h1>
        <TabBar />
      </div>

      <div className="px-5 mt-5">
        {currentBookings.length > 0 ? (
          <div className="space-y-3">
            {currentBookings.map((booking, i) => (
              <BookingCard key={booking.id} booking={booking} i={i} />
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
              <UserPlus className="w-10 h-10 text-primary/40" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-foreground text-lg">سجل دخولك لعرض حجوزاتك</h3>
            <p className="text-sm text-muted-foreground mt-1.5 text-center max-w-[250px]">
              يمكنك متابعة وإدارة حجوزاتك بعد تسجيل الدخول
            </p>
            <button
              onClick={() => requireAuth()}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-8 py-3 mt-6 font-bold text-sm active:scale-[0.97] transition-transform"
            >
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              تسجيل الدخول
            </button>
          </motion.div>
        )}
      </div>

      <AuthModal open={showAuth} onClose={closeAuth} />
      <BottomNav />
    </div>
  );
};

export default BookingsScreen;
