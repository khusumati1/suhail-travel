import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, MapPin, Wifi, Car, Dumbbell, Coffee, Check, Images, Shield, Loader2, Building2, Bed, CheckCircle2 } from "lucide-react";
import DesktopPageLayout from "@/components/DesktopPageLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import OptimizedImage from "@/components/OptimizedImage";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHotelImages } from "@/hooks/useHotelImages";

const facilities = [
  { icon: Wifi, label: "واي فاي مجاني", color: "text-info", bg: "bg-info/10" },
  { icon: Car, label: "موقف سيارات", color: "text-primary", bg: "bg-primary/10" },
  { icon: Dumbbell, label: "صالة رياضية", color: "text-success", bg: "bg-success/10" },
  { icon: Coffee, label: "إفطار مجاني", color: "text-accent-foreground", bg: "bg-accent/10" },
];

const GEOAPIFY_KEY = "2d43924f3c6c49e8998a4a728a082162";

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { images, loading: imagesLoading } = useHotelImages(hotel?.name || "", hotel?.lat, hotel?.lon, hotel?.neighborhood);

  // Retrieve global checkin/checkout/adults if navigated from search
  const searchState = location.state as any;

  useEffect(() => {
    const fetchHotelDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('search-hotels', {
          body: { 
            locationId: id,
            checkin: searchState?.checkin,
            checkout: searchState?.checkout,
            adults: searchState?.adults
          }, 
        });

        if (fnError) throw fnError;
        if (data?.hotel) {
          setHotel(data.hotel);
        } else {
          setError("لم يتم العثور على تفاصيل هذا الفندق في قاعدة البيانات");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("حدث خطأ أثناء الاتصال بالمزود");
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetails();
  }, [id, searchState]);

  if (isMobile === undefined || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center px-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">جاري جلب تفاصيل الفندق...</p>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground/40" />
        <h2 className="text-lg font-bold text-foreground">{error || "فندق غير معروف"}</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold">
          العودة للبحث
        </button>
      </div>
    );
  }

  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=600&height=300&center=lonlat:${hotel.lon},${hotel.lat}&zoom=14&marker=lonlat:${hotel.lon},${hotel.lat};type:material;color:%23ff0000;size:x-large;icon:circle;icontype:awesome&apiKey=${GEOAPIFY_KEY}`;

  const rooms = [
    { type: "غرفة قياسية (Standard)", desc: "سرير مزدوج كبير • إطلالة على المدينة", multiplier: 1 },
    { type: "غرفة ديلوكس (Deluxe)", desc: "سرير كينج • مساحة واسعة • إفطار مجاني", multiplier: 1.4 },
    { type: "جناح تنفيذي (Executive Suite)", desc: "غرفة نوم وصالة • إطلالة بانورامية • دخول الصالة", multiplier: 2.2 },
  ];

  const RoomCard = ({ room }: { room: typeof rooms[0] }) => {
    const roomPrice = Math.floor(hotel.price * room.multiplier);
    return (
      <div className="flex flex-col md:flex-row justify-between p-5 bg-card border border-border/60 hover:border-primary/40 rounded-2xl shadow-sm transition-all mb-4 gap-4">
        <div className="flex-1">
          <h4 className="font-bold text-foreground text-lg mb-1 flex items-center gap-2">
            <Bed className="w-5 h-5 text-primary" /> {room.type}
          </h4>
          <p className="text-muted-foreground text-sm mb-3">{room.desc}</p>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-success flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> إلغاء مجاني</span>
            {room.multiplier > 1 && <span className="text-xs font-medium text-success flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> يشمل الإفطار</span>}
          </div>
        </div>
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-r border-border/40 pt-4 md:pt-0 md:pr-5">
           <div>
             <span className="text-[10px] text-muted-foreground block md:text-end">السعر لعدة ليالي</span>
             <p className="text-2xl font-bold text-foreground">${roomPrice} <span className="text-xs text-muted-foreground font-medium">USD</span></p>
           </div>
           <button onClick={() => navigate("/payment")} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 transition-all text-sm">
             احجز الآن
           </button>
        </div>
      </div>
    );
  };

  const displayImages = images.length > 0 ? images : hotel.images || [hotel.propertyImage];

  if (!isMobile) {
    return (
      <DesktopPageLayout
        title={hotel.name}
        subtitle={`${hotel.neighborhood} — ★ ${hotel.reviewScore}`}
        heroImage={displayImages[0]}
      >
        <div className="max-w-[1000px] mx-auto pb-20">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: hotel.star || 4 }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 text-accent fill-accent" />
                ))}
              </div>
              <h1 className="text-3xl font-bold text-foreground">{hotel.name}</h1>
              <div className="flex items-center gap-1.5 mt-2 text-muted-foreground font-medium">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{hotel.address || hotel.neighborhood}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-end">
                <span className="block font-bold text-lg leading-tight text-foreground">{hotel.reviewScore >= 4.5 ? "استثنائي" : hotel.reviewScore >= 4 ? "رائع" : "جيد جداً"}</span>
                <span className="text-sm text-muted-foreground">{hotel.reviewCount} تقييم</span>
              </div>
              <div className="bg-primary text-primary-foreground font-bold rounded-t-lg rounded-br-lg rounded-bl-sm p-3 text-xl shadow-sm">
                {hotel.reviewScore}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`grid grid-cols-3 gap-3 h-[400px] mb-8 rounded-2xl overflow-hidden ${imagesLoading ? 'animate-pulse' : ''}`}
          >
            <div className="col-span-2 relative group overflow-hidden bg-secondary">
              <OptimizedImage src={displayImages[0]} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative overflow-hidden group h-1/2 bg-secondary">
                <OptimizedImage src={displayImages[1] || displayImages[0]} alt="Hotel" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" />
              </div>
              <div className="relative h-1/2 overflow-hidden group cursor-pointer bg-secondary">
                <OptimizedImage src={displayImages[2] || displayImages[0]} alt="Hotel" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" wrapperClassName="w-full h-full" />
                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center transition-colors">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Images className="w-5 h-5" /> عرض جميع الصور
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
                <h3 className="font-bold text-foreground text-xl mb-4">نظرة عامة</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {hotel.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  {facilities.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-success" />
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-foreground text-2xl mb-4">التوافر وخيارات الغرف</h3>
                {rooms.map((room, idx) => <RoomCard key={idx} room={room} />)}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
                 <div className="p-4 border-b border-border/50 bg-secondary/30">
                   <h3 className="font-bold text-foreground">الموقع الجغرافي</h3>
                 </div>
                 <div className="relative w-full h-[200px]">
                    <img src={mapUrl} alt="Map" loading="lazy" className="w-full h-full object-cover" />
                 </div>
                 <div className="p-4 flex items-start gap-2">
                   <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                   <span className="text-sm text-muted-foreground font-medium">{hotel.address}</span>
                 </div>
              </div>

              {hotel.rawContact?.phone && (
                <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                  <h4 className="font-bold mb-2">للتواصل</h4>
                  <p className="text-foreground" dir="ltr">{hotel.rawContact.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <div className="mobile-container bg-background pb-32">
      <div className={`relative ${imagesLoading ? 'animate-pulse bg-secondary' : ''}`}>
        <OptimizedImage src={displayImages[0]} alt={hotel.name} className="w-full h-64 object-cover" wrapperClassName="w-full h-64" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-12 start-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg">
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10">
        <div className="bg-card rounded-3xl p-5 shadow-card border border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground leading-tight">{hotel.name}</h1>
              <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="text-xs font-medium underline underline-offset-4 decoration-dashed">{hotel.neighborhood}</span>
              </div>
            </div>
            <div className="bg-primary text-primary-foreground font-bold rounded-t-lg rounded-br-lg rounded-bl-sm p-2 shadow-sm text-sm shrink-0 flex items-center justify-center w-10">
              {hotel.reviewScore}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6 border-b border-border/40 pb-6">
        <h3 className="font-bold text-foreground text-lg mb-2">عن الفندق</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {hotel.description}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {facilities.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span className="text-xs font-semibold">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6 border-b border-border/40 pb-6">
         <h3 className="font-bold text-foreground text-lg mb-3">الموقع</h3>
         <div className="rounded-2xl overflow-hidden border border-border/50">
            <img src={mapUrl} alt="Hotel Map" className="w-full h-[160px] object-cover" />
            <div className="bg-secondary p-3 text-xs text-muted-foreground font-medium">
              {hotel.address}
            </div>
         </div>
      </div>

      <div className="px-5 mt-6">
        <h3 className="font-bold text-foreground text-lg mb-4">الخيارات المتاحة</h3>
        {rooms.map((room, idx) => <RoomCard key={idx} room={room} />)}
      </div>
    </div>
  );
};

export default HotelDetails;
