"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  ChevronRight, 
  X, 
  Phone, 
  GraduationCap, 
  LayoutGrid, 
  List as ListIcon, 
  Menu, 
  Settings, 
  UserCircle,
  Mail,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Lead, LeadStage, TEST_LINKS } from '@/lib/types';
import { cn } from '@/lib/utils';

const STAGES: LeadStage[] = [
  'New', 'Converted', 'Details Requested', 'Test Sent', 'Test Completed', 
  'Appt Scheduled', '1:1 Complete', 'Report Sent', 'Lost'
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<LeadStage | 'All'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch leads');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
      } else {
        console.error('Expected array of leads, got:', data);
        setLeads([]);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchLeads();
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

  const reminders = useMemo(() => {
    const now = new Date();
    return leads.filter(lead => {
      if (lead.stage === 'Lost') return false;
      
      const inquiryDate = new Date(lead.inquiryDate);
      const daysSinceInquiry = differenceInDays(now, inquiryDate);
      
      if (lead.stage === 'New' && daysSinceInquiry >= 4) return true;
      
      if (lead.stage === 'Report Sent' && lead.reportSentDate) {
        const reportDate = new Date(lead.reportSentDate);
        const daysSinceReport = differenceInDays(now, reportDate);
        if (daysSinceReport >= 2) return true;
      }

      return false;
    });
  }, [leads]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#E4E3E0]" />;
  }

  const updateLead = async (id: number, updates: Partial<Lead>) => {
    if (updates.stage === 'Converted') {
      updates.convertedDate = new Date().toISOString();
    } else if (updates.stage === 'Report Sent') {
      updates.reportSentDate = new Date().toISOString();
    }

    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchLeads();
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const deleteLead = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) return;
    
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      setSelectedLead(null);
      fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLead = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      grade: formData.get('grade') as string,
      board: formData.get('board') as string,
      notes: formData.get('notes') as string,
    };

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      setIsAddModalOpen(false);
      fetchLeads();
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

  const getWhatsAppLink = (lead: Lead) => {
    let message = `Hi ${lead.name}, this is Binal from EduCompass. `;
    if (lead.stage === 'Converted') {
      message += `Great to have you onboard! Please fill this form to share student details: https://forms.gle/Cab1hdnxPz2t1P6r8`;
    } else if (lead.stage === 'Details Requested') {
      message += `Based on ${lead.name}'s grade (${lead.grade}), here is the career assessment link: ${lead.testLink || 'Please select a test'}`;
    }
    return `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-[#141414]/10 bg-[#E4E3E0] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#141414] rounded-full flex items-center justify-center text-[#E4E3E0]">
            <GraduationCap size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">EduCompass</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-[#141414]/5 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar / Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="fixed inset-0 bg-[#E4E3E0] z-50 p-6 lg:hidden"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#141414] rounded-full flex items-center justify-center text-[#E4E3E0]">
                  <GraduationCap size={24} />
                </div>
                <h1 className="text-xl font-bold tracking-tight">EduCompass</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-[#141414]/5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* Sidebar content repeated for mobile */}
            <nav className="space-y-4">
               <button 
                  onClick={() => { setSelectedStage('All'); setIsMobileMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    selectedStage === 'All' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                  )}
                >
                  <Users size={18} />
                  All Leads
                </button>
                {STAGES.map(stage => (
                  <button 
                    key={stage}
                    onClick={() => { setSelectedStage(stage); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      selectedStage === stage ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", getStageColor(stage))} />
                    {stage}
                  </button>
                ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block fixed left-0 top-0 h-full w-64 border-r border-[#141414]/10 bg-[#E4E3E0] p-6 z-30">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-[#141414] rounded-full flex items-center justify-center text-[#E4E3E0]">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">EduCompass</h1>
          </div>

          <div className="space-y-8">
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 mb-4 px-4">Workspace</p>
              <nav className="space-y-1">
                <button 
                  onClick={() => setSelectedStage('All')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    selectedStage === 'All' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                  )}
                >
                  <Users size={18} />
                  All Leads
                </button>
                {STAGES.map(stage => (
                  <button 
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      selectedStage === stage ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", getStageColor(stage))} />
                    {stage}
                  </button>
                ))}
              </nav>
            </section>

            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 mb-4 px-4">Account</p>
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#141414]/5 transition-colors">
                  <UserCircle size={18} />
                  Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#141414]/5 transition-colors">
                  <Settings size={18} />
                  Settings
                </button>
              </nav>
            </section>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="p-4 bg-[#141414]/5 rounded-xl border border-[#141414]/10">
              <p className="text-xs font-medium opacity-50 uppercase tracking-wider mb-2">System Status</p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                Automation Active
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 md:p-8">
          <header className="flex flex-col gap-6 mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-1">Lead Management</h2>
                <p className="text-[#141414]/60">Manage your career counseling workflow and automations.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-white border border-[#141414]/10 rounded-xl p-1 shadow-sm">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'list' ? "bg-indigo-600 text-white" : "hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <ListIcon size={18} />
                  </button>
                  <button 
                    onClick={() => setViewMode('kanban')}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      viewMode === 'kanban' ? "bg-indigo-600 text-white" : "hover:bg-slate-50 text-slate-500"
                    )}
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Plus size={18} />
                  Add Lead
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 md:gap-8 px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm w-full md:w-auto md:max-w-2xl overflow-x-auto no-scrollbar">
                <div className="text-center min-w-[80px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Leads</p>
                  <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
                </div>
                <div className="w-px h-10 bg-slate-100 shrink-0" />
                <div className="text-center min-w-[80px]">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Active</p>
                  <p className="text-2xl font-bold text-emerald-600">{leads.filter(l => l.stage !== 'Lost' && l.stage !== 'Report Sent').length}</p>
                </div>
                <div className="w-px h-10 bg-slate-100 shrink-0" />
                <div className="text-center min-w-[80px]">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">New</p>
                  <p className="text-2xl font-bold text-blue-600">{leads.filter(l => l.stage === 'New').length}</p>
                </div>
              </div>
              
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search leads by name, phone or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full shadow-sm transition-all"
                />
              </div>
            </div>
          </header>

          {/* Reminders Section */}
          {reminders.length > 0 && (
            <section className="mb-12">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#141414]/40 mb-4 flex items-center gap-2">
                <AlertCircle size={14} />
                Attention Required ({reminders.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reminders.map(lead => (
                  <motion.div 
                    layoutId={`reminder-${lead.id}`}
                    key={lead.id}
                    className="p-4 bg-white border border-[#141414]/10 rounded-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-wider">
                          Follow-up Due
                        </span>
                        <span className="text-[10px] text-[#141414]/40 font-mono">
                          {format(parseISO(lead.inquiryDate), 'MMM d')}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">{lead.name}</h4>
                      <p className="text-sm text-[#141414]/60 mb-4">
                        {lead.stage === 'New' 
                          ? 'Lead hasn\'t converted in 4 days. Time for a call.' 
                          : 'Report sent 2 days ago. Ask for a review.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={`tel:${lead.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#141414]/5 rounded-xl text-xs font-bold hover:bg-[#141414]/10 transition-colors"
                      >
                        <Phone size={14} />
                        Call
                      </a>
                      <a 
                        href={getWhatsAppLink(lead)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <MessageSquare size={14} />
                        WhatsApp
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Content View */}
          {viewMode === 'list' ? (
            <div className="bg-white border border-[#141414]/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_80px] p-4 border-b border-[#141414]/5 bg-[#141414]/5 text-[11px] font-bold uppercase tracking-wider text-[#141414]/40">
                    <div className="flex justify-center">#</div>
                    <div>Lead Details</div>
                    <div>Stage</div>
                    <div>Education</div>
                    <div>Next Action</div>
                    <div className="text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-[#141414]/5">
                    {filteredLeads.map((lead, idx) => (
                      <div 
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_80px] p-4 items-center hover:bg-[#141414]/[0.02] transition-colors cursor-pointer group"
                      >
                        <div className="text-xs text-[#141414]/40 font-mono text-center">{idx + 1}</div>
                        <div>
                          <div className="font-bold text-sm group-hover:underline">{lead.name}</div>
                          <div className="text-xs text-[#141414]/60 font-mono">{lead.phone}</div>
                        </div>
                        <div>
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            getStageBg(lead.stage)
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", getStageColor(lead.stage))} />
                            {lead.stage}
                          </span>
                        </div>
                        <div className="text-xs">
                          <div className="font-medium">{lead.grade || 'N/A'}</div>
                          <div className="text-[#141414]/40">{lead.board || 'N/A'}</div>
                        </div>
                        <div>
                          {getNextAction(lead)}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button className="p-2 hover:bg-[#141414]/5 rounded-lg transition-colors text-[#141414]/40">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-[#141414]/5">
                {filteredLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="p-4 space-y-3 active:bg-[#141414]/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-base">{lead.name}</h4>
                        <p className="text-xs text-[#141414]/60 font-mono">{lead.phone}</p>
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        getStageBg(lead.stage)
                      )}>
                        {lead.stage}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-[#141414]/60">
                        <GraduationCap size={14} />
                        {lead.grade || 'N/A'} • {lead.board || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1 text-[#141414]/60">
                        <Calendar size={14} />
                        {format(parseISO(lead.inquiryDate), 'MMM d')}
                      </div>
                    </div>
                    <div className="pt-1">
                      {getNextAction(lead)}
                    </div>
                  </div>
                ))}
              </div>

              {filteredLeads.length === 0 && (
                <div className="p-12 text-center text-[#141414]/40">
                  <Users size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-medium">No leads found matching your criteria.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar min-h-[600px]">
              {STAGES.map(stage => (
                <div key={stage} className="flex-shrink-0 w-80">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", getStageColor(stage))} />
                      <h4 className="text-sm font-bold uppercase tracking-wider">{stage}</h4>
                      <span className="text-xs font-mono text-[#141414]/40 bg-[#141414]/5 px-1.5 py-0.5 rounded">
                        {leads.filter(l => l.stage === stage).length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {leads
                      .filter(l => l.stage === stage)
                      .filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(lead => (
                        <motion.div 
                          layoutId={`kanban-${lead.id}`}
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="p-4 bg-white border border-[#141414]/10 rounded-2xl shadow-sm hover:border-[#141414]/30 transition-colors cursor-pointer group"
                        >
                          <h5 className="font-bold text-sm mb-1 group-hover:underline">{lead.name}</h5>
                          <p className="text-[10px] text-[#141414]/40 font-mono mb-3">{lead.phone}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <div className="text-[10px] font-bold text-[#141414]/60 bg-[#141414]/5 px-2 py-0.5 rounded uppercase tracking-wider">
                              {lead.grade || 'N/A'}
                            </div>
                            <div className="text-[10px] font-bold text-[#141414]/60 bg-[#141414]/5 px-2 py-0.5 rounded uppercase tracking-wider">
                              {lead.board || 'N/A'}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-[#141414]/40">
                              {format(parseISO(lead.inquiryDate), 'MMM d')}
                            </div>
                            <ChevronRight size={14} className="text-[#141414]/20" />
                          </div>
                        </motion.div>
                      ))}
                    {leads.filter(l => l.stage === stage).length === 0 && (
                      <div className="h-24 border-2 border-dashed border-[#141414]/5 rounded-2xl flex items-center justify-center text-[#141414]/20 text-xs italic">
                        No leads
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-[#141414]/5 flex items-center justify-between bg-[#141414] text-[#E4E3E0]">
                <div>
                  <h3 className="text-xl font-bold">New Inquiry</h3>
                  <p className="text-xs opacity-60">Add a new potential lead to the system.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddLead} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#141414]/40">Student Name</label>
                    <input name="name" required className="w-full px-4 py-2 bg-[#141414]/5 border border-transparent rounded-xl focus:bg-white focus:border-[#141414]/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#141414]/40">Phone Number</label>
                    <input name="phone" required className="w-full px-4 py-2 bg-[#141414]/5 border border-transparent rounded-xl focus:bg-white focus:border-[#141414]/20 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#141414]/40">Email Address</label>
                  <input name="email" type="email" className="w-full px-4 py-2 bg-[#141414]/5 border border-transparent rounded-xl focus:bg-white focus:border-[#141414]/20 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#141414]/40">Grade</label>
                    <input name="grade" className="w-full px-4 py-2 bg-[#141414]/5 border border-transparent rounded-xl focus:bg-white focus:border-[#141414]/20 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#141414]/40">Board</label>
                    <input name="board" className="w-full px-4 py-2 bg-[#141414]/5 border border-transparent rounded-xl focus:bg-white focus:border-[#141414]/20 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#141414]/40">Initial Notes</label>
                  <textarea name="notes" rows={3} className="w-full px-4 py-2 bg-[#141414]/5 border border-transparent rounded-xl focus:bg-white focus:border-[#141414]/20 outline-none transition-all resize-none" />
                </div>
                <button type="submit" className="w-full py-3 bg-[#141414] text-[#E4E3E0] rounded-xl font-bold hover:opacity-90 transition-opacity">
                  Create Lead
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lead Details Drawer */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLead(null)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-[#F5F5F3] h-full shadow-2xl border-l border-[#141414]/10 overflow-y-auto"
            >
              <div className="p-6 md:p-10">
                <div className="flex items-center justify-between mb-10">
                  <button 
                    onClick={() => setSelectedLead(null)} 
                    className="p-2.5 hover:bg-[#141414]/5 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to mark this lead as lost?')) {
                        updateLead(selectedLead.id, { stage: 'Lost' });
                        setSelectedLead(null);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 border-2 border-red-100 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <AlertCircle size={14} />
                    Mark as Lost
                  </button>
                </div>

                <div className="mb-10">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">{selectedLead.name}</h3>
                      <div className="flex flex-col gap-2 text-[#141414]/70">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#141414]/5 flex items-center justify-center">
                            <Phone size={16} />
                          </div>
                          <span className="text-base font-mono font-medium">{selectedLead.phone}</span>
                        </div>
                        {selectedLead.email && (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#141414]/5 flex items-center justify-center">
                              <Mail size={16} />
                            </div>
                            <span className="text-base font-mono font-medium">{selectedLead.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#141414]/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 mb-2">Current Status</p>
                      <div className="relative inline-block w-full md:w-64">
                        <select 
                          value={selectedLead.stage}
                          onChange={(e) => updateLead(selectedLead.id, { stage: e.target.value as LeadStage })}
                          className={cn(
                            "w-full appearance-none px-4 py-3 rounded-xl text-sm font-bold outline-none border-2 transition-all cursor-pointer",
                            selectedLead.stage === 'Lost' ? "bg-red-50 border-red-100 text-red-700" : "bg-white border-[#141414]/5 focus:border-[#141414]/20"
                          )}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="p-6 bg-white rounded-2xl border border-[#141414]/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <GraduationCap size={18} className="text-[#141414]/40" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Education</p>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <p className="text-[10px] font-bold text-[#141414]/40 uppercase mb-1">Grade</p>
                        <p className="text-lg font-bold">{selectedLead.grade || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#141414]/40 uppercase mb-1">Board</p>
                        <p className="text-lg font-bold">{selectedLead.board || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-[#141414]/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <ArrowRight size={18} className="text-[#141414]/40" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Quick Actions</p>
                    </div>
                    <div className="space-y-3">
                      <a 
                        href={getWhatsAppLink(selectedLead)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-between p-3.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        Send WhatsApp
                        <MessageSquare size={16} />
                      </a>
                      <a 
                        href="https://chat.whatsapp.com/example-group-link"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-between p-3.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        Invite to Group
                        <Users size={16} />
                      </a>
                      {selectedLead.stage === 'Details Requested' && (
                        <div className="space-y-2 pt-2">
                          <p className="text-[10px] font-bold text-[#141414]/40 uppercase">Select Test Link</p>
                          <select 
                            className="w-full p-3 bg-[#141414]/5 rounded-xl text-xs font-medium outline-none border border-transparent focus:border-[#141414]/10"
                            onChange={(e) => updateLead(selectedLead.id, { testLink: e.target.value, stage: 'Test Sent' })}
                          >
                            <option value="">Choose a test...</option>
                            {Object.entries(TEST_LINKS).map(([name, link]) => (
                              <option key={name} value={link}>{name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-white rounded-2xl border border-[#141414]/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Mail size={18} className="text-[#141414]/40" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Email Automation</p>
                    </div>
                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          const subject = `Career Counseling Report - ${selectedLead.name}`;
                          const body = `Dear Parent,\n\nPlease find attached the career counseling report for ${selectedLead.name}.\n\nBased on our 1:1 session, we discussed the following career choices:\n${selectedLead.notes || '[Add recommendations from notes]'}\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nBinal\nEduCompass`;
                          window.open(`mailto:${selectedLead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                          updateLead(selectedLead.id, { stage: 'Report Sent' });
                        }}
                        className="w-full flex items-center justify-between p-4 bg-[#141414] text-[#E4E3E0] rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                      >
                        Prepare & Send Email
                        <ArrowRight size={18} />
                      </button>
                      <p className="text-[10px] text-[#141414]/40 text-center italic">This will open your default email client and update the stage.</p>
                    </div>
                  </div>

                  <div className="p-6 bg-white rounded-2xl border border-[#141414]/5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare size={18} className="text-[#141414]/40" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Counseling Notes</p>
                    </div>
                    <textarea 
                      className="w-full p-4 bg-[#141414]/5 rounded-xl border border-transparent focus:border-[#141414]/10 outline-none text-sm resize-none min-h-[160px] transition-all"
                      placeholder="Add notes about career choices, recommendations..."
                      defaultValue={selectedLead.notes}
                      onBlur={(e) => updateLead(selectedLead.id, { notes: e.target.value })}
                    />
                  </div>

                  <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <Calendar size={18} className="text-slate-400" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Appointment & Fees</p>
                    </div>
                    <div className="space-y-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-400" />
                          <span className="text-sm font-medium">Appointment Time</span>
                        </div>
                        <input 
                          type="datetime-local"
                          className="w-full md:w-auto text-xs font-bold bg-slate-50 px-4 py-2.5 rounded-xl outline-none border border-transparent focus:border-indigo-500/20"
                          defaultValue={selectedLead.appointmentTime}
                          onBlur={(e) => updateLead(selectedLead.id, { appointmentTime: e.target.value, stage: 'Appt Scheduled' })}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-slate-400" />
                          <span className="text-sm font-medium">Fees Paid</span>
                        </div>
                        <button 
                          onClick={() => updateLead(selectedLead.id, { feesPaid: !selectedLead.feesPaid })}
                          className={cn(
                            "w-14 h-7 rounded-full transition-colors relative",
                            !!selectedLead.feesPaid ? "bg-emerald-500" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all",
                            !!selectedLead.feesPaid ? "left-8" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200">
                    <button 
                      onClick={() => deleteLead(selectedLead.id)}
                      className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-bold text-sm hover:bg-red-50 rounded-2xl transition-colors border-2 border-transparent hover:border-red-100"
                    >
                      <X size={18} />
                      Delete Lead Permanently
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getStageColor(stage: LeadStage) {
  switch (stage) {
    case 'New': return 'bg-blue-500';
    case 'Converted': return 'bg-emerald-500';
    case 'Details Requested': return 'bg-amber-500';
    case 'Test Sent': return 'bg-purple-500';
    case 'Test Completed': return 'bg-indigo-500';
    case 'Appt Scheduled': return 'bg-orange-500';
    case '1:1 Complete': return 'bg-cyan-500';
    case 'Report Sent': return 'bg-green-500';
    case 'Lost': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getStageBg(stage: LeadStage) {
  switch (stage) {
    case 'New': return 'bg-blue-50';
    case 'Converted': return 'bg-emerald-50';
    case 'Details Requested': return 'bg-amber-50';
    case 'Test Sent': return 'bg-purple-50';
    case 'Test Completed': return 'bg-indigo-50';
    case 'Appt Scheduled': return 'bg-orange-50';
    case '1:1 Complete': return 'bg-cyan-50';
    case 'Report Sent': return 'bg-green-50';
    case 'Lost': return 'bg-red-50';
    default: return 'bg-gray-50';
  }
}

function getNextAction(lead: Lead) {
  switch (lead.stage) {
    case 'New': 
      return (
        <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] uppercase tracking-wider">
          <Clock size={12} />
          Wait for conversion
        </div>
      );
    case 'Converted':
      return (
        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
          <ArrowRight size={12} />
          Send Details Form
        </div>
      );
    case 'Details Requested':
      return (
        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase tracking-wider">
          <ArrowRight size={12} />
          Send Test Link
        </div>
      );
    case 'Test Sent':
      return (
        <div className="flex items-center gap-1.5 text-purple-600 font-bold text-[10px] uppercase tracking-wider">
          <Clock size={12} />
          Awaiting Test
        </div>
      );
    case 'Test Completed':
      return (
        <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[10px] uppercase tracking-wider">
          <Calendar size={12} />
          Schedule Appt
        </div>
      );
    case 'Appt Scheduled':
      return (
        <div className="flex items-center gap-1.5 text-orange-600 font-bold text-[10px] uppercase tracking-wider">
          <Clock size={12} />
          {lead.appointmentTime ? format(parseISO(lead.appointmentTime), 'MMM d, h:mm a') : 'Set Time'}
        </div>
      );
    case '1:1 Complete':
      return (
        <div className="flex items-center gap-1.5 text-cyan-600 font-bold text-[10px] uppercase tracking-wider">
          <Mail size={12} />
          Email Report
        </div>
      );
    case 'Report Sent':
      return (
        <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-wider">
          <CheckCircle2 size={12} />
          Follow-up Done
        </div>
      );
    default:
      return <span className="text-[#141414]/20">---</span>;
  }
}
