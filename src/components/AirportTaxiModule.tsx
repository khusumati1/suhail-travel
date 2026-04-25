import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ArrowLeft, MapPin, Phone, Calendar as CalendarIcon, 
  Clock, Car, Users, CheckCircle2, Building, PlaneTakeoff, PlaneLanding,
  ChevronRight, ChevronLeft
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// --- Types & Schema ---

const carTypes = [
  { id: "small", name: "سيارة صغيرة", icon: Car, price: 25000, description: "تتسع لـ 3 أشخاص + 2 حقائب", image: "🚗" },
  { id: "suv", name: "سيارة عالية (SUV)", icon: Building, price: 40000, description: "تتسع لـ 4 أشخاص + 4 حقائب", image: "🚘" },
  { id: "family", name: "سيارة عائلية (Van)", icon: Users, price: 60000, description: "تتسع لـ 7 أشخاص + 6 حقائب", image: "🚐" },
];

const taxiSchema = z.object({
  direction: z.enum(["to-airport", "from-airport"]),
  location: z.string().min(5, "يرجى إدخال الموقع بالتفصيل"),
  date: z.string().min(1, "يرجى اختيار التاريخ"),
  time: z.string().min(1, "يرجى اختيار الوقت"),
  carType: z.string().min(1, "يرجى اختيار نوع السيارة"),
  phone: z.string().min(10, "رقم الهاتف غير مكتمل").regex(/^[0-9]+$/, "يجب أن يحتوي الرقم على أرقام فقط"),
});

type TaxiForm = z.infer<typeof taxiSchema>;

const steps = ["direction", "location", "date-time", "car-type", "contact", "success"] as const;

