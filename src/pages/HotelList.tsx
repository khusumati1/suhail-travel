import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  MapPin, 
  Filter, 
  Search, 
  Building2, 
  Loader2, 
  Pencil,
  ArrowUpDown,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';
import { apiService } from '@/services/apiService';
import HotelCard from '@/components/HotelCard';
import FilterSidebar from '@/components/FilterSidebar';
import BottomNav from '@/components/BottomNav';
import { HotelOffer } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  "Dubai": { cityId: 1001, countryId: 1 },
};

const HotelList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [originalHotels, setOriginalHotels] = useState<HotelOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort State
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating_desc'>('rating_desc');
  const [filters, setFilters] = useState({
    searchQuery: '',
    priceRange: [0, 2000000] as [number, number],
    selectedStars: [] as number[],
  });

  const searchParams = location.state as {
    cityName?: string;
    cityId?: number;
    regionId?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
  };

  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    try {
      const cityName = searchParams?.cityName || 'Erbil';
      const cityData = Object.entries(CITY_MAP).find(
        ([key]) => key.toLowerCase() === cityName.toLowerCase()
      )?.[1];

      const cityId = searchParams?.cityId ||
                     (searchParams?.regionId ? parseInt(searchParams.regionId) : null) ||
                     cityData?.cityId ||
                     null;
      const countryId = cityData?.countryId || 17;

      const result = await apiService.searchHotels({
        city: cityName,
        cityId: cityId,
        countryId: countryId,
        checkIn: searchParams?.checkIn || '2026-05-10',
        checkOut: searchParams?.checkOut || '2026-05-15',
        adults: searchParams?.adults || 2
      });

      if (!result.success) {
        setError(result.errorMessage || 'تعذر جلب نتائج الفنادق حالياً.');
        setOriginalHotels([]);
      } else {
        setOriginalHotels(result.data);
        // Initialize price range based on actual data
        const prices = result.data.map((h: any) => parseInt(h.price.replace(/,/g, ''))).filter((p: any) => !isNaN(p));
        if (prices.length > 0) {
          setFilters(prev => ({ ...prev, priceRange: [Math.min(...prices), Math.max(...prices)] }));
        }
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [location.state]);

  const filteredHotels = useMemo(() => {
    let result = [...originalHotels];

    // Apply Name Search
    if (filters.searchQuery) {
      result = result.filter(h => 
        h.name.toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }

    // Apply Price Range
    result = result.filter(h => {
      const p = parseInt(h.price.replace(/,/g, ''));
      return p >= filters.priceRange[0] && p <= filters.priceRange[1];
    });

    // Apply Star Rating
    if (filters.selectedStars.length > 0) {
      result = result.filter(h => filters.selectedStars.includes(h.stars));
    }

    // Apply Sorting
    result.sort((a, b) => {
      const priceA = parseInt(a.price.replace(/,/g, ''));
      const priceB = parseInt(b.price.replace(/,/g, ''));
      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      if (sortBy === 'rating_desc') return b.rating - a.rating;
      return 0;
    });

    return result;
  }, [originalHotels, filters, sortBy]);

  const clearFilters = () => {
    const prices = originalHotels.map(h => parseInt(h.price.replace(/,/g, ''))).filter(p => !isNaN(p));
    setFilters({
      searchQuery: '',
      priceRange: [Math.min(...prices), Math.max(...prices)] as [number, number],
      selectedStars: [],
    });
  };

  const cityName = searchParams?.cityName || 'اربيل';
  const guests = searchParams?.adults || 2;

  const sortLabels = {
    'price_asc': 'الأقل سعراً',
    'price_desc': 'الأعلى سعراً',
    'rating_desc': 'الأعلى تقييماً',
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32" dir="rtl">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-border/40 px-6 h-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-secondary/80 hover:bg-secondary transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight">{cityName}</h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px]">
                {guests} بالغين
              </Badge>
            </div>
            <div className="flex items-center gap-1 mt-0.5 opacity-60">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"> {searchParams?.checkIn} - {searchParams?.checkOut}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')} 
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-secondary/80 hover:bg-secondary transition-colors"
        >
          <Pencil className="w-5 h-5 text-primary" />
        </button>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-80 shrink-0 sticky top-28 self-start bg-card rounded-[32px] p-6 border border-border/40 shadow-sm">
             <FilterSidebar 
               originalHotels={originalHotels} 
               filters={filters} 
               setFilters={setFilters} 
               onClear={clearFilters}
             />
          </aside>

          {/* Main Results Area */}
          <div className="flex-1">
            {/* Top Bar: Sort & Summary */}
            {!loading && originalHotels.length > 0 && (
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
                <div>
                  <h2 className="text-2xl font-black">{filteredHotels.length} فندق متاح</h2>
                  <p className="text-sm font-bold text-muted-foreground opacity-70">نقارن لك أفضل الأسعار في {cityName}</p>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-12 px-6 rounded-2xl border-border/40 bg-white font-black text-xs flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-primary" />
                        ترتيب حسب: {sortLabels[sortBy]}
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[200px]">
                      <DropdownMenuItem onClick={() => setSortBy('rating_desc')} className="rounded-xl font-bold py-3">الأعلى تقييماً</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('price_asc')} className="rounded-xl font-bold py-3">الأقل سعراً</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('price_desc')} className="rounded-xl font-bold py-3">الأعلى سعراً</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {/* Content States */}
            <div className="space-y-4">
              {loading ? (
                // Premium Skeleton Loaders
                [...Array(5)].map((_, i) => (
                  <div key={i} className="bg-card rounded-[32px] overflow-hidden border border-border/40 p-5 flex flex-col md:flex-row gap-6 h-auto md:h-56">
                    <div className="flex-1 space-y-4 order-2 md:order-1">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-6 w-2/3 rounded-full" />
                        <Skeleton className="h-4 w-1/2 rounded-full" />
                      </div>
                      <div className="flex justify-between items-end pt-4">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-20 rounded-full" />
                          <Skeleton className="h-8 w-32 rounded-full" />
                        </div>
                        <Skeleton className="h-11 w-32 rounded-2xl" />
                      </div>
                    </div>
                    <Skeleton className="w-full md:w-72 h-56 md:h-full rounded-3xl order-1 md:order-2" />
                  </div>
                ))
              ) : error ? (
                <div className="py-24 text-center bg-card rounded-[40px] border border-border/40 space-y-6">
                   <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                      <Search className="w-12 h-12 opacity-50" />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-xl font-black">عذراً، حدث خطأ ما</h3>
                     <p className="text-sm font-bold text-muted-foreground">{error}</p>
                   </div>
                   <Button onClick={fetchHotels} variant="outline" className="rounded-2xl px-8 h-12 font-black">إعادة المحاولة</Button>
                </div>
              ) : filteredHotels.length === 0 ? (
                <div className="py-24 text-center bg-card rounded-[40px] border border-border/40 space-y-6">
                   <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary">
                      <LayoutGrid className="w-12 h-12 opacity-20" />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-xl font-black">لا توجد نتائج تطابق بحثك</h3>
                     <p className="text-sm font-bold text-muted-foreground">جرب تغيير معايير التصفية أو مسح الكل</p>
                   </div>
                   <Button onClick={clearFilters} variant="default" className="rounded-2xl px-10 h-12 font-black shadow-lg shadow-primary/20">مسح كافة الفلاتر</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredHotels.map((hotel, index) => (
                      <HotelCard 
                        key={hotel.hotelId} 
                        hotel={hotel} 
                        index={index} 
                        onClick={() => navigate(`/hotel/${hotel.hotelId}`, { 
                          state: { 
                            hotel,
                            cityName: hotel.location || searchParams?.cityName,
                            checkIn: searchParams?.checkIn,
                            checkOut: searchParams?.checkOut,
                            adultsCount: searchParams?.adults
                          } 
                        })}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Floating Filter Trigger */}
      {!loading && originalHotels.length > 0 && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 lg:hidden">
           <Sheet>
             <SheetTrigger asChild>
               <button className="h-16 px-10 bg-black text-white rounded-full flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] active:scale-95 transition-all border border-white/10">
                  <Filter className="w-6 h-6" />
                  <span className="text-sm font-black tracking-widest uppercase">تصفية النتائج</span>
                  { (filters.selectedStars.length > 0 || filters.searchQuery) && (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full ring-4 ring-primary/20" />
                  )}
               </button>
             </SheetTrigger>
             <SheetContent side="bottom" className="rounded-t-[40px] px-6 pb-12 pt-8 h-[85vh] border-none shadow-2xl overflow-y-auto">
                <SheetHeader className="mb-6">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-right font-black text-xl">تصفية النتائج</SheetTitle>
                    { (filters.selectedStars.length > 0 || filters.searchQuery) && (
                      <button onClick={clearFilters} className="text-xs font-bold text-primary">مسح الكل</button>
                    )}
                  </div>
                  <SheetDescription className="text-right text-xs">
                    استخدم معايير التصفية أدناه لتضييق نطاق البحث والعثور على الفندق المثالي.
                  </SheetDescription>
                </SheetHeader>

                <FilterSidebar 
                  originalHotels={originalHotels} 
                  filters={filters} 
                  setFilters={setFilters} 
                  onClear={clearFilters}
                />
             </SheetContent>
           </Sheet>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default HotelList;
