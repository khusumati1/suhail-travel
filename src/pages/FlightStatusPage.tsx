import FlightTimetable from "@/components/FlightTimetable";
import BottomNav from "@/components/BottomNav";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function FlightStatusPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Custom Header */}
      <div className="bg-card border-b border-border/50 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 backdrop-blur-md bg-card/80">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-black text-foreground">حالة الرحلات</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Live Flight Data</p>
        </div>
      </div>

      <div className="container py-6">
        <FlightTimetable />
      </div>

      <BottomNav />
    </div>
  );
}
