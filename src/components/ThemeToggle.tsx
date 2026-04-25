import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { useCallback } from "react";

const playSoftClick = () => {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Tiny percussive tap — like a premium UI toggle
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.008, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / ctx.sampleRate) * 1200);
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer = buf;
    filter.type = "bandpass";
    filter.frequency.value = 3500;
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);

    setTimeout(() => ctx.close(), 100);
  } catch {}
};

const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const handleToggle = useCallback(() => {
    playSoftClick();
    toggleTheme();
  }, [isDark, toggleTheme]);

  return (
    <button
      onClick={handleToggle}
      className={`relative overflow-hidden w-14 h-7 rounded-full p-0.5 transition-colors duration-500 ${
        isDark ? "bg-primary/20 border border-primary/30" : "bg-secondary border border-border"
      } ${className}`}
      aria-label="تبديل الوضع"
    >
      <motion.div
        className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
          isDark ? "bg-primary" : "bg-card"
        }`}
        animate={{ x: isDark ? -24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2} />
        ) : (
          <Sun className="w-3.5 h-3.5 text-accent-foreground" strokeWidth={2} />
        )}
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
