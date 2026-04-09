import React, { useState } from 'react';
import { Lead, FeesPaidStatus } from '@/lib/types';
import { CreditCard, IndianRupee, ChevronDown, Check, AlertCircle, Ban, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
}

export function DrawerFeesForm({ lead, onUpdate }: Props) {
  const [localFeesPaid, setLocalFeesPaid] = React.useState<FeesPaidStatus>(lead.feesPaid || 'Due');
  const isPaid = localFeesPaid === 'Paid';

  const handleStatusChange = (status: FeesPaidStatus) => {
    setLocalFeesPaid(status);
    onUpdate(lead.id, { feesPaid: status });
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <CreditCard className="text-primary-600" size={20} />
                <span className="font-bold text-sm">Professional Fees</span>
            </div>
        </div>
        
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Fee Status</label>
            <div className={cn(
                "flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border rounded-2xl transition-all",
                lead.feesPaid === 'Paid' ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30" : 
                lead.feesPaid === 'Due' ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/30" : 
                lead.feesPaid === 'Bad debt' ? "border-red-200 dark:border-red-900/50 bg-red-50/30" : 
                "border-slate-200 dark:border-slate-800"
            )}>
                {lead.feesPaid === 'Paid' && <Check size={20} className="text-emerald-500" />}
                {lead.feesPaid === 'Due' && <AlertCircle size={20} className="text-amber-500" />}
                {lead.feesPaid === 'Waived' && <Ban size={20} className="text-slate-400" />}
                {lead.feesPaid === 'Bad debt' && <XCircle size={20} className="text-red-500" />}
                
                <select 
                    className="flex-1 bg-transparent font-bold text-sm outline-none appearance-none cursor-pointer"
                    value={localFeesPaid}
                    onChange={(e) => {
                        const status = e.target.value as FeesPaidStatus;
                        handleStatusChange(status);
                    }}
                >
                    <option value="Due">Fees Due</option>
                    <option value="Paid">Fees Paid</option>
                    <option value="Waived">Fees Waived</option>
                    <option value="Bad debt">Bad Debt</option>
                </select>
                <ChevronDown size={18} className="text-slate-400 pointer-events-none" />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Amount</label>
                <div className="relative">
                    <IndianRupee size={16} className={cn("absolute left-4 top-1/2 -translate-y-1/2", isPaid ? "text-slate-900 dark:text-white" : "text-slate-300")} />
                    <input 
                        type="number"
                        placeholder="0" 
                        defaultValue={lead.feesAmount} 
                        disabled={!isPaid}
                        onBlur={(e) => {
                            if (isPaid && e.target.value !== lead.feesAmount) {
                                onUpdate(lead.id, { feesAmount: e.target.value });
                            }
                        }} 
                        className={cn(
                            "w-full pl-10 pr-4 py-4 rounded-2xl text-sm font-bold border outline-none transition-all",
                            isPaid 
                                ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-primary-500 shadow-sm text-slate-900 dark:text-white" 
                                : "bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-400 cursor-not-allowed"
                        )} 
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Mode</label>
                <div className="relative">
                    <select 
                        defaultValue={lead.paymentMode} 
                        disabled={!isPaid}
                        onChange={(e) => {
                            if (isPaid && e.target.value !== lead.paymentMode) {
                                onUpdate(lead.id, { paymentMode: e.target.value });
                            }
                        }} 
                        className={cn(
                            "w-full p-4 rounded-2xl text-sm font-bold border outline-none appearance-none transition-all",
                            isPaid 
                                ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-primary-500 shadow-sm cursor-pointer text-slate-900 dark:text-white" 
                                : "bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <option value="">Select mode...</option>
                        <option value="Online">Online</option>
                        <option value="Cash">Cash</option>
                    </select>
                    <ChevronDown size={18} className={cn("absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none", isPaid ? "text-slate-400" : "text-slate-300")} />
                </div>
            </div>
        </div>
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Transaction ID / Receipt #</label>
            <input 
                placeholder={isPaid ? "Enter receipt number..." : ""} 
                defaultValue={lead.transactionId} 
                        disabled={!isPaid}
                        onBlur={(e) => {
                            if (isPaid && e.target.value !== lead.transactionId) {
                                onUpdate(lead.id, { transactionId: e.target.value });
                            }
                        }} 

                className={cn(
                    "w-full p-4 rounded-2xl text-xs font-mono border outline-none transition-all",
                    isPaid 
                        ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-primary-500 shadow-sm text-slate-900 dark:text-white" 
                        : "bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-400 cursor-not-allowed"
                )}
            />
        </div>
      </div>
    </div>
  );
}
