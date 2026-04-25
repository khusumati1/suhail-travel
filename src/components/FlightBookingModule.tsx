import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, ArrowLeftRight, CalendarDays, Users, Search,
  Plane, Plus, Minus, ChevronLeft, ArrowRightLeft, MapPinned, Clock,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import CitySearchModal from "@/components/CitySearchModal";
import { saveRecentSearch } from "@/hooks/usePlaceSearch";
import { useToast } from "@/hooks/use-toast";

type TripType = "one-way" | "round-trip" | "multi-city" | "open-return";
type CabinClass = "economy" | "business" | "first";

const tripTypeIcons: Record<TripType, React.ReactNode> = {
  "one-way": <Plane className="w-3.5 h-3.5" strokeWidth={2} />,
  "round-trip": <ArrowRightLeft className="w-3.5 h-3.5" strokeWidth={2} />,
  "multi-city": <MapPinned className="w-3.5 h-3.5" strokeWidth={2} />,
  "open-return": <Clock className="w-3.5 h-3.5" strokeWidth={2} />,
};

const tripTypes: { id: TripType; label: string }[] = [
  { id: "one-way", label: "ذهاب" },
  { id: "round-trip", label: "ذهاب وعودة" },
  { id: "multi-city", label: "وجهات متعددة" },
  { id: "open-return", label: "عودة مفتوحة" },
];

const cabinClasses: { id: CabinClass; label: string }[] = [
  { id: "economy", label: "اقتصادي" },
  { id: "business", label: "رجال الأعمال" },
  { id: "first", label: "الدرجة الأولى" },
];

const quickRoutes: { from: string; fromCode: string; to: string; toCode: string; price: string; date: string }[] = [];

const cabinClassLabel: Record<CabinClass, string> = {
  economy: "اقتصادي",
  business: "رجال الأعمال",
  first: "الدرجة الأولى",
};

interface CounterProps {
  label: string;
  subtitle: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

const Counter = ({ label, subtitle, value, min = 0, max = 9, onChange }: CounterProps) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-bold text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center disabled:opacity-30 transition-opacity"
      >
        <Minus className="w-4 h-4 text-foreground" />
      </button>
      <span className="w-8 text-center text-base font-bold text-foreground" dir="ltr">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center disabled:opacity-30 transition-opacity"
      >
        <Plus className="w-4 h-4 text-primary" />
      </button>
    </div>
  </div>
);

