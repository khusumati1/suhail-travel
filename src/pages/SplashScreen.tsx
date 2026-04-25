import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { useIsMobile } from "@/hooks/use-mobile";

const SplashScreen = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (isMobile === undefined) return;
    if (isMobile === false) {
      navigate("/home", { replace: true });
      return;
    }
    // Start exit animation before navigating
    const exitTimer = setTimeout(() => setExiting(true), 2400);
    const navTimer = setTimeout(() => navigate("/home", { replace: true }), 3200);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(navTimer);
    };
  }, [navigate, isMobile]);

  return (
    <motion.div
      className="mobile-container bg-background flex flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Ambient background orbs */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)", top: "-10%", right: "-20%" }}
        animate={exiting
          ? { scale: 2, opacity: 0 }
          : { scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] }
        }
        transition={exiting
          ? { duration: 0.8, ease: "easeIn" }
          : { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <motion.div
        className="absolute w-[250px] h-[250px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.3), transparent 70%)", bottom: "5%", left: "-15%" }}
        animate={exiting
          ? { scale: 2, opacity: 0 }
          : { scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }
        }
        transition={exiting
          ? { duration: 0.8, ease: "easeIn" }
          : { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }
        }
      />

      {/* Geometric ring behind logo */}
      <motion.div
        className="absolute w-40 h-40 rounded-full border-2 border-primary/10"
        initial={{ scale: 0, opacity: 0 }}
        animate={exiting
          ? { scale: 3, opacity: 0 }
          : { scale: [0, 1.8, 2.2], opacity: [0, 0.3, 0] }
        }
        transition={{ duration: 2, delay: exiting ? 0 : 0.6, ease: "easeOut" }}
      />
      <motion.div
        className="absolute w-40 h-40 rounded-full border border-accent/10"
        initial={{ scale: 0, opacity: 0 }}
        animate={exiting
          ? { scale: 3.5, opacity: 0 }
          : { scale: [0, 2.5, 3], opacity: [0, 0.2, 0] }
        }
        transition={{ duration: 2.5, delay: exiting ? 0 : 0.9, ease: "easeOut" }}
      />

      {/* Logo + Text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={exiting
          ? { opacity: 0, scale: 0.8, y: -40 }
          : { opacity: 1, scale: 1, y: 0 }
        }
        transition={{ duration: exiting ? 0.6 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-5 z-10"
      >
        {/* Logo with glow */}
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{ background: "hsl(var(--primary) / 0.25)", filter: "blur(20px)" }}
            animate={exiting
              ? { opacity: 0, scale: 1.5 }
              : { opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }
            }
            transition={exiting
              ? { duration: 0.5 }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <motion.img
            src={logo}
            alt="سهيل"
            className="w-28 h-28 rounded-3xl shadow-premium relative z-10"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {/* App name */}
        <motion.div className="text-center">
          <motion.h1
            className="text-primary text-4xl font-bold mb-2 font-display"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
          >
            سهيل
          </motion.h1>
          <motion.div
            className="overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            transition={{ delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-muted-foreground text-sm font-medium whitespace-nowrap">
              رفيقك في كل رحلة
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Bottom loading bar */}
      <motion.div
        className="absolute bottom-24 w-32 h-1 rounded-full overflow-hidden bg-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ delay: exiting ? 0 : 1.5, duration: exiting ? 0.3 : 0.3 }}
      >
        <motion.div
          className="h-full rounded-full gradient-purple-vibrant"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: 1.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
