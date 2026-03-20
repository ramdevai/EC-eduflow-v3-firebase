import React, { memo } from 'react';
import { Users, UserPlus, CheckCircle2, IndianRupee } from 'lucide-react';
import { Lead } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { normalizeStage } from '@/lib/utils';

interface StatGridProps {
  leads: Lead[];
}

export const StatGrid = memo(function StatGrid({ leads }: StatGridProps) {
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
      value: leads.filter(l => {
        const stage = normalizeStage(l.stage);
        return l.status === 'Open' && stage !== 'Report sent' && stage !== 'Lost';
      }).length,
      icon: UserPlus,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'New Inquiries',
      value: leads.filter(l => normalizeStage(l.stage) === 'New').length,
      icon: CheckCircle2,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Fees Pending',
      value: leads.filter(l => l.status !== 'Lost' && l.feesPaid === 'Due').length,
      icon: IndianRupee,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-8">
      {stats.map((stat, i) => (
        <Card key={i} className="p-2.5 md:p-5 flex flex-row items-center gap-2.5 md:gap-4 text-left">
          <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
            <stat.icon size={18} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">{stat.label}</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white leading-none">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
});
