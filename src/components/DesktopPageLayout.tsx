import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, ChevronLeft, Home } from "lucide-react";
import logo from "@/assets/logo.png";
import OptimizedImage from "@/components/OptimizedImage";
import ThemeToggle from "@/components/ThemeToggle";

interface DesktopPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  heroImage?: string;
  heroImages?: string[];
}

const routeLabels: Record<string, string> = {
  "/home": "الرئيسية",
  "/flights": "الطيران",
  "/flights/1": "تفاصيل الرحلة",
  "/hotels": "الفنادق",
  "/hotels/1": "تفاصيل الفندق",
  "/cars": "تأجير السيارات",
  "/visa": "التأشيرات",
  "/groups/1": "كروبات سياحية",
  "/bookings": "الحجوزات",
  "/profile": "الملف الشخصي",
  "/payment": "الدفع",
};

const DesktopPageLayout = ({ children, title, subtitle, heroImage, heroImages }: DesktopPageLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const slides = heroImages && heroImages.length > 1 ? heroImages : null;
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    if (slides) setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides]);

  useEffect(() => {
    if (!slides) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [slides, nextSlide]);

  const breadcrumbs = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    const crumbs: { label: string; path: string }[] = [{ label: "الرئيسية", path: "/home" }];
    let currentPath = "";
    for (const part of parts) {
      currentPath += `/${part}`;
      const label = routeLabels[currentPath];
      if (label && currentPath !== "/home") {
        crumbs.push({ label, path: currentPath });
      }
    }
    return crumbs;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <nav className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button onClick={() => navigate("/login")} className="text-sm font-semibold bg-primary text-primary-foreground rounded-xl px-6 py-2.5 hover:opacity-90 transition-all shadow-sm">
              تسجيل الدخول
            </button>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium" dir="ltr" style={{ unicodeBidi: "isolate" }}>+964 770 000 0000</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6 text-sm font-semibold text-foreground">
              <button onClick={() => navigate("/groups/1")} className="hover:text-primary transition-colors relative group">
                كروبات سياحية
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
              <button onClick={() => navigate("/visa")} className="hover:text-primary transition-colors relative group">
                التأشيرات
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
              <button onClick={() => navigate("/hotels")} className="hover:text-primary transition-colors relative group">
                الفنادق
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
              <button onClick={() => navigate("/flights")} className="hover:text-primary transition-colors relative group">
                الطيران
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
            </div>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/home")}>
              <h1 className="text-xl font-bold text-primary group-hover:opacity-80 transition-opacity">سهيل</h1>
              <img src={logo} alt="سهيل" className="w-10 h-10 rounded-xl shadow-sm" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      {title && (
        <div className="relative h-[240px] overflow-hidden">
          {slides ? (
            <>
              {slides.map((src, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    opacity: i === currentSlide ? 1 : 0,
                    scale: i === currentSlide ? 1.08 : 1,
                  }}
                  transition={{
                    opacity: { duration: 1.5, ease: [0.4, 0, 0.2, 1] },
                    scale: { duration: 8, ease: "easeOut" },
                  }}
                  className="absolute inset-0"
                  style={{ zIndex: i === currentSlide ? 1 : 0 }}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </motion.div>
              ))}
            </>
          ) : (
            <motion.div
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 8, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <OptimizedImage
                src={heroImage || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1400&h=300&fit=crop"}
                alt=""
                className="w-full h-full object-cover"
                wrapperClassName="w-full h-full"
                loading="eager"
              />
            </motion.div>
          )}
          <div className="absolute inset-0 bg-gradient-to-l from-foreground/75 via-foreground/60 to-foreground/30" />
          
          {/* Breadcrumbs */}
          <div className="absolute top-6 right-0 left-0">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center gap-2 text-white/70">
                {breadcrumbs().map((crumb, i, arr) => (
                  <div key={crumb.path} className="flex items-center gap-2">
                    {i === 0 && <Home className="w-3.5 h-3.5" />}
                    <button
                      onClick={() => navigate(crumb.path)}
                      className={`text-xs font-medium transition-colors ${
                        i === arr.length - 1 ? "text-white font-bold" : "hover:text-white"
                      }`}
                    >
                      {crumb.label}
                    </button>
                    {i < arr.length - 1 && <ChevronLeft className="w-3 h-3" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-3xl lg:text-5xl font-bold text-white mb-3"
              >
                {title}
              </motion.h1>
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-white/70 text-base lg:text-lg"
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          </div>

          {/* Slide indicators */}
          {slides && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === currentSlide ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-8">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="سهيل" className="w-10 h-10 rounded-xl" />
                <h3 className="text-xl font-bold text-primary">سهيل</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                منصة حجز السفر الأولى في العراق.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">خدماتنا</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/flights")}>حجز الطيران</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/hotels")}>حجز الفنادق</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/visa")}>التأشيرات</li>
                <li className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/groups/1")}>كروبات سياحية</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">الشركة</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-primary cursor-pointer transition-colors">عن سهيل</li>
                <li className="hover:text-primary cursor-pointer transition-colors">سياسة الخصوصية</li>
                <li className="hover:text-primary cursor-pointer transition-colors">الشروط والأحكام</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /><span dir="ltr" style={{ unicodeBidi: "isolate" }}>+964 770 000 0000</span></li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>info@suhail.iq</span></li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>بغداد، العراق</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-6 text-center">
            <p className="text-xs text-muted-foreground">© ٢٠٢٦ سهيل. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DesktopPageLayout;
