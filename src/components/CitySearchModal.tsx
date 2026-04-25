import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Plane, Clock, X, Loader2 } from "lucide-react";
import { usePlaceSearch, Place, getRecentSearches, RecentSearch } from "@/hooks/usePlaceSearch";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface CitySearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (name: string, iataCode: string) => void;
  label: string;
  excludeCode?: string;
}

const popularCities = [
  { name: "دبي", code: "DXB", country: "الإمارات" },
  { name: "إسطنبول", code: "IST", country: "تركيا" },
  { name: "بيروت", code: "BEY", country: "لبنان" },
  { name: "عمّان", code: "AMM", country: "الأردن" },
  { name: "القاهرة", code: "CAI", country: "مصر" },
  { name: "الدوحة", code: "DOH", country: "قطر" },
  { name: "بغداد", code: "BGW", country: "العراق" },
  { name: "أربيل", code: "EBL", country: "العراق" },
];

function CitySearchContent({ onSelect, label, excludeCode, onClose }: {
  onSelect: (name: string, code: string) => void;
  label: string;
  excludeCode?: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { places, loading, searchPlaces } = usePlaceSearch();
  const [recentSearches] = useState<RecentSearch[]>(getRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    searchPlaces(query);
  }, [query, searchPlaces]);

  const handleSelect = (name: string, code: string) => {
    onSelect(name, code);
    onClose();
  };

  const filteredPopular = popularCities.filter((c) => c.code !== excludeCode);

  return (
    <div className="flex flex-col h-full max-h-[80vh] lg:max-h-[60vh]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="w-12 h-1.5 rounded-full bg-border mx-auto mb-4 lg:hidden" />
        <h3 className="font-bold text-lg text-foreground mb-4">{label}</h3>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مدينة أو مطار..."
            className="w-full bg-secondary rounded-xl px-10 py-3 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            dir="rtl"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {/* Duffel results */}
        {!loading && query.length >= 2 && places.length > 0 && (
          <div className="space-y-1">
            {places.map((place, i) => (
              <motion.button
                key={place.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleSelect(place.city_name || place.name, place.iata_code)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors text-start"
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  place.type === "airport" ? "bg-primary/10" : "bg-accent/10"
                )}>
                  {place.type === "airport" ? (
                    <Plane className="w-4 h-4 text-primary" />
                  ) : (
                    <MapPin className="w-4 h-4 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {place.name}
                    {place.iata_code && (
                      <span className="text-muted-foreground font-medium mr-1" dir="ltr">
                        ({place.iata_code})
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {place.city_name}{place.country_name ? ` · ${place.country_name}` : ""}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && places.length === 0 && (
          <div className="text-center py-8">
            <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لم يتم العثور على نتائج</p>
          </div>
        )}

        {/* Default state: recent + popular */}
        {query.length < 2 && (
          <>
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  عمليات البحث الأخيرة
                </p>
                <div className="space-y-1">
                  {recentSearches.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(
                        label.includes("المغادرة") ? s.from : s.to,
                        label.includes("المغادرة") ? s.fromCode : s.toCode
                      )}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-start"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {s.from} → {s.to}
                        </p>
                        {s.date && <p className="text-[10px] text-muted-foreground">{s.date}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular cities */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Plane className="w-3 h-3" />
                المدن الشائعة
              </p>
              <div className="grid grid-cols-2 gap-2">
                {filteredPopular.map((city) => (
                  <button
                    key={city.code}
                    onClick={() => handleSelect(city.name, city.code)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border/50 hover:border-primary/20 hover:bg-secondary transition-all text-start"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{city.name}</p>
                      <p className="text-[10px] text-muted-foreground" dir="ltr">{city.code} · {city.country}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CitySearchModal({ open, onOpenChange, onSelect, label, excludeCode }: CitySearchProps) {
  const isMobile = useIsMobile();

  const content = (
    <CitySearchContent
      onSelect={onSelect}
      label={label}
      excludeCode={excludeCode}
      onClose={() => onOpenChange(false)}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-w-md mx-auto max-h-[85vh]">
          <DrawerTitle className="sr-only">{label}</DrawerTitle>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 border-border overflow-hidden" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{label}</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
}
