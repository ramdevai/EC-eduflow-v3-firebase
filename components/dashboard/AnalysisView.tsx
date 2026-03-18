"use client";

import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ArrowDownCircle, 
  PieChart,
  Target,
  ArrowRight
} from 'lucide-react';
import { Lead, LeadStage } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { normalizeStage } from '@/lib/utils';
import { motion } from 'motion/react';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';

interface AnalysisViewProps {
  leads: Lead[];
}

const STAGE_GROUPS = {
  'Inquiry': ['New'],
  'Registration': ['Registration requested', 'Registration done'],
  'Testing': ['Test sent', 'Test completed'],
  'Counseling': ['1:1 scheduled', 'Session complete'],
  'Won': ['Report sent']
};

const STAGE_ORDER = ['Inquiry', 'Registration', 'Testing', 'Counseling', 'Won'];

export function AnalysisView({ leads }: AnalysisViewProps) {
  const stats = useMemo(() => {
    const total = leads.length;
    if (total === 0) return null;

    const lostLeads = leads.filter(l => l.status === 'Lost');
    const wonLeads = leads.filter(l => l.status === 'Won' || l.stage === 'Report sent');
    const activeLeads = leads.filter(l => l.status === 'Open' && l.stage !== 'Report sent' && l.stage !== 'Lost');
    
    // Funnel Data Calculation
    const funnelData = STAGE_ORDER.map((groupName, index) => {
      const stagesInGroup = STAGE_GROUPS[groupName as keyof typeof STAGE_GROUPS];
      
      // Leads currently in this group (Active)
      const activeAt = activeLeads.filter(l => stagesInGroup.includes(normalizeStage(l.stage))).length;
      
      // Leads lost at this group
      const lostAt = lostLeads.filter(l => stagesInGroup.includes(normalizeStage(l.stage))).length;
      
      // Leads that reached this stage or further
      // A lead reached stage index I if:
      // 1. Their current stage index is >= I
      // 2. They are won (reached all stages)
      // 3. They were lost at a stage index >= I
      const reached = leads.filter(l => {
        const currentStage = normalizeStage(l.stage);
        let groupIndex = STAGE_ORDER.findIndex(g => STAGE_GROUPS[g as keyof typeof STAGE_GROUPS].includes(currentStage));
        if (l.status === 'Won' || currentStage === 'Report sent') groupIndex = 4;
        return groupIndex >= index;
      }).length;

      return {
        label: groupName,
        reached,
        activeAt,
        lostAt,
        dropRate: reached > 0 ? ((lostAt / reached) * 100).toFixed(1) : '0',
        color: index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-indigo-500' : index === 2 ? 'bg-purple-500' : index === 3 ? 'bg-violet-500' : 'bg-emerald-500'
      };
    });

    // Stagnant Leads (> 7 days in same stage)
    const stagnantLeads = activeLeads.filter(l => {
      const dateStr = l.lastStageUpdate || l.updatedAt || l.inquiryDate;
      if (!dateStr) return false;
      return differenceInDays(new Date(), parseISO(dateStr)) >= 7;
    }).sort((a, b) => {
      const dateA = a.lastStageUpdate || a.updatedAt || a.inquiryDate;
      const dateB = b.lastStageUpdate || b.updatedAt || b.inquiryDate;
      return differenceInDays(new Date(), parseISO(dateA)) - differenceInDays(new Date(), parseISO(dateB));
    }).reverse();

    // Conversion Rates
    const totalConversion = ((wonLeads.length / total) * 100).toFixed(1);
    
    // Source Analysis
    const sources: Record<string, number> = {};
    leads.forEach(l => {
      const src = l.source || 'Unknown';
      sources[src] = (sources[src] || 0) + 1;
    });

    return {
      total,
      won: wonLeads.length,
      lost: lostLeads.length,
      active: activeLeads.length,
      funnelData,
      stagnantLeads,
      totalConversion,
      sources: Object.entries(sources).sort((a, b) => b[1] - a[1])
    };
  }, [leads]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <BarChart3 size={48} className="mb-4 opacity-20" />
        <p className="font-medium uppercase tracking-widest text-[10px]">No data to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-b-4 border-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <Badge variant="success" className="text-[10px] font-black">{stats.totalConversion}%</Badge>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conversion Rate</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Overall</h3>
        </Card>

        <Card className="p-6 border-b-4 border-blue-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stats.total}</h3>
        </Card>

        <Card className="p-6 border-b-4 border-indigo-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
              <Target size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Pipeline</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stats.active}</h3>
        </Card>

        <Card className="p-6 border-b-4 border-red-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600">
              <ArrowDownCircle size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leads Lost</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stats.lost}</h3>
        </Card>
      </div>

      {/* Visual Funnel */}
      <Card className="p-8">
        <div className="flex items-center gap-2 mb-8">
          <BarChart3 className="text-primary-600" size={20} />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Conversion Funnel</h3>
        </div>

        <div className="space-y-6">
          {stats.funnelData.map((stage, i) => {
            const nextStage = stats.funnelData[i + 1];
            const percentage = (stage.reached / stats.total * 100).toFixed(0);

            return (
              <div key={stage.label} className="relative">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-32 text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stage.label}</span>
                  </div>
                  <div className="flex-1 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden relative border border-slate-100 dark:border-slate-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={`h-full ${stage.color} opacity-80`}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{stage.reached} Reached</span>
                        {stage.activeAt > 0 && (
                          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                            {stage.activeAt} Active
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {parseFloat(stage.dropRate) > 0 && (
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mr-4">
                            {stage.dropRate}% Lost here
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-500">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stagnant Leads & Source Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stagnant Leads */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Target className="text-amber-500" size={20} />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Stagnant Leads</h3>
            </div>
            <Badge variant="warning" className="text-[10px] font-black">{stats.stagnantLeads.length}</Badge>
          </div>
          <div className="space-y-3">
            {stats.stagnantLeads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{lead.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {lead.stage} • {formatDistanceToNow(parseISO(lead.lastStageUpdate || lead.updatedAt || lead.inquiryDate))} in stage
                  </p>
                </div>
                <Badge variant="warning" className="text-[9px] font-bold border-amber-200 text-amber-600 bg-amber-50">Nudge</Badge>
              </div>
            ))}
            {stats.stagnantLeads.length > 5 && (
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase pt-2">
                + {stats.stagnantLeads.length - 5} more leads need attention
              </p>
            )}
            {stats.stagnantLeads.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400 font-bold">All active leads are moving! 🚀</p>
              </div>
            )}
          </div>
        </Card>

        {/* Source Distribution */}
        <Card className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="text-primary-600" size={20} />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Lead Sources</h3>
          </div>
          <div className="space-y-4">
            {stats.sources.map(([source, count], i) => {
              const percent = (count / stats.total * 100).toFixed(0);
              return (
                <div key={source} className="group">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2 px-1">
                    <span className="text-slate-500">{source}</span>
                    <span className="text-slate-900 dark:text-white">{count} Leads</span>
                  </div>
                  <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className="h-full bg-primary-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-emerald-400" size={20} />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Funnel Health</p>
            {(() => {
              const highestDrop = [...stats.funnelData].sort((a, b) => parseFloat(b.dropRate) - parseFloat(a.dropRate))[0];
              return (
                <p className="text-sm leading-relaxed text-slate-300">
                  {parseFloat(highestDrop?.dropRate || '0') > 0 ? (
                    <>The highest actual drop-off is at <span className="text-white font-bold">{highestDrop.label}</span> ({highestDrop.dropRate}% lost). Focus on improving engagement in this stage.</>
                  ) : (
                    <>Your funnel has zero lost leads so far! Keep up the great conversion momentum.</>
                  )}
                </p>
              );
            })()}
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Attention Needed</p>
            <p className="text-sm leading-relaxed text-slate-300">
              There are <span className="text-white font-bold">{stats.stagnantLeads.length} leads</span> that haven't moved in over 7 days. 
              {stats.stagnantLeads.length > 0 ? " A quick nudge via WhatsApp might help convert them." : " Your pipeline is very healthy and moving fast."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

