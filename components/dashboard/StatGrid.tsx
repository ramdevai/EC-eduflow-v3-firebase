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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <Card key={i} className="p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
            <stat.icon size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
