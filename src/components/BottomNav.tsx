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
    <div className="flex justify-center">
      <div className="floating-island max-w-md mx-auto" dir="rtl">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center justify-center w-16 h-14 rounded-[2rem] transition-all duration-300 active:scale-90"
              >
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute inset-0 bg-primary/10 rounded-2xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`h-6 w-6 transition-all duration-300 ${
                    isActive ? "text-primary scale-110" : "text-muted-foreground/60"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-[9px] font-black mt-1 transition-all duration-300 ${
                    isActive ? "text-primary opacity-100" : "text-muted-foreground/40"
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
