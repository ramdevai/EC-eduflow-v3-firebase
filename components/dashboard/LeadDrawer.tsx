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
  Star,
  Copy,
  Check,
  AlertCircle,
  Bell,
  XCircle,
  Ban,
  Pencil
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Lead, LeadStage, FeesPaidStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn, normalizeStage } from '@/lib/utils';
import { getWhatsAppLink, getEmailLink } from '@/lib/messaging-utils';
import { RefreshCw } from 'lucide-react';

const TEST_OPTIONS = [
  { name: "Career Analysis for 2nd to 7th class", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as11" },
  { name: "Career Analysis for 8th, 9th & 10th Class", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as12" },
  { name: "Career Analysis for 11th & 12th Class", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as13" },
  { name: "Vocational Career Assessment", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/vas341" },
  { name: "Engineering Assessment", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as16" },
  { name: "Secondary School (IB MYP/IGCSE)", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as71" },
  { name: "High School (IBDP/A-level)", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as72" },
  { name: "Career Analysis for Graduates", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as14" },
  { name: "Career Analysis for Homemakers and Sabbatical", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/hms341" },
  { name: "Career Analysis for Professionals", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/as204" },
  { name: "Business Management", url: "https://careertest.edumilestones.com/student-dashboard/suitability-registration/login/OTI2/Bm144" },
];

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (id: number, updates: Partial<Lead>) => void;
  onDelete: (id: number) => void;
  fetchLeads: () => void;
  stages: LeadStage[];
}

export function LeadDrawer({ lead, onClose, onUpdate, onDelete, fetchLeads, stages }: LeadDrawerProps) {
  const [activeSection, setActiveSection] = useState<string | null>('pipeline');
  const [localStage, setLocalStage] = useState<LeadStage | null>(null);
  const [localFeesPaid, setLocalFeesPaid] = useState<FeesPaidStatus>('Due');
  const [showRawData, setShowRawData] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Slot Picker State
  const [showCalendar, setShowCalendar] = useState(false);
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Sync local stage when lead changes
  React.useEffect(() => {
    if (lead) {
        setLocalStage(normalizeStage(lead.stage) as LeadStage);
        setLocalFeesPaid(lead.feesPaid);
        setCopied(false);
        setShowCalendar(false);
    }
  }, [lead]);

  if (!lead) return null;

  const currentStage = localStage || (normalizeStage(lead.stage) as LeadStage);
  const connectionAge = lead.inquiryDate ? differenceInDays(new Date(), new Date(lead.inquiryDate)) : 0;
  const stageAge = lead.lastStageUpdate ? differenceInDays(new Date(), new Date(lead.lastStageUpdate)) : 0;

  const fetchAvailability = async () => {
    setLoadingCalendar(true);
    setShowCalendar(true);
    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/calendar/availability?timeMin=${timeMin}&timeMax=${timeMax}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch availability');
      setBusySlots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch availability:', err);
      alert(err.message);
      setShowCalendar(false);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleSchedule = async (startTime: string) => {
    try {
      const res = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-sheet-id': localStorage.getItem('educompass_sheet_id') || ''
        },
        body: JSON.stringify({ leadId: lead.id, startTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Event scheduled and Meet link generated!');
      fetchLeads(); // Refresh leads to show updated stage
      setShowCalendar(false);
    } catch (err: any) {
      alert('Scheduling failed: ' + err.message);
    }
  };

  const handleCopyLink = () => {
    if (!lead.registrationToken) return;
    const url = `${window.location.origin}/register/${lead.registrationToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateFreeSlots = (busy: any[]) => {
    if (!Array.isArray(busy)) return [];
    const slots = [];
    const now = new Date();
    now.setMinutes(0, 0, 0); // Round to next hour
    
    // Start from next hour or tomorrow 9AM if it's late
    let current = new Date(now.getTime() + 60 * 60 * 1000);
    if (current.getHours() > 18) {
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
    }

    const endSearch = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    while (current < endSearch) {
        const hour = current.getHours();
        // Working hours 9AM to 7PM
        if (hour >= 9 && hour <= 19) {
            const startStr = current.toISOString();
            const endStr = new Date(current.getTime() + 60 * 60 * 1000).toISOString();
            
            const isBusy = busy.some(b => {
                return (startStr >= b.start && startStr < b.end) || 
                       (endStr > b.start && endStr <= b.end);
            });

            if (!isBusy) slots.push(startStr);
        }
        current = new Date(current.getTime() + 60 * 60 * 1000); // Increment 1 hour
    }
    return slots;
  };

  const handleStageChange = (newStage: LeadStage) => {
    setLocalStage(newStage);
    const updates: Partial<Lead> = { stage: newStage };
    if (newStage === 'Session complete' || newStage === 'Report sent') {
        updates.status = 'Won';
    } else if (lead.status === 'Won') {
        updates.status = 'Open';
    }
    onUpdate(lead.id, updates);
  };

  const handleSendOnboarding = async () => {
    if (!lead) return;
    
    // Generate token if not exists
    if (!lead.registrationToken) {
        const token = Math.random().toString(36).substring(2, 15);
        try {
            await onUpdate(lead.id, { 
                registrationToken: token,
                stage: 'Registration requested'
            });
            // Construct link with the new token
            const tempLead = { ...lead, registrationToken: token };
            window.open(getWhatsAppLink(tempLead, 'onboarding'), '_blank');
        } catch (err) {
            alert('Failed to generate registration link');
        }
    } else {
        window.open(getWhatsAppLink(lead, 'onboarding'), '_blank');
        handleStageChange('Registration requested');
    }
  };

  const handleSendTestLink = (testUrl: string) => {
    onUpdate(lead.id, { testLink: testUrl, stage: 'Test sent' });
    setLocalStage('Test sent');
    window.open(getWhatsAppLink({ ...lead, testLink: testUrl }, 'test'), '_blank');
  };

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

  const SlotPicker = () => (
    <Card className="p-4 border border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/20 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary-600">Available Slots (Next 3 Days)</h4>
            <Button variant="ghost" size="sm" onClick={() => setShowCalendar(false)} className="h-8 w-8 p-0 rounded-full"><X size={14}/></Button>
        </div>
        {loadingCalendar ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-4"><RefreshCw className="animate-spin" size={14} /> Checking your calendar...</div>
        ) : (
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                {generateFreeSlots(busySlots).map((slot: string) => (
                    <button 
                        key={slot}
                        onClick={() => handleSchedule(slot)}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold hover:border-primary-500 transition-all text-left shadow-sm"
                    >
                        {format(parseISO(slot), 'EEE, MMM d')}
                        <div className="text-primary-600 text-xs">{format(parseISO(slot), 'h:mm a')}</div>
                    </button>
                ))}
                {generateFreeSlots(busySlots).length === 0 && (
                    <div className="col-span-2 p-4 text-center text-xs text-slate-400 italic">No free slots found in the next 3 days.</div>
                )}
            </div>
        )}
    </Card>
  );

    const renderFeesDropdown = () => (
        <div className="flex-1 flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            {localFeesPaid === 'Paid' && <Check size={16} className="text-emerald-500" />}
            {localFeesPaid === 'Due' && <AlertCircle size={16} className="text-amber-500" />}
            {localFeesPaid === 'Waived' && <Ban size={16} className="text-slate-400" />}
            {localFeesPaid === 'Bad debt' && <XCircle size={16} className="text-red-500" />}
            
            <select 
                className="flex-1 bg-transparent font-bold text-xs outline-none"
                value={localFeesPaid}
                onChange={(e) => {
                    const status = e.target.value as FeesPaidStatus;
                    setLocalFeesPaid(status);
                    onUpdate(lead.id, { feesPaid: status });
                }}
            >
                <option value="Due">Fees Due</option>
                <option value="Paid">Fees Paid</option>
                <option value="Waived">Fees Waived</option>
                <option value="Bad debt">Bad Debt</option>
            </select>
        </div>
    );

    const renderActionArea = () => {
    const stage = normalizeStage(currentStage);
    switch (stage) {
      case 'New':
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-medium italic">Its been {connectionAge} days since you first connected with them.</p>
            <div className="grid grid-cols-1 gap-3">
                <Button className="h-14 rounded-2xl bg-emerald-500 text-white gap-3 text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none" onClick={() => window.open(getWhatsAppLink(lead, 'followup'), '_blank')}>
                    <MessageSquare size={18} /> Send inquiry follow-up
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl bg-white dark:bg-slate-900 gap-3 text-sm font-bold" onClick={handleSendOnboarding}>
                    <MessageSquare size={18} /> Send registration form
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl bg-white dark:bg-slate-900 gap-3 text-sm font-bold" onClick={() => window.open(`tel:${lead.phone}`)}>
                    Call - {lead.phone}
                </Button>
            </div>
          </div>
        );
      case 'Registration requested':
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-medium">Check with them if they need any help with registration</p>
            <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-white gap-3 text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none" onClick={() => window.open(getWhatsAppLink(lead, 'followup'), '_blank')}>
                Registration follow-up
            </Button>
          </div>
        );
      case 'Registration done':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Test link</label>
                <div className="relative">
                    <select 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary-500 appearance-none transition-all"
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleSendTestLink(val);
                        }}
                        value={lead.testLink || ''}
                    >
                        <option value="">Select a test...</option>
                        {TEST_OPTIONS.map(opt => <option key={opt.url} value={opt.url}>{opt.name}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {lead.testLink && <a href={lead.testLink} target="_blank" className="text-[10px] text-primary-600 hover:underline ml-2 truncate block">{lead.testLink}</a>}
            </div>
            <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-white gap-3 text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none" onClick={() => lead.testLink && handleSendTestLink(lead.testLink)}>
                Send assessment link
            </Button>
          </div>
        );
      case 'Test sent':
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-medium">Check with them if they need any help with the test</p>
            <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-white gap-3 text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none" onClick={() => window.open(getWhatsAppLink(lead, 'followup'), '_blank')}>
                Nudge on test completion
            </Button>
          </div>
        );
      case 'Test completed':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                <Button className="h-14 rounded-2xl bg-primary-600 text-white gap-3 text-sm font-bold shadow-lg shadow-primary-100 dark:shadow-none" onClick={fetchAvailability}>
                    Book a 1:1 slot
                </Button>
                {showCalendar && <SlotPicker />}
                <Button variant="outline" className="h-14 rounded-2xl bg-white dark:bg-slate-900 gap-3 text-sm font-bold" onClick={() => {
                    handleStageChange('Report sent');
                    window.open(getEmailLink(lead), '_blank');
                }}>
                    Send report & close
                </Button>
            </div>
                <div className="flex gap-2">
                {renderFeesDropdown()}
                <Button variant="outline" className="p-3 rounded-xl flex gap-2 text-xs font-bold">
                    <Bell size={16} /> Remind
                </Button>
            </div>
          </div>
        );
      case '1:1 scheduled':
        return (
            <div className="space-y-4">
                <Card className="flex items-center justify-between p-4 bg-primary-50/50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <Calendar size={20} className="text-primary-600" />
                        <div>
                            <p className="text-sm font-bold">{lead.appointmentTime ? format(parseISO(lead.appointmentTime), 'EEE, MMM d') : 'No time set'}</p>
                            <p className="text-xs font-medium text-primary-600">{lead.appointmentTime ? format(parseISO(lead.appointmentTime), 'h:mm a') : ''}</p>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors shadow-sm" onClick={fetchAvailability}>
                        <Pencil size={16} className="text-slate-400" />
                    </button>
                </Card>
                {showCalendar && <SlotPicker />}
                <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-white gap-3 text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none" onClick={() => handleStageChange('Session complete')}>
                    Mark session as complete
                </Button>
                <div className="flex gap-2">
                    {renderFeesDropdown()}
                    <Button variant="outline" className="flex-1 h-12 rounded-xl flex gap-2 text-xs font-bold" onClick={() => window.open(getWhatsAppLink(lead, 'community'), '_blank')}>
                        Community invite
                    </Button>
                </div>
            </div>
        );
      case 'Session complete':
      case 'Report sent':
        return (
            <div className="space-y-4">
                <Button className="w-full h-14 rounded-2xl bg-primary-600 text-white gap-3 text-sm font-bold shadow-lg shadow-primary-100 dark:shadow-none" onClick={() => window.open(getEmailLink(lead), '_blank')}>
                    Prepare & Resend Report
                </Button>
                <div className="flex gap-2">
                    {renderFeesDropdown()}
                    <Button variant="outline" className="flex-1 h-12 rounded-xl flex gap-2 text-xs font-bold" onClick={() => window.open(getWhatsAppLink(lead, 'review'), '_blank')}>
                        Ask Review
                    </Button>
                </div>
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {lead && (
        <motion.div 
          key="lead-drawer-overlay"
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex justify-end"
        >
          <motion.div 
            key="lead-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60"
          />
          
          <motion.div 
            key="lead-drawer-content"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="relative w-full md:max-w-2xl bg-white dark:bg-slate-950 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col will-change-transform"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Student detail</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-10 h-10 p-0">
                    <X size={24} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-24">
              {/* Header Info */}
              <header className="mb-6 space-y-1">
                <div className="group">
                    <input 
                        defaultValue={lead.name} 
                        onBlur={(e) => onUpdate(lead.id, { name: e.target.value })}
                        className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight w-full bg-transparent border-b border-transparent focus:border-primary-500 outline-none transition-all"
                    />
                </div>
                <p className="text-slate-500 font-bold text-sm">
                   Class {lead.grade || 'N/A'}, {lead.board || 'N/A'}
                </p>
              </header>

              {/* Current Stage Selection */}
              <div className="space-y-2 mb-6">
                  <div className="relative">
                    <select 
                        value={currentStage}
                        onChange={(e) => handleStageChange(e.target.value as LeadStage)}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary-500 appearance-none transition-all"
                    >
                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
              </div>

              {/* Dynamic Action Area */}
              <div className="mb-8">
                  {renderActionArea()}
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {/* Pipeline Section */}
                <SectionHeader id="pipeline" title="Pipeline" icon={Clock} />
                {activeSection === 'pipeline' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-1 pb-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stage Duration: {stageAge} days</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 block">Primary Phone</label>
                            <div className="flex gap-2">
                                <input 
                                    defaultValue={lead.phone} 
                                    onBlur={(e) => onUpdate(lead.id, { phone: e.target.value })}
                                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-sm font-bold outline-none focus:border-primary-500"
                                />
                                <Button variant="outline" className="w-10 h-10 p-0 rounded-xl" onClick={() => window.open(`tel:${lead.phone}`)}>
                                    <Phone size={16} />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 block">Email Address</label>
                            <div className="flex gap-2">
                                <input 
                                    defaultValue={lead.email} 
                                    onBlur={(e) => onUpdate(lead.id, { email: e.target.value })}
                                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-sm font-bold outline-none focus:border-primary-500"
                                />
                                <Button variant="outline" className="w-10 h-10 p-0 rounded-xl" onClick={() => window.open(`mailto:${lead.email}`)}>
                                    <Mail size={16} />
                                </Button>
                            </div>
                        </div>
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
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-1 pb-4 space-y-4">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <Badge variant="info">Lead ID: #{lead.id}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Grade/Class</label>
                            <input defaultValue={lead.grade} onBlur={(e) => onUpdate(lead.id, { grade: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Board</label>
                            <input defaultValue={lead.board} onBlur={(e) => onUpdate(lead.id, { board: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" />
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">School Name</label>
                        <input defaultValue={lead.school} onBlur={(e) => onUpdate(lead.id, { school: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Date of Birth</label>
                            <input type="date" defaultValue={lead.dob} onBlur={(e) => onUpdate(lead.id, { dob: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Gender</label>
                            <select defaultValue={lead.gender} onChange={(e) => onUpdate(lead.id, { gender: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all appearance-none">
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hobbies</label>
                        <textarea defaultValue={lead.hobbies} onBlur={(e) => onUpdate(lead.id, { hobbies: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500 transition-all resize-none min-h-[80px]" />
                    </div>
                  </motion.div>
                )}

                {/* Family Section */}
                <SectionHeader id="family" title="Family Information" icon={Heart} />
                {activeSection === 'family' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-1 pb-4 space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Father's Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Name" defaultValue={lead.fatherName} onBlur={(e) => onUpdate(lead.id, { fatherName: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" />
                            <input placeholder="Phone" defaultValue={lead.fatherPhone} onBlur={(e) => onUpdate(lead.id, { fatherPhone: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" />
                        </div>
                        <input placeholder="Occupation" defaultValue={lead.fatherOccupation} onBlur={(e) => onUpdate(lead.id, { fatherOccupation: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" />
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Mother's Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Name" defaultValue={lead.motherName} onBlur={(e) => onUpdate(lead.id, { motherName: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" />
                            <input placeholder="Phone" defaultValue={lead.motherPhone} onBlur={(e) => onUpdate(lead.id, { motherPhone: e.target.value })} className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" />
                        </div>
                        <input placeholder="Occupation" defaultValue={lead.motherOccupation} onBlur={(e) => onUpdate(lead.id, { motherOccupation: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" />
                    </div>
                  </motion.div>
                )}

                {/* Counseling & Assessment Section */}
                <SectionHeader id="counseling" title="Counseling & Assessment" icon={MessageSquare} />
                {activeSection === 'counseling' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-1 pb-4 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">1:1 Session Notes</label>
                            <Badge variant="default">Staff cannot see this</Badge>
                        </div>
                        <textarea 
                            defaultValue={lead.notes} 
                            onBlur={(e) => onUpdate(lead.id, { notes: e.target.value })} 
                            placeholder="Type session recommendations here..."
                            className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-sm font-medium border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all resize-none min-h-[200px]" 
                        />
                    </div>
                    <div className="space-y-4">
                         <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assessment URL</label>
                            <div className="flex gap-2">
                                <input defaultValue={lead.testLink} onBlur={(e) => onUpdate(lead.id, { testLink: e.target.value })} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500" />
                                <Button variant="outline" className="rounded-2xl" onClick={() => window.open(lead.testLink, '_blank')} disabled={!lead.testLink}><ExternalLink size={16}/></Button>
                            </div>
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Report PDF Link</label>
                            <input defaultValue={lead.reportPdfUrl} onBlur={(e) => onUpdate(lead.id, { reportPdfUrl: e.target.value })} placeholder="Paste edumilestones report link here..." className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500" />
                        </div>
                    </div>
                  </motion.div>
                )}

                {/* Appointments & Billing Section (DEPRECATED - REMOVED PER USER REQUEST)
                <SectionHeader id="billing" title="Appointments & Fees" icon={CreditCard} />
                {activeSection === 'billing' && (
                  <motion.div id="billing-section" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-1 pb-4 space-y-6">
                    <div className="p-6 bg-primary-50/50 dark:bg-primary-900/10 rounded-[2rem] space-y-4 border border-primary-100 dark:border-primary-900/20">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-primary-600" size={20} />
                            <span className="font-bold text-sm dark:text-primary-200">1:1 Appointment</span>
                        </div>
                        <input 
                            type="datetime-local" 
                            defaultValue={lead.appointmentTime} 
                            onBlur={(e) => onUpdate(lead.id, { appointmentTime: e.target.value, stage: '1:1 scheduled' })} 
                            className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 outline-none shadow-sm focus:border-primary-500 transition-all" 
                        />
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CreditCard className="text-primary-600" size={20} />
                                <span className="font-bold text-sm">Professional Fees</span>
                            </div>
                            <button 
                                onClick={() => onUpdate(lead.id, { feesPaid: !lead.feesPaid })}
                                className={cn(
                                    "w-14 h-7 rounded-full transition-all relative",
                                    lead.feesPaid ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                                )}
                            >
                                <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300", lead.feesPaid ? "left-8" : "left-1")} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Amount</label>
                                <input placeholder="₹0.00" defaultValue={lead.feesAmount} onBlur={(e) => onUpdate(lead.id, { feesAmount: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-800 outline-none shadow-sm focus:border-primary-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Mode</label>
                                <div className="relative">
                                    <select defaultValue={lead.paymentMode} onChange={(e) => onUpdate(lead.id, { paymentMode: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-800 outline-none shadow-sm appearance-none focus:border-primary-500">
                                        <option value="">Mode...</option>
                                        <option value="GPay">GPay</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank">Bank</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        <input placeholder="Transaction ID / Receipt #" defaultValue={lead.transactionId} onBlur={(e) => onUpdate(lead.id, { transactionId: e.target.value })} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 outline-none shadow-sm focus:border-primary-500" />
                    </div>
                  </motion.div>
                )}
                */}
              </div>

              {/* Danger Zone */}
              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl gap-3 text-xs font-bold text-red-500 border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10" 
                    onClick={() => {
                        if (confirm('Mark this lead as Lost?')) {
                            onUpdate(lead.id, { status: 'Lost' });
                            onClose();
                        }
                    }}
                >
                    <X size={18} /> Mark Lead as Lost
                </Button>

                <Button 
                    variant="outline" 
                    className="w-full h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400"
                    onClick={() => setShowRawData(!showRawData)}
                >
                    {showRawData ? 'Hide Debug Data' : 'View Debug Raw Data'}
                </Button>

                {showRawData && (
                    <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl text-[10px] overflow-auto max-h-64 font-mono">
                        {JSON.stringify(lead, null, 2)}
                    </pre>
                )}

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
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-3 z-[60]">
               <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={onClose}>Close</Button>
               <Button className="flex-1 h-14 rounded-2xl bg-primary-600 text-white" onClick={() => window.open(getWhatsAppLink(lead, 'followup'), '_blank')}>Quick WhatsApp</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
