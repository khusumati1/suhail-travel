import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Heart, HelpCircle, LogOut, ChevronLeft, Bell, Shield, Globe, Award, Edit3, User, UserPlus, Plane, Building2, Star, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AuthModal from "@/components/AuthModal";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { getPlaceholder } from "@/utils/imagePlaceholder"; // Imported for placeholder usage

const menuItems = [
  { icon: CreditCard, label: "طرق الدفع", desc: "إدارة بطاقاتك", color: "text-primary", needsAuth: true, path: "payments" },
  { icon: Heart, label: "المفضلة", desc: "الفنادق والرحلات المحفوظة", color: "text-destructive", needsAuth: true, path: "favorites" },
  { icon: Bell, label: "الإشعارات", desc: "إدارة التنبيهات", color: "text-accent-foreground", needsAuth: true, path: "notifications" },
  { icon: Shield, label: "الأمان والخصوصية", desc: "كلمة المرور والبيانات", color: "text-success", needsAuth: true, path: "security" },
  { icon: Globe, label: "اللغة", desc: "العربية", color: "text-info", needsAuth: false, path: "language" },
  { icon: HelpCircle, label: "المساعدة والدعم", desc: "تواصل معنا", color: "text-muted-foreground", needsAuth: false, path: "support" },
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImage(reader.result as string);
        setIsEditingImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isMobile === undefined) return null;

  const MenuList = ({ className = "" }: { className?: string }) => (
    <div className={`space-y-3 ${className}`}>
      {menuItems.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => {
              if (item.needsAuth && !isLoggedIn) {
                requireAuth();
              } else {
                navigate(`/profile/${item.path}`);
              }
            }}
            className="w-full bg-white/60 backdrop-blur-md rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-white/40 hover:border-primary/30 hover:bg-white/80 transition-all duration-300 active:scale-[0.98] group"
          >
            <div className={`w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border/20 group-hover:scale-110 transition-transform duration-500`}>
              <Icon className={`w-6 h-6 ${item.color}`} strokeWidth={2} />
            </div>
            <div className="flex-1 text-right">
              <p className="font-black text-sm text-foreground tracking-tight">{item.label}</p>
              <p className="text-[10px] font-bold text-muted-foreground opacity-70 mt-0.5">{item.desc}</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </motion.button>
        );
      })}

      {isLoggedIn && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={logout}
          className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-destructive/5 border border-destructive/10 mt-6 hover:bg-destructive/10 transition-all active:scale-95 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center group-hover:rotate-12 transition-transform">
            <LogOut className="w-6 h-6 text-destructive" strokeWidth={2} />
          </div>
          <span className="flex-1 text-right font-black text-sm text-destructive uppercase tracking-widest">تسجيل الخروج</span>
          <ChevronLeft className="w-4 h-4 text-destructive/40" />
        </motion.button>
      )}
    </div>
  );

  const ProfileHeader = ({ size = "sm" }: { size?: "sm" | "lg" }) => (
    <div className="relative w-full flex flex-col items-center">
      {/* Immersive Background Header */}
      <div className="absolute -top-14 inset-x-0 h-64 gradient-purple-vibrant opacity-90 blur-3xl rounded-full scale-110 -z-10" />
      
      <div className="relative group">
        <div className={`relative ${size === "lg" ? "w-28 h-28" : "w-24 h-24"} rounded-[32px] overflow-hidden border-4 border-white shadow-premium bg-white p-1`}>
          <div className="w-full h-full rounded-[28px] bg-secondary/30 flex items-center justify-center overflow-hidden">
             {profileImage ? (
               <img src={profileImage} className="w-full h-full object-cover" alt="Profile" />
             ) : (
               <User className={`${size === "lg" ? "w-14 h-14" : "w-12 h-12"} text-primary/40`} strokeWidth={1} />
             )}
          </div>
        </div>
        {isLoggedIn && (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -left-2 w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center border-4 border-white shadow-lg hover:scale-110 transition-all active:rotate-12"
            >
              <Edit3 className="w-5 h-5" strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      <div className="mt-5 text-center">
        <h2 className={`text-foreground font-black tracking-tighter ${size === "lg" ? "text-3xl" : "text-2xl"}`}>
          {isLoggedIn ? user?.name : "أهلاً بك، زائرنا العزيز"}
        </h2>
        {isLoggedIn ? (
          <div className="space-y-3 mt-2">
            <p className="text-muted-foreground font-bold text-xs opacity-70" dir="ltr">{user?.phone}</p>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full px-5 py-2 shadow-lg shadow-amber-500/20">
              <Award className="w-4 h-4 fill-white/20" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest">التميز الذهبي</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-muted-foreground font-bold text-xs max-w-[200px] mx-auto leading-relaxed">انضم إلينا الآن واستمتع بمزايا حصرية وعروض لا مثيل لها</p>
            <button
              onClick={() => requireAuth()}
              className="flex items-center gap-2 bg-primary text-white rounded-2xl px-10 py-4 shadow-premium font-black text-sm hover:scale-105 active:scale-95 transition-all"
            >
              <UserPlus className="w-5 h-5" strokeWidth={2.5} />
              ابدأ رحلتك الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="الملف الشخصي"
        subtitle="إدارة حسابك وتفضيلاتك في مكان واحد"
        heroImage={getPlaceholder(1400,400)}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <div className="sticky top-28 space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 border border-white shadow-native relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
                  <ProfileHeader size="lg" />
                </motion.div>

                {isLoggedIn && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    {quickStats.map((stat, i) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="bg-white/60 backdrop-blur-md rounded-[28px] p-4 border border-white shadow-sm text-center group hover:shadow-md transition-all">
                          <div className={`w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                            <Icon className={`w-5 h-5 ${stat.color}`} strokeWidth={2} />
                          </div>
                          <p className="text-xl font-black text-foreground leading-none">{stat.value}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase mt-2 tracking-widest">{stat.label}</p>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="space-y-6">
                <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  الإعدادات والخدمات
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => item.needsAuth && !isLoggedIn ? requireAuth() : undefined}
                        className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 flex items-center gap-5 border border-white shadow-sm hover:shadow-premium hover:bg-white transition-all group text-right"
                      >
                         <div className={`w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center group-hover:scale-110 transition-all duration-500`}>
                          <Icon className={`w-7 h-7 ${item.color}`} strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-base text-foreground tracking-tight">{item.label}</p>
                          <p className="text-xs font-bold text-muted-foreground opacity-70 mt-1">{item.desc}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <AuthModal open={showAuth} onClose={closeAuth} />
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-[#F8F9FA] pb-32">
      <div className="relative pt-20 pb-10 px-6 overflow-hidden">
        <ProfileHeader />
      </div>

      <div className="px-6 space-y-6">
        {isLoggedIn && (
           <div className="grid grid-cols-2 gap-4">
            {quickStats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-[28px] p-4 shadow-sm border border-white flex flex-col items-center">
                 <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
                 <p className="text-xl font-black">{stat.value}</p>
                 <p className="text-[9px] font-black text-muted-foreground uppercase">{stat.label}</p>
              </div>
            ))}
           </div>
        )}
        
        <div className="space-y-4">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] px-2">الحساب والإعدادات</h3>
          <MenuList />
        </div>
      </div>

      <AuthModal open={showAuth} onClose={closeAuth} />
      <BottomNav />

      {/* Immersive Image Editor */}
      <AnimatePresence>
        {isEditingImage && profileImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <div className="absolute top-10 text-center text-white/60">
              <p className="text-xl font-black text-white">معاينة الصورة</p>
              <p className="text-xs font-bold mt-2">اسحب الصورة لضبط المكان المناسب</p>
            </div>

            <div className="relative w-72 h-72 rounded-full border-2 border-white/20 overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.1)]">
              <motion.img 
                src={profileImage} 
                drag
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                whileTap={{ scale: 1.1 }}
                className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
              />
              <div className="absolute inset-0 pointer-events-none ring-[40px] ring-black/40" />
            </div>

            <div className="fixed bottom-12 inset-x-6 flex gap-4">
               <button 
                onClick={() => setIsEditingImage(false)}
                className="flex-1 h-14 rounded-2xl bg-white/10 text-white font-black text-sm border border-white/20 backdrop-blur-md active:scale-95 transition-all"
               >
                 إلغاء
               </button>
               <button 
                onClick={() => setIsEditingImage(false)}
                className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black text-sm shadow-premium active:scale-95 transition-all"
               >
                 حفظ الصورة
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileScreen;
