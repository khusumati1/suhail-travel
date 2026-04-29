import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, CreditCard, Heart, Bell, Shield, Globe, HelpCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const subPageContent: Record<string, any> = {
  payments: {
    title: "طرق الدفع",
    icon: CreditCard,
    color: "text-primary",
    content: "لا توجد بطاقات مسجلة حالياً. أضف بطاقتك الأولى لتسهيل عمليات الحجز المستقبلية."
  },
  favorites: {
    title: "المفضلة",
    icon: Heart,
    color: "text-destructive",
    content: "قائمة أمنياتك فارغة. ابدأ بإضافة الفنادق والرحلات التي تحبها للرجوع إليها لاحقاً."
  },
  notifications: {
    title: "الإشعارات",
    icon: Bell,
    color: "text-accent-foreground",
    content: "أنت مواكب لكل جديد! لا توجد إشعارات غير مقروءة حالياً."
  },
  security: {
    title: "الأمان والخصوصية",
    icon: Shield,
    color: "text-success",
    content: "بياناتك محمية بأعلى معايير الأمان. يمكنك هنا إدارة كلمة المرور وتفضيلات الخصوصية."
  }
};

const ProfileSubPage = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const page = type ? subPageContent[type] : null;

  if (!page) return null;

  const Icon = page.icon;

  return (
    <div className="mobile-container bg-background min-h-screen pb-32">
      {/* Header */}
      <div className="pt-14 pb-6 px-6 flex items-center justify-between border-b border-border/40">
        <button 
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-black text-foreground">{page.title}</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="p-10 flex flex-col items-center text-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 rounded-[32px] bg-secondary/50 flex items-center justify-center mb-8 border border-border/20"
        >
          <Icon className={`w-12 h-12 ${page.color} opacity-40`} strokeWidth={1.5} />
        </motion.div>
        
        <h2 className="text-xl font-black text-foreground mb-4">{page.title}</h2>
        <p className="text-sm font-bold text-muted-foreground leading-relaxed">
          {page.content}
        </p>

        {type === 'payments' && (
          <button className="mt-8 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-premium active:scale-95 transition-all">
            أضف بطاقة جديدة
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileSubPage;
