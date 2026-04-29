import React from 'react';
import { Search, Star, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HotelOffer } from '@/types';

interface FilterSidebarProps {
  originalHotels: HotelOffer[];
  filters: {
    searchQuery: string;
    priceRange: [number, number];
    selectedStars: number[];
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    searchQuery: string;
    priceRange: [number, number];
    selectedStars: number[];
  }>>;
  onClear: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  originalHotels,
  filters,
  setFilters,
  onClear
}) => {
  // Parse prices to numbers for min/max calculation
  const prices = originalHotels.map(h => parseInt(String(h.price).replace(/,/g, ''))).filter(p => !isNaN(p));
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 1000000;

  // Star counts
  const starCounts = [5, 4, 3, 2, 1].map(star => ({
    count: originalHotels.filter(h => h.stars === star).length,
    star
  }));

  const handleStarToggle = (star: number) => {
    setFilters(prev => ({
      ...prev,
      selectedStars: prev.selectedStars.includes(star)
        ? prev.selectedStars.filter(s => s !== star)
        : [...prev.selectedStars, star]
    }));
  };

  return (
    <div className="space-y-8 py-2 overflow-y-auto max-h-[80vh] lg:max-h-none no-scrollbar" dir="rtl">
      {/* Search Header for Mobile Sheet if needed */}
      <div className="flex items-center justify-between lg:hidden mb-4">
        <h2 className="text-xl font-black">تصفية النتائج</h2>
        <Button variant="ghost" size="icon" onClick={() => {}}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Property Search */}
      <div className="space-y-3">
        <Label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" /> ابحث باسم الفندق
        </Label>
        <div className="relative">
          <Input 
            placeholder="مثلاً: روتانا، شيراتون..."
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            className="bg-secondary/50 border-border/40 h-12 pr-4 pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <Label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
             السعر (د.ع)
          </Label>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[10px]">
            {filters.priceRange[0].toLocaleString()} - {filters.priceRange[1].toLocaleString()}
          </Badge>
        </div>
        <Slider
          min={minPrice}
          max={maxPrice}
          step={10000}
          value={[filters.priceRange[0], filters.priceRange[1]]}
          onValueChange={(val) => setFilters(prev => ({ ...prev, priceRange: val as [number, number] }))}
          className="py-4"
        />
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground opacity-60">
          <span>{minPrice.toLocaleString()} د.ع</span>
          <span>{maxPrice.toLocaleString()} د.ع</span>
        </div>
      </div>

      {/* Star Rating */}
      <div className="space-y-4">
        <Label className="text-sm font-black text-muted-foreground uppercase tracking-widest">تصنيف النجوم</Label>
        <div className="space-y-2">
          {starCounts.map(({ star, count }) => (
            <div 
              key={star} 
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                filters.selectedStars.includes(star) 
                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' 
                : 'bg-secondary/20 border-border/20 hover:border-border/60'
              }`}
              onClick={() => handleStarToggle(star)}
            >
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={filters.selectedStars.includes(star)}
                  onCheckedChange={() => handleStarToggle(star)}
                  className="rounded-md"
                />
                <div className="flex gap-0.5">
                  {[...Array(star)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
              </div>
              <span className="text-xs font-bold text-muted-foreground opacity-60">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <Button 
        variant="outline" 
        className="w-full h-12 rounded-2xl border-dashed border-2 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-all font-black text-xs uppercase tracking-widest"
        onClick={onClear}
      >
        مسح الكل
      </Button>
    </div>
  );
};

export default FilterSidebar;
