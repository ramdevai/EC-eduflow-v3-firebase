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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLeads } from '@/hooks/useLeads';
import { Lead, LeadStage } from '@/lib/types';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatGrid } from '@/components/dashboard/StatGrid';
import { KanbanView } from '@/components/dashboard/KanbanView';
import { ListView } from '@/components/dashboard/ListView';
import { LeadDrawer } from '@/components/dashboard/LeadDrawer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden"
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
      <div className="hidden lg:block w-72 h-screen sticky top-0">
        <Sidebar 
          selectedStage={selectedStage} 
          setSelectedStage={setSelectedStage} 
          stages={STAGES} 
        />
      </div>

      <main className="flex-1 px-4 py-8 md:px-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
              >
                <Menu size={20} />
              </button>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {selectedStage === 'All' ? 'Lead Dashboard' : selectedStage}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Manage and track student counseling inquiries with ease.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? "bg-primary-600 text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
              >
                <ListIcon size={18} />
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? "bg-primary-600 text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} />
              Add Lead
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchLeads()} className="w-10 h-10 p-0 hidden md:flex">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </header>

        <StatGrid leads={leads} />

        {/* Search & Filter Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search leads by name, phone or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm transition-all dark:placeholder:text-slate-600"
          />
        </div>

        {/* Attention Items */}
        {reminders.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Attention Required ({reminders.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reminders.map(lead => (
                <Card key={lead.id} className="p-4 border-l-4 border-amber-500 bg-amber-50/30 dark:bg-amber-900/10">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{lead.name}</h4>
                    <Badge variant="warning">Follow-up Due</Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                    {lead.stage === 'New' ? 'High potential lead hasn\'t converted.' : 'Review required for report sent.'}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => setSelectedLead(lead)}>Details</Button>
                    <Button size="sm" className="flex-1 h-8" onClick={() => window.open(`tel:${lead.phone}`)}>Call Now</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* View Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
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
      </main>

      {/* Overlays */}
      <LeadDrawer 
        lead={selectedLead} 
        onClose={() => setSelectedLead(null)} 
        onUpdate={updateLead}
        onDelete={deleteLead}
        stages={STAGES}
      />

      {/* Simple Add Modal Placeholder */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-8 shadow-2xl overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-primary-600" />
               <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold dark:text-white">New Inquiry</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Capture a potential student lead.</p>
                </div>
                <Button variant="ghost" className="rounded-full w-10 h-10 p-0" onClick={() => setIsAddModalOpen(false)}>
                  <X size={20} />
                </Button>
               </div>
               
               <form className="space-y-5" onSubmit={async (e) => {
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
                  <div className="grid grid-cols-2 gap-4">
                    <input name="name" required placeholder="Student Name" className="col-span-2 md:col-span-1 p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                    <input name="phone" required placeholder="Phone Number" className="col-span-2 md:col-span-1 p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                  <input name="email" placeholder="Email Address" type="email" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="grade" placeholder="Current Grade" className="p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                    <input name="board" placeholder="Education Board" className="p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20" />
                  </div>
                  <Button type="submit" className="w-full py-4 text-base mt-2">Create Inquiry</Button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
