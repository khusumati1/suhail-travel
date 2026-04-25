import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Star, MapPin, Search,
  Loader2, Building2, Check, ArrowUpDown, ChevronLeft, ChevronRight, ImageIcon
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHotelSearch, HotelResult, HotelRegion } from "@/hooks/useHotelSearch";
import { useState, useEffect, useCallback } from "react";
import HotelSearchModule from "@/components/HotelSearchModule";
import OptimizedImage from "@/components/OptimizedImage";
import { useHotelImages } from "@/hooks/useHotelImages";
import useEmblaCarousel from "embla-carousel-react";

const SkeletonCard = () => (
  <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/40 flex flex-col md:flex-row animate-pulse">
    <div className="w-full md:w-72 h-48 md:h-full min-h-[220px] bg-secondary" />
    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
      <div>
        <div className="h-5 bg-secondary rounded w-3/4 mb-3" />
        <div className="h-3 bg-secondary rounded w-1/2 mb-2" />
        <div className="h-3 bg-secondary rounded w-1/3" />
      </div>
      <div className="flex justify-between items-end">
        <div>
          <div className="h-3 bg-secondary rounded w-16 mb-1" />
          <div className="h-6 bg-secondary rounded w-24" />
        </div>
        <div className="h-10 bg-secondary rounded w-28" />
      </div>
    </div>
  </div>
);

