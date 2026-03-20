import React from 'react';
import { Lead } from '@/lib/types';

interface Props {
  lead: Lead;
  onUpdate: (id: number, updates: Partial<Lead>) => void;
}

export function DrawerFamilyForm({ lead, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Father's Details</p>
        <div className="grid grid-cols-2 gap-4">
            <input 
                placeholder="Name" 
                defaultValue={lead.fatherName} 
                onBlur={(e) => { if (e.target.value !== lead.fatherName) onUpdate(lead.id, { fatherName: e.target.value }); }} 
                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
            />
            <input 
                placeholder="Phone" 
                defaultValue={lead.fatherPhone} 
                onBlur={(e) => { if (e.target.value !== lead.fatherPhone) onUpdate(lead.id, { fatherPhone: e.target.value }); }} 
                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
            />
        </div>
        <input 
            placeholder="Occupation" 
            defaultValue={lead.fatherOccupation} 
            onBlur={(e) => { if (e.target.value !== lead.fatherOccupation) onUpdate(lead.id, { fatherOccupation: e.target.value }); }} 
            className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
        />
      </div>
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Mother's Details</p>
        <div className="grid grid-cols-2 gap-4">
            <input 
                placeholder="Name" 
                defaultValue={lead.motherName} 
                onBlur={(e) => { if (e.target.value !== lead.motherName) onUpdate(lead.id, { motherName: e.target.value }); }} 
                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
            />
            <input 
                placeholder="Phone" 
                defaultValue={lead.motherPhone} 
                onBlur={(e) => { if (e.target.value !== lead.motherPhone) onUpdate(lead.id, { motherPhone: e.target.value }); }} 
                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
            />
        </div>
        <input 
            placeholder="Occupation" 
            defaultValue={lead.motherOccupation} 
            onBlur={(e) => { if (e.target.value !== lead.motherOccupation) onUpdate(lead.id, { motherOccupation: e.target.value }); }} 
            className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
        />
      </div>
    </div>
  );
}
