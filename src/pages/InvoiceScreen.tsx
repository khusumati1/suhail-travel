import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { Printer, Download, Image as ImageIcon, ArrowRight, Loader2, FileWarning, Plane, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export default function InvoiceScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const isMobile = useIsMobile();
  const ticketRef = useRef<HTMLDivElement>(null);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      toast.error("يرجى تسجيل الدخول لعرض الفاتورة");
      navigate("/login");
      return;
    }

    const fetchBooking = async () => {
      try {
        const { data, error: fetchError } = await (supabase as any)
          .from("bookings")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError || !data) {
          setError("عذراً، لم نتمكن من العثور على الحجز المطلوب.");
          return;
        }

        // Enforce RLS compatibility manually as an extra layer
        const userId = user?.phone || user?.name || "guest";
        if (data.user_id !== userId) {
          setError("لا تملك صلاحية الوصول إلى هذه الفاتورة.");
          return;
        }

        setBooking(data);
      } catch (err) {
        setError("حدث خطأ أثناء تحميل بيانات الفاتورة.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id, isLoggedIn, user, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportImage = async () => {
    if (!ticketRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ticketRef.current, { scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `Suhail-Ticket-${id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("تم حفظ الصورة بنجاح");
    } catch (err) {
      toast.error("فشل حفظ الصورة");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!ticketRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(ticketRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Suhail-Invoice-${id}.pdf`);
      toast.success("تم حفظ ملف PDF بنجاح");
    } catch (err) {
      toast.error("فشل حفظ الـ PDF");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <FileWarning className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">خطأ في الفاتورة</h2>
        <p className="text-muted-foreground text-center mb-6">{error}</p>
        <button onClick={() => navigate("/bookings")} className="btn-primary">العودة لحجوزاتي</button>
      </div>
    );
  }

  const { flight_details, price, created_at } = booking;
  const flight = flight_details;

  const InvoiceContent = () => (
    <div className="bg-white text-black p-8 sm:p-12 min-h-[297mm] w-full max-w-[210mm] mx-auto shadow-2xl relative print:shadow-none print:p-0 print:m-0 print:w-full print:h-auto" dir="rtl" ref={ticketRef}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
        <div className="flex items-center gap-4">
          <img src={logo} alt="سهيل" className="w-16 h-16 rounded-xl" />
          <div>
            <h1 className="text-3xl font-black text-primary">سهيل للسفر</h1>
            <p className="text-sm font-semibold text-gray-500">رفيق سفرك الموثوق</p>
          </div>
        </div>
        <div className="text-left" dir="ltr">
          <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-widest mb-1">INVOICE</h2>
          <p className="text-sm font-bold text-gray-500">REF: {id.split("-")[0].toUpperCase()}</p>
          <p className="text-xs text-gray-400 mt-1">{format(new Date(created_at), "dd MMM yyyy, HH:mm")}</p>
        </div>
      </div>

      {/* Passenger & Booking Info */}
      <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">بيانات المسافر</p>
          <p className="text-lg font-bold text-gray-800">{user?.name || "ضيف"}</p>
          <p className="text-sm text-gray-600 mt-0.5" dir="ltr">{user?.phone || booking.user_id}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">تفاصيل الحجز</p>
          <p className="text-sm font-bold text-gray-800">حالة الدفع: <span className="text-green-600">مكتمل</span></p>
          <p className="text-sm font-bold text-gray-800 mt-1">طريقة الدفع: بطاقة إئتمانية</p>
        </div>
      </div>

      {/* Flight Details Boarding Pass Style */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white mb-8">
        <div className="bg-primary px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            <span className="font-bold tracking-wide">{flight.airline}</span>
          </div>
          <span className="font-bold tracking-widest">{flight.flightNum || flight.flight_number || "IA-204"}</span>
        </div>
        
        <div className="p-8 flex items-center justify-between relative">
          <div className="text-center w-28">
            <p className="text-5xl font-black text-gray-800 tracking-tighter" dir="ltr">{flight.origin || flight.from}</p>
            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">Origin</p>
            <p className="text-xl font-bold text-gray-800 mt-1" dir="ltr">{flight.departTime || flight.depart?.split("T")[1]?.slice(0,5) || "08:30"}</p>
          </div>
          
          <div className="flex-1 mx-8 flex flex-col items-center relative">
            <div className="absolute top-1/2 left-0 w-full flex items-center -translate-y-1/2">
              <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
              <div className="flex-1 border-t-2 border-dashed border-gray-300" />
              <Plane className="w-6 h-6 text-gray-400 mx-3 rotate-180" />
              <div className="flex-1 border-t-2 border-dashed border-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <div className="absolute -top-8 text-xs font-bold text-gray-500 bg-white px-4 py-1 rounded-full border border-gray-200 shadow-sm">
              {flight.duration || "مباشر"}
            </div>
            <p className="absolute -bottom-8 text-xs font-bold text-gray-400">
              {flight.date ? format(new Date(flight.date), "dd MMMM yyyy", { locale: ar }) : "قريباً"}
            </p>
          </div>

          <div className="text-center w-28">
            <p className="text-5xl font-black text-gray-800 tracking-tighter" dir="ltr">{flight.dest || flight.to}</p>
            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">Destination</p>
            <p className="text-xl font-bold text-gray-800 mt-1" dir="ltr">{flight.arriveTime || flight.arrive?.split("T")[1]?.slice(0,5) || "10:30"}</p>
          </div>
        </div>

        <div className="bg-gray-50 border-t-2 border-dashed border-gray-200 px-8 py-5 flex items-center justify-between">
          <div className="grid grid-cols-3 gap-8 flex-1">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Class</p>
              <p className="text-sm font-bold text-gray-800">{flight.cabin_class === "ECONOMY" ? "اقتصادية" : "أعمال"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Gate</p>
              <p className="text-sm font-bold text-gray-800">TBD</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Seat</p>
              <p className="text-sm font-bold text-gray-800">Check-in</p>
            </div>
          </div>
          <div className="ml-6 pl-6 border-l-2 border-gray-200">
            <QRCodeSVG value={`SUHAIL-${id}`} size={64} level="M" />
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="mb-12">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">تفاصيل الدفع</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center text-gray-600">
            <span className="font-semibold">سعر التذكرة</span>
            <span className="font-bold text-gray-800" dir="ltr">${(price - 15).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <span className="font-semibold">الضرائب والرسوم</span>
            <span className="font-bold text-gray-800" dir="ltr">$15.00</span>
          </div>
          <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-200">
            <span className="font-bold text-lg text-gray-800">الإجمالي المدفوع</span>
            <span className="font-black text-2xl text-primary" dir="ltr">${Number(price).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-12 left-0 w-full px-12 text-center">
        <p className="text-xs text-gray-400 font-semibold mb-1">شكراً لاختياركم سهيل للسفر</p>
        <p className="text-[10px] text-gray-400">لأي استفسار يرجى التواصل مع خدمة العملاء على 800-SUHAIL</p>
      </div>
    </div>
  );

  const ActionButtons = () => (
    <div className="flex flex-wrap items-center justify-center gap-3 mb-8 print:hidden">
      <button onClick={handlePrint} className="flex items-center gap-2 bg-secondary text-foreground font-bold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-colors">
        <Printer className="w-5 h-5" />
        طباعة
      </button>
      <button onClick={handleExportImage} disabled={exporting} className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-70">
        {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
        حفظ كصورة
      </button>
      <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-2 bg-[#ff0000] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-70">
        {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        حفظ PDF
      </button>
    </div>
  );

  if (!isMobile) {
    return (
      <DesktopPageLayout title="فاتورة الحجز" subtitle={`رقم المرجع: ${id.split("-")[0].toUpperCase()}`}>
        <div className="max-w-4xl mx-auto py-8">
          <ActionButtons />
          <div className="overflow-x-auto pb-12 print:overflow-visible">
            <InvoiceContent />
          </div>
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-gray-100 min-h-screen pb-24 print:bg-white">
      <div className="px-5 pt-14 pb-6 bg-background print:hidden">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/bookings")} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-foreground font-black text-xl">تذكرة إلكترونية</h1>
          <div className="w-10" />
        </div>
        <ActionButtons />
      </div>
      <div className="px-4 py-6 print:p-0">
        <div className="overflow-x-auto pb-12 print:overflow-visible">
          <InvoiceContent />
        </div>
      </div>
    </div>
  );
}
