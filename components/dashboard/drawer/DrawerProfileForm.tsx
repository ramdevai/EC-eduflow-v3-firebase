import React from 'react';
import { Lead } from '@/lib/types';
import { safeFormat, toInputFormat } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface Props {
  lead: Lead;
  onUpdate: (id: number, updates: Partial<Lead>) => void;
}

export function DrawerProfileForm({ lead, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="group">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Grade/Class</label>
          <input 
            defaultValue={lead.grade} 
            onBlur={(e) => { if (e.target.value !== lead.grade) onUpdate(lead.id, { grade: e.target.value }); }} 
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
          />
        </div>
        <div className="group">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Board</label>
          <input 
            defaultValue={lead.board} 
            onBlur={(e) => { if (e.target.value !== lead.board) onUpdate(lead.id, { board: e.target.value }); }} 
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
          />
        </div>
      </div>
      <div className="group">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">School Name</label>
        <input 
          defaultValue={lead.school} 
          onBlur={(e) => { if (e.target.value !== lead.school) onUpdate(lead.id, { school: e.target.value }); }} 
          className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="group">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                Date of Birth {lead.dob ? `: ${safeFormat(lead.dob, 'dd MMM yyyy')}` : '(Not set)'}
            </label>
            <input 
                type="date" 
                defaultValue={toInputFormat(lead.dob)} 
                onBlur={(e) => { if (e.target.value !== toInputFormat(lead.dob)) onUpdate(lead.id, { dob: safeFormat(e.target.value) }); }} 
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
            />
        </div>
        <div className="group">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Gender</label>
            <select 
                defaultValue={lead.gender} 
                onChange={(e) => { if (e.target.value !== lead.gender) onUpdate(lead.id, { gender: e.target.value }); }} 
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all appearance-none"
            >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
            </select>
        </div>
      </div>
    </div>
  );
}
