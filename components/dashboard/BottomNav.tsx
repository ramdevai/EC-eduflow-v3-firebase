"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Plus, 
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadStage } from '@/lib/types';

interface BottomNavProps {
  activeTab: 'leads' | 'today' | 'templates' | 'lost' | 'analysis';
  setActiveTab: (tab: 'leads' | 'today' | 'templates' | 'lost' | 'analysis') => void;
  onAddClick: () => void;
  onSyncClick: () => void;
  isSyncing?: boolean;
}

export function BottomNav({ activeTab, setActiveTab, onAddClick, onSyncClick, isSyncing }: BottomNavProps) {
  const NavItem = ({ 
    icon: Icon, 
    label, 
    isActive, 
    onClick,
    isLoading = false
  }: { 
    icon: any, 
    label: string, 
    isActive?: boolean, 
    onClick: () => void,
    isLoading?: boolean
  }) => (
    <button 
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200",
        isActive 
          ? "text-primary-600 dark:text-primary-400" 
          : "text-slate-400 dark:text-slate-500",
        isLoading && "opacity-50"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all active:bg-slate-100 dark:active:bg-slate-800",
        isActive && "bg-primary-50 dark:bg-primary-900/10"
      )}>
        <Icon size={22} className={isLoading ? 'animate-spin' : ''} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[50] px-2 pb-6 pt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around">
      <NavItem 
        icon={LayoutDashboard} 
        label="Pipeline" 
        isActive={activeTab === 'leads'} 
        onClick={() => setActiveTab('leads')} 
      />
      <NavItem 
        icon={Calendar} 
        label="Today" 
        isActive={activeTab === 'today'} 
        onClick={() => setActiveTab('today')} 
      />
      <NavItem 
        icon={Sparkles} 
        label="Sync" 
        onClick={onSyncClick} 
        isLoading={isSyncing}
      />
      <NavItem 
        icon={Plus} 
        label="Add Lead" 
        onClick={onAddClick} 
      />
    </nav>
  );
}
