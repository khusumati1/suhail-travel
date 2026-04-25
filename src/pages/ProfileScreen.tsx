import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Heart, HelpCircle, LogOut, ChevronLeft, Bell, Shield, Globe, Award, Edit3, User, UserPlus, Plane, Building2, Star, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopPageLayout from "@/components/DesktopPageLayout";

const menuItems = [
  { icon: CreditCard, label: "طرق الدفع", desc: "إدارة بطاقاتك", color: "text-primary", needsAuth: true },
  { icon: Heart, label: "المفضلة", desc: "الفنادق والرحلات المحفوظة", color: "text-destructive", needsAuth: true },
  { icon: Bell, label: "الإشعارات", desc: "إدارة التنبيهات", color: "text-accent-foreground", needsAuth: true },
  { icon: Shield, label: "الأمان والخصوصية", desc: "كلمة المرور والبيانات", color: "text-success", needsAuth: true },
  { icon: Globe, label: "اللغة", desc: "العربية", color: "text-info", needsAuth: false },
  { icon: HelpCircle, label: "المساعدة والدعم", desc: "تواصل معنا", color: "text-muted-foreground", needsAuth: false },
];

const quickStats = [
  { icon: Plane, label: "رحلات محجوزة", value: "١٢", color: "text-primary" },
  { icon: Building2, label: "فنادق محجوزة", value: "٥", color: "text-info" },
  { icon: Star, label: "التقييم", value: "٤.٩", color: "text-accent-foreground" },
  { icon: MapPin, label: "وجهات زُرت", value: "٨", color: "text-success" },
];

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { showAuth, requireAuth, closeAuth } = useAuthGate();
  const { user, isLoggedIn, logout } = useAuth();
  const isMobile = useIsMobile();

  if (isMobile === undefined) return null;

  const MenuList = ({ className = "" }: { className?: string }) => (
    <div className={`space-y-2 ${className}`}>
      {menuItems.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => item.needsAuth && !isLoggedIn ? requireAuth() : undefined}
            className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 shadow-card border border-border/50 hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
            <div className="flex-1 text-right">
              <p className="font-semibold text-sm text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center border border-border group-hover:scale-110 transition-transform">
              <Icon className={`w-5 h-5 ${item.color}`} strokeWidth={1.8} />
            </div>
          </motion.button>
        );
      })}

      {isLoggedIn && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={logout}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/10 mt-4 hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-destructive flex-shrink-0" strokeWidth={2} />
          <span className="flex-1 text-right font-semibold text-sm text-destructive">تسجيل الخروج</span>
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" strokeWidth={1.8} />
          </div>
        </motion.button>
      )}
    </div>
  );

  const ProfileHeader = ({ size = "sm" }: { size?: "sm" | "lg" }) => (
    <div className={`flex flex-col items-center ${size === "lg" ? "py-2" : ""}`}>
      <div className="relative mb-4">
        <div className={`${size === "lg" ? "w-24 h-24" : "w-20 h-20"} rounded-2xl bg-secondary flex items-center justify-center border border-border`}>
          <User className={`${size === "lg" ? "w-12 h-12" : "w-10 h-10"} text-muted-foreground`} strokeWidth={1.5} />
        </div>
        {isLoggedIn && (
          <button className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background hover:scale-110 transition-transform">
            <Edit3 className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <h2 className={`text-foreground font-bold ${size === "lg" ? "text-2xl" : "text-xl"}`}>
        {isLoggedIn ? user?.name : "زائر"}
      </h2>
      {isLoggedIn ? (
        <>
          <p className="text-muted-foreground text-sm mt-0.5" dir="ltr" style={{ unicodeBidi: "isolate" }}>{user?.phone}</p>
          <div className="flex items-center gap-1.5 bg-accent/10 rounded-full px-3 py-1.5 mt-3 border border-accent/20">
            <Award className="w-4 h-4 text-accent-foreground" strokeWidth={2} />
            <span className="text-xs font-bold text-accent-foreground">عضو ذهبي</span>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm mt-0.5">سجل دخولك للوصول لجميع الميزات</p>
          <button
            onClick={() => requireAuth()}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-6 py-2.5 mt-4 font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-4 h-4" strokeWidth={2} />
            تسجيل الدخول
          </button>
        </>
      )}
    </div>
  );

  // Desktop layout
  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="الملف الشخصي"
        subtitle="إدارة حسابك وإعداداتك"
        heroImage="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1400&h=300&fit=crop"
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar - Profile Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-card"
                >
                  <div className="gradient-purple p-6 relative overflow-hidden">
                    <div className="particles-overlay" />
                  </div>
                  <div className="-mt-10 relative z-10 px-5 pb-6">
                    <ProfileHeader size="lg" />
                  </div>
                </motion.div>

                {/* Quick Stats */}
                {isLoggedIn && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card rounded-2xl p-5 border border-border/50 shadow-card"
                  >
                    <h3 className="font-bold text-foreground mb-4">إحصائياتك</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {quickStats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="text-center p-3 bg-secondary rounded-xl border border-border">
                            <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} strokeWidth={1.8} />
                            <p className="text-lg font-bold text-foreground">{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Main Content - Settings */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-lg font-bold text-foreground mb-5">الإعدادات</h3>
                <MenuList />
              </motion.div>
            </div>
          </div>
        </div>
        <AuthModal open={showAuth} onClose={closeAuth} />
      </DesktopPageLayout>
    );
  }

  // Mobile layout
  return (
    <div className="mobile-container bg-background pb-24">
      <div className="px-5 pt-14 pb-6">
        <ProfileHeader />
      </div>

      <div className="px-5">
        <MenuList />
      </div>

      <AuthModal open={showAuth} onClose={closeAuth} />
      <BottomNav />
    </div>
  );
};

export default ProfileScreen;
