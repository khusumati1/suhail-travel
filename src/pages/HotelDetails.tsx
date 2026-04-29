import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  MapPin, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  Coffee,
  Clock,
  Info,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiService } from "@/services/apiService";
import { Skeleton } from "@/components/ui/skeleton";

// Helper for Label component if missing
const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <label className={className || "text-xs font-black"}>{children}</label>
);

const HotelDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  // Booking States
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  // Form State
  const [passenger, setPassenger] = useState({
    title: 'Mr',
    firstName: '',
    lastName: '',
    nationality: 'العراق',
    phone: '',
    email: ''
  });

  // Extract params from navigation state
  const state = (location.state as any) || {};
  const hotelBase = state.hotel || {};
  const cityName = state.cityName || hotelBase.location || 'Erbil';
  const checkIn = state.checkIn || new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const checkOut = state.checkOut || new Date(Date.now() + 172800000).toISOString().split('T')[0];

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const result = await apiService.fetchHotelDetails({ 
          hotelId: id, 
          cityName: cityName.split(',')[0].trim(),
          checkIn, 
          checkOut 
        });
        
        if (result.success && result.data) {
          const rawPrice = result.data.price;
          if (rawPrice) {
            const numericPrice = parseInt(rawPrice.replace(/,/g, ''), 10);
            result.data.price = Math.ceil(numericPrice * 1.10).toLocaleString('en-US');
          }
          setDetails(result.data);
        }
      } catch (e) {
        console.error("[HotelDetails] Fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
    window.scrollTo(0, 0);
  }, [id, cityName]);

  const handleBookingSubmit = async () => {
    setBookingLoading(true);
    try {
      const res = await apiService.createBooking({
        passenger,
        hotelId: id,
        hotelName: details?.title || hotelBase.name,
        checkIn,
        checkOut,
        price: details?.price || hotelBase.price
      });
      if (res.success) {
        setBookingSuccess(res);
        setBookingStep(4);
      }
    } catch (e) {
      console.error("Booking failed:", e);
    } finally {
      setBookingLoading(false);
    }
  };

  const renderBookingModal = () => {
    if (!bookingModalOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setBookingModalOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
          dir="rtl"
        >
          {/* Modal Header */}
          <div className="p-8 border-b border-border/40 flex justify-between items-center bg-primary/5">
             <div>
               <h2 className="text-2xl font-black">إتمام الحجز</h2>
               <p className="text-sm text-muted-foreground font-bold">يرجى إدخال بيانات المسافرين</p>
             </div>
             <button 
               onClick={() => setBookingModalOpen(false)}
               className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-secondary transition-all"
             >
               <ArrowRight className="w-5 h-5" />
             </button>
          </div>

          <div className="p-8">
            {/* Step Indicator */}
            <div className="flex items-center gap-4 mb-8">
               {[1, 2, 3].map(s => (
                 <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${bookingStep >= s ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                      {s}
                    </div>
                    {s < 3 && <div className={`h-1 flex-1 rounded-full ${bookingStep > s ? 'bg-primary' : 'bg-secondary'}`} />}
                 </div>
               ))}
            </div>

            {/* Step 1: Passenger Details */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>اللقب</Label>
                    <select 
                      className="w-full h-12 bg-secondary/50 rounded-xl px-4 text-sm font-bold border-none focus:ring-2 focus:ring-primary"
                      value={passenger.title}
                      onChange={(e) => setPassenger({...passenger, title: e.target.value})}
                    >
                      <option value="Mr">السيد</option>
                      <option value="Mrs">السيدة</option>
                      <option value="Ms">الآنسة</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>الاسم الأول</Label>
                    <input 
                      className="w-full h-12 bg-secondary/50 rounded-xl px-4 text-sm font-bold border-none focus:ring-2 focus:ring-primary"
                      placeholder="مثال: علي"
                      value={passenger.firstName}
                      onChange={(e) => setPassenger({...passenger, firstName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>اسم العائلة</Label>
                  <input 
                    className="w-full h-12 bg-secondary/50 rounded-xl px-4 text-sm font-bold border-none focus:ring-2 focus:ring-primary"
                    placeholder="مثال: أحمد"
                    value={passenger.lastName}
                    onChange={(e) => setPassenger({...passenger, lastName: e.target.value})}
                  />
                </div>
                <Button 
                  disabled={!passenger.firstName || !passenger.lastName}
                  onClick={() => setBookingStep(2)}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-lg"
                >
                  المتابعة
                </Button>
              </div>
            )}

            {/* Step 2: Contact Info */}
            {bookingStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <div className="relative">
                    <input 
                      className="w-full h-12 bg-secondary/50 rounded-xl pr-12 text-sm font-bold border-none focus:ring-2 focus:ring-primary"
                      placeholder="07XXXXXXXX"
                      value={passenger.phone}
                      onChange={(e) => setPassenger({...passenger, phone: e.target.value})}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <span className="text-sm font-bold text-muted-foreground">+964</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني (اختياري)</Label>
                  <input 
                    className="w-full h-12 bg-secondary/50 rounded-xl px-4 text-sm font-bold border-none focus:ring-2 focus:ring-primary"
                    placeholder="example@mail.com"
                    value={passenger.email}
                    onChange={(e) => setPassenger({...passenger, email: e.target.value})}
                  />
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setBookingStep(1)} className="flex-1 h-14 rounded-2xl font-black">الرجوع</Button>
                  <Button 
                    disabled={!passenger.phone}
                    onClick={() => setBookingStep(3)}
                    className="flex-[2] h-14 bg-primary text-white rounded-2xl font-black"
                  >
                    تأكيد البيانات
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {bookingStep === 3 && (
              <div className="space-y-6">
                <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 space-y-4">
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-muted-foreground">الفندق:</span>
                     <span className="text-sm font-black">{details?.title || hotelBase.name}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-muted-foreground">التكلفة الإجمالية:</span>
                     <span className="text-lg font-black text-primary">{details?.price || hotelBase.price} د.ع</span>
                   </div>
                </div>
                
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">اختر طريقة الدفع</h3>
                <div className="grid grid-cols-2 gap-4">
                   <button className="p-4 border-2 border-primary rounded-2xl bg-primary/5 flex flex-col items-center gap-2">
                     <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-primary" />
                     </div>
                     <span className="text-xs font-black">زين كاش / ماستر</span>
                   </button>
                   <button className="p-4 border border-border/40 rounded-2xl hover:bg-secondary transition-all flex flex-col items-center gap-2">
                     <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground" />
                     </div>
                     <span className="text-xs font-black">الدفع في المكتب</span>
                   </button>
                </div>

                <Button 
                  disabled={bookingLoading}
                  onClick={handleBookingSubmit}
                  className="w-full h-16 bg-primary text-white rounded-[24px] font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {bookingLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {bookingLoading ? "جاري المعالجة..." : "تأكيد الحجز والدفع"}
                </Button>
              </div>
            )}

            {/* Step 4: Success */}
            {bookingStep === 4 && (
              <div className="text-center space-y-6 py-8">
                 <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20">
                   <ShieldCheck className="w-12 h-12 text-white" />
                 </div>
                 <div className="space-y-2">
                   <h2 className="text-3xl font-black text-foreground">تم الحجز بنجاح!</h2>
                   <p className="text-muted-foreground font-bold">شكراً لثقتك بـ سهيل Travel Vision</p>
                 </div>
                 <div className="p-6 bg-secondary/50 rounded-[32px] border border-dashed border-border/80">
                    <p className="text-xs font-black text-muted-foreground uppercase mb-1">رقم مرجع الحجز</p>
                    <p className="text-2xl font-black text-primary tracking-widest">{bookingSuccess?.bookingId}</p>
                 </div>
                 <Button onClick={() => setBookingModalOpen(false)} className="w-full h-14 bg-foreground text-white rounded-2xl font-black">
                   العودة للرئيسية
                 </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pb-20" dir="rtl">
        <div className="h-20 bg-white border-b border-border/40 flex items-center px-6">
           <Skeleton className="w-10 h-10 rounded-2xl" />
        </div>
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="grid grid-cols-4 gap-4 h-[50vh]">
            <Skeleton className="col-span-2 row-span-2 rounded-[32px]" />
            <Skeleton className="rounded-[32px]" />
            <Skeleton className="rounded-[32px]" />
            <Skeleton className="rounded-[32px]" />
            <Skeleton className="rounded-[32px]" />
          </div>
          <div className="flex flex-col lg:flex-row gap-8 mt-8">
            <div className="flex-1 space-y-6">
              <Skeleton className="h-12 w-1/2 rounded-full" />
              <Skeleton className="h-4 w-1/4 rounded-full" />
              <Skeleton className="h-32 w-full rounded-[32px]" />
            </div>
            <Skeleton className="w-80 h-96 rounded-[32px]" />
          </div>
        </div>
      </div>
    );
  }

  const images = details?.images || [];
  const displayImages = images.length > 0 ? images.slice(0, 5) : [hotelBase.image || "https://picsum.photos/1200/800"];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32" dir="rtl">
      <AnimatePresence>
        {renderBookingModal()}
      </AnimatePresence>

      <div className="fixed top-6 right-6 z-50">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 bg-white/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/50 hover:bg-white transition-all active:scale-95"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      <main className="container mx-auto px-4 py-8 lg:px-8">
        <section className="grid grid-cols-4 gap-3 md:gap-4 h-[40vh] md:h-[60vh] rounded-[40px] overflow-hidden mb-10 shadow-2xl shadow-black/5">
          <div className="col-span-4 md:col-span-2 row-span-2 relative group">
            <img 
              src={images[activeImg] || displayImages[0]} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              alt="Hotel Hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 right-6 flex gap-1">
               <Badge className="bg-white/90 text-black border-none font-black px-3 py-1.5 rounded-xl backdrop-blur-md">
                 1 / {images.length || 1} صور
               </Badge>
            </div>
          </div>
          
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="hidden md:block col-span-1 row-span-1 overflow-hidden relative cursor-pointer" onClick={() => setActiveImg(idx)}>
              <img src={images[idx] || `https://picsum.photos/600/400?random=${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" alt={`Detail ${idx}`} />
              {idx === 4 && images.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-black text-lg">+{images.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 space-y-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < (hotelBase.stars || 4) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/20'}`} />
                    ))}
                 </div>
                 <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest">
                   إقامة فاخرة
                 </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
                {details?.title || hotelBase.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold">{hotelBase.location || cityName}</span>
                </div>
                <div className="flex items-center gap-2 bg-green-500/5 px-3 py-1.5 rounded-xl border border-green-500/10">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-black text-green-700">أفضل سعر مضمون</span>
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Info className="w-5 h-5" />
                 </div>
                 <h2 className="text-2xl font-black">حول هذا الفندق</h2>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-lg leading-relaxed text-muted-foreground/80 font-medium bg-white p-8 rounded-[32px] border border-border/40 shadow-sm whitespace-pre-line">
                  {details?.description || "لا يوجد وصف متاح لهذا الفندق حالياً."}
                </p>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-black">المرافق والخدمات</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(details?.facilities || []).map((f: string, i: number) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5 }}
                    className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-border/40 shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-primary shrink-0">
                      <Coffee className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold truncate">{f}</span>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:w-[400px] shrink-0">
            <div className="sticky top-28 space-y-6">
              <Card className="rounded-[40px] border-border/40 shadow-2xl shadow-primary/5 overflow-hidden border-2 border-primary/5">
                <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-primary uppercase tracking-widest">السعر لليلة</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground tracking-tight">
                          {details?.price || hotelBase.price || "---"}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground">د.ع</span>
                      </div>
                    </div>
                    <Badge className="bg-primary text-white border-none font-black rounded-lg">توفير %15</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label>تاريخ الدخول</Label>
                       <div className="h-12 bg-secondary/30 rounded-xl flex items-center px-4 text-xs font-bold">{checkIn}</div>
                    </div>
                    <div className="space-y-2">
                       <Label>تاريخ المغادرة</Label>
                       <div className="h-12 bg-secondary/30 rounded-xl flex items-center px-4 text-xs font-bold">{checkOut}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-2xl flex items-center gap-4 border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black">عدد المسافرين</p>
                      <p className="text-[10px] font-bold text-muted-foreground">{state.adultsCount || 2} بالغين</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                  <Button 
                    onClick={() => setBookingModalOpen(true)}
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-[24px] text-lg font-black shadow-xl shadow-primary/20 flex items-center gap-3 transition-all active:scale-95"
                  >
                    احجز الآن
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </CardFooter>
              </Card>

              <div className="bg-white rounded-[32px] p-6 border border-border/40 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-sm font-black text-foreground">دفع آمن وسهل</p>
                   <p className="text-[10px] font-bold text-muted-foreground">ادفع باستخدام زين كاش أو الماستركارد</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default HotelDetails;
