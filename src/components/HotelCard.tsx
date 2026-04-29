// src/components/HotelCard.tsx
import React, { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Heart, ChevronLeft } from 'lucide-react';
import { getPlaceholder } from '@/utils/imagePlaceholder';
import { Badge } from '@/components/ui/badge';
import { HotelOffer } from '../types';

interface HotelCardProps {
  hotel: HotelOffer;
  onClick?: () => void;
  index: number;
}

const DEFAULT_IMG = getPlaceholder(800,400); // Replaced Unsplash URL with placeholder

const HotelCard = forwardRef<HTMLDivElement, HotelCardProps>(({ hotel, onClick, index }, ref) => {
  const navigate = useNavigate();
  const [imgSrc, setImgSrc] = useState(() => {
    const initialImg = hotel.image || (hotel as any).imageUrl || "";
    if (!initialImg || initialImg.includes("System.Object") || initialImg.trim() === "") {
      return DEFAULT_IMG;
    }
    return initialImg;
  });

  const getRatingLabel = (rating: number) => {
    if (rating >= 9) return 'استثنائي';
    if (rating >= 8) return 'رائع';
    if (rating >= 7) return 'جيد جداً';
    return 'جيد';
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group bg-card rounded-[40px] overflow-hidden border border-border/20 shadow-native hover:shadow-premium transition-all duration-500 cursor-pointer mb-6 flex flex-col"
      dir="rtl"
    >
      {/* Image Section - Now takes primary focus like premium apps */}
      <div className="w-full h-64 overflow-hidden relative">
        <img 
          src={imgSrc} 
          alt={hotel.name} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onError={() => setImgSrc(DEFAULT_IMG)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
        
        {/* Top Badges */}
        <div className="absolute top-5 inset-x-5 flex justify-between items-start">
          <Badge className="bg-white/95 text-black hover:bg-white border-none font-black text-[10px] px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
            {hotel.provider || "عرض متاح"}
          </Badge>
          <button className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white hover:text-primary transition-all active:scale-90">
            <Heart className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Price/Info Overlay for Mobile Immersive feel */}
        <div className="absolute bottom-5 right-5 left-5 flex justify-between items-end">
          <div className="bg-primary/90 backdrop-blur-md px-4 py-2 rounded-2xl text-white shadow-lg">
             <p className="text-[9px] font-black opacity-80 uppercase tracking-widest leading-none mb-1">السعر يبدأ من</p>
             <div className="flex items-baseline gap-1">
               <span className="text-lg font-black">{hotel.price}</span>
               <span className="text-[10px] font-bold opacity-80">د.ع / ليلة</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg border border-white/20">
            <div className="text-right">
              <p className="text-[10px] font-black text-primary leading-none">{getRatingLabel(hotel.rating)}</p>
              <p className="text-[9px] font-bold text-muted-foreground mt-1">{hotel.reviewsCount} تقييم</p>
            </div>
            <div className="text-base font-black text-primary bg-primary/5 w-8 h-8 flex items-center justify-center rounded-xl">
              {hotel.rating}
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <h3 className="font-black text-foreground text-xl leading-tight group-hover:text-primary transition-colors">{hotel.name}</h3>
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" /> {hotel.location || "وسط المدينة"}
              </p>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < hotel.stars ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/20'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
           <div className="flex -space-x-2 space-x-reverse">
              {/* Fake user avatars for "Social Proof" */}
              {[1,2,3].map(i => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-[10px] font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-[8px] font-black">
                +12
              </div>
           </div>
           <p className="text-[10px] font-bold text-muted-foreground">أكثر من 50 شخصاً حجزوا هذا اليوم</p>
        </div>
      </div>
    </motion.div>
  );
});

HotelCard.displayName = 'HotelCard';
export default HotelCard;
