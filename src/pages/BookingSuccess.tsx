// src/pages/BookingSuccess.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Home, Calendar, ArrowRight } from 'lucide-react';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = location.state?.bookingId || 'SND-XXXXXX';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 mb-8"
      >
        <CheckCircle2 className="w-16 h-16" strokeWidth={3} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-3xl font-black mb-4">تم تأكيد حجزك بنجاح!</h1>
        <p className="text-muted-foreground font-bold mb-10 max-w-xs mx-auto">
          لقد تم تسجيل حجزك في النظام. رقم المرجع الخاص بك هو:
          <span className="block text-2xl text-primary font-black mt-3 tracking-[0.2em]">{bookingId}</span>
        </p>

        <div className="space-y-4 w-full max-w-xs mx-auto">
          <button
            onClick={() => navigate('/home')}
            className="w-full h-16 bg-primary text-primary-foreground rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Home className="w-5 h-5" />
            العودة للرئيسية
          </button>
          
          <button
            onClick={() => navigate('/bookings')}
            className="w-full h-16 bg-secondary text-foreground rounded-3xl font-black flex items-center justify-center gap-3 border border-border/40 hover:bg-secondary/80 transition-all"
          >
            <Calendar className="w-5 h-5" />
            عرض حجوزاتي
          </button>
        </div>
      </motion.div>

      <footer className="mt-16 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40">
        تطبيق سهيل للـسفر والسياحة
      </footer>
    </div>
  );
};

export default BookingSuccess;
