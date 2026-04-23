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
  counts?: { 
    pipeline: number; 
    customers: number; 
    stages: Record<string, number> 
  };
}

export const KanbanView = memo(function KanbanView({ leads, stages, onLeadClick, searchQuery, counts }: KanbanViewProps) {
  const filteredData = useMemo(() => {
    return stages.map(stage => {
      // Use lead count from database-wide totals for the header badge
      // unless a search is active (in which case we show local matches)
      const countFromDb = counts?.stages?.[stage] ?? counts?.stages?.[normalizeStage(stage)];
      
      const stageLeads = leads
        .filter(l => normalizeStage(l.stage) === normalizeStage(stage))
        .filter(l => !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return {
        stage,
        displayCount: searchQuery ? stageLeads.length : (countFromDb ?? stageLeads.length),
        stageLeads
      };
    });
  }, [leads, stages, searchQuery, counts]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar min-h-[600px] -mx-4 px-4 sm:mx-0 sm:px-0">
      {filteredData.map(({ stage, stageLeads, displayCount }) => (
          <div key={`column-${stage}`} className="flex-shrink-0 w-80">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">{stage}</h4>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {displayCount}
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
