import { useState } from "react";
import { useFlightTimetable, FlightInfo } from "@/hooks/useFlights";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plane, Clock, MapPin, Search, RefreshCw, 
  AlertCircle, PlaneTakeoff, PlaneLanding, Info
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function FlightTimetable() {
  const [mode, setMode] = useState<'departure' | 'arrival'>('departure');
  const { data: flights, isLoading, error, refetch, isFetching } = useFlightTimetable('AMM', mode);

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/10 text-blue-600 border-blue-200",
    active: "bg-green-500/10 text-green-600 border-green-200",
    landed: "bg-gray-500/10 text-gray-600 border-gray-200",
    cancelled: "bg-red-500/10 text-red-600 border-red-200",
    delayed: "bg-amber-500/10 text-amber-600 border-amber-200",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "مجدولة",
    active: "في الجو",
    landed: "هبطت",
    cancelled: "ملغاة",
    delayed: "متأخرة",
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plane className={cn("w-6 h-6 text-primary", mode === 'departure' ? '-rotate-45' : 'rotate-135')} />
            جدول رحلات مطار الملكة علياء (AMM)
          </h2>
          <p className="text-muted-foreground text-sm">تحديث مباشر لحالة الرحلات القادمة والمغادرة</p>
        </div>

        <div className="flex bg-secondary p-1 rounded-xl w-fit">
          <button
            onClick={() => setMode('departure')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              mode === 'departure' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            )}
          >
            <PlaneTakeoff className="w-4 h-4" />
            المغادرة
          </button>
          <button
            onClick={() => setMode('arrival')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              mode === 'arrival' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            )}
          >
            <PlaneLanding className="w-4 h-4" />
            الوصول
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-4 md:grid-cols-5 bg-secondary/30 px-6 py-4 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2 md:col-span-2">الرحلة / الخطوط</div>
          <div className="text-center">الموعد</div>
          <div className="text-center hidden md:block">الموقع</div>
          <div className="text-center">الحالة</div>
        </div>

        <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto scrollbar-hide">
          {isLoading ? (
            <LoadingSkeletons />
          ) : error ? (
            <ErrorState message={(error as any).message} onRetry={refetch} />
          ) : flights?.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence mode="popLayout">
              {flights?.map((flight, idx) => (
                <motion.div
                  key={`${flight.flight_number}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="grid grid-cols-4 md:grid-cols-5 px-6 py-5 items-center hover:bg-secondary/10 transition-colors"
                >
                  {/* Airline Info */}
                  <div className="col-span-2 md:col-span-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                      <Plane className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{flight.airline}</p>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{flight.flight_number}</p>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground" dir="ltr">
                      {flight.departure.scheduled ? format(parseISO(flight.departure.scheduled), "HH:mm") : '--:--'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {mode === 'departure' ? 'إقلاع' : 'وصول'}
                    </p>
                  </div>

                  {/* Airport/Gate */}
                  <div className="text-center hidden md:block">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{mode === 'departure' ? flight.arrival.iata : flight.departure.iata}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">بوابة {flight.departure.gate || '-'}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <Badge variant="outline" className={cn("px-2.5 py-0.5 text-[10px] font-bold border rounded-full", statusColors[flight.status] || "bg-gray-100")}>
                      {statusLabels[flight.status] || flight.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>آخر تحديث: {new Date().toLocaleTimeString('ar-JO')}</span>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isFetching}
          className="flex items-center gap-1 text-primary font-bold hover:underline"
        >
          <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
          تحديث الآن
        </button>
      </div>
    </div>
  );
}

function LoadingSkeletons() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="grid grid-cols-4 md:grid-cols-5 px-6 py-5 border-b border-border/50">
          <div className="col-span-2 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="hidden md:flex flex-col items-center justify-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="flex items-center justify-center">
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
}

function ErrorState({ message, onRetry }: { message: string, onRetry: () => void }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <div className="space-y-2">
        <h3 className="font-bold text-lg">حدث خطأ أثناء جلب البيانات</h3>
        <p className="text-muted-foreground text-sm max-w-xs">{message}</p>
      </div>
      <Button onClick={onRetry} variant="outline" className="gap-2 rounded-xl">
        <RefreshCw className="w-4 h-4" />
        إعادة المحاولة
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-bold text-lg text-foreground">لا يوجد رحلات حالياً</h3>
        <p className="text-muted-foreground text-sm">يرجى المحاولة مرة أخرى لاحقاً</p>
      </div>
    </div>
  );
}

function Button({ children, onClick, variant = "primary", className, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 text-sm font-bold transition-all disabled:opacity-50",
        variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "border border-border hover:bg-secondary",
        className
      )}
    >
      {children}
    </button>
  );
}
