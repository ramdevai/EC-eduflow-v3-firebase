"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Menu, 
  AlertCircle, 
  RefreshCw,
  X,
  Sparkles,
  Settings,
  Database,
  ExternalLink,
  Link as LinkIcon,
  ChevronRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession, signOut } from "next-auth/react";
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStage } from '@/lib/types';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatGrid } from '@/components/dashboard/StatGrid';
import { KanbanView } from '@/components/dashboard/KanbanView';
import { ListView } from '@/components/dashboard/ListView';
import { AnalysisView } from '@/components/dashboard/AnalysisView';

const LeadDrawer = dynamic(() => import('@/components/dashboard/LeadDrawer').then(mod => mod.LeadDrawer), { ssr: false });

import { BottomNav } from '@/components/dashboard/BottomNav';
import { TodayView } from '@/components/dashboard/TodayView';
import { TemplatesView } from '@/components/dashboard/TemplatesView';
import { LostLeadsView } from '@/components/dashboard/LostLeadsView';
import { ImportModal } from '@/components/dashboard/ImportModal';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn, normalizeStage, safeFormat } from '@/lib/utils';
import { getWhatsAppLink } from '@/lib/messaging-utils';
import { LoginScreen } from '@/components/LoginScreen';

const STAGES: LeadStage[] = [
  'New', 'Registration requested', 'Registration done', 'Test sent', 'Test completed', 
  '1:1 scheduled', 'Session complete', 'Report sent', 'Lost'
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { leads, templates, loading, error, sheetId, reminders, fetchLeads, updateLead, deleteLead, addLead, saveSheetId } = useLeads();
  
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<LeadStage | 'All'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [activeTab, setActiveTab] = useState<'leads' | 'today' | 'templates' | 'lost' | 'analysis' | 'customers'>('leads');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const currentLead = useMemo(() => {
    if (!selectedLead) return null;
    return leads.find(l => l.id === selectedLead.id) || selectedLead;
  }, [leads, selectedLead]);

  const [isInitializing, setIsInitializing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && mounted) {
      if (window.location.search || window.location.hash) {
          window.history.replaceState(null, '', '/');
      }
      
      const justLoggedIn = sessionStorage.getItem('just_logged_in');
      if (justLoggedIn) {
        window.history.replaceState(null, '', '/');
        sessionStorage.removeItem('just_logged_in');
      }
    }
  }, [status, mounted]);


  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateSheet = async () => {
    setIsCreating(true);
    try {
      const createRes = await fetch('/api/setup/create-sheet', { method: 'POST' });
      const createData = await createRes.json();
      
      if (createRes.status === 401) {
        if (confirm(`${createData.error}\n\nWould you like to Sign Out now so you can log in again and fix this?`)) {
          signOut({ callbackUrl: '/' });
        }
        return;
      }
      
      if (!createRes.ok) throw new Error(createData.error);
      const newSheetId = createData.sheetId;
      const initRes = await fetch('/api/setup/initialize-sheet', {
        method: 'POST',
        headers: { 'x-sheet-id': newSheetId }
      });
      const initData = await initRes.json();
      
      if (initRes.status === 401) {
        if (confirm(`${initData.error}\n\nWould you like to Sign Out now so you can log in again and fix this?`)) {
          signOut({ callbackUrl: '/' });
        }
        return;
      }
      
      if (!initRes.ok) throw new Error(initData.error);
      saveSheetId(newSheetId);
      alert('Workspace created and initialized successfully!');
      fetchLeads();
    } catch (err: any) {
      alert('Creation failed: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExisting = async () => {
    const input = document.getElementById('sheet-id-input') as HTMLInputElement;
    const id = input.value.trim();
    if (!id) {
        alert('Please enter a Sheet ID');
        return;
    }

    setIsConnecting(true);
    try {
        const res = await fetch('/api/setup/initialize-sheet', {
            method: 'POST',
            headers: { 
                'x-sheet-id': id,
                'x-validate-only': 'true'
            }
        });
        const data = await res.json();
        
        if (res.status === 401) {
            if (confirm(`${data.error}\n\nWould you like to Sign Out now so you can log in again and fix this?`)) {
                signOut({ callbackUrl: '/' });
            }
            return;
        }
        
        if (!res.ok) {
            if (confirm(`${data.error}\n\nWould you like to run 'Fix sheet structure' now to repair these issues automatically? (No existing data will be lost)`)) {
                setIsInitializing(true);
                const initRes = await fetch('/api/setup/initialize-sheet', {
                    method: 'POST',
                    headers: { 'x-sheet-id': id }
                });
                const initData = await initRes.json();
                
                if (initRes.status === 401) {
                    if (confirm(`${initData.error}\n\nWould you like to Sign Out now so you can log in again and fix this?`)) {
                        signOut({ callbackUrl: '/' });
                    }
                    return;
                }
                
                if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize sheet');
                saveSheetId(id);
                setIsSettingsOpen(false);
                fetchLeads();
            }
            return;
        }

        saveSheetId(id);
        setIsSettingsOpen(false);
        fetchLeads();
    } catch (err: any) {
        alert('Connection failed: ' + err.message);
    } finally {
        setIsConnecting(false);
        setIsInitializing(false);
    }
  };

  const handleSyncContacts = async () => {
    if (!sheetId) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/leads/sync', {
        method: 'POST',
        headers: { 'x-sheet-id': sheetId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      let message = `Sync complete!`;
      if (data.added > 0) message += `\n✅ Added: ${data.added} new leads.`;
      if (data.updated > 0) message += `\n🔄 Updated: ${data.updated} existing leads.`;
      
      if (data.skippedCount > 0) {
        message += `\n⏭️ Skipped: ${data.skippedCount} (Unchanged duplicates).`;
      }
      if (data.added === 0 && data.updated === 0 && data.skippedCount === 0) {
        message = "No leads found in your contacts matching 'lead'.";
      }
      alert(message);
      fetchLeads();
    } catch (err: any) {
      alert('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeedLeads = async () => {
    if (!sheetId) return;
    if (!confirm('This will add sample leads to your sheet. Continue?')) return;
    setIsSeeding(true);
    try {
      const res = await fetch('/api/setup/seed-leads', {
        method: 'POST',
        headers: { 'x-sheet-id': sheetId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Successfully added ${data.count} sample leads!`);
      fetchLeads();
    } catch (err: any) {
      alert('Seeding failed: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleInitializeSheet = async () => {
    if (!sheetId) return;
    setIsInitializing(true);
    try {
      const res = await fetch('/api/setup/initialize-sheet', {
        method: 'POST',
        headers: { 'x-sheet-id': sheetId }
      });
      const data = await res.json();
      
      if (res.status === 401) {
        if (confirm(`${data.error}\n\nWould you like to Sign Out now so you can log in again and fix this?`)) {
          signOut({ callbackUrl: '/' });
        }
        return;
      }
      
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchLeads();
    } catch (err: any) {
      alert('Initialization failed: ' + err.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const filteredLeads = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const isSearchActive = query.length > 0;

    return leads.filter(lead => {
      const matchesSearch = !isSearchActive || 
                          lead.name.toLowerCase().includes(query) ||
                          lead.phone.includes(query) ||
                          (lead.email && lead.email.toLowerCase().includes(query));

      const normalized = normalizeStage(lead.stage);
      const matchesStage = (isSearchActive || selectedStage === 'All') || normalized === selectedStage;
      
      if (activeTab === 'lost') return lead.stage === 'Lost' && matchesSearch;
      if (activeTab === 'customers') return normalized === 'Report sent' && matchesSearch;
      
      return matchesSearch && matchesStage && lead.stage !== 'Lost' && normalized !== 'Report sent';
    });
  }, [leads, searchQuery, selectedStage, activeTab]);

  const customerCount = useMemo(() => {
    return leads.filter(l => normalizeStage(l.stage) === 'Report sent').length;
  }, [leads]);

  const kanbanStages = useMemo(() => 
    STAGES.filter(s => s !== 'Lost' && s !== 'Report sent'),
  []);

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {!mounted || status === "loading" ? (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <RefreshCw className="w-10 h-10 animate-spin text-primary-600 mx-auto" />
                    <p className="text-slate-500 font-medium tracking-tight">Authenticating your session...</p>
                </div>
            </div>
        ) : status === "unauthenticated" ? (
            <LoginScreen />
        ) : !sheetId || isSettingsOpen ? (
            <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
                    <Card className="p-8 md:p-10 space-y-10 shadow-2xl border-white/20">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-100">
                                <Database size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black dark:text-white tracking-tight">{sheetId ? 'Preferences' : 'Workspace Setup'}</h2>
                                <p className="text-slate-500 text-sm font-medium">
                                    {sheetId ? 'Manage your connected Google Sheet.' : 'Choose how you want to start with EduCompass.'}
                                </p>
                            </div>
                        </div>

                        {!sheetId ? (
                            <div className="space-y-6">
                                <button onClick={handleCreateSheet} disabled={isCreating} className="w-full text-left p-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] hover:border-primary-500 transition-all group flex items-center gap-6">
                                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                                        <Sparkles size={28} className={isCreating ? 'animate-spin' : ''} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-900 dark:text-white">Create New Workspace</h3>
                                        <p className="text-xs text-slate-500 mt-1">Recommended. Creates a fresh sheet with all tabs and templates automatically.</p>
                                    </div>
                                    <ChevronRight className="text-slate-300" />
                                </button>
                                <div className="flex items-center gap-4 px-4">
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">or connect existing</span>
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                                        <input id="sheet-id-input" placeholder="Paste your Google Sheet ID here..." className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white" />
                                    </div>
                                    <Button className="w-full h-16 rounded-2xl text-lg font-black shadow-lg" onClick={handleConnectExisting} disabled={isConnecting}>
                                        {isConnecting ? 'Validating...' : 'Connect Existing Sheet'}
                                    </Button>
                                    <p className="text-[10px] text-slate-400 italic text-center px-4">Sheet ID is in the URL: docs.google.com/spreadsheets/d/<span className="text-primary-600 font-bold">YOUR_ID</span>/edit</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Connected Google Sheet ID</label>
                                    <div className="flex gap-2">
                                        <input defaultValue={sheetId} id="sheet-id-input" className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-mono text-xs outline-none focus:border-primary-500 transition-all dark:text-white" />
                                        <Button variant="outline" className="h-14 w-14 p-0 rounded-2xl" onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, '_blank')}><ExternalLink size={20} /></Button>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 mt-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black text-emerald-600 tracking-widest uppercase">Live Workspace</span></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="outline" className="h-14 rounded-2xl font-bold" onClick={() => setIsSettingsOpen(false)}>Close</Button>
                                    <Button className="h-14 rounded-2xl font-black" onClick={handleConnectExisting} disabled={isConnecting}>{isConnecting ? 'Updating...' : 'Update Sheet'}</Button>
                                </div>
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                    <div className="text-center space-y-1"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">CRM Database Maintenance</h4><p className="text-[9px] text-slate-400 italic">Essential tools to keep your Google Sheet synchronized and healthy.</p></div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Button variant="secondary" className="w-full h-12 rounded-xl text-xs gap-2" onClick={handleInitializeSheet} disabled={isInitializing}><RefreshCw size={16} className={isInitializing ? 'animate-spin' : ''} />Fix sheet structure</Button>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 text-center px-4 leading-relaxed">Checks your spreadsheet for missing columns or tabs and repairs them automatically. <span className="font-bold text-emerald-600 dark:text-emerald-500"> Your existing lead data will not be lost or changed.</span></p>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
                                            <Button variant="outline" className="w-full h-12 rounded-xl text-xs gap-2 border-primary-100 text-primary-600 hover:bg-primary-50" onClick={() => { setIsSettingsOpen(false); setIsImportModalOpen(true); }}><Download size={14} />Import from External Sheet</Button>
                                            <Button variant="outline" className="w-full h-12 rounded-xl text-[10px] gap-2 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary-600 transition-all" onClick={handleSeedLeads} disabled={isSeeding}><Plus size={14} className={isSeeding ? 'animate-spin' : ''} />Seed Sample Data (Testing Only)</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="bg-primary-50 dark:bg-primary-900/10 p-5 rounded-[2rem] border border-primary-100 dark:border-primary-900/20 flex gap-4 items-start"><AlertCircle className="text-primary-600 shrink-0 mt-0.5" size={18} /><p className="text-xs leading-relaxed text-primary-700 dark:text-primary-400 font-medium">The app acts on your behalf using your Google account. Ensure you have Edit permissions for the connected sheet.</p></div>
                    </Card>
                </motion.div>
            </div>
        ) : (
            <div className="flex min-h-screen pb-24 lg:pb-0">
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div key="mobile-sidebar-container" initial="initial" animate="animate" exit="exit" className="fixed inset-0 z-[60] lg:hidden">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-slate-900/40" />
                            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }} className="absolute inset-y-0 left-0 w-72 z-[70] will-change-transform">
                                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onMobileClose={() => setIsSidebarOpen(false)} onPreferencesClick={() => setIsSettingsOpen(true)} customerCount={customerCount} />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="hidden lg:block w-72 h-screen sticky top-0 shrink-0">
                    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onPreferencesClick={() => setIsSettingsOpen(true)} customerCount={customerCount} />
                </div>

                <main className="flex-1 px-4 py-6 md:py-10 md:px-10 max-w-7xl mx-auto w-full overflow-hidden">
                    <header className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 -ml-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-400 active:scale-95 transition-all"><Menu size={20} /></button>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                                            {activeTab === 'today' ? "Today's Agenda" : 
                                             activeTab === 'templates' ? 'Message Templates' : 
                                             activeTab === 'lost' ? 'Lost Deals' : 
                                             activeTab === 'customers' ? 'All Customers' :
                                             activeTab === 'analysis' ? 'Business Analysis' :
                                             (selectedStage === 'All' ? 'Pipeline' : selectedStage)}
                                        </h1>
                                        {activeTab === 'leads' && reminders.length > 0 && selectedStage === 'All' && (
                                            <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-red-500 text-white text-[10px] font-black rounded-full">{reminders.length}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1"><Sparkles size={12} className="text-primary-500" /><p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">EduCompass CRM</p></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 p-0 rounded-xl"><Settings size={18} /></Button>
                                <Button variant="outline" size="sm" onClick={() => fetchLeads()} className="w-10 h-10 p-0 rounded-xl"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></Button>
                                {activeTab === 'leads' && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={handleSyncContacts} className={cn("h-10 px-4 rounded-xl hidden md:flex gap-2 text-xs font-bold", isSyncing && "opacity-50")} disabled={isSyncing}><Sparkles size={16} className={isSyncing ? 'animate-spin' : ''} />{isSyncing ? 'Syncing...' : 'Sync Contacts'}</Button>
                                        <Button className="hidden md:flex" onClick={() => setIsAddModalOpen(true)}><Plus size={18} />Add Lead</Button>
                                    </>
                                )}
                            </div>
                        </div>
                        {activeTab === 'leads' && !isSearchActive && !isSearchFocused && <StatGrid leads={leads} />}
                    </header>

                    {(activeTab === 'leads' || activeTab === 'customers') && (
                        <div className="space-y-10">
                            {/* Attention Required Items - NOW ABOVE ACTION BAR */}
                            {activeTab === 'leads' && !isSearchActive && !isSearchFocused && reminders.length > 0 && (
                                <section className="overflow-hidden">

                                    <div className="flex items-center gap-2 mb-4 px-1">
                                        <AlertCircle size={16} className="text-amber-500" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Attention Required</h3>
                                        <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">{reminders.length}</span>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
                                        {reminders.map(lead => {
                                            const stage = normalizeStage(lead.stage);
                                            const isFeesReminder = ['Test completed', '1:1 scheduled', 'Session complete', 'Report sent'].includes(stage) && lead.feesPaid === 'Due';
                                            return (
                                                <Card key={lead.id} className={cn("min-w-[280px] md:min-w-[320px] p-4 border-l-4 snap-center shadow-md cursor-pointer transition-colors", isFeesReminder ? "border-amber-500 bg-amber-50/10 hover:bg-amber-50/20" : "border-amber-500 bg-white dark:bg-slate-900 hover:border-amber-400")} onClick={() => setSelectedLead(lead)}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{lead.name}</h4>
                                                        <Badge variant={isFeesReminder ? 'warning' : lead.stage === 'Report sent' ? 'success' : 'warning'}>
                                                            {isFeesReminder ? 'Fees Due' : stage === 'New' ? 'Overdue' : stage === 'Registration requested' ? 'Follow-up' : stage === 'Registration done' ? 'Ready' : stage === 'Test sent' ? 'Nudge' : stage === 'Report sent' ? 'Review' : 'Follow-up'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                                                        {isFeesReminder ? 'Student is active but professional fees are pending.' : stage === 'New' ? 'Lead hasn\'t converted in 4 days. Time for a call.' : stage === 'Registration requested' ? 'Awaiting student details. Follow up on form completion.' : stage === 'Registration done' ? 'Student has shared details. Select and send the assessment link.' : stage === 'Test sent' ? 'Test link sent over 48h ago. Nudge for completion.' : stage === 'Session complete' ? 'Counseling done. Prepare and send the report.' : stage === 'Report sent' ? 'Report sent 2 days ago. Ask for a Google review.' : 'Action required for this student profile.'}
                                                    </p>
                                                    <div className="flex gap-2 mt-auto">
                                                        {isFeesReminder && <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-600" onClick={(e) => { e.stopPropagation(); updateLead(lead.id, { feesPaid: 'Paid' }); }}>Mark Paid</Button>}
                                                        <Button size="sm" className="flex-1 rounded-xl text-[10px]" onClick={(e) => { e.stopPropagation(); if (isFeesReminder) { window.open(getWhatsAppLink(lead, 'fees_reminder', templates), '_blank'); } else if (stage === 'Report sent') { window.open(getWhatsAppLink(lead, 'review', templates), '_blank'); } else if (stage === 'Test sent') { window.open(getWhatsAppLink(lead, 'test_nudge', templates), '_blank'); } else { window.open(getWhatsAppLink(lead, 'followup', templates), '_blank'); } }}>
                                                            {isFeesReminder ? 'Remind' : stage === 'New' ? 'Follow up' : stage === 'Registration requested' ? 'Remind' : stage === 'Test sent' ? 'Remind' : stage === 'Registration done' ? 'WhatsApp' : stage === 'Report sent' ? 'Ask Review' : 'WhatsApp'}
                                                        </Button>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Action Bar */}
                            <div className="flex items-center gap-2 md:gap-4">
                                <SearchBar 
                                    placeholder={activeTab === 'customers' ? "Search customers..." : "Search leads..."} 
                                    onSearch={setSearchQuery} 
                                    onFocusChange={setIsSearchFocused}
                                    initialValue={searchQuery} 
                                />
                                {activeTab === 'leads' && !isSearchActive && !isSearchFocused && (
                                    <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-sm shrink-0">
                                        <button onClick={() => setViewMode('list')} className={cn("p-2 md:px-4 md:py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest", viewMode === 'list' ? "bg-primary-600 text-white shadow-lg shadow-primary-200 dark:shadow-none" : "text-slate-400 hover:text-slate-600")}><ListIcon size={16} /><span className="hidden md:inline">List</span></button>
                                        <button onClick={() => setViewMode('kanban')} className={cn("p-2 md:px-4 md:py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest", viewMode === 'kanban' ? "bg-primary-600 text-white shadow-lg shadow-primary-200 dark:shadow-none" : "text-slate-400 hover:text-slate-600")}><LayoutGrid size={16} /><span className="hidden md:inline">Kanban</span></button>
                                    </div>
                                )}
                            </div>

                            {/* View Content */}
                            <div className="relative">
                                {error && (
                                    <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl flex items-center justify-between gap-4">
                                        <div className="text-red-600 text-xs font-bold leading-relaxed">
                                            {error.toLowerCase().includes('auth') || error.toLowerCase().includes('credential') || error.toLowerCase().includes('token')
                                                ? "Your Google session has expired or is invalid. Please sign in again to continue."
                                                : `Error: ${error}. Please check your Sheet ID or Google permissions.`
                                            }
                                        </div>
                                        {(error.toLowerCase().includes('auth') || error.toLowerCase().includes('credential') || error.toLowerCase().includes('token')) && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50 shrink-0 shadow-sm" 
                                                onClick={() => signOut({ callbackUrl: '/' })}
                                            >
                                                Sign In Again
                                            </Button>
                                        )}
                                    </div>
                                )}
                                
                                {loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">{[1, 2, 3].map(i => (<div key={i} className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem]" />))}</div>
                                ) : (isSearchActive || isSearchFocused) ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {isSearchActive ? 'Search Results' : 'Search Mode'}
                                            </h3>
                                            {isSearchActive && <Badge variant="info" className="text-[10px] font-black">{filteredLeads.length} matches</Badge>}
                                        </div>
                                        <ListView leads={filteredLeads} onLeadClick={setSelectedLead} />
                                    </div>
                                ) : activeTab === 'customers' ? (
                                    <ListView leads={filteredLeads} onLeadClick={setSelectedLead} />
                                ) : viewMode === 'kanban' ? (
                                    <KanbanView leads={leads} stages={kanbanStages} onLeadClick={setSelectedLead} searchQuery={searchQuery} />
                                ) : (
                                    <ListView leads={filteredLeads} onLeadClick={setSelectedLead} />
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'today' && <TodayView leads={leads} templates={templates} />}
                    {activeTab === 'templates' && <TemplatesView sheetId={sheetId!} />}
                    {activeTab === 'lost' && <LostLeadsView leads={leads} updateLead={updateLead} />}
                    {activeTab === 'analysis' && <AnalysisView leads={leads} />}
                </main>

                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onAddClick={() => setIsAddModalOpen(true)} onSyncClick={handleSyncContacts} isSyncing={isSyncing} />

                <AnimatePresence>
                    {currentLead && (
                        <LeadDrawer key={`lead-drawer-${currentLead.id}`} lead={currentLead} onClose={() => setSelectedLead(null)} onUpdate={updateLead} onDelete={deleteLead} fetchLeads={fetchLeads} stages={STAGES} templates={templates} />
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {isImportModalOpen && <ImportModal sheetId={sheetId!} onClose={() => setIsImportModalOpen(false)} onSuccess={() => { fetchLeads(); }} />}
                    {isAddModalOpen && (
                        <motion.div key="add-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
                            <motion.div key="add-modal-content" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} onClick={(e) => e.stopPropagation()} className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden border border-white/20">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-primary-600" />
                                <div className="flex items-center justify-between mb-8">
                                    <div><h3 className="text-2xl font-black dark:text-white tracking-tight">New Inquiry</h3><p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Add a student to your pipeline.</p></div>
                                    <Button variant="ghost" className="rounded-full w-12 h-12 p-0 bg-slate-50 dark:bg-slate-800" onClick={() => setIsAddModalOpen(false)}><X size={24} /></Button>
                                </div>
                                <form className="space-y-4" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    try {
                                        await addLead({ name: fd.get('name') as string, phone: fd.get('phone') as string, email: fd.get('email') as string, grade: fd.get('grade') as string, board: fd.get('board') as string });
                                        setIsAddModalOpen(false);
                                    } catch (err) { alert('Failed to add lead. Check your sheet ID and permissions.'); }
                                }}>
                                    <div className="space-y-4">
                                        <div className="group"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Full Name</label><input name="name" required placeholder="Student Name" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" /></div>
                                        <div className="group"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Contact Number</label><input name="phone" required placeholder="+91 00000 00000" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" /></div>
                                        <div className="group"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Email Address</label><input name="email" placeholder="example@mail.com" type="email" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Grade</label><input name="grade" placeholder="e.g. 10th" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" /></div>
                                            <div className="group"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Board</label><input name="board" placeholder="e.g. CBSE" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" /></div>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full py-5 text-lg font-black rounded-2xl mt-6 shadow-xl shadow-primary-200 dark:shadow-none">Create Lead Profile</Button>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )}
    </div>
  );
}
