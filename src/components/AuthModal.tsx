import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, User, Eye, EyeOff, Phone, Check, AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = () => {
    setError("");
    if (!phone || !password) {
      setError("يرجى ملء جميع الحقول");
      return;
    }
    if (mode === "register" && !name) {
      setError("يرجى إدخال الاسم");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const userName = mode === "register" ? name : (phone.includes("@") ? phone.split("@")[0] : "مستخدم سهيل");
      login(userName, phone);
      setLoading(false);
      toast({
        title: mode === "login" ? "تم تسجيل الدخول بنجاح" : "تم إنشاء الحساب بنجاح",
        description: `مرحباً ${userName}! 👋`,
      });
      onClose();
      setName("");
      setPhone("");
      setPassword("");
    }, 800);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-[101] max-w-md mx-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
          >
            <div className="bg-card rounded-t-[2rem] shadow-premium border-t border-border overflow-hidden">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>

              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border"
              >
                <X className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
              </button>

              <div className="px-6 pb-8 pt-2">
                <div className="flex flex-col items-center mb-6">
                  <img src={logo} alt="سهيل" className="w-14 h-14 rounded-2xl shadow-card mb-3" />
                  <h2 className="text-foreground font-bold text-xl">
                    {mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {mode === "login" ? "سجل دخولك للمتابعة" : "انضم إلى سهيل الآن"}
                  </p>
                </div>

                <div className="flex gap-1 bg-secondary rounded-2xl p-1 mb-5">
                  {(["login", "register"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setMode(tab); setError(""); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 relative ${
                        mode === tab ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {mode === tab && (
                        <motion.div
                          layoutId="authTab"
                          className="absolute inset-0 bg-card rounded-xl shadow-card border border-border/50"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">
                        {tab === "login" ? "تسجيل الدخول" : "حساب جديد"}
                      </span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20"
                        >
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" strokeWidth={2} />
                          <span className="text-sm font-medium text-destructive">{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {mode === "register" && (
                      <div className="relative">
                        <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="الاسم الكامل"
                          className="w-full pr-11 pl-4 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-medium border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="رقم الهاتف أو البريد الإلكتروني"
                        className="w-full pr-11 pl-4 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-medium border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder="كلمة المرور"
                        className="w-full pr-11 pl-11 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-medium border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                        )}
                      </button>
                    </div>

                    {mode === "login" && (
                      <button className="text-xs text-primary font-semibold block mr-auto">
                        نسيت كلمة المرور؟
                      </button>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="btn-primary mt-2 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                      ) : (
                        <>
                          <Check className="w-5 h-5" strokeWidth={2} />
                          {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                        </>
                      )}
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
