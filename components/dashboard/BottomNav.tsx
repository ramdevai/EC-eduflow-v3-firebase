"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  Search, 
  UserCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadStage } from '@/lib/types';

interface BottomNavProps {
  selectedStage: LeadStage | 'All';
  setSelectedStage: (stage: LeadStage | 'All') => void;
  onAddClick: () => void;
}

export function BottomNav({ selectedStage, setSelectedStage, onAddClick }: BottomNavProps) {
  const NavItem = ({ 
    icon: Icon, 
    label, 
    isActive, 
    onClick,
    isCenter = false
  }: { 
    icon: any, 
    label: string, 
    isActive?: boolean, 
    onClick: () => void,
    isCenter?: boolean
  }) => (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all duration-200",
        isCenter ? "relative -top-5" : "flex-1",
        isActive 
          ? "text-primary-600 dark:text-primary-400" 
          : "text-slate-400 dark:text-slate-500"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all",
        isCenter ? "bg-primary-600 text-white shadow-lg shadow-primary-200 dark:shadow-none p-4 rounded-2xl scale-110 active:scale-95" : "active:bg-slate-100 dark:active:bg-slate-800"
      )}>
        <Icon size={isCenter ? 28 : 22} />
      </div>
      {!isCenter && <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>}
    </button>
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[50] px-6 pb-6 pt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <NavItem 
        icon={LayoutDashboard} 
        label="Home" 
        isActive={selectedStage === 'All'} 
        onClick={() => setSelectedStage('All')} 
      />
      <NavItem 
        icon={Users} 
        label="Leads" 
        isActive={selectedStage !== 'All'} 
        onClick={() => setSelectedStage('New')} 
      />
      
      <NavItem 
        icon={PlusCircle} 
        label="Add" 
        isCenter 
        onClick={onAddClick} 
      />
      
      <NavItem 
        icon={Search} 
        label="Search" 
        onClick={() => {
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (searchInput) searchInput.focus();
        }} 
      />
      <NavItem 
        icon={UserCircle} 
        label="Profile" 
        onClick={() => {}} 
      />
    </nav>
  );
}
