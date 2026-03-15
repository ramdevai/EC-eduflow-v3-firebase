"use client";

import React from 'react';
import { format, parseISO } from 'date-fns';
import { MoreVertical, Phone, Mail, Clock } from 'lucide-react';
import { Lead } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { LeadCard } from './LeadCard';

interface ListViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function ListView({ leads, onLeadClick }: ListViewProps) {
  const getStageVariant = (stage: string) => {
    switch (stage) {
      case 'Converted': return 'success';
      case 'Lost': return 'error';
      case 'New': return 'info';
      case 'Test Sent':
      case 'Test Completed': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Card List */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {leads.map((lead) => (
          <LeadCard 
            key={lead.id} 
            lead={lead} 
            onClick={onLeadClick} 
            layoutId={`list-mobile-${lead.id}`}
          />
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">#</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lead Details</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Education</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {leads.map((lead, idx) => (
                <tr 
                  key={lead.id}
                  onClick={() => onLeadClick(lead)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <td className="p-4 text-xs font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-4">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                        {lead.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                        <Phone size={10} /> {lead.phone}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={getStageVariant(lead.stage)}>{lead.stage}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{lead.grade || 'N/A'}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{lead.board || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={14} className="text-slate-300" />
                      {format(parseISO(lead.inquiryDate), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {leads.length === 0 && (
        <div className="p-12 text-center text-slate-400 italic text-sm">
          No leads found matching your criteria.
        </div>
      )}
    </div>
  );
}
