"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from "next-auth/react";
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStage } from '@/lib/types';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatGrid } from '@/components/dashboard/StatGrid';
import { KanbanView } from '@/components/dashboard/KanbanView';
import { ListView } from '@/components/dashboard/ListView';
import { LeadDrawer } from '@/components/dashboard/LeadDrawer';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { getWhatsAppLink } from '@/lib/messaging-utils';
import { LoginScreen } from '@/components/LoginScreen';

const STAGES: LeadStage[] = [
  'New', 'Converted', 'Details Requested', 'Test Sent', 'Test Completed', 
  'Appt Scheduled', '1:1 Complete', 'Report Sent', 'Lost'
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { leads, loading, error, sheetId, reminders, fetchLeads, updateLead, deleteLead, addLead, saveSheetId } = useLeads();
  
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<LeadStage | 'All'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.phone.includes(searchQuery) ||
                          (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStage = selectedStage === 'All' || lead.stage === selectedStage;
      return matchesSearch && matchesStage;
    });
  }, [leads, searchQuery, selectedStage]);

  if (!mounted || status === "loading") return null;

  // Login Gate
  if (!session) {
    return <LoginScreen />;
  }

  // Setup / Settings Gate
  if (!sheetId || isSettingsOpen) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="w-full max-w-lg p-10 space-y-8 shadow-2xl border-white/20">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                            <Database size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black dark:text-white">Database Setup</h2>
                            <p className="text-slate-500 text-sm font-medium">Connect your Google Sheet to start.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Master Google Sheet ID</label>
                            <input 
                                defaultValue={sheetId || ''} 
                                id="sheet-id-input"
                                placeholder="Paste Sheet ID here..." 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-mono text-xs outline-none focus:border-primary-500 transition-all" 
                            />
                            <p className="text-[10px] text-slate-400 italic px-2">
                                Found in the URL: docs.google.com/spreadsheets/d/<span className="text-primary-600 font-bold">YOUR_ID_HERE</span>/edit
                            </p>
                        </div>

                        <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-2xl border border-primary-100 dark:border-primary-900/20">
                            <p className="text-[10px] leading-relaxed text-primary-700 dark:text-primary-400 font-medium">
                                <b>Note:</b> You must be the owner of this sheet or have editor permissions. The app will act on your behalf using your logged-in Google account.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            {sheetId && (
                                <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                            )}
                            <Button className="flex-[2] h-14 rounded-2xl" onClick={() => {
                                const input = document.getElementById('sheet-id-input') as HTMLInputElement;
                                if (input.value) {
                                    saveSheetId(input.value);
                                    setIsSettingsOpen(false);
                                }
                            }}>Save & Connect</Button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-0">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-[70] lg:hidden"
            >
              <Sidebar 
                selectedStage={selectedStage} 
                setSelectedStage={setSelectedStage} 
                stages={STAGES} 
                onMobileClose={() => setIsSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 h-screen sticky top-0 shrink-0">
        <Sidebar 
          selectedStage={selectedStage} 
          setSelectedStage={setSelectedStage} 
          stages={STAGES} 
        />
      </div>

      <main className="flex-1 px-4 py-6 md:py-10 md:px-10 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Header */}
        <header className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2.5 -ml-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
              >
                <Menu size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                    {selectedStage === 'All' ? 'Dashboard' : selectedStage}
                    </h1>
                    {reminders.length > 0 && selectedStage === 'All' && (
                        <div className="flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-red-500 text-white text-[10px] font-black rounded-full animate-bounce">
                            {reminders.length}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                    <Sparkles size={12} className="text-primary-500" />
                    <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">EduCompass CRM</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 p-0 rounded-xl">
                <Settings size={18} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchLeads()} className="w-10 h-10 p-0 rounded-xl">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </Button>
              <Button className="hidden md:flex" onClick={() => setIsAddModalOpen(true)}>
                <Plus size={18} />
                Add Lead
              </Button>
            </div>
          </div>

          <StatGrid leads={leads} />
        </header>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
           <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 shadow-sm transition-all dark:placeholder:text-slate-600"
            />
          </div>
          
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm self-end sm:self-auto">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest",
                viewMode === 'list' ? "bg-primary-600 text-white shadow-lg shadow-primary-200 dark:shadow-none" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <ListIcon size={16} />
              <span className="hidden sm:inline">List</span>
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest",
                viewMode === 'kanban' ? "bg-primary-600 text-white shadow-lg shadow-primary-200 dark:shadow-none" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
        </div>

        {/* Attention Items */}
        {reminders.length > 0 && (
          <section className="mb-10 overflow-hidden">
            <div className="flex items-center gap-2 mb-4 px-1">
              <AlertCircle size={16} className="text-amber-500" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Attention Required</h3>
              <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">{reminders.length}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
              {reminders.map(lead => (
                <Card key={lead.id} className="min-w-[280px] md:min-w-[320px] p-4 border-l-4 border-amber-500 bg-white dark:bg-slate-900 snap-center shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{lead.name}</h4>
                    <Badge variant={lead.stage === 'Report Sent' ? 'success' : 'warning'}>
                        {lead.stage === 'New' ? 'Overdue' : 
                         lead.stage === 'Test Sent' ? 'Nudge' : 
                         lead.stage === 'Report Sent' ? 'Review' : 
                         !lead.feesPaid ? 'Fees' : 'Follow-up'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {lead.stage === 'New' ? 'Lead hasn\'t converted in 4 days. Time for a call.' : 
                     lead.stage === 'Test Sent' ? 'Test link sent over 48h ago. Nudge for completion.' :
                     lead.stage === '1:1 Complete' ? 'Counseling done. Prepare and send the report.' :
                     lead.stage === 'Report Sent' ? 'Report sent 2 days ago. Ask for a Google review.' :
                     !lead.feesPaid ? 'Student is active but professional fees are pending.' :
                     'Action required for this student profile.'}
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px]" onClick={() => setSelectedLead(lead)}>Details</Button>
                    <Button size="sm" className="flex-1 rounded-xl text-[10px]" onClick={() => {
                        if (lead.stage === 'Report Sent') {
                            window.open(getWhatsAppLink(lead, 'review'), '_blank');
                        } else {
                            window.open(getWhatsAppLink(lead, 'followup'), '_blank');
                        }
                    }}>
                        {lead.stage === 'Report Sent' ? 'Ask Review' : 'WhatsApp'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* View Content */}
        <div className="relative">
            {error && (
                <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl text-red-600 text-xs font-bold">
                    Error: {error}. Please check your Sheet ID or Google permissions.
                </div>
            )}
            {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem]" />
                ))}
            </div>
            ) : (
            viewMode === 'kanban' ? (
                <KanbanView 
                leads={leads} 
                stages={STAGES} 
                onLeadClick={setSelectedLead} 
                searchQuery={searchQuery}
                />
            ) : (
                <ListView 
                leads={filteredLeads} 
                onLeadClick={setSelectedLead} 
                />
            )
            )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav 
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        onAddClick={() => setIsAddModalOpen(true)}
      />

      {/* Overlays */}
      <LeadDrawer 
        lead={selectedLead} 
        onClose={() => setSelectedLead(null)} 
        onUpdate={updateLead}
        onDelete={deleteLead}
        stages={STAGES}
      />

      {/* Modern Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl overflow-hidden border border-white/20"
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-primary-600" />
               <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black dark:text-white tracking-tight">New Inquiry</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Add a student to your pipeline.</p>
                </div>
                <Button variant="ghost" className="rounded-full w-12 h-12 p-0 bg-slate-50 dark:bg-slate-800" onClick={() => setIsAddModalOpen(false)}>
                  <X size={24} />
                </Button>
               </div>
               
               <form className="space-y-4" onSubmit={async (e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 try {
                    await addLead({
                        name: fd.get('name') as string,
                        phone: fd.get('phone') as string,
                        email: fd.get('email') as string,
                        grade: fd.get('grade') as string,
                        board: fd.get('board') as string,
                    });
                    setIsAddModalOpen(false);
                 } catch (err) {
                    alert('Failed to add lead. Check your sheet ID and permissions.');
                 }
               }}>
                  <div className="space-y-4">
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Full Name</label>
                        <input name="name" required placeholder="Student Name" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Contact Number</label>
                        <input name="phone" required placeholder="+91 00000 00000" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Email Address</label>
                        <input name="email" placeholder="example@mail.com" type="email" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Grade</label>
                            <input name="grade" placeholder="e.g. 10th" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Board</label>
                            <input name="board" placeholder="e.g. CBSE" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 rounded-2xl text-sm font-bold outline-none transition-all" />
                        </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full py-5 text-lg font-black rounded-2xl mt-6 shadow-xl shadow-primary-200 dark:shadow-none">Create Lead Profile</Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
