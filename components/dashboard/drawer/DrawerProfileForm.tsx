import React, { useState, useEffect } from 'react';
import { Lead } from '@/lib/types';
import { safeFormat, toInputFormat, cn, normalizeStage, safeParseISO } from '@/lib/utils';
import { differenceInYears, isValid } from 'date-fns';
import { Sparkles, Mail, Phone } from 'lucide-react';

interface Props {
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
}

export function DrawerProfileForm({ lead, onUpdate }: Props) {
  const [isEmailOnly, setIsEmailOnly] = useState(lead.communicateViaEmailOnly);

  // Sync state if lead changes (e.g. from server update)
  useEffect(() => {
    setIsEmailOnly(lead.communicateViaEmailOnly);
  }, [lead.communicateViaEmailOnly]);

  const handleToggle = () => {
    const newVal = !isEmailOnly;
    setIsEmailOnly(newVal);
    onUpdate(lead.id, { communicateViaEmailOnly: newVal });
  };

  const stage = normalizeStage(lead.stage);
  const isRegistrationDone = stage !== 'New' && stage !== 'Registration requested';

  return (
    <div className="space-y-4">
      <div className="p-4 bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/20 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Mail className="text-primary-600" size={20} />
            <div>
                <p className="text-sm font-bold">Communicate via Email Only</p>
                <p className="text-[10px] text-slate-500 font-medium">Disable all WhatsApp shortcuts for this student</p>
            </div>
        </div>
        <button 
            onClick={handleToggle}
            className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                isEmailOnly ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-800"
            )}
        >
            <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300", isEmailOnly ? "left-7" : "left-1")} />
        </button>
      </div>

      {isRegistrationDone && (
        <div className="grid grid-cols-2 gap-4">
            <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Student Phone</label>
                <div className="relative">
                    <input 
                        defaultValue={lead.phone} 
                        onBlur={(e) => { if (e.target.value !== lead.phone) onUpdate(lead.id, { phone: e.target.value }); }} 
                        className="w-full p-4 pr-12 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
                    />
                    <Phone size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
            </div>
            <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Student Email</label>
                <div className="relative">
                    <input 
                        defaultValue={lead.email} 
                        onBlur={(e) => { if (e.target.value !== lead.email) onUpdate(lead.id, { email: e.target.value }); }} 
                        className="w-full p-4 pr-12 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
                    />
                    <Mail size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
            </div>
        </div>
      )}

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
      <div className="group">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Residential Address</label>
        <textarea 
          defaultValue={lead.address} 
          onBlur={(e) => { if (e.target.value !== lead.address) onUpdate(lead.id, { address: e.target.value }); }} 
          className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all resize-none min-h-[80px]" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="group">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                Date of Birth {lead.dob ? `: ${safeFormat(lead.dob, 'dd MMM yyyy')}` : '(Not set)'}
                {(() => {
                    const dob = lead.dob ? safeParseISO(lead.dob) : null;
                    const age = (dob && isValid(dob)) ? differenceInYears(new Date(), dob) : null;
                    return age !== null ? ` (Age: ${age})` : '';
                })()}
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
