// src/components/HotelSearchModule.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Loader2, CalendarDays, Users, TrendingUp } from "lucide-react";
import { useHotelSearch, HotelRegion } from "@/hooks/useHotelSearch";

const CITY_MAP: Record<string, { cityId: number; countryId: number }> = {
  "Erbil": { cityId: 3482, countryId: 17 },
  "اربيل": { cityId: 3482, countryId: 17 },
  "أربيل": { cityId: 3482, countryId: 17 },
  "Baghdad": { cityId: 3483, countryId: 17 },
  "بغداد": { cityId: 3483, countryId: 17 },
  "Basra": { cityId: 3484, countryId: 17 },
  "البصرة": { cityId: 3484, countryId: 17 },
  "Najaf": { cityId: 3489, countryId: 17 },
  "النجف": { cityId: 3489, countryId: 17 },
  "Karbala": { cityId: 3486, countryId: 17 },
  "كربلاء": { cityId: 3486, countryId: 17 },
  "Sulaymaniyah": { cityId: 3487, countryId: 17 },
  "السليمانية": { cityId: 3487, countryId: 17 },
  "Duhok": { cityId: 3488, countryId: 17 },
  "دهوك": { cityId: 3488, countryId: 17 },
  "Dubai": { cityId: 1001, countryId: 1 }
};

const POPULAR_DESTINATIONS = [
  { name: "دبي", nameEn: "Dubai", emoji: "🇦🇪" },
  { name: "إسطنبول", nameEn: "Istanbul", emoji: "🇹🇷" },
  { name: "لندن", nameEn: "London", emoji: "🇬🇧" },
  { name: "باريس", nameEn: "Paris", emoji: "🇫🇷" },
  { name: "القاهرة", nameEn: "Cairo", emoji: "🇪🇬" },
  { name: "كوالالمبور", nameEn: "Kuala Lumpur", emoji: "🇲🇾" },
];

export interface HotelSearchModuleProps {
  onSearch: (regionId: string, checkin: string, checkout: string, adults: number, cityName: string) => void;
  loading?: boolean;
  defaultCity?: string;
  defaultRegion?: HotelRegion | null;
  defaultCheckin?: string;
  defaultCheckout?: string;
  defaultAdults?: number;
}

