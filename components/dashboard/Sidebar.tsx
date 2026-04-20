"use client";

import React, { memo, useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  Settings, 
  UserCircle,
  LayoutDashboard,
  Calendar,
  LogOut,
  MessageSquare,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadStage, UserRole } from '@/lib/types';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSession, signOut } from "next-auth/react";
import { UserAvatar } from './UserAvatar';

interface SidebarProps {
  activeTab: 'leads' | 'today' | 'templates' | 'lost' | 'analysis' | 'customers';
  setActiveTab: (tab: 'leads' | 'today' | 'templates' | 'lost' | 'analysis' | 'customers') => void;
  onMobileClose?: () => void;
  onPreferencesClick?: () => void;
  pipelineCount?: number;
  customerCount?: number;
}

export const Sidebar = memo(function Sidebar({ activeTab, setActiveTab, onMobileClose, onPreferencesClick, pipelineCount, customerCount }: SidebarProps) {
  const { data: session } = useSession();
  const NavButton = ({ 
    icon: Icon, 
    label, 
    isActive, 
    onClick,
    count
  }: { 
    icon: any, 
    label: string, 
    isActive: boolean, 
    onClick: () => void,
    count?: number
  }) => (
    <button 
      onClick={() => {
        onClick();
        if (onMobileClose) onMobileClose();
      }}
      className={cn(
        "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        isActive 
          ? "bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-none" 
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        {label}
      </div>
      {count !== undefined && (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
          isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
        )}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-200 dark:shadow-none">
          <GraduationCap size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">EduCompass</h1>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">CRM Portal</p>
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar">
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 px-4">Menu</p>
          <nav className="space-y-1">
            <NavButton 
              icon={LayoutDashboard} 
              label="Pipeline" 
              isActive={activeTab === 'leads'} 
              onClick={() => setActiveTab('leads')}
              count={pipelineCount}
            />
            <NavButton 
              icon={Users} 
              label="All Customers" 
              isActive={activeTab === 'customers'} 
              onClick={() => setActiveTab('customers')} 
              count={customerCount}
            />
            {session?.user?.role === UserRole.Admin && (
              <NavButton 
                icon={BarChart3} 
                label="Analysis" 
                isActive={activeTab === 'analysis'} 
                onClick={() => setActiveTab('analysis')} 
              />
            )}
            <NavButton 
              icon={Calendar} 
              label="Today" 
              isActive={activeTab === 'today'} 
              onClick={() => setActiveTab('today')} 
            />
            <NavButton 
              icon={TrendingDown} 
              label="Deals Lost" 
              isActive={activeTab === 'lost'} 
              onClick={() => setActiveTab('lost')} 
            />
          </nav>
        </section>

        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 px-4">Settings</p>
          <nav className="space-y-1">
            <NavButton 
              icon={MessageSquare} 
              label="Message Templates" 
              isActive={activeTab === 'templates'} 
              onClick={() => setActiveTab('templates')} 
            />
            {session?.user?.role === UserRole.Admin && (
              <NavButton 
                  icon={Settings} 
                  label="System Settings" 
                  isActive={false} 
                  onClick={() => onPreferencesClick?.()} 
              />
            )}
            <NavButton 
                icon={LogOut} 
                label="Sign Out" 
                isActive={false} 
                onClick={() => signOut()} 
            />
          </nav>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar user={session?.user || null} className="w-9 h-9 border border-slate-200 dark:border-slate-800" />
          <div className="hidden lg:block min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{session?.user?.name || 'User'}</p>
            <button onClick={() => signOut()} className="text-[10px] font-bold text-primary-600 hover:underline">Sign Out</button>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
});
