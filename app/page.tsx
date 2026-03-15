"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Menu, 
  AlertCircle, 
  RefreshCw,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

const STAGES: LeadStage[] = [
  'New', 'Converted', 'Details Requested', 'Test Sent', 'Test Completed', 
  'Appt Scheduled', '1:1 Complete', 'Report Sent', 'Lost'
];

export default function Dashboard() {
  const { leads, loading, reminders, fetchLeads, updateLead, deleteLead, addLead } = useLeads();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<LeadStage | 'All'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  if (!mounted) return null;

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
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                  {selectedStage === 'All' ? 'Dashboard' : selectedStage}
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                    <Sparkles size={12} className="text-primary-500" />
                    <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">EduCompass CRM</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                    <Badge variant="warning">Follow-up</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {lead.stage === 'New' ? 'Lead hasn\'t converted in 4 days. Time for a call.' : 'Review required for report sent.'}
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px]" onClick={() => setSelectedLead(lead)}>View Profile</Button>
                    <Button size="sm" className="flex-1 rounded-xl text-[10px]" onClick={() => window.open(`tel:${lead.phone}`)}>Quick Call</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* View Content */}
        <div className="relative">
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
                 await addLead({
                   name: fd.get('name') as string,
                   phone: fd.get('phone') as string,
                   email: fd.get('email') as string,
                   grade: fd.get('grade') as string,
                   board: fd.get('board') as string,
                 });
                 setIsAddModalOpen(false);
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
