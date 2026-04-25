import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Search, Loader2, CalendarDays, MapPin, Car, Clock,
  Users, Fuel, Wind, Briefcase, TrendingUp, CheckCircle2
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCarSearch, CarResult, CarDestination } from "@/hooks/useCarSearch";
import { useState, useEffect, useRef } from "react";

const POPULAR_LOCATIONS = [
  { name: "دبي", nameEn: "Dubai", emoji: "🇦🇪" },
  { name: "إسطنبول", nameEn: "Istanbul", emoji: "🇹🇷" },
  { name: "لندن", nameEn: "London", emoji: "🇬🇧" },
  { name: "باريس", nameEn: "Paris", emoji: "🇫🇷" },
  { name: "القاهرة", nameEn: "Cairo", emoji: "🇪🇬" },
];

// ─── Car Card ───
const CarCard = ({ car, i }: { car: CarResult; i: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
    className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 group hover:shadow-card-hover hover:border-primary/20 transition-all duration-300"
  >
    <div className="relative w-full h-40 lg:h-48 bg-gradient-to-br from-primary/10 via-secondary to-accent/10 overflow-hidden flex items-center justify-center">
      {car.imageUrl ? (
        <img src={car.imageUrl} alt={car.vehicleName} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
      ) : (
        <Car className="w-16 h-16 text-primary/20" />
      )}
      {car.freeCancellation && (
        <div className="absolute top-2.5 start-2.5 flex items-center gap-1 bg-success/10 backdrop-blur-sm rounded-full px-2 py-0.5 border border-success/20">
          <CheckCircle2 className="w-3 h-3 text-success" />
          <span className="text-[9px] font-bold text-success">إلغاء مجاني</span>
        </div>
      )}
      {car.supplier && (
        <div className="absolute bottom-2.5 end-2.5 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-border/50">
          {car.supplierLogo && <img src={car.supplierLogo} alt={car.supplier} className="w-4 h-4 rounded" />}
          <span className="text-[10px] font-medium text-foreground">{car.supplier}</span>
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">{car.vehicleName}</h3>
      {car.vehicleGroup && (
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full mt-1 inline-block">{car.vehicleGroup}</span>
      )}
      <div className="flex flex-wrap gap-2 mt-2.5">
        {car.seats && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="w-3 h-3" /> {car.seats}
          </div>
        )}
        {car.transmission && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Car className="w-3 h-3" /> {car.transmission === 'Automatic' ? 'أوتوماتيك' : car.transmission === 'Manual' ? 'يدوي' : car.transmission}
          </div>
        )}
        {car.airConditioning && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Wind className="w-3 h-3" /> تكييف
          </div>
        )}
        {car.bags && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Briefcase className="w-3 h-3" /> {car.bags}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
        {car.priceFormatted ? (
          <p className="text-lg font-bold text-primary">{car.priceFormatted}</p>
        ) : (
          <p className="text-xs text-muted-foreground">السعر غير متاح</p>
        )}
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">للفترة</span>
      </div>
    </div>
  </motion.div>
);

// ─── Search Form ───
const CarSearchForm = ({
  onSearch,
  loading,
  destinations,
  destinationsLoading,
  onLocationSearch,
}: {
  onSearch: (dest: CarDestination, pickupDate: string, dropoffDate: string, pickupTime: string, dropoffTime: string) => void;
  loading: boolean;
  destinations: CarDestination[];
  destinationsLoading: boolean;
  onLocationSearch: (q: string) => void;
}) => {
  const [location, setLocation] = useState("");
  const [selectedDest, setSelectedDest] = useState<CarDestination | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffTime, setDropoffTime] = useState("10:00");
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (destinations.length > 0 && !selectedDest && location.length >= 2) {
      setShowDropdown(true);
    }
  }, [destinations]);

  const handleInput = (val: string) => {
    setLocation(val);
    setSelectedDest(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => onLocationSearch(val), 400);
    } else {
      setShowDropdown(false);
    }
  };

  const selectDest = (d: CarDestination) => {
    setSelectedDest(d);
    setLocation(d.name || d.label);
    setShowDropdown(false);
  };

  const handleQuickPick = (dest: typeof POPULAR_LOCATIONS[0]) => {
    setLocation(dest.name);
    setSelectedDest(null);
    onLocationSearch(dest.nameEn);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDest && pickupDate && dropoffDate) {
      onSearch(selectedDest, pickupDate, dropoffDate, pickupTime, dropoffTime);
    }
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const validDestinations = destinations.filter(d => d.coordinates);

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-4 md:p-5 border border-border/50 shadow-card">
        {/* Location input */}
        <div className="relative mb-3" ref={dropdownRef}>
          <label className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> موقع الاستلام
          </label>
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3.5 py-3 border border-border focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => validDestinations.length > 0 && !selectedDest && setShowDropdown(true)}
              placeholder="ابحث عن مدينة أو مطار..."
              className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground"
              required
            />
            {destinationsLoading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
            {selectedDest && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">✓</span>
            )}
          </div>
          <AnimatePresence>
            {showDropdown && validDestinations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto"
              >
                {validDestinations.map((d, idx) => (
                  <button
                    key={d.id || `dest-${idx}`}
                    type="button"
                    onClick={() => selectDest(d)}
                    className="w-full text-start px-4 py-2.5 hover:bg-secondary transition-colors flex items-start gap-2.5 border-b border-border/20 last:border-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.name || d.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{d.country}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dates row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> تاريخ الاستلام
            </label>
            <div className="bg-secondary rounded-xl px-3 py-2.5 border border-border focus-within:border-primary/40 transition-all">
              <input
                type="date"
                value={pickupDate}
                min={minDate}
                onChange={(e) => {
                  setPickupDate(e.target.value);
                  if (!dropoffDate || e.target.value >= dropoffDate) {
                    const next = new Date(e.target.value);
                    next.setDate(next.getDate() + 3);
                    setDropoffDate(next.toISOString().split('T')[0]);
                  }
                }}
                className="bg-transparent text-xs text-foreground w-full outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> تاريخ التسليم
            </label>
            <div className="bg-secondary rounded-xl px-3 py-2.5 border border-border focus-within:border-primary/40 transition-all">
              <input
                type="date"
                value={dropoffDate}
                min={pickupDate || minDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                className="bg-transparent text-xs text-foreground w-full outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Times row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> وقت الاستلام
            </label>
            <div className="bg-secondary rounded-xl px-3 py-2.5 border border-border">
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="bg-transparent text-xs text-foreground w-full outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> وقت التسليم
            </label>
            <div className="bg-secondary rounded-xl px-3 py-2.5 border border-border">
              <input
                type="time"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                className="bg-transparent text-xs text-foreground w-full outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedDest || !pickupDate || !dropoffDate}
          className="w-full gradient-purple-vibrant text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري البحث...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              البحث عن سيارات
            </>
          )}
        </button>
      </form>

      {!loading && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> مواقع شائعة
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_LOCATIONS.map((dest) => (
              <button
                key={dest.nameEn}
                type="button"
                onClick={() => handleQuickPick(dest)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border/50 hover:border-primary/30 hover:bg-primary/5 text-xs font-medium text-foreground transition-all"
              >
                <span>{dest.emoji}</span>
                <span>{dest.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Results Section ───
const CarResults = ({ cars, loading, error, searched }: {
  cars: CarResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
}) => (
  <>
    {loading && (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <Car className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">جاري البحث عن أفضل السيارات...</p>
        <p className="text-muted-foreground/60 text-[11px]">قد يستغرق الأمر بضع ثوان</p>
      </div>
    )}

    {error && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 text-center"
      >
        <p className="text-destructive font-bold text-sm mb-1">حدث خطأ</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </motion.div>
    )}

    {!loading && !error && cars.length === 0 && searched && (
      <div className="text-center py-16">
        <Car className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium text-sm">لم يتم العثور على سيارات</p>
        <p className="text-muted-foreground/60 text-xs mt-1">جرب تغيير التواريخ أو الموقع</p>
      </div>
    )}

    {!loading && cars.length > 0 && (
      <>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            تم العثور على <span className="text-primary font-bold">{cars.length}</span> سيارة
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {cars.map((car, i) => (
            <CarCard key={car.id} car={car} i={i} />
          ))}
        </div>
      </>
    )}
  </>
);

// ─── Main Page ───
const CarRentals = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { cars, destinations, loading, destinationsLoading, error, searchDestinations, searchCars } = useCarSearch();
  const [searched, setSearched] = useState(false);

  const handleSearch = async (dest: CarDestination, pickupDate: string, dropoffDate: string, pickupTime: string, dropoffTime: string) => {
    if (!dest.coordinates) return;
    setSearched(true);
    await searchCars({
      pick_up_latitude: dest.coordinates.latitude,
      pick_up_longitude: dest.coordinates.longitude,
      drop_off_latitude: dest.coordinates.latitude,
      drop_off_longitude: dest.coordinates.longitude,
      pick_up_date: pickupDate,
      drop_off_date: dropoffDate,
      pick_up_time: pickupTime,
      drop_off_time: dropoffTime,
    });
  };

  const formProps = {
    onSearch: handleSearch,
    loading,
    destinations,
    destinationsLoading,
    onLocationSearch: searchDestinations,
  };

  const resultsProps = { cars, loading, error, searched };

  if (isMobile === undefined) return null;

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title="تأجير السيارات"
        subtitle="قارن أسعار تأجير السيارات من أفضل الشركات"
        heroImage="https://images.unsplash.com/photo-1449965408869-ebd3fee0cbb7?w=1400&h=300&fit=crop"
      >
        <CarSearchForm {...formProps} />
        <CarResults {...resultsProps} />
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-background pb-24">
      <div className="px-5 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center border border-border">
            <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={2} />
          </button>
          <h1 className="text-foreground font-bold text-lg">تأجير السيارات</h1>
          <div className="w-9" />
        </div>
      </div>
      <div className="px-5 mt-3">
        <CarSearchForm {...formProps} />
        <CarResults {...resultsProps} />
      </div>
      <BottomNav />
    </div>
  );
};

export default CarRentals;