export default function HotelSearchModule({ 
  onSearch, 
  loading = false,
  defaultCity = "",
  defaultRegion = null,
  defaultCheckin = "",
  defaultCheckout = "",
  defaultAdults = 2
}: HotelSearchModuleProps) {
  const { regions, regionsLoading, searchRegions } = useHotelSearch();
  const today = new Date();
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const dayAfterDate = new Date(today);
  dayAfterDate.setDate(today.getDate() + 2);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const [city, setCity] = useState(defaultCity);
  const [selectedRegion, setSelectedRegion] = useState<HotelRegion | null>(defaultRegion);
  const [checkin, setCheckin] = useState(defaultCheckin || formatDate(tomorrowDate));
  const [checkout, setCheckout] = useState(defaultCheckout || formatDate(dayAfterDate));
  const [adults, setAdults] = useState(defaultAdults);
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
    if (regions.length > 0 && !selectedRegion && city.length >= 2) {
      setShowDropdown(true);
    }
  }, [regions, selectedRegion, city.length]);

  const handleCityInput = (val: string) => {
    setCity(val);
    setSelectedRegion(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchRegions(val);
      }, 400);
    } else {
      setShowDropdown(false);
    }
  };

  const selectRegion = (r: HotelRegion) => {
    setSelectedRegion(r);
    setCity(r.regionNames.primaryDisplayName);
    setShowDropdown(false);
  };

  const handleQuickPick = (dest: typeof POPULAR_DESTINATIONS[0]) => {
    setCity(dest.name);
    setSelectedRegion(null);
    searchRegions(dest.nameEn);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city && checkin && checkout) {
      const cityData = Object.entries(CITY_MAP).find(
        ([key]) => key.toLowerCase() === city.toLowerCase()
      )?.[1];

      const regionId = selectedRegion?.gaiaId || cityData?.cityId?.toString() || "";
      onSearch(regionId, checkin, checkout, adults, city);
    }
  };

  const minCheckin = formatDate(tomorrowDate);

  return (
    <div className="mb-0">
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-4 md:p-5 border border-border/50 shadow-card">
        {/* City input */}
        <div className="relative mb-3" ref={dropdownRef}>
          <label htmlFor="hotel-destination" className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {"الوجهة"}
          </label>
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3.5 py-3 border border-border focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Search className="w-4 h-4 text-primary shrink-0" />
            <input
              type="text"
              id="hotel-destination"
              name="destination"
              value={city}
              onChange={(e) => handleCityInput(e.target.value)}
              onFocus={() => regions.length > 0 && !selectedRegion && setShowDropdown(true)}
              placeholder="ابحث عن مدينة أو منطقة..."
              className="bg-transparent text-sm text-foreground w-full outline-none placeholder:text-muted-foreground"
              required
            />
            {regionsLoading && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
            {selectedRegion && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">{"✓"}</span>
            )}
          </div>
          <AnimatePresence>
            {showDropdown && regions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto"
              >
                {regions.filter((r) => r.gaiaId).map((r, idx) => (
                  <button
                    key={r.gaiaId || `region-${idx}`}
                    type="button"
                    onClick={() => selectRegion(r)}
                    className="w-full text-start px-4 py-2.5 hover:bg-secondary transition-colors flex items-start gap-2.5 border-b border-border/20 last:border-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r?.regionNames?.primaryDisplayName || ""}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r?.regionNames?.secondaryDisplayName || ""}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">
                      {r.type === 'CITY' ? "مدينة" : r.type === 'NEIGHBORHOOD' ? "حي" : r.type === 'AIRPORT' ? "مطار" : r.type === 'MULTIREGION' ? "منطقة" : r.type}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dates & adults row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label htmlFor="hotel-checkin" className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> {"الوصول"}
            </label>
            <div className="flex items-center bg-secondary rounded-xl px-3 py-2.5 border border-border focus-within:border-primary/40 transition-all">
               <input
                type="date"
                id="hotel-checkin"
                name="checkin"
                value={checkin}
                min={minCheckin}
                onChange={(e) => {
                  setCheckin(e.target.value);
                  if (!checkout || e.target.value >= checkout) {
                    const next = new Date(e.target.value);
                    next.setDate(next.getDate() + 1);
                    setCheckout(next.toISOString().split('T')[0]);
                  }
                }}
                className="bg-transparent text-xs text-foreground w-full outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="hotel-checkout" className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> {"المغادرة"}
            </label>
            <div className="flex items-center bg-secondary rounded-xl px-3 py-2.5 border border-border focus-within:border-primary/40 transition-all">
              <input
                type="date"
                id="hotel-checkout"
                name="checkout"
                value={checkout}
                min={checkin || minCheckin}
                onChange={(e) => setCheckout(e.target.value)}
                className="bg-transparent text-xs text-foreground w-full outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="hotel-guests" className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" /> {"الضيوف"}
            </label>
            <div className="flex items-center bg-secondary rounded-xl px-3 py-2.5 border border-border">
              <select
                id="hotel-guests"
                name="guests"
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="bg-transparent text-xs text-foreground w-full outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? "بالغ" : "بالغين"}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search button */}
        <button
          type="submit"
          disabled={loading || !city || !checkin || !checkout}
          className="w-full gradient-purple-vibrant text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:opacity-90 transition-opacity shadow-sm disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "جاري البحث..." : "البحث عن فنادق"}
        </button>
      </form>

      {/* Popular destinations - show only when no search done */}
      {!loading && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {"وجهات شائعة"}
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_DESTINATIONS.map((dest) => (
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
}
