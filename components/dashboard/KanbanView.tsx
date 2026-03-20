"use client";

import React, { memo, useMemo } from 'react';
import { Lead, LeadStage } from '@/lib/types';
import { LeadCard } from './LeadCard';
import { normalizeStage } from '@/lib/utils';

interface KanbanViewProps {
  leads: Lead[];
  stages: LeadStage[];
  onLeadClick: (lead: Lead) => void;
  searchQuery: string;
}

export const KanbanView = memo(function KanbanView({ leads, stages, onLeadClick, searchQuery }: KanbanViewProps) {
  const filteredData = useMemo(() => {
    return stages.map(stage => ({
      stage,
      stageLeads: leads
        .filter(l => normalizeStage(l.stage) === stage)
        .filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }));
  }, [leads, stages, searchQuery]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar min-h-[600px] -mx-4 px-4 sm:mx-0 sm:px-0">
      {filteredData.map(({ stage, stageLeads }) => (
          <div key={stage} className="flex-shrink-0 w-80">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">{stage}</h4>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {stageLeads.length}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              {stageLeads.map((lead: Lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onClick={onLeadClick} 
                />
              ))}
              {stageLeads.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-xs italic">
                  No leads in this stage
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
});
