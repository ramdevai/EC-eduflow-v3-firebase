"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
    Search, 
    RefreshCw, 
    Trash2, 
    AlertCircle, 
    User, 
    Phone, 
    Mail, 
    ChevronRight,
    CheckCircle2,
    Filter,
    ArrowLeft,
    Check,
    Calendar,
    School,
    MapPin,
    CreditCard,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Lead } from '@/lib/types';
import { normalizeStage, safeFormat } from '@/lib/utils';

export function DuplicateFinder() {
    const [category, setCategory] = useState<'pipeline' | 'customers'>('pipeline');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedSet, setSelectedSet] = useState<Lead[] | null>(null);
    const [fullLeadsData, setFullLeadsData] = useState<Record<string, Lead>>({});

    const fetchLeads = async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            const res = await fetch(`/api/leads?category=${category}&summary=true`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
            }
        } catch (error) {
            console.error('Failed to fetch leads', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasSearched) {
            fetchLeads();
        }
    }, [category]);

    const duplicateGroups = useMemo(() => {
        const groups: Record<string, Lead[]> = {};
        
        leads.forEach(lead => {
            const phone = lead.phone.replace(/\D/g, '').slice(-10);
            const email = lead.email?.toLowerCase().trim();

            const keys = [];
            if (phone && phone.length === 10) keys.push(`phone:${phone}`);
            if (email && email.length > 5) keys.push(`email:${email}`);

            keys.forEach(key => {
                if (!groups[key]) groups[key] = [];
                if (!groups[key].find(l => l.id === lead.id)) {
                    groups[key].push(lead);
                }
            });
        });

        return Object.entries(groups)
            .filter(([_, groupLeads]) => groupLeads.length > 1)
            .map(([key, groupLeads]) => ({
                key,
                leads: groupLeads
            }));
    }, [leads]);

    const handleResolve = async (groupLeads: Lead[]) => {
        setLoading(true);
        try {
            // Fetch full data for each lead in the group
            const fullData: Record<string, Lead> = {};
            await Promise.all(groupLeads.map(async (l) => {
                const res = await fetch(`/api/leads/${l.id}`);
                if (res.ok) {
                    fullData[l.id] = await res.json();
                }
            }));
            setFullLeadsData(fullData);
            setSelectedSet(groupLeads.map(l => fullData[l.id] || l));
        } catch (error) {
            console.error('Failed to fetch full lead data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeepOne = async (keepId: string) => {
        if (!selectedSet) return;
        
        const toDelete = selectedSet.filter(l => l.id !== keepId);
        if (!confirm(`Are you sure? This will delete ${toDelete.length} duplicate record(s) and KEEP only this one.`)) return;
        
        setProcessingId(keepId);
        try {
            await Promise.all(toDelete.map(l => 
                fetch(`/api/leads/${l.id}`, { method: 'DELETE' })
            ));
            
            // Refresh list
            setLeads(prev => prev.filter(l => !toDelete.find(td => td.id === l.id)));
            setSelectedSet(null);
        } catch (error) {
            console.error('Resolution failed', error);
            alert('Failed to delete some duplicates. Please check console.');
        } finally {
            setProcessingId(null);
        }
    };

    if (selectedSet) {
        const fields = [
            { key: 'name', label: 'Student Name', icon: User },
            { key: 'phone', label: 'Phone', icon: Phone },
            { key: 'email', label: 'Email', icon: Mail },
            { key: 'stage', label: 'Stage', icon: Filter },
            { key: 'grade', label: 'Grade', icon: School },
            { key: 'board', label: 'Board', icon: Globe },
            { key: 'inquiryDate', label: 'Inquiry Date', icon: Calendar },
            { key: 'feesPaid', label: 'Fees Status', icon: CreditCard },
            { key: 'address', label: 'Address', icon: MapPin },
            { key: 'updatedAt', label: 'Last Updated', icon: RefreshCw },
            { key: 'notes', label: 'Notes', icon: AlertCircle },
        ];

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSet(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h4 className="text-sm font-black uppercase">Resolve Duplicates</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Compare & Choose</p>
                    </div>
                </div>

                <div className="overflow-x-auto pb-4 no-scrollbar">
                    <div className="flex gap-4 min-w-max">
                        {selectedSet.map((lead) => (
                            <Card key={lead.id} className={`w-80 overflow-hidden flex flex-col border-2 transition-all ${processingId === lead.id ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-slate-100 dark:border-slate-800'}`}>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={lead.status === 'Won' ? 'success' : lead.status === 'Lost' ? 'error' : 'info'} className="text-[9px] uppercase">
                                            {lead.status}
                                        </Badge>
                                        <span className="text-[9px] font-mono text-slate-400">ID: {lead.id.slice(-6)}</span>
                                    </div>
                                </div>
                                
                                <div className="p-4 space-y-5 flex-1">
                                    {fields.map((field) => {
                                        const value = (lead as any)[field.key];
                                        const isDifferent = selectedSet.some(other => (other as any)[field.key] !== value);
                                        
                                        return (
                                            <div key={field.key} className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <field.icon size={10} className="text-slate-400" />
                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">{field.label}</p>
                                                </div>
                                                <p className={`text-xs font-bold break-words ${isDifferent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {field.key === 'updatedAt' || field.key === 'inquiryDate' ? safeFormat(value) : (value || '—')}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                    <Button 
                                        className="w-full h-11 rounded-xl text-xs font-black uppercase gap-2" 
                                        onClick={() => handleKeepOne(lead.id)}
                                        disabled={!!processingId}
                                    >
                                        {processingId === lead.id ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                                        Keep This Version
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl">
                <button 
                    onClick={() => setCategory('pipeline')}
                    className={`flex-1 py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${category === 'pipeline' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400'}`}
                >
                    Pipeline
                </button>
                <button 
                    onClick={() => setCategory('customers')}
                    className={`flex-1 py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${category === 'customers' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400'}`}
                >
                    All Customers
                </button>
            </div>

            {!hasSearched ? (
                <div className="py-12 text-center space-y-6 bg-slate-50/50 dark:bg-slate-800/20 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/10 text-primary-600 rounded-full flex items-center justify-center mx-auto">
                        <Search size={32} />
                    </div>
                    <div className="space-y-2 px-6">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Ready to clean up your data?</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                            Scanning {category} will identify records with matching phone numbers or email addresses.
                        </p>
                    </div>
                    <Button onClick={fetchLeads} className="h-11 rounded-xl px-8 text-xs font-black uppercase gap-2 shadow-lg shadow-primary-100">
                        <RefreshCw size={16} />
                        Start Duplicate Scan
                    </Button>
                </div>
            ) : loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="animate-spin text-primary-500" size={32} />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scanning for duplicates...</p>
                </div>
            ) : duplicateGroups.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-500">No obvious duplicates found in {category}.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Found {duplicateGroups.length} Potential Sets
                            </h4>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchLeads} className="h-8 px-3 rounded-lg text-[10px] font-bold gap-2">
                            <RefreshCw size={12} /> Rescan
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {duplicateGroups.map((group) => (
                            <Card key={group.key} className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary-200 transition-all group">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <Badge variant="warning" className="text-[9px] font-black uppercase">
                                        MATCH: {group.key.split(':')[0]}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-slate-400">{group.key.split(':')[1]}</span>
                                </div>
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex -space-x-3">
                                        {group.leads.map((l, i) => (
                                            <div key={l.id} className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm" title={l.name}>
                                                {l.name.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold">{group.leads.length} Records</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Potential Conflict</p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleResolve(group.leads)}
                                        className="rounded-xl text-[10px] font-black uppercase gap-2 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-100"
                                    >
                                        Compare & Resolve
                                        <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
