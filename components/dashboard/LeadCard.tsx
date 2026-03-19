"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, GraduationCap, ChevronRight, Clock, CreditCard, AlertCircle, Ban, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Lead } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn, normalizeStage } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  layoutId?: string;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const getStageVariant = (stage: string) => {
    const normalized = normalizeStage(stage);
    switch (normalized) {
      case 'Registration requested': 
      case 'Registration done': return 'success';
      case 'Lost': return 'error';
      case 'New': return 'info';
      case 'Test sent':
      case 'Test completed': return 'warning';
      case '1:1 scheduled':
      case 'Session complete':
      case 'Report sent': return 'success';
      default: return 'default';
    }
  };

  return (
    <div>
      <Card 
        onClick={() => onClick(lead)}
        className="p-4 cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 transition-colors group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="max-w-[180px]">
            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">
              {lead.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-400">
              <Phone size={10} />
              {lead.phone}
            </div>
          </div>
          <Badge variant={getStageVariant(lead.stage)}>
            {normalizeStage(lead.stage)}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            <GraduationCap size={12} />
            {lead.grade || 'N/A'} • {lead.board || 'N/A'}
          </div>
          {['1:1 scheduled', 'Session complete', 'Report sent'].includes(normalizeStage(lead.stage)) && (
            <>
              {lead.feesPaid === 'Paid' && (
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-bold text-emerald-600">
                    <CreditCard size={10} />
                    Paid
                </div>
              )}
              {lead.feesPaid === 'Due' && (
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[10px] font-bold text-amber-600">
                    <AlertCircle size={10} />
                    Due
                </div>
              )}
              {lead.feesPaid === 'Waived' && (
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                    <Ban size={10} />
                    Waived
                </div>
              )}
              {lead.feesPaid === 'Bad debt' && (
                <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-[10px] font-bold text-red-600">
                    <XCircle size={10} />
                    Bad Debt
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Clock size={12} />
            {lead.inquiryDate ? format(parseISO(lead.inquiryDate), 'MMM d, yyyy') : 'N/A'}
          </div>
          <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-primary-500 transform group-hover:translate-x-0.5 transition-all" />
        </div>
      </Card>
    </div>
  );
}