const HotelImageCarousel = ({ name, lat, lon, city, fallbackImage }: { name: string, lat?: number, lon?: number, city?: string, fallbackImage: string }) => {
  const { images, loading } = useHotelImages(name, lat, lon, city);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl' });
  
  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const displayImages = images.length > 0 ? images : [fallbackImage];

  if (loading) {
    return (
      <div className="w-full h-full bg-secondary animate-pulse flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group/carousel overflow-hidden" ref={emblaRef}>
      <div className="flex w-full h-full">
        {displayImages.map((src, idx) => (
          <div className="relative flex-[0_0_100%] min-w-0 w-full h-full" key={idx}>
            <OptimizedImage 
              src={src} 
              alt={`${name} - ${idx + 1}`} 
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/carousel:scale-105" 
              wrapperClassName="w-full h-full"
              onError={(e: any) => { e.currentTarget.src = fallbackImage; }}
            />
          </div>
        ))}
      </div>
      
      {displayImages.length > 1 && (
        <>
          <button 
            onClick={scrollNext} 
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all text-white z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={scrollPrev} 
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all text-white z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {displayImages.map((_, idx) => (
              <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-sm" />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const HotelCard = ({ hotel, i, searchedCity, onClick }: { hotel: HotelResult; i: number; searchedCity?: string; onClick: () => void }) => {
  const resolvedCity = hotel.city || (hotel.address as any)?.cityName || searchedCity || "";
  const { address } = useHotelImages(hotel.name, hotel.lat, hotel.lon, resolvedCity);
  const displayAddress = address || (hotel.address as any)?.cityName || hotel.neighborhood || (typeof hotel.address === 'string' ? hotel.address : undefined) || "منطقة متميزة";

  return (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(i, 8) * 0.05, ease: "easeOut" }}
    onClick={onClick}
    className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/60 hover:shadow-md hover:border-primary/40 transition-all duration-300 cursor-pointer group flex flex-col md:flex-row mb-4"
  >
    {/* Image Section */}
    <div className="relative w-full md:w-[280px] shrink-0 h-56 md:h-auto min-h-[200px] overflow-hidden group-hover:opacity-95 transition-opacity">
      <HotelImageCarousel 
        name={hotel.name} 
        lat={hotel.lat} 
        lon={hotel.lon} 
        city={resolvedCity}
        fallbackImage={hotel.propertyImage || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop"} 
      />
      <div className="absolute top-3 end-3 flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 z-10">
        <HeartIcon />
      </div>
    </div>
    
    {/* Content Section */}
    <div className="p-4 md:p-5 flex-1 flex flex-col justify-between min-w-0">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-1 mb-1.5">
            {Array.from({ length: Math.min(hotel.star || 4, 5) }).map((_, idx) => (
              <Star key={idx} className="w-3.5 h-3.5 text-accent fill-accent" />
            ))}
          </div>
          <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors leading-tight mb-2 truncate">
            {hotel.name}
          </h3>
          <div className="flex items-center gap-1.5 pt-1">
            <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
            <span title={displayAddress} className="text-sm text-muted-foreground font-medium underline decoration-dashed decoration-muted-foreground/30 underline-offset-4 truncate block">
              {displayAddress}
            </span>
          </div>
          
          <div className="hidden md:flex flex-wrap gap-2 mt-4 text-[11px] font-medium text-success bg-success/5 border border-success/20 px-2.5 py-1.5 rounded-md w-fit">
            <Check className="w-3.5 h-3.5" /> الإلغاء مجاني في معظم الغرف
          </div>
        </div>
        
        {/* Rating Block Booking style */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex gap-2 items-center">
            <div className="text-end">
              <span className="block font-bold text-sm leading-tight">
                {hotel.reviewScore >= 4.5 ? "استثنائي" : hotel.reviewScore >= 4 ? "رائع" : "جيد جداً"}
              </span>
              <span className="text-[11px] text-muted-foreground">{hotel.reviewCount} تقييم</span>
            </div>
            <div className="bg-primary text-primary-foreground font-bold rounded-t-lg rounded-br-lg rounded-bl-sm p-2 shadow-sm text-sm">
              {hotel.reviewScore}
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Section */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mt-5 pt-4 border-t border-border/40 gap-4">
        <div className="md:hidden text-[11px] font-medium text-success flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> الإلغاء مجاني
        </div>

        <div className="text-end md:ml-auto w-full md:w-auto flex flex-row justify-end items-center">
          <button className="h-10 px-8 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 transition-all shrink-0">
            شاهد الخيارات
          </button>
        </div>
      </div>
    </div>
  </motion.div>
  );
};

const HeartIcon = () => (
  <svg className="w-5 h-5 text-white stroke-2 drop-shadow-md hover:fill-red-500 hover:text-red-500 transition-colors cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)

// ─── Results Section ───
const HotelResults = ({ hotels, loading, error, searched, navigate, searchedCity }: {
  hotels: HotelResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
  navigate: ReturnType<typeof useNavigate>;
  searchedCity?: string;
}) => (
  <>
    {loading && (
      <div className="flex flex-col gap-4 py-4">
        {[1, 2, 3, 4].map(n => <SkeletonCard key={n} />)}
      </div>
    )}

    {error && (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 text-center mt-6">
        <p className="text-destructive font-bold text-sm mb-1">حدث خطأ</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )}

    {!loading && !error && hotels.length === 0 && searched && (
      <div className="text-center py-16">
        <Building2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-foreground font-bold text-base">لم نتمكن من العثور على فنادق</p>
        <p className="text-muted-foreground text-sm mt-1">يرجى تعديل وجهتك أو تواريخ السفر</p>
      </div>
    )}

    {!loading && hotels.length > 0 && (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-lg text-foreground">
            {hotels.length} مكان إقامة وجدناه لك
          </p>
          <div className="flex gap-1.5">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-xs font-bold text-foreground border border-border/50 hover:bg-primary/5 transition-all">
              <ArrowUpDown className="w-3.5 h-3.5" /> الفرز حسب
            </button>
          </div>
        </div>
        <div className="flex flex-col">
          {hotels.map((hotel, i) => (
            <HotelCard key={hotel.id} hotel={hotel} i={i} searchedCity={searchedCity} onClick={() => navigate(`/hotels/${hotel.id}`)} />
          ))}
        </div>
      </div>
    )}
  </>
);

// ─── Main Page ───
const HotelList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { hotels, loading, error, searchHotels } = useHotelSearch();
  const [searched, setSearched] = useState(false);

  const searchState = location.state as {
    regionId?: string;
    checkin?: string;
    checkout?: string;
    adults?: number;
    cityName?: string;
  } | null;

  useEffect(() => {
    if ((searchState?.regionId || searchState?.cityName) && searchState?.checkin && searchState?.checkout) {
      setSearched(true);
      searchHotels({
        regionId: searchState.regionId || "",
        checkin: searchState.checkin,
        checkout: searchState.checkout,
        adults: searchState.adults || 2,
        currency: 'USD',
        cityName: searchState.cityName,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (regionId: string, checkin: string, checkout: string, adults: number, cityName?: string) => {
    setSearched(true);
    await searchHotels({ regionId, checkin, checkout, adults, currency: 'USD', cityName });
  };

  const searchedCity = searchState?.cityName || "";
  const headerTitle = searchedCity ? `فنادق في ${searchedCity}` : "البحث عن فنادق";
  const headerSubtitle = searchedCity ? `استكشف أفضل الفنادق والعروض في ${searchedCity}` : "قارن أسعار الفنادق من مئات المواقع في مكان واحد";
  const headerImage = searchedCity ? `https://source.unsplash.com/1600x900/?${searchedCity},cityscape,skyline` : "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&h=300&fit=crop";

  const resultsProps = { hotels, loading, error, searched, navigate, searchedCity };

  if (isMobile === undefined) return null;

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title={headerTitle}
        subtitle={headerSubtitle}
        heroImage={headerImage}
      >
        <div className="max-w-[1000px] mx-auto">
          <HotelSearchModule
            onSearch={handleSearch}
            loading={loading}
            defaultCity={searchState?.cityName}
            defaultRegion={searchState?.regionId ? { gaiaId: searchState.regionId, type: "CITY", regionNames: { displayName: searchState.cityName || "", primaryDisplayName: searchState.cityName || "", secondaryDisplayName: "", shortName: "" } } : null}
            defaultCheckin={searchState?.checkin}
            defaultCheckout={searchState?.checkout}
            defaultAdults={searchState?.adults}
          />
          <HotelResults {...resultsProps} />
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-background pb-24 min-h-screen">
      <div className="px-5 pt-14 pb-2 bg-card/80 backdrop-blur-md sticky top-0 z-40 border-b border-border/50">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center border border-border">
            <ArrowRight className="w-5 h-5 text-foreground" strokeWidth={2} />
          </button>
          <div className="text-center">
            <h1 className="text-foreground font-bold text-[15px]">{searchedCity ? `فنادق في ${searchedCity}` : "البحث عن فنادق"}</h1>
            {searchedCity ? <p className="text-[11px] text-muted-foreground">{searchedCity} • {searchState?.adults || 2} بالغين</p> : null}
          </div>
          <div className="w-9" />
        </div>
      </div>
      <div className="px-4 mt-4">
        <div className="mb-6">
          <HotelSearchModule
            onSearch={handleSearch}
            loading={loading}
            defaultCity={searchState?.cityName}
            defaultRegion={searchState?.regionId ? { gaiaId: searchState.regionId, type: "CITY", regionNames: { displayName: searchState.cityName || "", primaryDisplayName: searchState.cityName || "", secondaryDisplayName: "", shortName: "" } } : null}
            defaultCheckin={searchState?.checkin}
            defaultCheckout={searchState?.checkout}
            defaultAdults={searchState?.adults}
          />
        </div>
        <HotelResults {...resultsProps} />
      </div>
      <BottomNav />
    </div>
  );
};

export default HotelList;
