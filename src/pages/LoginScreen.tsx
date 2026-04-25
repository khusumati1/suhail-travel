import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Shield, ArrowRight, Lock } from "lucide-react";
import logo from "@/assets/logo.png";

const LoginScreen = () => {
  const [phone, setPhone] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const navigate = useNavigate();

  const handleSendOtp = () => {
    if (phone.length >= 10) setShowOtp(true);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
    if (newOtp.every((d) => d !== "")) {
      setTimeout(() => navigate("/home"), 600);
    }
  };

  return (
    <div className="mobile-container bg-background flex flex-col">
      <div className="px-6 pt-16 pb-8 flex flex-col items-center gap-4">
        <img src={logo} alt="سهيل" className="w-16 h-16 rounded-2xl shadow-card" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-1">مرحباً بك في سهيل</h1>
          <p className="text-muted-foreground text-sm">سجل دخولك لبدء رحلتك</p>
        </div>
      </div>

      <motion.div
        className="flex-1 px-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {!showOtp ? (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-2 justify-end">
                رقم الجوال
                <Phone className="w-4 h-4 text-primary" strokeWidth={2} />
              </label>
              <div className="flex gap-2.5" dir="ltr">
                <div className="flex items-center justify-center px-4 rounded-2xl bg-secondary text-sm font-bold text-foreground border border-border" style={{ unicodeBidi: "isolate" }}>
                  +964
                </div>
                <input
                  type="tel"
                  placeholder="770 XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-4 py-4 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground text-left outline-none focus:ring-2 focus:ring-primary/30 border border-border transition-all font-medium"
                  maxLength={11}
                />
              </div>
            </div>

            <button
              onClick={handleSendOtp}
              disabled={phone.length < 10}
              className="btn-primary disabled:opacity-40"
            >
              إرسال رمز التحقق
            </button>

            <div className="text-center pt-2">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-success" strokeWidth={2} />
                <span className="text-xs text-success font-medium">اتصال آمن ومشفر</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                بالمتابعة، أنت توافق على{" "}
                <span className="text-primary font-semibold">شروط الاستخدام</span>{" "}
                و{" "}
                <span className="text-primary font-semibold">سياسة الخصوصية</span>
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <button onClick={() => setShowOtp(false)} className="flex items-center gap-2 text-primary text-sm font-semibold">
              <ArrowRight className="w-4 h-4" />
              رجوع
            </button>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-primary" strokeWidth={1.8} />
              </div>
              <h2 className="text-xl font-bold text-foreground">رمز التحقق</h2>
              <p className="text-sm text-muted-foreground mt-2">
                تم إرسال رمز التحقق إلى <span className="font-bold text-foreground" dir="ltr" style={{ unicodeBidi: "isolate" }}>+964 {phone}</span>
              </p>
            </div>

            <div className="flex justify-center gap-3" dir="ltr">
              {otp.map((digit, i) => (
                <motion.input
                  key={i}
                  id={`otp-${i}`}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="w-16 h-16 text-center text-2xl font-bold rounded-2xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary border-2 border-border focus:border-primary transition-all"
                />
              ))}
            </div>

            <div className="text-center">
              <p className="text-muted-foreground text-xs mb-2">لم يصلك الرمز؟</p>
              <button className="text-primary text-sm font-bold">إعادة إرسال الرمز</button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginScreen;
