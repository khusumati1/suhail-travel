import React, { useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { getPlaceholder } from '@/utils/imagePlaceholder';

const offers = [
  {
    title: "عروض الصيف في دبي",
    desc: "خصم يصل إلى 30% على فنادق الخمس نجوم",
    image: getPlaceholder(800, 400),
    tag: "عرض محدود",
    color: "from-blue-600/80"
  },
  {
    title: "سحر إسطنبول بانتظارك",
    desc: "رحلات طيران مباشرة بأسعار تبدأ من $150",
    image: getPlaceholder(800, 400),
    tag: "الأكثر مبيعاً",
    color: "from-orange-600/80"
  },
  {
    title: "استرخِ في المالديف",
    desc: "باقات شهر العسل والعائلات بأسعار استثنائية",
    image: getPlaceholder(800, 400),
    tag: "وجهة مميزة",
    color: "from-teal-600/80"
  }
];

const OfferSlider = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl' });
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    // Manual Autoplay Implementation
    const autoplay = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, 4000);

    return () => clearInterval(autoplay);
  }, [emblaApi, onSelect]);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <Sparkles className="w-4 h-4 text-primary" />
           <h3 className="text-sm font-black text-foreground uppercase tracking-widest">أفضل العروض الحصرية</h3>
        </div>
        <div className="flex gap-1.5">
          {offers.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${selectedIndex === i ? 'w-6 bg-primary' : 'w-1.5 bg-primary/20'}`} 
            />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[32px] shadow-native border border-white/10" ref={emblaRef}>
        <div className="flex">
          {offers.map((offer, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 relative h-52">
              <img 
                src={offer.image} 
                className="w-full h-full object-cover" 
                alt={offer.title} 
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${offer.color} to-transparent opacity-90`} />
              
              <div className="absolute inset-0 p-6 flex flex-col justify-end text-right">
                 <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full w-fit mb-3">
                   <span className="text-[9px] font-black text-white uppercase tracking-widest">{offer.tag}</span>
                 </div>
                 <h4 className="text-xl font-black text-white mb-1">{offer.title}</h4>
                 <p className="text-[11px] font-bold text-white/80 leading-relaxed max-w-[240px]">
                   {offer.desc}
                 </p>
                 
                 <button className="absolute bottom-6 left-6 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                   <ArrowLeft className="w-5 h-5" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OfferSlider;