export default function AirportTaxiModule() {
  const [currentStep, setCurrentStep] = useState(0);
  
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaxiForm>({
    resolver: zodResolver(taxiSchema),
    defaultValues: {
      direction: "from-airport",
      carType: "small",
    },
  });

  const formValues = watch();

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const onSubmit = async (data: TaxiForm) => {
    // Simulate API call to "Control Panel"
    console.log("Submitting to Control Panel:", data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    nextStep(); // Go to success step
  };

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="w-full max-w-xl mx-auto overflow-hidden">
      {/* Progress Bar */}
      {currentStep < steps.length - 1 && (
        <div className="flex justify-center gap-2 mb-8 px-4">
          {steps.slice(0, -1).map((_, idx) => (
            <div 
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                idx <= currentStep ? "w-8 bg-primary" : "w-2 bg-gray-200"
              )}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 0: Direction */}
        {currentStep === 0 && (
          <motion.div 
            key="step0" 
            variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">مرحباً بك في خدمة تكسي المطار</h2>
              <p className="text-muted-foreground">حدد مسار رحلتك للبدء</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DirectionCard 
                active={formValues.direction === "from-airport"}
                onClick={() => { setValue("direction", "from-airport"); nextStep(); }}
                icon={PlaneLanding}
                title="من المطار"
                subtitle="إلى منزلك"
              />
              <DirectionCard 
                active={formValues.direction === "to-airport"}
                onClick={() => { setValue("direction", "to-airport"); nextStep(); }}
                icon={PlaneTakeoff}
                title="إلى المطار"
                subtitle="من منزلك"
              />
            </div>
          </motion.div>
        )}

        {/* STEP 1: Location */}
        {currentStep === 1 && (
          <motion.div 
            key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            className="space-y-6"
          >
            <StepHeader title="أين تقع وجهتك؟" subtitle="يرجى كتابة العنوان أو اسم المنطقة بدقة" icon={MapPin} />
            <div className="space-y-4">
              <div className="relative">
                <MapPin className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input 
                  {...register("location")}
                  placeholder={formValues.direction === "from-airport" ? "العنوان المقصود (مثلاً: المنصور، شارع الأميرات)" : "موقع الانطلاق"}
                  className="pr-10 h-14 rounded-2xl text-lg border-gray-200 focus:ring-primary shadow-sm"
                />
              </div>
              {errors.location && <p className="text-red-500 text-sm">{errors.location.message}</p>}
              <Button onClick={nextStep} className="w-full h-14 rounded-2xl text-lg font-bold group">
                استمرار
                <ChevronLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
              </Button>
              <Button variant="ghost" onClick={prevStep} className="w-full">رجوع</Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Date & Time */}
        {currentStep === 2 && (
          <motion.div 
            key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            className="space-y-6"
          >
            <StepHeader title="موعد الرحلة" subtitle="اختر الوقت والتاريخ المناسبين" icon={Clock} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium mr-1">التاريخ</label>
                <div className="relative">
                  <CalendarIcon className="absolute right-3 top-3.5 w-5 h-5 text-primary" />
                  <Input type="date" {...register("date")} className="pr-10 h-12 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium mr-1">الوقت</label>
                <div className="relative">
                  <Clock className="absolute right-3 top-3.5 w-5 h-5 text-primary" />
                  <Input type="time" {...register("time")} className="pr-10 h-12 rounded-xl" />
                </div>
              </div>
            </div>
            

            <div className="space-y-3">
              <Button onClick={nextStep} className="w-full h-14 rounded-2xl text-lg font-bold">التالي</Button>
              <Button variant="ghost" onClick={prevStep} className="w-full">رجوع</Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Car Type */}
        {currentStep === 3 && (
          <motion.div 
            key="step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            className="space-y-6"
          >
            <StepHeader title="اختر سيارتك" subtitle="مجموعة متنوعة تناسب احتياجاتك" icon={Car} />
            
            <div className="space-y-3">
              {carTypes.map((car) => (
                <CarCard 
                  key={car.id}
                  active={formValues.carType === car.id}
                  onClick={() => setValue("carType", car.id)}
                  car={car}
                />
              ))}
            </div>

            <div className="space-y-3 pt-4">
              <Button onClick={nextStep} className="w-full h-14 rounded-2xl text-lg font-bold">اختيار السيارة</Button>
              <Button variant="ghost" onClick={prevStep} className="w-full">رجوع</Button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Contact */}
        {currentStep === 4 && (
          <motion.div 
            key="step4" variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            className="space-y-6"
          >
            <StepHeader title="تأكيد الحجز" subtitle="أدخل رقم هاتفك لنتواصل معك" icon={Phone} />
            
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute right-3 top-3.5 w-5 h-5 text-muted-foreground" />
                <Input 
                  {...register("phone")}
                  placeholder="07XXXXXXXX"
                  className="pr-10 h-14 rounded-2xl text-xl font-bold tracking-widest text-center"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm text-center">{errors.phone.message}</p>}
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">نوع السيارة</span>
                  <span className="font-bold">{carTypes.find(c => c.id === formValues.carType)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">التاريخ والوقت</span>
                  <span className="font-bold text-primary" dir="ltr">{formValues.date} | {formValues.time}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-lg font-bold">المجموع الكلي</span>
                  <span className="text-xl font-black text-primary">{carTypes.find(c => c.id === formValues.carType)?.price.toLocaleString()} د.ع</span>
                </div>
              </div>

              <Button onClick={handleSubmit(onSubmit)} className="w-full h-16 rounded-2xl text-xl font-black shadow-lg shadow-primary/20">
                إتمام الحجز الآن
              </Button>
              <Button variant="ghost" onClick={prevStep} className="w-full">رجوع</Button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Success */}
        {currentStep === 5 && (
          <motion.div 
            key="step5" variants={containerVariants} initial="hidden" animate="visible" exit="exit"
            className="text-center py-10 space-y-6"
          >
            <div className="relative inline-block">
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
                className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full border-4 border-green-500/30"
              />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">تم الحجز بنجاح!</h2>
              <p className="text-muted-foreground max-w-[280px] mx-auto">
                شكراً لاختيارك سهيل. تم إرسال معلوماتك إلى لوحة التحكم، وسنتصل بك قريباً لتأكيد الموعد.
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/home"}
              className="h-12 rounded-xl px-10"
            >
              العودة للرئيسية
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

function DirectionCard({ active, onClick, icon: Icon, title, subtitle }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 group overflow-hidden",
        active 
          ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
          : "border-gray-100 bg-white hover:border-primary/30"
      )}
    >
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
        active ? "bg-primary text-white" : "bg-gray-100 text-gray-500 group-hover:scale-110"
      )}>
        <Icon className="w-8 h-8" />
      </div>
      <div className="text-center">
        <p className={cn("font-black text-lg", active ? "text-primary" : "text-gray-700")}>{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {active && (
        <motion.div layoutId="check" className="absolute top-2 left-2 text-primary">
          <CheckCircle2 className="w-5 h-5" />
        </motion.div>
      )}
    </button>
  );
}

function StepHeader({ title, subtitle, icon: Icon }: any) {
  return (
    <div className="text-center space-y-2 mb-6">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-2xl font-black text-foreground">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function CarCard({ car, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 text-right group relative",
        active 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-gray-100 bg-white hover:border-primary/20"
      )}
    >
      <div className="text-3xl lg:text-4xl grayscale-[0.5] group-hover:grayscale-0 transition-all duration-300">
        {car.image}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className={cn("font-bold text-lg", active ? "text-primary" : "text-gray-800")}>{car.name}</h4>
          <span className="font-black text-primary" dir="ltr">{car.price.toLocaleString()} د.ع</span>
        </div>
        <p className="text-xs text-muted-foreground">{car.description}</p>
      </div>
      {active && (
        <motion.div layoutId="carCheck" className="mr-2 text-primary">
          <CheckCircle2 className="w-6 h-6" />
        </motion.div>
      )}
    </button>
  );
}
