import React from 'react';
import { Lead } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ExternalLink } from 'lucide-react';

interface Props {
  lead: Lead;
  onUpdate: (id: number, updates: Partial<Lead>) => void;
}

export function DrawerCounselingForm({ lead, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">1:1 Session Notes</label>
        <textarea 
            defaultValue={lead.notes} 
            onBlur={(e) => { if (e.target.value !== lead.notes) onUpdate(lead.id, { notes: e.target.value }); }} 
            placeholder="Type session recommendations here..."
            className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-sm font-medium border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all resize-none min-h-[200px]" 
        />
      </div>
      <div className="space-y-4">
        <div className="group">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assessment URL</label>
          <div className="flex gap-2">
            <input 
              defaultValue={lead.testLink} 
              onBlur={(e) => { if (e.target.value !== lead.testLink) onUpdate(lead.id, { testLink: e.target.value }); }} 
              className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500" 
            />
            <Button variant="outline" className="rounded-2xl" onClick={() => window.open(lead.testLink, '_blank')} disabled={!lead.testLink}><ExternalLink size={16}/></Button>
          </div>
        </div>
        <div className="group">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Report PDF Link</label>
          <input 
            defaultValue={lead.reportPdfUrl} 
            onBlur={(e) => { if (e.target.value !== lead.reportPdfUrl) onUpdate(lead.id, { reportPdfUrl: e.target.value }); }} 
            placeholder="Paste edumilestones report link here..." 
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500" 
          />
        </div>
      </div>
    </div>
  );
}
