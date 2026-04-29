import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Filter, Star, Clock, Plane } from 'lucide-react';

interface FlightFiltersProps {
  onFilterChange?: (filters: any) => void;
}

const FlightFilters: React.FC<FlightFiltersProps> = () => {
  return (
    <div className="space-y-8 bg-card/50 backdrop-blur-xl border border-border/40 p-6 rounded-[32px] sticky top-28">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Filter className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-black tracking-tight">تصفية النتائج</h2>
      </div>

      {/* Stops Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Plane className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-widest">عدد التوقفات</h3>
        </div>
        <div className="space-y-3">
          {[
            { id: 'direct', label: 'رحلة مباشرة', count: 12 },
            { id: '1stop', label: 'توقف واحد', count: 8 },
            { id: '2stops', label: 'توقفين أو أكثر', count: 3 },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Checkbox id={item.id} className="rounded-md border-border/60 data-[state=checked]:bg-primary" />
                <Label htmlFor={item.id} className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors">
                  {item.label}
                </Label>
              </div>
              <span className="text-[10px] font-black bg-secondary px-2 py-1 rounded-md text-muted-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Price Range */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Star className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-widest">الميزانية</h3>
          </div>
          <span className="text-xs font-black text-primary">$1,200</span>
        </div>
        <Slider defaultValue={[1200]} max={5000} step={100} className="py-4" />
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>$100</span>
          <span>$5,000+</span>
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Time Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Clock className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-widest">وقت الإقلاع</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'صباحاً', time: '06:00 - 12:00' },
            { label: 'ظهراً', time: '12:00 - 18:00' },
            { label: 'مساءً', time: '18:00 - 00:00' },
            { label: 'فجراً', time: '00:00 - 06:00' },
          ].map((period) => (
            <button key={period.label} className="p-3 rounded-2xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all text-right group">
              <p className="text-xs font-bold group-hover:text-primary transition-colors">{period.label}</p>
              <p className="text-[9px] text-muted-foreground font-medium mt-1">{period.time}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <button className="w-full py-4 rounded-2xl bg-secondary text-foreground text-xs font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-primary-foreground transition-all">
        إعادة ضبط الكل
      </button>
    </div>
  );
};

export default FlightFilters;
