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
  Users,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Papa from 'papaparse';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal = memo(function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === UserRole.Admin;

  const [mode, setMode] = useState<'selection' | 'contacts' | 'csv'>('selection');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [step, setStep] = useState<'analyze' | 'confirm' | 'success'>('analyze');
  const [analysis, setAnalysis] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<{ checked: number; added: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dupMode, setDupMode] = useState<'skip' | 'update'>('update');

  if (!isAdmin) {
    return null; 
  }

  const formatImportError = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes('resource_exhausted') || normalized.includes('quota exceeded')) {
      return 'Google Contacts quota exceeded. Wait a while and try again, or reduce sync frequency.';
    }

    return message;
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const payload = { rows: csvRows, handleDuplicates: dupMode, source: 'CSV Import' };

      const res = await fetch('/api/admin/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('success');
      onSuccess();
    } catch (err: any) {
      setError(formatImportError(err.message));
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
      setError(formatImportError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }
    setCsvFile(file);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvRows(results.data);
        setMode('csv');
        setStep('analyze');
      },
      error: (error) => setError('Failed to parse CSV: ' + error.message)
    });
  };

  const handleAnalyzeCsv = async () => {
    if (csvRows.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/import/analyze-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvRows, filename: csvFile?.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
      setStep('confirm');
    } catch (err: any) {
      setError(formatImportError(err.message));
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
                 onClick={() => document.getElementById('csv-upload')?.click()}
                 className="group p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-left hover:border-emerald-500 transition-all flex items-center gap-6"
                >
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                     <Upload size={28} />
                  </div>
                  <div className="flex-1">
                     <h4 className="text-lg font-black dark:text-white">Upload CSV</h4>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed">Import leads from a CSV file. First row must be headers.</p>
                  </div>
                  <ArrowRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={20} />
                </button>
             </div>
           )}
           <input
             id="csv-upload"
             type="file"
             accept=".csv"
             onChange={handleFileSelect}
             className="hidden"
           />

           {mode === 'csv' && step === 'analyze' && (
             <div className="space-y-6">
               <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-center">
                 <Upload className="mx-auto mb-4 text-emerald-600" size={48} />
                 <p className="font-black text-lg dark:text-white">{csvFile?.name}</p>
                 <p className="text-sm text-emerald-600 font-medium">{csvRows.length} rows detected</p>
               </div>
               <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 rounded-2xl space-y-2">
                 <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tight">
                   Important Notes:
                 </p>
                 <ul className="text-[10px] leading-relaxed text-amber-700/80 dark:text-amber-400/80 list-disc ml-4 font-medium">
                     <li>First row is used as column headers.</li>
                     <li>Columns like name, email, phone, grade, status are auto-mapped.</li>
                     <li>Missing fields will use sensible defaults.</li>
                 </ul>
               </div>
               <Button className="w-full h-16 rounded-2xl font-black text-lg gap-2" onClick={handleAnalyzeCsv} disabled={loading}>
                 {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                 Analyze CSV Data
               </Button>
             </div>
           )}

            {mode === 'csv' && step === 'confirm' && (

             <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">New Leads</p>
                   <p className="text-2xl font-black text-slate-900 dark:text-white">{analysis.newLeads}</p>
                 </div>
                 <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl text-center">
                   <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Existing Leads</p>
                   <p className="text-2xl font-black text-amber-600">{analysis.existing}</p>
                 </div>
               </div>

               {analysis.matchedFields && (
                 <div className="px-2 space-y-2">
                     <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Auto-detected Columns:</p>
                      <div className="flex flex-wrap gap-2">
                          {analysis.matchedFields.name && <Badge variant="info" className="text-[8px]">Name: {analysis.matchedFields.name}</Badge>}
                          {analysis.matchedFields.email && <Badge variant="info" className="text-[8px]">Email: {analysis.matchedFields.email}</Badge>}
                          {analysis.matchedFields.phone && <Badge variant="info" className="text-[8px]">Phone: {analysis.matchedFields.phone}</Badge>}
                          {analysis.matchedFields.grade && <Badge variant="info" className="text-[8px]">Grade: {analysis.matchedFields.grade}</Badge>}
                          {analysis.matchedFields.stage && <Badge variant="info" className="text-[8px]">Stage: {analysis.matchedFields.stage}</Badge>}
                          {analysis.sampleStatus && <Badge variant="info" className="text-[8px] bg-emerald-100 text-emerald-700">Status: {analysis.sampleStatus}</Badge>}
                      </div>

                 </div>
               )}

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Import Strategy</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button 
                      onClick={() => setDupMode('skip')}
                      className={`py-3 rounded-lg text-xs font-bold transition-all ${dupMode === 'skip' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      New Leads Only
                    </button>
                    <button 
                      onClick={() => setDupMode('update')}
                      className={`py-3 rounded-lg text-xs font-bold transition-all ${dupMode === 'update' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      Update Existing (Recommended)
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-primary-50 dark:bg-primary-950/30 rounded-2xl border border-primary-100 dark:border-primary-900/20 flex gap-4">
                  <ShieldAlert className="text-primary-600 shrink-0" size={20} />
                  <div>
                    <p className="text-[11px] font-bold text-primary-700 dark:text-primary-400">Confirmation Required</p>
                    <p className="text-[10px] text-primary-600/80 dark:text-primary-400/60 leading-relaxed">
                      {dupMode === 'update' 
                        ? `Merging data for ${analysis.existing} existing leads and adding ${analysis.newLeads} new leads.`
                        : `Adding ${analysis.newLeads} new leads. Existing records will be ignored.`
                      }
                      <br/>All 40+ columns will be mapped including family details, address, and fees.
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
                   {mode === 'contacts' ? 'Contacts Synced!' : mode === 'csv' ? 'CSV Imported!' : 'Import Complete!'}
                 </h3>
                 <p className="text-sm text-slate-500 font-medium">
                   {mode === 'contacts' 
                     ? `Successfully added ${syncResult?.added} new leads from your contacts.`
                     : mode === 'csv'
                     ? `Successfully imported leads from ${csvFile?.name}.`
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
