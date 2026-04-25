import { Home, Plane, Calendar, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { icon: Home, label: "الرئيسية", path: "/home" },
  { icon: Plane, label: "رحلاتي", path: "/flights" },
  { icon: Calendar, label: "حجوزاتي", path: "/bookings" },
  { icon: User, label: "حسابي", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-md bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2 px-4" dir="rtl">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all duration-200"
              >
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -top-1 w-8 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  className={`h-[22px] w-[22px] transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className={`text-[10px] font-semibold transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
