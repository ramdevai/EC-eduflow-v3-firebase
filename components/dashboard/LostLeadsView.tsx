"use client";

import React, { useMemo } from 'react';
import { Lead } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  TrendingDown, 
  RefreshCw, 
  Trash2, 
  Search,
  Filter,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { normalizeStage, safeFormat } from '@/lib/utils';

interface LostLeadsViewProps {
  leads: Lead[];
  updateLead: (id: number, updates: Partial<Lead>) => void;
}

export function LostLeadsView({ leads, updateLead }: LostLeadsViewProps) {
  const lostLeads = useMemo(() => leads.filter(l => l.status === 'Lost'), [leads]);
  
  const analytics = useMemo(() => {
    const total = leads.length;
    const lostCount = lostLeads.length;
    const lossRate = total > 0 ? ((lostCount / total) * 100).toFixed(1) : '0';

    // Group by Stage
    const stageLoss: Record<string, number> = {};
    // Group by Grade
    const gradeLoss: Record<string, number> = {};

    lostLeads.forEach(l => {
      stageLoss[l.stage] = (stageLoss[l.stage] || 0) + 1;
      gradeLoss[l.grade] = (gradeLoss[l.grade] || 0) + 1;
    });

    const topLossStage = Object.entries(stageLoss).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topLossGrade = Object.entries(gradeLoss).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      lossRate,
      lostCount,
      topLossStage,
      topLossGrade,
      stageLoss,
      gradeLoss
    };
  }, [leads, lostLeads]);

  const handleRestore = (id: number) => {
    updateLead(id, { status: 'Open' });
  };

  const handleMarkWon = (id: number) => {
    updateLead(id, { status: 'Won' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Analytics Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
              <TrendingDown size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600/70">Loss Rate</p>
          </div>
          <p className="text-3xl font-black text-red-600">{analytics.lossRate}%</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">{analytics.lostCount} of {leads.length} total leads</p>
        </Card>

        <Card className="p-5 bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <BarChart3 size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Top Loss Stage</p>
          </div>
          <p className="text-xl font-black text-amber-600 truncate">{analytics.topLossStage}</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Highest drop-off point</p>
        </Card>

        <Card className="p-5 bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
              <PieChart size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600/70">Grade Drop-off</p>
          </div>
          <p className="text-xl font-black text-indigo-600">{analytics.topLossGrade}</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Most lost grade/class</p>
        </Card>

        <Card className="p-5 bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <Target size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Retention Target</p>
          </div>
          <p className="text-3xl font-black text-emerald-600">&lt; 15%</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Industry benchmark</p>
        </Card>
      </div>

      {/* Lost Leads Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-[2rem]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Lost Leads Archive</h3>
            <p className="text-xs text-slate-500 font-medium">Review and potentially restore dropped leads.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                placeholder="Search lost leads..." 
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20 w-full md:w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dropped At</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Lost Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lostLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{lead.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{lead.grade}, {lead.board}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="info" className="text-[10px] font-bold uppercase tracking-wider">{lead.stage}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {safeFormat(lead.updatedAt)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 rounded-lg text-[10px] font-bold gap-2 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                        onClick={() => handleMarkWon(lead.id)}
                      >
                        Mark Won
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 rounded-lg text-[10px] font-bold gap-2 text-primary-600"
                        onClick={() => handleRestore(lead.id)}
                      >
                        <RefreshCw size={12} />
                        Restore
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {lostLeads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="max-w-[240px] mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <TrendingDown size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">No lost leads found</p>
                      <p className="text-[11px] text-slate-500 font-medium">Great! You haven't lost any students from your pipeline yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
