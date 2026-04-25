import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CreditCard, Smartphone, Building2, Check, ShieldCheck, Lock } from "lucide-react";

const methods = [
  { id: "card", icon: CreditCard, label: "بطاقة ائتمان", desc: "Visa, Mastercard" },
  { id: "apple", icon: Smartphone, label: "Apple Pay", desc: "الدفع السريع" },
  { id: "zain", icon: Building2, label: "زين كاش", desc: "محفظة زين الإلكترونية" },
];

const PaymentScreen = () => {
  const [selected, setSelected] = useState("card");
  const navigate = useNavigate();

  return (
    <div className="mobile-container bg-background pb-8">
      <div className="px-5 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center border border-border">
            <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={2} />
          </button>
          <h1 className="text-foreground font-bold text-lg">إتمام الدفع</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card border border-border/50">
          <h3 className="font-bold text-foreground mb-4">ملخص الطلب</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">السعر الأساسي</span>
              <span className="font-semibold text-foreground">١٢٠ $</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الضريبة والرسوم</span>
              <span className="font-semibold text-foreground">١٨ $</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-bold text-foreground">الإجمالي</span>
              <span className="text-2xl font-bold text-primary">١٣٨ $</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="bg-card rounded-2xl p-5 shadow-card border border-border/50">
          <h3 className="font-bold text-foreground mb-4">طريقة الدفع</h3>
          <div className="space-y-2.5">
            {methods.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
                    selected === m.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <Icon className="w-6 h-6 text-muted-foreground" strokeWidth={1.8} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                  </div>
                  {selected === m.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {selected === "card" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card border border-border/50 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">رقم البطاقة</label>
              <input placeholder="0000 0000 0000 0000" className="w-full px-4 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-medium border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" dir="ltr" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">تاريخ الانتهاء</label>
                <input placeholder="MM/YY" className="w-full px-4 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-medium border border-border focus:border-primary transition-all" dir="ltr" />
              </div>
              <div className="w-28">
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">CVV</label>
                <input placeholder="000" className="w-full px-4 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-medium border border-border focus:border-primary transition-all" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">الاسم على البطاقة</label>
              <input placeholder="ALI HUSSEIN AL-RUBAIE" className="w-full px-4 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-medium border border-border focus:border-primary transition-all" dir="ltr" />
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-2 py-2">
          <Lock className="w-3.5 h-3.5 text-success" strokeWidth={2} />
          <span className="text-[11px] text-success font-medium">دفع آمن ومشفر بتقنية SSL</span>
          <ShieldCheck className="w-3.5 h-3.5 text-success" strokeWidth={2} />
        </div>

        <button className="btn-primary flex items-center justify-center gap-2">
          <Lock className="w-5 h-5" strokeWidth={2} />
          <span>تأكيد الدفع · ١٣٨ $</span>
        </button>
      </div>
    </div>
  );
};

export default PaymentScreen;