const PassengerSheetContent = ({
  adults, setAdults, children, setChildren, infants, setInfants,
  cabinClass, setCabinClass, onConfirm,
}: {
  adults: number; setAdults: (v: number) => void;
  children: number; setChildren: (v: number) => void;
  infants: number; setInfants: (v: number) => void;
  cabinClass: CabinClass; setCabinClass: (v: CabinClass) => void;
  onConfirm: () => void;
}) => (
  <div className="px-5 pt-2 pb-6">
    <div className="w-12 h-1.5 rounded-full bg-border mx-auto mb-5 lg:hidden" />
    <h3 className="font-bold text-lg text-foreground mb-5">المسافرون والدرجة</h3>
    <div className="space-y-1 divide-y divide-border/50">
      <Counter label="بالغون" subtitle="١٢ سنة وأكثر" value={adults} min={1} onChange={setAdults} />
      <Counter label="أطفال" subtitle="٢ - ١٢ سنة" value={children} onChange={setChildren} />
      <Counter label="رضّع" subtitle="أقل من سنتين" value={infants} onChange={setInfants} />
    </div>
    <div className="mt-5">
      <p className="text-sm font-bold text-foreground mb-3">درجة المقصورة</p>
      <div className="space-y-2">
        {cabinClasses.map((c) => (
          <button
            key={c.id}
            onClick={() => setCabinClass(c.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200",
              cabinClass === c.id
                ? "bg-primary/10 border-primary/30 text-foreground"
                : "bg-secondary border-border text-muted-foreground"
            )}
          >
            <span className="text-sm font-bold">{c.label}</span>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              cabinClass === c.id ? "border-primary" : "border-muted-foreground/30"
            )}>
              {cabinClass === c.id && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 rounded-full bg-primary" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
    <button onClick={onConfirm} className="btn-primary mt-6 flex items-center justify-center gap-2">
      تأكيد الاختيار
    </button>
  </div>
);

interface FlightBookingModuleProps {
  variant?: "compact" | "full";
}

const FlightBookingModule = ({ variant = "full" }: FlightBookingModuleProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [tripType, setTripType] = useState<TripType>("one-way");
  const [fromCity, setFromCity] = useState("بغداد");
  const [fromCode, setFromCode] = useState("BGW");
  const [toCity, setToCity] = useState("");
  const [toCode, setToCode] = useState("");
  const [departDate, setDepartDate] = useState<Date | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fromSearchOpen, setFromSearchOpen] = useState(false);
  const [toSearchOpen, setToSearchOpen] = useState(false);

  const totalPassengers = adults + children + infants;

  const passengerSummary = useMemo(() => {
    const word = totalPassengers === 1 ? "مسافر" : "مسافرين";
    return `${totalPassengers} ${word} / ${cabinClassLabel[cabinClass]}`;
  }, [totalPassengers, cabinClass]);

  const swapCities = () => {
    setFromCity(toCity);
    setFromCode(toCode);
    setToCity(fromCity);
    setToCode(fromCode);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSearch = () => {
    if (!toCity || !toCode) {
      toast({ title: "اختر الوجهة", description: "يرجى اختيار مدينة الوصول", variant: "destructive" });
      return;
    }
    if (!departDate) {
      toast({ title: "اختر التاريخ", description: "يرجى تحديد تاريخ المغادرة", variant: "destructive" });
      return;
    }

    // Save recent search
    saveRecentSearch({
      from: fromCity,
      fromCode,
      to: toCity,
      toCode,
      date: format(departDate, "d MMM yyyy", { locale: ar }),
    });

    navigate("/flights", {
      state: {
        origin: fromCode,
        destination: toCode,
        originName: fromCity,
        destinationName: toCity,
        departure_date: format(departDate, "yyyy-MM-dd"),
        return_date: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
        passengers: { adults, children, infants },
        cabin_class: cabinClass,
      },
    });
  };

  const handleQuickRoute = (route: typeof quickRoutes[0]) => {
    setFromCity(route.from);
    setFromCode(route.fromCode);
    setToCity(route.to);
    setToCode(route.toCode);
  };

  const passengerSheetContent = (
    <PassengerSheetContent
      adults={adults} setAdults={setAdults}
      children={children} setChildren={setChildren}
      infants={infants} setInfants={setInfants}
      cabinClass={cabinClass} setCabinClass={setCabinClass}
      onConfirm={() => setSheetOpen(false)}
    />
  );

  const passengerTrigger = (
    <button className="w-full flex items-center gap-2.5 bg-secondary rounded-xl px-3.5 lg:px-4 py-3 lg:py-3.5 border border-border hover:border-primary/30 transition-colors text-start">
      <Users className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] lg:text-xs text-muted-foreground">المسافرون والدرجة</p>
        <p className="text-sm font-bold text-foreground truncate">{passengerSummary}</p>
      </div>
      <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 lg:space-y-5">
      {/* Trip Type Selector */}
      <div className="flex bg-secondary/80 rounded-xl p-0.5 border border-border/50 lg:max-w-xl w-full">
        {tripTypes.map((t) => {
          const isActive = tripType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTripType(t.id)}
              className={cn(
                "flex-1 py-2 lg:py-2.5 px-1.5 lg:px-4 rounded-[10px] text-[9px] sm:text-[11px] lg:text-[13px] font-bold transition-all duration-200 relative",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-center gap-0.5 sm:gap-1">
                {tripTypeIcons[t.id]}
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop: horizontal row | Mobile: stacked */}
      <div className="flex flex-col lg:flex-row lg:gap-3 lg:items-end gap-3">
        {/* Locations */}
        <div className="flex gap-2 items-center lg:flex-1">
          <button
            onClick={() => setFromSearchOpen(true)}
            className="flex-1 flex items-center gap-2.5 bg-secondary rounded-xl px-3.5 lg:px-4 py-3 lg:py-3.5 border border-border hover:border-primary/30 transition-colors text-start"
          >
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] lg:text-xs text-muted-foreground">المغادرة من</p>
              <p className={cn("text-sm font-bold truncate", fromCity ? "text-foreground" : "text-muted-foreground")}>
                {fromCity || "اختر المدينة"}
              </p>
              {fromCode && <p className="text-[10px] text-muted-foreground" dir="ltr">{fromCode}</p>}
            </div>
          </button>
          <button
            onClick={swapCities}
            className="w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm active:scale-90 hover:scale-110 transition-transform"
          >
            <ArrowLeftRight className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
          </button>
          <button
            onClick={() => setToSearchOpen(true)}
            className="flex-1 flex items-center gap-2.5 bg-secondary rounded-xl px-3.5 lg:px-4 py-3 lg:py-3.5 border border-border hover:border-primary/30 transition-colors text-start"
          >
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] lg:text-xs text-muted-foreground">الوجهة إلى</p>
              <p className={cn("text-sm truncate", toCity ? "font-bold text-foreground" : "text-muted-foreground")}>
                {toCity || "إلى أين؟"}
              </p>
              {toCode && <p className="text-[10px] text-muted-foreground" dir="ltr">{toCode}</p>}
            </div>
          </button>
        </div>

        {/* Dates */}
        <div className="flex gap-2 lg:flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-2.5 bg-secondary rounded-xl px-3.5 lg:px-4 py-3 lg:py-3.5 border border-border hover:border-primary/30 transition-colors text-start">
                <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">تاريخ المغادرة</p>
                  <p className={cn("text-sm", departDate ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {departDate ? format(departDate, "d MMM yyyy", { locale: ar }) : "اختر التاريخ"}
                  </p>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={departDate}
                onSelect={setDepartDate}
                disabled={(date) => date < today}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <AnimatePresence mode="wait">
            {tripType === "round-trip" ? (
              <motion.div
                key="return-date"
                initial={{ opacity: 0, width: 0, scale: 0.95 }}
                animate={{ opacity: 1, width: "100%", scale: 1 }}
                exit={{ opacity: 0, width: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex-1 overflow-hidden"
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-2.5 bg-secondary rounded-xl px-3.5 lg:px-4 py-3 lg:py-3.5 border border-border hover:border-primary/30 transition-colors text-start">
                      <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={2} />
                      <div>
                        <p className="text-[10px] lg:text-xs text-muted-foreground">تاريخ العودة</p>
                        <p className={cn("text-sm", returnDate ? "font-bold text-foreground" : "text-muted-foreground")}>
                          {returnDate ? format(returnDate, "d MMM yyyy", { locale: ar }) : "اختر التاريخ"}
                        </p>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={setReturnDate}
                      disabled={(date) => date < (departDate || today)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </motion.div>
            ) : (
              <motion.div
                key="return-optional"
                initial={{ opacity: 0, width: 0, scale: 0.95 }}
                animate={{ opacity: 1, width: "100%", scale: 1 }}
                exit={{ opacity: 0, width: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="hidden lg:flex flex-1 overflow-hidden"
              >
                <div className="w-full flex items-center gap-2.5 bg-secondary/50 rounded-xl px-4 py-3.5 border border-border/50">
                  <CalendarDays className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" strokeWidth={2} />
                  <div>
                    <p className="text-xs text-muted-foreground/50">تاريخ العودة</p>
                    <p className="text-sm text-muted-foreground/40">اختياري</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Passengers */}
        <div className="lg:flex-1">
          {isMobile ? (
            <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
              <DrawerTrigger asChild>{passengerTrigger}</DrawerTrigger>
              <DrawerContent className="max-w-md mx-auto">{passengerSheetContent}</DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
              <DialogTrigger asChild>{passengerTrigger}</DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 border-border" aria-describedby={undefined}>
                <DialogTitle className="sr-only">المسافرون والدرجة</DialogTitle>
                {passengerSheetContent}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="btn-primary flex items-center justify-center gap-2 lg:max-w-xs lg:mx-auto lg:px-16"
      >
        <Search className="w-5 h-5" strokeWidth={2} />
        <span>بحث عن رحلات</span>
      </button>

      {/* Quick Search Routes */}
      {variant === "full" && quickRoutes.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] lg:text-xs font-bold text-muted-foreground mb-2.5">الوجهات المميزة</p>
          <div className="space-y-2 lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0">
            {quickRoutes.map((route, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleQuickRoute(route)}
                className="w-full flex items-center gap-3 bg-secondary/60 rounded-xl px-3.5 py-2.5 border border-border/50 active:scale-[0.98] hover:border-primary/20 hover:shadow-card transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plane className="w-4 h-4 text-primary" strokeWidth={1.8} />
                </div>
                <div className="flex-1 text-start">
                  <p className="text-xs font-bold text-foreground">
                    {route.from} → {route.to}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{route.date}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-primary" dir="ltr">{route.price}$</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* City Search Modals */}
      <CitySearchModal
        open={fromSearchOpen}
        onOpenChange={setFromSearchOpen}
        onSelect={(name, code) => { setFromCity(name); setFromCode(code); }}
        label="المغادرة من"
        excludeCode={toCode}
      />
      <CitySearchModal
        open={toSearchOpen}
        onOpenChange={setToSearchOpen}
        onSelect={(name, code) => { setToCity(name); setToCode(code); }}
        label="الوجهة إلى"
        excludeCode={fromCode}
      />
    </motion.div>
  );
};

export default FlightBookingModule;
