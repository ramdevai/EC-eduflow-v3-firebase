import React from 'react';
import { Users, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { Lead } from '@/lib/types';
import { Card } from '@/components/ui/Card';

interface StatGridProps {
  leads: Lead[];
}

export function StatGrid({ leads }: StatGridProps) {
  const stats = [
    {
      label: 'Total Leads',
      value: leads.length,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Active Leads',
      value: leads.filter(l => l.stage !== 'Lost' && l.stage !== 'Report Sent').length,
      icon: UserPlus,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'New Inquiries',
      value: leads.filter(l => l.stage === 'New').length,
      icon: CheckCircle2,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Lost Deals',
      value: leads.filter(l => l.stage === 'Lost').length,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
      {stats.map((stat, i) => (
        <Card key={i} className="p-3 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
            <stat.icon size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
