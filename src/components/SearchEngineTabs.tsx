// src/components/SearchEngineTabs.tsx
import React from 'react';
import { Plane, Hotel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type Tab = 'flights' | 'hotels';

interface SearchEngineTabsProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

const SearchEngineTabs: React.FC<SearchEngineTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="flex bg-secondary/80 rounded-[24px] p-1.5 border border-border/50 w-full max-w-sm mx-auto mb-8 shadow-inner">
      {(['flights', 'hotels'] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "relative flex-1 flex items-center justify-center gap-2 py-3 rounded-[20px] text-sm font-bold transition-all duration-300",
            activeTab === tab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {activeTab === tab && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-primary rounded-[20px] shadow-lg shadow-primary/20"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2 capitalize">
            {tab === 'flights' ? <Plane className="w-4 h-4" /> : <Hotel className="w-4 h-4" />}
            {tab}
          </span>
        </button>
      ))}
    </div>
  );
};

export default SearchEngineTabs;
