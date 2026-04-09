import React from 'react';
import { Lead } from '@/lib/types';
import { safeFormat, toInputFormat } from '@/lib/utils';
import { Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { normalizeStage } from '@/lib/utils';

interface Props {
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  stageAge: number;
}

export function DrawerPipelineForm({ lead, onUpdate, stageAge }: Props) {
  const stage = normalizeStage(lead.stage);
  const isRegistrationPending = stage === 'New' || stage === 'Registration requested';

  return (
    <div className="px-1 pb-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stage Duration: {stageAge} days</p>
      </div>

      {isRegistrationPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 block">Student Phone</label>
                <div className="flex gap-2">
                    <input 
                        defaultValue={lead.phone} 
                        onBlur={(e) => {
                            if (e.target.value !== lead.phone) {
                                onUpdate(lead.id, { phone: e.target.value });
                            }
                        }}
                        className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-sm font-bold outline-none focus:border-primary-500"
                    />
                    <Button variant="outline" className="w-10 h-10 p-0 rounded-xl" onClick={() => window.open(`tel:${lead.phone}`)}>
                        <Phone size={16} />
                    </Button>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 block">Student Email</label>
                <div className="flex gap-2">
                    <input 
                        defaultValue={lead.email} 
                        onBlur={(e) => {
                            if (e.target.value !== lead.email) {
                                onUpdate(lead.id, { email: e.target.value });
                            }
                        }}
                        className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-sm font-bold outline-none focus:border-primary-500"
                    />
                    <Button variant="outline" className="w-10 h-10 p-0 rounded-xl" onClick={() => window.open(`mailto:${lead.email}`)}>
                        <Mail size={16} />
                    </Button>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  Inquiry Date {lead.inquiryDate ? `: ${safeFormat(lead.inquiryDate, 'dd MMM yyyy')}` : '(Not set)'}
              </label>
              <input 
                  type="date" 
                  defaultValue={toInputFormat(lead.inquiryDate)} 
                  onBlur={(e) => {
                      if (e.target.value !== toInputFormat(lead.inquiryDate)) {
                          onUpdate(lead.id, { inquiryDate: safeFormat(e.target.value) });
                      }
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" 
              />
          </div>
          <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Source</label>
              <input value={lead.source || 'Manual'} readOnly className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
          </div>
      </div>
    </div>
  );
}
