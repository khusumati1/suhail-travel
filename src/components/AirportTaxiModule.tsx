// src/components/AirportTaxiModule.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Phone, Calendar as CalendarIcon,
  Clock, Car, Users, CheckCircle2, PlaneTakeoff, PlaneLanding,
  ChevronLeft, Luggage, Baby, UserCheck, Shield, Sparkles, Info, AlertCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AIRPORTS = [
  { id: "BGW", name: "مطار بغداد الدولي", code: "BGW" },
  { id: "BSR", name: "مطار البصرة الدولي", code: "BSR" },
  { id: "EBL", name: "مطار أربيل الدولي", code: "EBL" },
  { id: "NJF", name: "مطار النجف الأشرف", code: "NJF" },
  { id: "ISU", name: "مطار السليمانية الدولي", code: "ISU" },
];

const VEHICLES = [
  { id: "economy", name: "اقتصادي بلس", desc: "تويوتا كورولا أو مشابه", price: 15000 },
  { id: "comfort", name: "مريح بريميوم", desc: "تويوتا كامري أو مشابه", price: 25000 },
  { id: "business", name: "رجال أعمال", desc: "مرسيدس E-Class", price: 45000 },
  { id: "suv", name: "SUV عائلي", desc: "شيفروليه تاهو", price: 55000 },
];

