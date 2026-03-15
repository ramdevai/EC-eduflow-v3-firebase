"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Phone, 
  Mail, 
  GraduationCap, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  MessageSquare,
  Trash2,
  ExternalLink,
  ChevronDown,
  User,
  Heart,
  Users,
  MapPin,
  CreditCard,
  Send,
  FileText,
  Star
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Lead, LeadStage, TEST_LINKS } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { getWhatsAppLink, getEmailLink } from '@/lib/messaging-utils';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (id: number, updates: Partial<Lead>) => void;
  onDelete: (id: number) => void;
  stages: LeadStage[];
}

export function LeadDrawer({ lead, onClose, onUpdate, onDelete, stages }: LeadDrawerProps) {
  const [activeSection, setActiveSection] = useState<string | null>('pipeline');

  if (!lead) return null;

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string, title: string, icon: any }) => (
    <button 
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl mb-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-primary-600">
          <Icon size={18} />
        </div>
        <span className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">{title}</span>
      </div>
      <ChevronDown size={18} className={cn("text-slate-400 transition-transform", activeSection === id && "rotate-180")} />
    </button>
  );

  return (
    <AnimatePresence>
      {lead && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full bg-white dark:bg-slate-950 h-[95vh] md:h-full md:max-w-2xl shadow-2xl border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col rounded-t-[2.5rem] md:rounded-t-none"
          >
            <div className="md:hidden w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>

            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Badge variant="info">ID: #{lead.id}</Badge>
                <Badge variant="default">{lead.stage}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-10 h-10 p-0">
                    <X size={24} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-24">
              {/* Header Info */}
              <header className="mb-8">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
                  {lead.name}
                </h2>
                <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
                   <MapPin size={14} /> {lead.address || 'No address provided'}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button variant="outline" className="h-12 rounded-xl justify-start gap-3" onClick={() => window.open(`tel:${lead.phone}`)}>
                    <Phone size={18} className="text-primary-600" />
                    <span className="font-mono text-xs truncate">{lead.phone}</span>
                  </Button>
                  <Button variant="outline" className="h-12 rounded-xl justify-start gap-3" onClick={() => window.open(`mailto:${lead.email}`)}>
                    <Mail size={18} className="text-primary-600" />
                    <span className="font-mono text-xs truncate">{lead.email || 'No email'}</span>
                  </Button>
                </div>
              </header>

              {/* Action Buttons Based on Stage */}
              <div className="grid grid-cols-1 gap-3 mb-8">
                {lead.stage === 'New' && (
                    <Button className="h-14 rounded-2xl bg-primary-600 text-white gap-3 text-base shadow-lg shadow-primary-200 dark:shadow-none" onClick={() => window.open(getWhatsAppLink(lead, 'followup'), '_blank')}>
                        <Send size={20} /> Send Inquiry Follow-up
                    </Button>
                )}
                {lead.stage === 'Converted' && (
                    <Button className="h-14 rounded-2xl bg-primary-600 text-white gap-3 text-base shadow-lg shadow-primary-200 dark:shadow-none" onClick={() => {
                        window.open(getWhatsAppLink(lead, 'onboarding'), '_blank');
                        onUpdate(lead.id, { stage: 'Details Requested' });
                    }}>
                        <FileText size={20} /> Send Registration Form
                    </Button>
                )}
                {lead.stage === 'Details Requested' && (
                    <Button className="h-14 rounded-2xl bg-emerald-600 text-white gap-3 text-base shadow-lg shadow-emerald-200 dark:shadow-none" onClick={() => {
                        window.open(getWhatsAppLink(lead, 'test'), '_blank');
                        onUpdate(lead.id, { stage: 'Test Sent' });
                    }}>
                        <GraduationCap size={20} /> Send Assessment Link
                    </Button>
                )}
                {lead.stage === 'Test Sent' && (
                    <Button className="h-14 rounded-2xl bg-amber-500 text-white gap-3 text-base shadow-lg shadow-amber-200 dark:shadow-none" onClick={() => {
                        window.open(getWhatsAppLink(lead, 'followup'), '_blank');
                    }}>
                        <Send size={20} /> Nudge for Test Completion
                    </Button>
                )}
                {lead.stage === 'Test Completed' && (
                    <Button className="h-14 rounded-2xl bg-primary-600 text-white gap-3 text-base shadow-lg shadow-primary-200 dark:shadow-none" onClick={() => {
                        // Just scroll to billing/appointment section
                        const billingSection = document.getElementById('billing-section');
                        if (billingSection) billingSection.scrollIntoView({ behavior: 'smooth' });
                    }}>
                        <Calendar size={20} /> Schedule 1:1 Session
                    </Button>
                )}
                {lead.stage === 'Appt Scheduled' && (
                    <Button className="h-14 rounded-2xl bg-emerald-600 text-white gap-3 text-base shadow-lg shadow-emerald-200 dark:shadow-none" onClick={() => {
                        onUpdate(lead.id, { stage: '1:1 Complete' });
                    }}>
                        <CheckCircle2 size={20} /> Mark Session Complete
                    </Button>
                )}
                {lead.stage === '1:1 Complete' && (
                    <Button className="h-14 rounded-2xl bg-blue-600 text-white gap-3 text-base shadow-lg shadow-blue-200 dark:shadow-none" onClick={() => {
                        window.open(getEmailLink(lead), '_blank');
                        onUpdate(lead.id, { stage: 'Report Sent', reportSentDate: new Date().toISOString() });
                    }}>
                        <Mail size={20} /> Prepare Report Email
                    </Button>
                )}
                {lead.stage === 'Report Sent' && (
                    <Button className="h-14 rounded-2xl bg-amber-500 text-white gap-3 text-base" onClick={() => window.open(getWhatsAppLink(lead, 'review'), '_blank')}>
                        <Star size={20} /> Request Google Review
                    </Button>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" className="h-12 rounded-xl gap-3 text-[10px] uppercase font-black tracking-widest" onClick={() => window.open(getWhatsAppLink(lead, 'community'), '_blank')}>
                        <Users size={18} /> Community Invite
                    </Button>
                    <Button variant="outline" className="h-12 rounded-xl gap-3 text-[10px] uppercase font-black tracking-widest text-red-500" onClick={() => {
                        if (confirm('Mark this lead as Lost?')) {
                            onUpdate(lead.id, { stage: 'Lost' });
                            onClose();
                        }
                    }}>
                        <X size={18} /> Mark Lost
                    </Button>
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {/* Pipeline Section */}
                <SectionHeader id="pipeline" title="Pipeline & Status" icon={Clock} />
                {activeSection === 'pipeline' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Current Stage</label>
                        <select 
                            value={lead.stage}
                            onChange={(e) => onUpdate(lead.id, { stage: e.target.value as LeadStage })}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary-500 transition-all"
                        >
                            {stages.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Inquiry Date</label>
                            <input type="date" value={lead.inquiryDate ? lead.inquiryDate.split('T')[0] : ''} disabled className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Source</label>
                            <input value={lead.source || 'Manual'} readOnly className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                        </div>
                    </div>
                  </motion.div>
                )}

                {/* Academic & Personal Section */}
                <SectionHeader id="personal" title="Student Profile" icon={User} />
                {activeSection === 'personal' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Grade/Class</label>
                            <input defaultValue={lead.grade} onBlur={(e) => onUpdate(lead.id, { grade: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Board</label>
                            <input defaultValue={lead.board} onBlur={(e) => onUpdate(lead.id, { board: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">School Name</label>
                        <input defaultValue={lead.school} onBlur={(e) => onUpdate(lead.id, { school: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Date of Birth</label>
                            <input type="date" defaultValue={lead.dob} onBlur={(e) => onUpdate(lead.id, { dob: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Gender</label>
                            <select defaultValue={lead.gender} onChange={(e) => onUpdate(lead.id, { gender: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all">
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hobbies</label>
                        <textarea defaultValue={lead.hobbies} onBlur={(e) => onUpdate(lead.id, { hobbies: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold outline-none transition-all resize-none min-h-[80px]" />
                    </div>
                  </motion.div>
                )}

                {/* Family Section */}
                <SectionHeader id="family" title="Family Information" icon={Heart} />
                {activeSection === 'family' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Father's Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Name" defaultValue={lead.fatherName} onBlur={(e) => onUpdate(lead.id, { fatherName: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                            <input placeholder="Phone" defaultValue={lead.fatherPhone} onBlur={(e) => onUpdate(lead.id, { fatherPhone: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                        </div>
                        <input placeholder="Occupation" defaultValue={lead.fatherOccupation} onBlur={(e) => onUpdate(lead.id, { fatherOccupation: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Mother's Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Name" defaultValue={lead.motherName} onBlur={(e) => onUpdate(lead.id, { motherName: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                            <input placeholder="Phone" defaultValue={lead.motherPhone} onBlur={(e) => onUpdate(lead.id, { motherPhone: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                        </div>
                        <input placeholder="Occupation" defaultValue={lead.motherOccupation} onBlur={(e) => onUpdate(lead.id, { motherOccupation: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                    </div>
                  </motion.div>
                )}

                {/* Counseling & Assessment Section */}
                <SectionHeader id="counseling" title="Counseling & Assessment" icon={MessageSquare} />
                {activeSection === 'counseling' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">1:1 Session Notes</label>
                            <Badge variant="default">Staff cannot see this</Badge>
                        </div>
                        <textarea 
                            defaultValue={lead.notes} 
                            onBlur={(e) => onUpdate(lead.id, { notes: e.target.value })} 
                            placeholder="Type session recommendations here..."
                            className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-sm font-medium border-2 border-transparent focus:border-primary-500 outline-none transition-all resize-none min-h-[200px]" 
                        />
                    </div>
                    <div className="space-y-4">
                         <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assessment URL</label>
                            <div className="flex gap-2">
                                <input defaultValue={lead.testLink} onBlur={(e) => onUpdate(lead.id, { testLink: e.target.value })} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border-none" />
                                <Button variant="outline" className="rounded-2xl" onClick={() => window.open(lead.testLink, '_blank')} disabled={!lead.testLink}><ExternalLink size={16}/></Button>
                            </div>
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Report PDF Link</label>
                            <input defaultValue={lead.reportPdfUrl} onBlur={(e) => onUpdate(lead.id, { reportPdfUrl: e.target.value })} placeholder="Paste edumilestones report link here..." className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border-none" />
                        </div>
                    </div>
                  </motion.div>
                )}

                {/* Appointments & Billing Section */}
                <SectionHeader id="billing" title="Appointments & Fees" icon={CreditCard} />
                {activeSection === 'billing' && (
                  <motion.div id="billing-section" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-6">
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] space-y-4 border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-amber-600" size={20} />
                            <span className="font-bold text-sm dark:text-amber-200">1:1 Appointment</span>
                        </div>
                        <input 
                            type="datetime-local" 
                            defaultValue={lead.appointmentTime} 
                            onBlur={(e) => onUpdate(lead.id, { appointmentTime: e.target.value, stage: 'Appt Scheduled' })} 
                            className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl text-sm font-bold border-none outline-none shadow-sm" 
                        />
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CreditCard className="text-primary-600" size={20} />
                                <span className="font-bold text-sm">Professional Fees</span>
                            </div>
                            <button 
                                onClick={() => onUpdate(lead.id, { feesPaid: !lead.feesPaid })}
                                className={cn(
                                    "w-14 h-7 rounded-full transition-all relative",
                                    lead.feesPaid ? "bg-primary-600 shadow-lg shadow-primary-200 dark:shadow-none" : "bg-slate-200 dark:bg-slate-800"
                                )}
                            >
                                <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300", lead.feesPaid ? "left-8" : "left-1")} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Amount</label>
                                <input placeholder="₹0.00" defaultValue={lead.feesAmount} onBlur={(e) => onUpdate(lead.id, { feesAmount: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none shadow-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Mode</label>
                                <select defaultValue={lead.paymentMode} onChange={(e) => onUpdate(lead.id, { paymentMode: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none shadow-sm">
                                    <option value="">Mode...</option>
                                    <option value="GPay">GPay</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank">Bank</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>
                        </div>
                        <input placeholder="Transaction ID / Receipt #" defaultValue={lead.transactionId} onBlur={(e) => onUpdate(lead.id, { transactionId: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-mono border-none outline-none shadow-sm" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {/* Pipeline Section */}
                <SectionHeader id="pipeline" title="Pipeline & Status" icon={Clock} />
                {activeSection === 'pipeline' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Current Stage</label>
                        <select 
                            value={lead.stage}
                            onChange={(e) => onUpdate(lead.id, { stage: e.target.value as LeadStage })}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary-500 transition-all"
                        >
                            {stages.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Inquiry Date</label>
                            <input type="date" value={lead.inquiryDate ? lead.inquiryDate.split('T')[0] : ''} disabled className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Source</label>
                            <input value={lead.source || 'Manual'} readOnly className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                        </div>
                    </div>
                  </motion.div>
                )}

                {/* Academic & Personal Section */}
                <SectionHeader id="personal" title="Student Profile" icon={User} />
                {activeSection === 'personal' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Grade/Class</label>
                            <input defaultValue={lead.grade} onBlur={(e) => onUpdate(lead.id, { grade: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Board</label>
                            <input defaultValue={lead.board} onBlur={(e) => onUpdate(lead.id, { board: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">School Name</label>
                        <input defaultValue={lead.school} onBlur={(e) => onUpdate(lead.id, { school: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Date of Birth</label>
                            <input type="date" defaultValue={lead.dob} onBlur={(e) => onUpdate(lead.id, { dob: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Gender</label>
                            <select defaultValue={lead.gender} onChange={(e) => onUpdate(lead.id, { gender: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold border-2 border-transparent focus:border-primary-500 outline-none transition-all">
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hobbies</label>
                        <textarea defaultValue={lead.hobbies} onBlur={(e) => onUpdate(lead.id, { hobbies: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold outline-none transition-all resize-none min-h-[80px]" />
                    </div>
                  </motion.div>
                )}

                {/* Family Section */}
                <SectionHeader id="family" title="Family Information" icon={Heart} />
                {activeSection === 'family' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Father's Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Name" defaultValue={lead.fatherName} onBlur={(e) => onUpdate(lead.id, { fatherName: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                            <input placeholder="Phone" defaultValue={lead.fatherPhone} onBlur={(e) => onUpdate(lead.id, { fatherPhone: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                        </div>
                        <input placeholder="Occupation" defaultValue={lead.fatherOccupation} onBlur={(e) => onUpdate(lead.id, { fatherOccupation: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Mother's Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Name" defaultValue={lead.motherName} onBlur={(e) => onUpdate(lead.id, { motherName: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                            <input placeholder="Phone" defaultValue={lead.motherPhone} onBlur={(e) => onUpdate(lead.id, { motherPhone: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                        </div>
                        <input placeholder="Occupation" defaultValue={lead.motherOccupation} onBlur={(e) => onUpdate(lead.id, { motherOccupation: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border-none outline-none" />
                    </div>
                  </motion.div>
                )}

                {/* Counseling & Assessment Section */}
                <SectionHeader id="counseling" title="Counseling & Assessment" icon={MessageSquare} />
                {activeSection === 'counseling' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">1:1 Session Notes</label>
                            <Badge variant="default">Staff cannot see this</Badge>
                        </div>
                        <textarea 
                            defaultValue={lead.notes} 
                            onBlur={(e) => onUpdate(lead.id, { notes: e.target.value })} 
                            placeholder="Type session recommendations here..."
                            className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-sm font-medium border-2 border-transparent focus:border-primary-500 outline-none transition-all resize-none min-h-[200px]" 
                        />
                    </div>
                    <div className="space-y-4">
                         <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assessment URL</label>
                            <input defaultValue={lead.testLink} onBlur={(e) => onUpdate(lead.id, { testLink: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-mono outline-none border-none" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Report PDF Link</label>
                            <input defaultValue={lead.reportPdfUrl} onBlur={(e) => onUpdate(lead.id, { reportPdfUrl: e.target.value })} placeholder="Paste edumilestones report link here..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-mono outline-none border-none" />
                        </div>
                    </div>
                  </motion.div>
                )}

                {/* Appointments & Billing Section */}
                <SectionHeader id="billing" title="Appointments & Fees" icon={CreditCard} />
                {activeSection === 'billing' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-1 pb-4 space-y-6">
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] space-y-4 border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-amber-600" size={20} />
                            <span className="font-bold text-sm dark:text-amber-200">1:1 Appointment</span>
                        </div>
                        <input 
                            type="datetime-local" 
                            defaultValue={lead.appointmentTime} 
                            onBlur={(e) => onUpdate(lead.id, { appointmentTime: e.target.value, stage: 'Appt Scheduled' })} 
                            className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl text-sm font-bold border-none outline-none shadow-sm" 
                        />
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CreditCard className="text-primary-600" size={20} />
                                <span className="font-bold text-sm">Professional Fees</span>
                            </div>
                            <button 
                                onClick={() => onUpdate(lead.id, { feesPaid: !lead.feesPaid })}
                                className={cn(
                                    "w-14 h-7 rounded-full transition-all relative",
                                    lead.feesPaid ? "bg-primary-600 shadow-lg shadow-primary-200 dark:shadow-none" : "bg-slate-200 dark:bg-slate-800"
                                )}
                            >
                                <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300", lead.feesPaid ? "left-8" : "left-1")} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Amount</label>
                                <input placeholder="₹0.00" defaultValue={lead.feesAmount} onBlur={(e) => onUpdate(lead.id, { feesAmount: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none shadow-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Mode</label>
                                <select defaultValue={lead.paymentMode} onChange={(e) => onUpdate(lead.id, { paymentMode: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border-none outline-none shadow-sm">
                                    <option value="">Mode...</option>
                                    <option value="GPay">GPay</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank">Bank</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>
                        </div>
                        <input placeholder="Transaction ID / Receipt #" defaultValue={lead.transactionId} onBlur={(e) => onUpdate(lead.id, { transactionId: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-mono border-none outline-none shadow-sm" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                <Button 
                    variant="danger" 
                    className="w-full h-14 rounded-2xl gap-3 text-sm font-black uppercase tracking-[0.2em]"
                    onClick={() => {
                        if (confirm('Permanently delete this student profile?')) {
                            onDelete(lead.id);
                            onClose();
                        }
                    }}
                >
                    <Trash2 size={18} /> Delete Student Record
                </Button>
              </div>
            </div>

            {/* Sticky Mobile Actions */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 flex gap-3 z-[60]">
               <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={onClose}>Close</Button>
               <Button className="flex-1 h-14 rounded-2xl bg-primary-600 text-white" onClick={() => window.open(getWhatsAppLink(lead, 'followup'), '_blank')}>Quick WhatsApp</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
