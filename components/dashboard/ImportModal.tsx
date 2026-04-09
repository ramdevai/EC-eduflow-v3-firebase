"use client";

import React, { useState, memo } from 'react';
import { useSession } from "next-auth/react";
import { UserRole } from '@/lib/types';
import { 
  X, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Database,
  ArrowRight,
  ShieldAlert,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal = memo(function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === UserRole.Admin;

  if (!isAdmin) {
    // Ideally, a parent component should prevent rendering this, or display an access denied message
    return null; 
  }
  const [mode, setMode] = useState<'selection' | 'sheet' | 'contacts'>('selection');
  const [externalId, setExternalId] = useState('1cdEuiNvsxEBWgOK718WxCcSDhNKOYkDfsQKHLdDFpZI');
  const [step, setStep] = useState<'input' | 'analyze' | 'confirm' | 'success'>('input');
  const [analysis, setAnalysis] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<{ checked: number; added: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupMode, setDupMode] = useState<'skip' | 'allow'>('skip');

  const handleAnalyze = async () => {
    if (!externalId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/import/analyze', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ externalSheetId: externalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/import/execute', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            externalSheetId: externalId,
            handleDuplicates: dupMode
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leads/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult({ checked: data.checked, added: data.added });
      setMode('contacts');
      setStep('success');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 transition-opacity">
      <Card className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/30 text-primary-600 flex items-center justify-center">
              <Download size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black dark:text-white">Data Migration</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">External Import Utility</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="rounded-full w-10 h-10 p-0">
            <X size={24} />
          </Button>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {mode === 'selection' && (
            <div className="grid grid-cols-1 gap-4">
               <button 
                onClick={handleSyncContacts}
                disabled={loading}
                className="group p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-left hover:border-primary-500 transition-all flex items-center gap-6"
               >
                 <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {loading ? <Loader2 className="animate-spin" /> : <Users size={28} />}
                 </div>
                 <div className="flex-1">
                    <h4 className="text-lg font-black dark:text-white">Google Contacts</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Fetch new leads ending with a date suffix (DDMMYY).</p>
                 </div>
                 <ArrowRight className="text-slate-300 group-hover:text-primary-500 transition-colors" size={20} />
               </button>

               <button 
                onClick={() => setMode('sheet')}
                className="group p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-left hover:border-primary-500 transition-all flex items-center gap-6"
               >
                 <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Database size={28} />
                 </div>
                 <div className="flex-1">
                    <h4 className="text-lg font-black dark:text-white">Google Sheet</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Migrate data from an existing lead spreadsheet.</p>
                 </div>
                 <ArrowRight className="text-slate-300 group-hover:text-amber-500 transition-colors" size={20} />
               </button>
            </div>
          )}

          {mode === 'sheet' && step === 'input' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">External Google Sheet ID</label>
                <div className="relative">
                  <input 
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    placeholder="Paste ID here..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:border-primary-500 transition-all"
                  />
                  <button onClick={() => setMode('selection')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary-600 uppercase">Change</button>
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 rounded-2xl space-y-2">
                <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tight">
                  Important Notes:
                </p>
                <ul className="text-[10px] leading-relaxed text-amber-700/80 dark:text-amber-400/80 list-disc ml-4 font-medium">
                    <li>Data must be on the <b>first tab</b> of the external spreadsheet.</li>
                    <li>Imported leads will be set to <b>Won</b> status.</li>
                    <li>Inquiry Date will be pulled from the <b>Timestamp</b> column.</li>
                </ul>
              </div>
              <Button className="w-full h-16 rounded-2xl font-black text-lg gap-2" onClick={handleAnalyze} disabled={loading || !externalId}>
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                Analyze External Data
              </Button>
            </div>
          )}

          {mode === 'sheet' && step === 'confirm' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Leads</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{analysis.total}</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl text-center">
                  <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Duplicates Found</p>
                  <p className="text-2xl font-black text-amber-600">{analysis.duplicates}</p>
                </div>
              </div>

              {analysis.matchedFields && (
                <div className="px-2 space-y-2">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Auto-detected Columns:</p>
                    <div className="flex flex-wrap gap-2">
                        {analysis.matchedFields.email && <Badge variant="info" className="text-[8px]">Email: {analysis.matchedFields.email}</Badge>}
                        {analysis.matchedFields.phone && <Badge variant="info" className="text-[8px]">Phone: {analysis.matchedFields.phone}</Badge>}
                    </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Handle Duplicates</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button 
                    onClick={() => setDupMode('skip')}
                    className={`py-3 rounded-lg text-xs font-bold transition-all ${dupMode === 'skip' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Skip (Recommended)
                  </button>
                  <button 
                    onClick={() => setDupMode('allow')}
                    className={`py-3 rounded-lg text-xs font-bold transition-all ${dupMode === 'allow' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Import Anyway
                  </button>
                </div>
              </div>

              <div className="p-4 bg-primary-50 dark:bg-primary-950/30 rounded-2xl border border-primary-100 dark:border-primary-900/20 flex gap-4">
                <ShieldAlert className="text-primary-600 shrink-0" size={20} />
                <div>
                  <p className="text-[11px] font-bold text-primary-700 dark:text-primary-400">Confirmation Required</p>
                  <p className="text-[10px] text-primary-600/80 dark:text-primary-400/60 leading-relaxed">
                    Importing <b>{dupMode === 'skip' ? analysis.total - analysis.duplicates : analysis.total}</b> leads. 
                    Their status will be <b>Won</b> and Inquiry Date will be pulled from <b>Timestamp</b>.
                  </p>
                </div>
              </div>

              <Button className="w-full h-16 rounded-2xl font-black text-lg gap-2" onClick={handleExecute} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Database size={20} />}
                Start Import Now
              </Button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {mode === 'contacts' ? 'Contacts Synced!' : 'Import Complete!'}
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {mode === 'contacts' 
                    ? `Successfully added ${syncResult?.added} new leads from your contacts.`
                    : 'Your CRM has been updated with the external data.'
                  }
                </p>
              </div>
              <Button className="w-full h-14 rounded-2xl" onClick={onClose}>
                Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
});