const schema = z.object({
  direction: z.enum(["to-airport", "from-airport"]),
  airport: z.string().min(1, "يجب اختيار مطار"),
  location: z.string().min(3, "أدخل العنوان بالتفصيل"),
  date: z.string().min(1, "اختر التاريخ"),
  time: z.string().min(1, "اختر الوقت"),
  vehicle: z.string().min(1, "يجب اختيار نوع السيارة"),
  phone: z.string().min(10, "رقم الهاتف يجب أن يكون 10 أرقام على الأقل"),
  passengerName: z.string().min(3, "أدخل الاسم الكامل"),
  flightNumber: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const STEPS = ["direction", "route", "datetime", "vehicle", "confirm", "success"] as const;

export default function AirportTaxiModule() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, setValue, watch, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { direction: "from-airport", airport: "BGW", vehicle: "comfort" },
  });

  const v = watch();

  const validateAndNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    if (step === 0) fieldsToValidate = ["direction"];
    if (step === 1) fieldsToValidate = ["airport", "location"];
    if (step === 2) fieldsToValidate = ["date", "time"];
    if (step === 3) fieldsToValidate = ["vehicle"];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
      setError(null);
    }
  };

  const prev = () => setStep(s => Math.max(s - 1, 0));

  const selectedVehicle = VEHICLES.find(c => c.id === v.vehicle)!;
  const total = selectedVehicle?.price || 0;

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const SCRAPER_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${SCRAPER_BASE_URL}/api/create-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "taxi",
          hotelName: `تكسي ${AIRPORTS.find(a => a.id === data.airport)?.name}`,
          checkIn: data.date,
          checkOut: data.date,
          price: `${total.toLocaleString()} د.ع`,
          passenger: { firstName: data.passengerName, lastName: data.phone },
        }),
      });

      if (!response.ok) throw new Error("فشل في إرسال طلب الحجز. يرجى المحاولة لاحقاً.");

      setStep(STEPS.indexOf("success"));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "حدث خطأ غير متوقع");
    }
    setSubmitting(false);
  };

  const anim = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Simple Progress Bar */}
      {step < STEPS.indexOf("success") && (
        <div className="flex gap-1 mb-8">
          {STEPS.slice(0, -1).map((_, i) => (
            <div key={i} className={cn("h-1 rounded-full flex-1 transition-all", i <= step ? "bg-primary" : "bg-secondary")} />
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-bold">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" variants={anim} initial="hidden" animate="visible" exit="exit" className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black">حجز تكسي المطار</h2>
              <p className="text-sm text-muted-foreground">اختر نوع الخدمة المطلوبة</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setValue("direction", "from-airport"); validateAndNext(); }}
                className={cn("p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all",
                  v.direction === "from-airport" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <PlaneLanding className="w-8 h-8 text-primary" />
                <span className="font-bold">من المطار</span>
              </button>
              <button onClick={() => { setValue("direction", "to-airport"); validateAndNext(); }}
                className={cn("p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all",
                  v.direction === "to-airport" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <PlaneTakeoff className="w-8 h-8 text-primary" />
                <span className="font-bold">إلى المطار</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" variants={anim} initial="hidden" animate="visible" exit="exit" className="space-y-5">
            <h3 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> تفاصيل المسار</h3>
            <div className="space-y-3">
              <label className="text-sm font-bold">المطار</label>
              <div className="grid grid-cols-1 gap-2">
                {AIRPORTS.map(a => (
                  <button key={a.id} type="button" onClick={() => setValue("airport", a.id)}
                    className={cn("flex items-center justify-between p-4 rounded-2xl border-2 text-right transition-all",
                      v.airport === a.id ? "border-primary bg-primary/5" : "border-border"
                    )}>
                    <span className="font-bold">{a.name}</span>
                    {v.airport === a.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
              {errors.airport && <p className="text-red-500 text-xs font-bold mr-1">{errors.airport.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">{v.direction === "from-airport" ? "عنوان التوصيل" : "عنوان الانطلاق"}</label>
              <Input {...register("location")} placeholder="أدخل العنوان بالتفصيل..." className="h-12 rounded-xl" />
              {errors.location && <p className="text-red-500 text-xs font-bold mr-1">{errors.location.message}</p>}
            </div>
            <NavButtons onNext={validateAndNext} onPrev={prev} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" variants={anim} initial="hidden" animate="visible" exit="exit" className="space-y-5">
            <h3 className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> موعد الرحلة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">التاريخ</label>
                <Input type="date" {...register("date")} className="h-12 rounded-xl" />
                {errors.date && <p className="text-red-500 text-xs font-bold mr-1">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">الوقت</label>
                <Input type="time" {...register("time")} className="h-12 rounded-xl" />
                {errors.time && <p className="text-red-500 text-xs font-bold mr-1">{errors.time.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">رقم الرحلة (لتتبع الموعد)</label>
              <Input {...register("flightNumber")} placeholder="مثال: IA-204" className="h-12 rounded-xl" />
            </div>
            <NavButtons onNext={validateAndNext} onPrev={prev} />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" variants={anim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
            <h3 className="text-xl font-bold">اختر نوع السيارة</h3>
            <div className="space-y-3">
              {VEHICLES.map(car => (
                <button key={car.id} type="button" onClick={() => setValue("vehicle", car.id)}
                  className={cn("w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                    v.vehicle === car.id ? "border-primary bg-primary/5" : "border-border")}>
                  <div className="text-right">
                    <p className="font-bold">{car.name}</p>
                    <p className="text-xs text-muted-foreground">{car.desc}</p>
                  </div>
                  <p className="font-black text-primary">{car.price.toLocaleString()} د.ع</p>
                </button>
              ))}
            </div>
            {errors.vehicle && <p className="text-red-500 text-xs font-bold mr-1">{errors.vehicle.message}</p>}
            <NavButtons onNext={validateAndNext} onPrev={prev} />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" variants={anim} initial="hidden" animate="visible" exit="exit" className="space-y-6">
            <h3 className="text-xl font-bold">تأكيد الحجز</h3>
            <div className="bg-secondary/30 p-5 rounded-3xl space-y-3">
              <Row label="المطار" value={AIRPORTS.find(a => a.id === v.airport)?.name || "—"} />
              <Row label="العنوان" value={v.location || "—"} />
              <Row label="الموعد" value={`${v.date || "—"} ${v.time || "—"}`} />
              <Row label="السيارة" value={selectedVehicle?.name || "—"} />
              <div className="border-t pt-3 flex justify-between items-center font-black">
                <span>الإجمالي</span>
                <span className="text-primary text-xl">{total.toLocaleString()} د.ع</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold mr-1 text-muted-foreground">الاسم الكامل</label>
                <Input {...register("passengerName")} placeholder="الاسم الكامل" className="h-12 rounded-xl" />
                {errors.passengerName && <p className="text-red-500 text-xs font-bold mr-1">{errors.passengerName.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold mr-1 text-muted-foreground">رقم الهاتف</label>
                <Input {...register("phone")} placeholder="رقم الهاتف" className="h-12 rounded-xl" />
                {errors.phone && <p className="text-red-500 text-xs font-bold mr-1">{errors.phone.message}</p>}
              </div>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={submitting}
                className="w-full h-14 rounded-2xl text-lg font-bold mt-2"
              >
                {submitting ? "جاري الإرسال..." : "تأكيد الحجز الآن"}
              </Button>
            </div>
            <Button variant="ghost" onClick={prev} className="w-full">رجوع</Button>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div key="s5" variants={anim} initial="hidden" animate="visible" exit="exit" className="text-center py-10 space-y-4">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black">تم الحجز بنجاح!</h2>
            <p className="text-muted-foreground">سنتواصل معك قريباً لتأكيد موعد السائق.</p>
            <Button onClick={() => window.location.href = "/home"} className="px-10 rounded-xl">العودة للرئيسية</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButtons({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div className="flex gap-2 pt-4">
      <Button variant="outline" type="button" onClick={onPrev} className="flex-1 h-12 rounded-xl">رجوع</Button>
      <Button type="button" onClick={onNext} className="flex-[2] h-12 rounded-xl">استمرار</Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

