"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Menu, 
  AlertCircle, 
  RefreshCw,
  Download,
  Settings,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStage, UserRole } from '@/lib/types';

// Dynamically imported components
const LoginScreen = dynamic(() => import('@/components/LoginScreen').then(mod => mod.LoginScreen), { ssr: false });
const Sidebar = dynamic(() => import('@/components/dashboard/Sidebar').then(mod => mod.Sidebar), { ssr: false });
const StatGrid = dynamic(() => import('@/components/dashboard/StatGrid').then(mod => mod.StatGrid), { ssr: false });
const KanbanView = dynamic(() => import('@/components/dashboard/KanbanView').then(mod => mod.KanbanView), { ssr: false });
const ListView = dynamic(() => import('@/components/dashboard/ListView').then(mod => mod.ListView), { ssr: false });
const AnalysisView = dynamic(() => import('@/components/dashboard/AnalysisView').then(mod => mod.AnalysisView), { ssr: false });
const BottomNav = dynamic(() => import('@/components/dashboard/BottomNav').then(mod => mod.BottomNav), { ssr: false });
const TodayView = dynamic(() => import('@/components/dashboard/TodayView').then(mod => mod.TodayView), { ssr: false });
const TemplatesView = dynamic(() => import('@/components/dashboard/TemplatesView').then(mod => mod.TemplatesView), { ssr: false });
const LostLeadsView = dynamic(() => import('@/components/dashboard/LostLeadsView').then(mod => mod.LostLeadsView), { ssr: false });
const ImportModal = dynamic(() => import('@/components/dashboard/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const AddLeadModal = dynamic(() => import('@/components/dashboard/AddLeadModal').then(mod => mod.AddLeadModal), { ssr: false });
const SearchBar = dynamic(() => import('@/components/dashboard/SearchBar').then(mod => mod.SearchBar), { ssr: false });
const LeadDrawer = dynamic(() => import('@/components/dashboard/LeadDrawer').then(mod => mod.LeadDrawer), { ssr: false });
const SettingsModal = dynamic(() => import('@/components/dashboard/SettingsModal').then(mod => mod.SettingsModal), { ssr: false });

// UI Components (imported directly for smaller, frequently used components or for TS type consistency)
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// Utility functions
import { cn, normalizeStage, safeFormat } from '@/lib/utils';
import { getWhatsAppLink } from '@/lib/messaging-utils';

const STAGES: LeadStage[] = [
  'New', 'Registration requested', 'Registration done', 'Test sent', 'Test completed', 
  '1:1 scheduled', 'Session complete', 'Report sent', 'Lost'
];

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { leads, templates, loading, error, reminders, fetchLeads, updateLead, deleteLead, addLead } = useLeads();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<LeadStage | 'All'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'today' | 'templates' | 'lost' | 'analysis' | 'customers'>('leads');
  const [isSyncing, setIsSyncing] = useState(false);
  const historyStateRef = useRef<string>('root');

  const currentLead = useMemo(() => {
    if (!selectedLead) return null;
    return leads.find(l => l.id === selectedLead.id) || selectedLead;
  }, [leads, selectedLead]);

  useEffect(() => {
    if ((session as any)?.error === "RefreshAccessTokenError") {
        signOut({ callbackUrl: '/' });
    }
  }, [session]);

  // This effect ensures that if a user tries to access a restricted page (like settings for staff)
  // and then navigates back, the settings modal is properly closed if they're not an admin.
  useEffect(() => {
    if (isSettingsOpen && session?.user?.role !== UserRole.Admin) {
      setIsSettingsOpen(false);
    }
  }, [isSettingsOpen, session?.user?.role]);

  useEffect(() => {
    if (activeTab === 'analysis' && session?.user?.role !== UserRole.Admin) {
      setActiveTab('leads');
    }
  }, [activeTab, session?.user?.role]);

  const closeTopOverlay = useCallback(() => {
    if (selectedLead) {
      setSelectedLead(null);
      return true;
    }
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return true;
    }
    if (isImportModalOpen) {
      setIsImportModalOpen(false);
      return true;
    }
    if (isAddModalOpen) {
      setIsAddModalOpen(false);
      return true;
    }
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return true;
    }
    return false;
  }, [selectedLead, isSettingsOpen, isImportModalOpen, isAddModalOpen, isSidebarOpen]);

  const overlayState = useMemo(() => {
    if (selectedLead) return `lead:${selectedLead.id}`;
    if (isSettingsOpen) return 'settings';
    if (isImportModalOpen) return 'import';
    if (isAddModalOpen) return 'add';
    if (isSidebarOpen) return 'sidebar';
    return 'root';
  }, [selectedLead, isSettingsOpen, isImportModalOpen, isAddModalOpen, isSidebarOpen]);

  useEffect(() => {
    const url = window.location.pathname;

    if (!window.history.state?.dashboardGuard) {
      window.history.replaceState({ dashboardGuard: true, overlay: 'root' }, '', url);
      historyStateRef.current = 'root';
    }

    if (overlayState !== 'root' && historyStateRef.current !== overlayState) {
      window.history.pushState({ dashboardGuard: true, overlay: overlayState }, '', url);
      historyStateRef.current = overlayState;
    }

    if (overlayState === 'root') {
      historyStateRef.current = 'root';
    }
  }, [overlayState]);

  useEffect(() => {
    const handlePopState = () => {
      const closedOverlay = closeTopOverlay();

      if (closedOverlay) {
        window.history.pushState({ dashboardGuard: true, overlay: 'root' }, '', window.location.pathname);
        historyStateRef.current = 'root';
        return;
      }

      router.replace('/');
      window.history.pushState({ dashboardGuard: true, overlay: 'root' }, '', '/');
      historyStateRef.current = 'root';
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeTopOverlay, router]);

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/leads/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      alert(`Synchronized! Added ${data.added} new leads.`);
      fetchLeads();
    } catch (err: any) {
      alert('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const closeImportModal = useCallback(() => setIsImportModalOpen(false), []);
  const handleImportSuccess = useCallback(() => {
    setIsImportModalOpen(false);
    fetchLeads();
  }, [fetchLeads]);

  const handleAddLead = useCallback(async (lead: Partial<Lead>) => {
    if (!session?.user?.id) return;
    await addLead({ ...lead, ownerUid: session.user.id, updatedAt: new Date().toISOString() });
  }, [addLead, session?.user?.id]);

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

  const pipelineCount = useMemo(() => {
    return leads.filter(l => {
      const normalized = normalizeStage(l.stage);
      return l.stage !== 'Lost' && normalized !== 'Report sent';
    }).length;
  }, [leads]);

  const kanbanStages = useMemo(() => 
    STAGES.filter(s => s !== 'Lost' && s !== 'Report sent'),
  []);

  const isSearchActive = searchQuery.trim().length > 0;

  // Main Render Logic
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-primary-600 mx-auto" />
          <p className="text-slate-500 font-medium tracking-tight">Authenticating your session...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.role) {
    console.warn(`[Dashboard] Blocking access - unauthenticated or no role. Status: ${status}, Role: ${session?.user?.role}`);
    return <LoginScreen />;
  }


  // Main Dashboard Content
  return (
    <div className="flex min-h-screen pb-24 lg:pb-0">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div key="mobile-sidebar-container" initial="initial" animate="animate" exit="exit" className="fixed inset-0 z-[60] lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="absolute inset-0 bg-slate-900/40" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }} className="absolute inset-y-0 left-0 w-72 z-[70] will-change-transform">
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onMobileClose={() => setIsSidebarOpen(false)} onPreferencesClick={() => setIsSettingsOpen(true)} pipelineCount={pipelineCount} customerCount={customerCount} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden lg:block w-72 h-screen sticky top-0 shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onPreferencesClick={() => setIsSettingsOpen(true)} pipelineCount={pipelineCount} customerCount={customerCount} />
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
              {session?.user?.role === UserRole.Admin && (
                <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 p-0 rounded-xl"><Settings size={18} /></Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncContacts} 
                disabled={isSyncing}
                className="hidden md:flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-bold"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                SYNC CONTACTS
              </Button>
              {activeTab === 'leads' && (
                <>
                  {session?.user?.role === UserRole.Admin && (
                    <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)} className="h-10 px-4 rounded-xl hidden md:flex gap-2 text-xs font-bold"><Download size={16} />Import Leads</Button>
                  )}
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
                          {isFeesReminder && <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-600" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); updateLead(lead.id, { feesPaid: 'Paid' }); }}>Mark Paid</Button>}
                          <Button size="sm" className="flex-1 rounded-xl text-[10px]" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); if (isFeesReminder) { window.open(getWhatsAppLink(lead, 'fees_reminder', templates), '_blank'); } else if (stage === 'Report sent') { window.open(getWhatsAppLink(lead, 'review', templates), '_blank'); } else if (stage === 'Test sent') { window.open(getWhatsAppLink(lead, 'test_nudge', templates), '_blank'); } else { window.open(getWhatsAppLink(lead, 'followup', templates), '_blank'); } }}>
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
        {activeTab === 'templates' && <TemplatesView />}
        {activeTab === 'lost' && <LostLeadsView leads={leads} updateLead={updateLead} />}
        {activeTab === 'analysis' && session?.user?.role === UserRole.Admin && <AnalysisView leads={leads} />}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onAddClick={() => setIsAddModalOpen(true)} />

      <AnimatePresence>
        {currentLead && (
          <LeadDrawer key={`lead-drawer-${currentLead.id}`} lead={currentLead} onClose={() => setSelectedLead(null)} onUpdate={updateLead} onDelete={deleteLead} fetchLeads={fetchLeads} stages={STAGES} templates={templates} />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {isSettingsOpen && (
          <SettingsModal 
            onClose={() => setIsSettingsOpen(false)} 
          />
        )}
        {isImportModalOpen && <ImportModal onClose={closeImportModal} onSuccess={handleImportSuccess} />}
        {isAddModalOpen && session?.user && (
          <AddLeadModal 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={handleAddLead} 
            user={session.user} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
