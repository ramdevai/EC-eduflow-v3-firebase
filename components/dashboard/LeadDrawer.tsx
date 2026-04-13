"use client";

import React, { useState, memo, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from 'motion/react';
import Timeline from 'react-calendar-timeline';
import 'react-calendar-timeline/lib/Timeline.css';
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
  Pencil,
} from 'lucide-react';

import { differenceInDays } from 'date-fns';
import { Lead, LeadStage, FeesPaidStatus, TEST_LINKS, UserRole, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn, normalizeStage, generateRegistrationToken, safeParseISO, safeFormat, toInputFormat } from '@/lib/utils';
import { getWhatsAppLink, getEmailLink, getTestLinkByGrade, getReportEmailData, getEmailData, MessageType } from '@/lib/messaging-utils';
import { RefreshCw, Sparkles } from 'lucide-react';
import { EmailComposer } from './EmailComposer';
import { DrawerProfileForm } from './drawer/DrawerProfileForm';
import { DrawerFamilyForm } from './drawer/DrawerFamilyForm';
import { DrawerCounselingForm } from './drawer/DrawerCounselingForm';
import { DrawerPipelineForm } from './drawer/DrawerPipelineForm';
import { DrawerFeesForm } from './drawer/DrawerFeesForm';

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
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onDelete: (id: string) => void;
  fetchLeads: () => void;
  stages: LeadStage[];
  templates?: any[];
}

export const LeadDrawer = memo(function LeadDrawer({ lead, onClose, onUpdate, onDelete, fetchLeads, stages, templates }: LeadDrawerProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === UserRole.Admin;

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [localStage, setLocalStage] = useState<LeadStage | null>(lead.stage);
  const [localFeesPaid, setLocalFeesPaid] = useState<FeesPaidStatus>(lead.feesPaid || 'Due');
  const [showRawData, setShowRawData] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Slot Picker State
  const [showCalendar, setShowCalendar] = useState(false);
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [emailComposerType, setEmailComposerType] = useState<MessageType | null>(null);

  // Scheduling Settings (loaded from admin settings - hardcoded for now to avoid server bundle issues)
  const systemSettings = {
    defaultSessionDuration: 90,
    calendarLookaheadDays: 3,
  };

  const openEmailComposer = (type: MessageType) => {
    setEmailComposerType(type);
  };

  // Auto-select test link if Registration done and no test link currently set
  React.useEffect(() => {
    const stage = normalizeStage(lead.stage);
    if (stage === 'Registration done' && (!lead.testLink || lead.testLink === 'FALSE')) {
      const suggested = getTestLinkByGrade(lead.grade, lead.board);
      if (suggested && suggested !== lead.testLink) {
        onUpdate(lead.id, { testLink: suggested });
      }
    }
  }, [lead.id, lead.stage, lead.grade, lead.board, lead.testLink, onUpdate]);

  const currentStage = localStage || (normalizeStage(lead.stage) as LeadStage);
  const normalizedCurrentStage = normalizeStage(currentStage);
  const isSessionDone = normalizedCurrentStage === 'Session complete' || normalizedCurrentStage === 'Report sent';
  const connectionAge = lead.inquiryDate ? differenceInDays(new Date(), safeParseISO(lead.inquiryDate)) : 0;
  const stageAge = lead.lastStageUpdate ? differenceInDays(new Date(), safeParseISO(lead.lastStageUpdate)) : 0;

  const fetchAvailability = async () => {
    setLoadingCalendar(true);
    setShowCalendar(true);
    try {
      const timeMin = new Date().toISOString();
      const days = systemSettings.calendarLookaheadDays || 3;
      const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
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
    if (isScheduling) return;
    setIsScheduling(true);
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
    } finally {
      setIsScheduling(false);
    }
  };

  const handleRemind = () => {
    let type: MessageType = 'followup';
    const stage = normalizeStage(lead.stage);

    // 1. Priority: Fees Reminder
    const advancedStages = ['Test completed', '1:1 scheduled', 'Session complete', 'Report sent'];
    if (advancedStages.includes(stage) && lead.feesPaid === 'Due') {
        type = 'fees_reminder';
    } 
    // 2. Priority: Stage Nudges
    else if (stage === 'Test sent') {
        type = 'test_nudge';
    } else if (stage === 'Registration requested') {
        type = 'followup';
    }

    if (lead.communicateViaEmailOnly) {
        setEmailComposerType(type);
    } else {
        window.open(getWhatsAppLink(lead, type, templates), '_blank');
    }
  };

  const handleCancelSchedule = async () => {
    if (!lead.calendarEventId) return;
    if (!confirm('Are you sure you want to cancel this booking? This will remove the event from the calendar.')) return;
    
    setIsCancelling(true);
    try {
      const res = await fetch('/api/calendar/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, eventId: lead.calendarEventId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Booking cancelled!');
      fetchLeads(); // Refresh leads to reflect state change
    } catch (err: any) {
      alert('Cancellation failed: ' + err.message);
    } finally {
      setIsCancelling(false);
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
    
    const durationMinutes = systemSettings.defaultSessionDuration || 90;
    const lookaheadDays = systemSettings.calendarLookaheadDays || 3;

    // Start from next hour or tomorrow 9AM if it's late
    let current = new Date(now.getTime() + durationMinutes * 60 * 1000);
    if (current.getHours() > 21) {
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
    }

    // End at 9PM of the last full day (no rigid 36-hour cutoff)
    const endSearch = new Date(Date.now() + lookaheadDays * 24 * 60 * 60 * 1000);
    endSearch.setHours(21, 0, 0, 0);

    while (current < endSearch) {
        const hour = current.getHours();
        // Working hours 9AM to 9PM as requested
        if (hour >= 9 && hour < 21) {
            const startStr = current.toISOString();
            const slotEndTime = current.getTime() + durationMinutes * 60 * 1000;

            const isBusy = busy.some(b => {
                const busyStartTime = new Date(b.start?.dateTime || b.start?.date || b.start).getTime();
                const busyEndTime = new Date(b.end?.dateTime || b.end?.date || b.end).getTime();
                const slotStart = current.getTime();
                return (slotStart >= busyStartTime && slotStart < busyEndTime) || 
                       (slotEndTime > busyStartTime && slotStart < busyEndTime);
            });

            if (!isBusy) {
                slots.push(startStr);
            }
        }
        current = new Date(current.getTime() + durationMinutes * 60 * 1000); // Increment by configured slot duration
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
    
    let currentToken = lead.registrationToken;
    
    // Generate token if not exists
    if (!currentToken) {
        currentToken = generateRegistrationToken();
        try {
        await onUpdate(lead.id, { 
            registrationToken: currentToken,
            stage: 'Registration requested'
        });
        } catch (err) {
            alert('Failed to generate registration link');
            return;
        }
    }

    if (lead.communicateViaEmailOnly) {
        setEmailComposerType('onboarding');
        return;
    }
    
    window.open(getWhatsAppLink(lead, 'onboarding', templates), '_blank');
    if (normalizeStage(lead.stage) === 'New') {
        handleStageChange('Registration requested');
    }
  };


  const handleSendTestLink = () => {
    if (!lead.testLink) {
        alert('Please select a test link first.');
        return;
    }

    if (lead.communicateViaEmailOnly) {
        setEmailComposerType('test');
        return;
    }

    // Generate WhatsApp link first before starting any state updates or renders
    const whatsappUrl = getWhatsAppLink(lead, 'test', templates);
    
    // Open the window immediately using the current stable lead and templates data
    window.open(whatsappUrl, '_blank');

    // Update state and lead stage in the background
    onUpdate(lead.id, { stage: 'Test sent' });
    setLocalStage('Test sent');
  };

  const toggleSection = (section: string) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string, title: string, icon: any }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSection(id);
      }}
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

  const SlotPicker = () => {
    const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
    const freeSlots = generateFreeSlots(busySlots);
    const duration = systemSettings.defaultSessionDuration || 90;
    const days = systemSettings.calendarLookaheadDays || 3;

    // Data for Timeline View
    const timelineGroups = [{ id: 1, title: `Admin Calendar (${days} days)` }];
    const timelineItems = [
      // Booked slots in red with event title
      ...busySlots.map((slot, index) => ({
        id: `busy-${index}`,
        group: 1,
        title: slot.summary || 'Booked',
        start_time: new Date(slot.start?.dateTime || slot.start?.date || slot.start || 0).getTime(),
        end_time: new Date(slot.end?.dateTime || slot.end?.date || slot.end || 0).getTime(),
        itemProps: { style: { background: '#ef4444', color: 'white', borderRadius: '4px' } },
      })),
      // Free slots in green
      ...freeSlots.map((slot, index) => ({
        id: `free-${index}`,
        group: 1,
        title: `Free (${duration}min)`,
        start_time: new Date(slot).getTime(),
        end_time: new Date(new Date(slot).getTime() + duration * 60 * 1000).getTime(),
        itemProps: { 
          style: { background: '#22c55e', color: 'white', borderRadius: '4px', cursor: 'pointer' },
          onClick: () => handleSchedule(slot),
        },
      })),
    ];

    return (
      <Card className="p-6 border border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/20 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-primary-600">
              {duration}-Minute Slots • Next {days} Days
            </h4>
            <p className="text-xs text-slate-500">Red = Booked (with title) • Green = Available</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCalendar(false)} className="h-8 w-8 p-0 rounded-full">
            <X size={14} />
          </Button>
        </div>

        {/* Switch to view both timeline and list (as requested) */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Timeline View
          </button>
        </div>

        {loadingCalendar ? (
          <div className="flex items-center gap-3 text-sm text-slate-400 p-8 justify-center">
            <RefreshCw className="animate-spin" size={18} /> Checking admin calendar...
          </div>
        ) : (
          <div>
            {viewMode === 'list' ? (
              /* Enhanced List View with Day Headers and Red Booked Slots with Titles */
              <div className="space-y-8">
                {Array.from(new Set([
                  ...busySlots.map(s => safeFormat(s.start?.dateTime || s.start?.date || s.start, 'yyyy-MM-dd')),
                  ...freeSlots.map(s => safeFormat(s, 'yyyy-MM-dd'))
                ])).sort().map(dayStr => {
                  const dayName = safeFormat(new Date(dayStr), 'EEEE, dd MMM yyyy');
                  const dayBusy = busySlots.filter(s => safeFormat(s.start?.dateTime || s.start?.date || s.start, 'yyyy-MM-dd') === dayStr);
                  const dayFree = freeSlots.filter(s => safeFormat(s, 'yyyy-MM-dd') === dayStr);

                  return (
                    <div key={dayStr} className="space-y-4">
                      <div className="font-black text-sm uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">{dayName}</div>
                      
                      {/* Booked slots in red with event title */}
                      {dayBusy.map((slot, index) => {
                        const startStr = typeof slot.start === 'string' ? slot.start : (slot.start?.dateTime || slot.start?.date || '');
                        const endStr = typeof slot.end === 'string' ? slot.end : (slot.end?.dateTime || slot.end?.date || '');
                        const start = safeParseISO(startStr);
                        const end = safeParseISO(endStr);
                        return (
                          <div key={`booked-${index}`} className="p-5 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-3xl flex gap-4 items-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900 flex-shrink-0 flex items-center justify-center text-red-600 font-mono text-xs font-black border border-red-200">
                              BUSY
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-red-600">{slot.summary || 'Booked Event'}</div>
                              <div className="text-xs text-slate-500">
                                {safeFormat(start, 'h:mm a')} – {safeFormat(end, 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Free slots in green */}
                      {dayFree.map((slot, index) => {
                        const start = new Date(slot);
                        const end = new Date(start.getTime() + duration * 60 * 1000);
                        return (
                          <button
                            key={index}
                            onClick={() => handleSchedule(slot)}
                            className="w-full p-5 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950 border-2 border-emerald-200 dark:border-emerald-800 rounded-3xl text-left transition-all group flex gap-4 items-center"
                          >
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900 flex-shrink-0 flex items-center justify-center text-emerald-600 font-mono text-xs font-black border border-emerald-200">
                              {duration}<br />MIN
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-black text-emerald-600 text-xl">{safeFormat(slot, 'h:mm a')}</div>
                              <div className="text-xs text-slate-500 font-medium">{safeFormat(slot, 'EEE, dd MMM')}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">to {safeFormat(end, 'h:mm a')}</div>
                            </div>
                            <div className="text-emerald-600 text-xs font-bold group-hover:translate-x-0.5 transition-transform">BOOK →</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Full Horizontal Timeline View */
              <div className="h-80 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
                <Timeline
                  groups={timelineGroups}
                  items={timelineItems}
                  defaultTimeStart={Date.now()}
                  defaultTimeEnd={Date.now() + days * 24 * 60 * 60 * 1000}
                  canMove={false}
                  canResize={false}
                  lineHeight={50}
                  itemHeightRatio={0.8}
                  onItemClick={(itemId: any) => {
                    const item = timelineItems.find(i => i.id === itemId);
                    if (item && item.title.includes('Free')) {
                      const slot = new Date(item.start_time).toISOString();
                      handleSchedule(slot);
                    }
                  }}
                />
              </div>
            )}
            <p className="text-center text-[10px] text-slate-400 pt-4">
              Red = Booked (with title) • Green = Available • Switch views above to compare
            </p>
          </div>
        )}
      </Card>
    );
  };




  const renderFeesDropdown = () => null; // Removed floating fees dropdowns per design update

    const renderActionArea = () => {
    const stage = normalizeStage(currentStage);
    switch (stage) {
      case 'New':
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-medium italic">Its been {connectionAge} days since you first connected with them.</p>
            <div className="grid grid-cols-1 gap-3">
                <Button 
                    className={cn(
                        "h-14 rounded-2xl text-white gap-3 text-sm font-bold shadow-lg dark:shadow-none",
                        lead.communicateViaEmailOnly ? "bg-primary-600 shadow-primary-100" : "bg-emerald-500 shadow-emerald-100"
                    )} 
                    onClick={() => {
                        if (lead.communicateViaEmailOnly) setEmailComposerType('followup');
                        else window.open(getWhatsAppLink(lead, 'followup', templates), '_blank');
                    }}
                >
                    {lead.communicateViaEmailOnly ? <Mail size={18} /> : <MessageSquare size={18} />}
                    {lead.communicateViaEmailOnly ? "Email inquiry follow-up" : "Send inquiry follow-up"}
                </Button>
                <Button variant="outline" className="h-14 rounded-2xl bg-white dark:bg-slate-900 gap-3 text-sm font-bold" onClick={handleSendOnboarding}>
                    {lead.communicateViaEmailOnly ? <Mail size={18} /> : <MessageSquare size={18} />}
                    {lead.communicateViaEmailOnly ? "Email registration form" : "Send registration form"}
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
            <Button 
                className={cn(
                    "w-full h-14 rounded-2xl text-white gap-3 text-sm font-bold shadow-lg dark:shadow-none",
                    lead.communicateViaEmailOnly ? "bg-primary-600 shadow-primary-100" : "bg-emerald-500 shadow-emerald-100"
                )}
                onClick={() => {
                    if (lead.communicateViaEmailOnly) setEmailComposerType('followup');
                    else window.open(getWhatsAppLink(lead, 'followup', templates), '_blank');
                }}
            >
                {lead.communicateViaEmailOnly ? <Mail size={18} /> : <MessageSquare size={18} />}
                {lead.communicateViaEmailOnly ? "Email follow-up" : "Registration follow-up"}
            </Button>
          </div>
        );
      case 'Registration done':
        const suggested = getTestLinkByGrade(lead.grade, lead.board);
        return (
          <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Test link</label>
                <div className="relative">
                    <select 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:border-primary-500 appearance-none transition-all"
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val && val !== lead.testLink) {
                                onUpdate(lead.id, { testLink: val });
                            }
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

            {/* Suggestion Note */}
            {suggested ? (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-[10px] text-emerald-600 font-bold border border-emerald-100 dark:border-emerald-900/30">
                    <Sparkles size={12} />
                    Suggested based on Class {lead.grade || 'N/A'} ({lead.board || 'any'} board)
                </div>
            ) : (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-[10px] text-amber-600 font-bold border border-amber-100 dark:border-amber-900/30">
                    <AlertCircle size={12} />
                    Unable to suggest: {!lead.grade && !lead.board ? "class and board missing" : !lead.grade ? "class missing" : !lead.board ? "board missing" : `no specific match for Class ${lead.grade} (${lead.board} board)`}
                </div>
            )}

            <Button 
                className={cn(
                    "w-full h-14 rounded-2xl text-white gap-3 text-sm font-bold shadow-lg dark:shadow-none disabled:opacity-50",
                    lead.communicateViaEmailOnly ? "bg-primary-600 shadow-primary-100" : "bg-emerald-500 shadow-emerald-100"
                )}
                onClick={handleSendTestLink}
                disabled={!lead.testLink}
            >
                {lead.communicateViaEmailOnly ? <Mail size={18} /> : null}
                {lead.communicateViaEmailOnly ? "Email assessment link" : "Send assessment link"}
            </Button>
          </div>
        );
      case 'Test sent':
        return (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-medium">Check with them if they need any help with the test</p>
            <Button 
                className={cn(
                    "w-full h-14 rounded-2xl text-white gap-3 text-sm font-bold shadow-lg dark:shadow-none",
                    lead.communicateViaEmailOnly ? "bg-primary-600 shadow-primary-100" : "bg-emerald-500 shadow-emerald-100"
                )}
                onClick={() => {
                    if (lead.communicateViaEmailOnly) setEmailComposerType('test_nudge');
                    else window.open(getWhatsAppLink(lead, 'test_nudge', templates), '_blank');
                }}
            >
                {lead.communicateViaEmailOnly ? <Mail size={18} /> : null}
                {lead.communicateViaEmailOnly ? "Email nudge" : "Nudge on test completion"}
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
                    setEmailComposerType('report_email');
                }}>
                    Send report & close
                </Button>
            </div>
                <div className="flex gap-2">
                {renderFeesDropdown()}
                <Button variant="outline" className="p-3 rounded-xl flex gap-2 text-xs font-bold" onClick={handleRemind}>
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
                            <p className="text-sm font-bold">{lead.appointmentTime ? safeFormat(lead.appointmentTime, 'EEE, dd MMM yyyy') : 'No time set'}</p>
                            <p className="text-xs font-medium text-primary-600">{lead.appointmentTime ? safeFormat(lead.appointmentTime, 'h:mm a') : ''}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors shadow-sm" onClick={fetchAvailability}>
                            <Pencil size={16} className="text-slate-400" />
                        </button>
                        <button 
                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors shadow-sm text-red-500" 
                            onClick={handleCancelSchedule}
                            disabled={isCancelling}
                        >
                            {isCancelling ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                    </div>
                </Card>
                {showCalendar && <SlotPicker />}
                <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-white gap-3 text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none" onClick={() => handleStageChange('Session complete')}>
                    Mark session as complete
                </Button>
                <div className="flex gap-2">
                    {renderFeesDropdown()}
                    <Button 
                        variant="outline" 
                        className="flex-1 h-12 rounded-xl flex gap-2 text-xs font-bold" 
                        onClick={() => {
                            if (lead.communicateViaEmailOnly) setEmailComposerType('community');
                            else window.open(getWhatsAppLink(lead, 'community', templates), '_blank');
                        }}
                    >
                        {lead.communicateViaEmailOnly ? <Mail size={16} /> : <MessageSquare size={16} />}
                        {lead.communicateViaEmailOnly ? "Email community invite" : "Community invite"}
                    </Button>
                </div>
            </div>
        );
      case 'Session complete':
      case 'Report sent':
        return (
            <div className="space-y-4">
                <Button className="w-full h-14 rounded-2xl bg-primary-600 text-white gap-3 text-sm font-bold shadow-lg shadow-primary-100 dark:shadow-none" onClick={() => setEmailComposerType('report_email')}>
                    Prepare & {normalizedCurrentStage === 'Report sent' ? 'Resend' : 'Send'} Report
                </Button>
                <div className="flex gap-2">
                    {renderFeesDropdown()}
                    <Button 
                        variant="outline" 
                        className="flex-1 h-12 rounded-xl flex gap-2 text-xs font-bold" 
                        onClick={() => {
                            if (lead.communicateViaEmailOnly) setEmailComposerType('review');
                            else window.open(getWhatsAppLink(lead, 'review', templates), '_blank');
                        }}
                    >
                        {lead.communicateViaEmailOnly ? <Mail size={16} /> : <MessageSquare size={16} />}
                        {lead.communicateViaEmailOnly ? "Email review request" : "Ask Review"}
                    </Button>
                </div>
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <>
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
          className="absolute inset-0 bg-slate-950/40"
        />
        
        <motion.div 
          key="lead-drawer-content"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full md:max-w-2xl bg-white dark:bg-slate-950 h-full shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col will-change-transform"
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
                        onBlur={(e) => {
                            if (e.target.value !== lead.name) {
                                onUpdate(lead.id, { name: e.target.value });
                            }
                        }}
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
                  <DrawerPipelineForm lead={lead} onUpdate={onUpdate} stageAge={stageAge} />
                )}

                {/* Academic & Personal Section */}
                <SectionHeader id="personal" title="Student Information" icon={User} />
                {activeSection === 'personal' && (
                  <DrawerProfileForm lead={lead} onUpdate={onUpdate} />
                )}

                {/* Family Section */}
                <SectionHeader id="family" title="Family Information" icon={Heart} />
                {activeSection === 'family' && (
                  <DrawerFamilyForm lead={lead} onUpdate={onUpdate} />
                )}
                
                {/* Counseling Section */}
                <SectionHeader id="counseling" title="Counseling & Assessment" icon={MessageSquare} />
                {activeSection === 'counseling' && (
                    <DrawerCounselingForm lead={lead} onUpdate={onUpdate} />
                )}

                {/* Fees Section */}
                <SectionHeader id="fees" title="Fees" icon={CreditCard} />
                {activeSection === 'fees' && (
                    <DrawerFeesForm lead={lead} onUpdate={onUpdate} />
                )}


                {/* Academic & Personal Section */}
                {false && (<> 
                <SectionHeader id="personal" title="Student Information" icon={User} />
                {activeSection === 'personal' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-1 pb-4 space-y-4">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <Badge variant="info">Lead ID: #{lead.id}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Grade/Class</label>
                            <input 
                                defaultValue={lead.grade} 
                                onBlur={(e) => {
                                    if (e.target.value !== lead.grade) {
                                        onUpdate(lead.id, { grade: e.target.value });
                                    }
                                }} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
                            />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Board</label>
                            <input 
                                defaultValue={lead.board} 
                                onBlur={(e) => {
                                    if (e.target.value !== lead.board) {
                                        onUpdate(lead.id, { board: e.target.value });
                                    }
                                }} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">School Name</label>
                        <input 
                            defaultValue={lead.school} 
                            onBlur={(e) => {
                                if (e.target.value !== lead.school) {
                                    onUpdate(lead.id, { school: e.target.value });
                                }
                            }} 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                                Date of Birth {lead.dob ? `: ${safeFormat(lead.dob, 'dd MMM yyyy')}` : '(Not set)'}
                            </label>
                            <input 
                                type="date" 
                                defaultValue={toInputFormat(lead.dob)} 
                                onBlur={(e) => {
                                    if (e.target.value !== toInputFormat(lead.dob)) {
                                        onUpdate(lead.id, { dob: safeFormat(e.target.value) });
                                    }
                                }} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all" 
                            />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Gender</label>
                            <select 
                                defaultValue={lead.gender} 
                                onChange={(e) => {
                                    if (e.target.value !== lead.gender) {
                                        onUpdate(lead.id, { gender: e.target.value });
                                    }
                                }} 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all appearance-none"
                            >
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hobbies</label>
                        <textarea 
                            defaultValue={lead.hobbies} 
                            onBlur={(e) => {
                                if (e.target.value !== lead.hobbies) {
                                    onUpdate(lead.id, { hobbies: e.target.value });
                                }
                            }} 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-sm font-bold outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500 transition-all resize-none min-h-[80px]" 
                        />
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
                            <input 
                                placeholder="Name" 
                                defaultValue={lead.fatherName} 
                                onBlur={(e) => {
                                    if (e.target.value !== lead.fatherName) {
                                        onUpdate(lead.id, { fatherName: e.target.value });
                                    }
                                }} 
                                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
                            />
                            <input 
                                placeholder="Phone" 
                                defaultValue={lead.fatherPhone} 
                                onBlur={(e) => {
                                    if (e.target.value !== lead.fatherPhone) {
                                        onUpdate(lead.id, { fatherPhone: e.target.value });
                                    }
                                }} 
                                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
                            />
                        </div>
                        <input 
                            placeholder="Occupation" 
                            defaultValue={lead.fatherOccupation} 
                            onBlur={(e) => {
                                if (e.target.value !== lead.fatherOccupation) {
                                    onUpdate(lead.id, { fatherOccupation: e.target.value });
                                }
                            }} 
                            className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
                        />
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Mother's Details</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                placeholder="Name" 
                                defaultValue={lead.motherName} 
                                onBlur={(e) => {
                                    if (e.target.value !== lead.motherName) {
                                        onUpdate(lead.id, { motherName: e.target.value });
                                    }
                                }} 
                                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
                            />
                            <input 
                                placeholder="Phone" 
                                defaultValue={lead.motherPhone} 
                                onBlur={(e) => {
                                    if (e.target.value !== lead.motherPhone) {
                                        onUpdate(lead.id, { motherPhone: e.target.value });
                                    }
                                }} 
                                className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
                            />
                        </div>
                        <input 
                            placeholder="Occupation" 
                            defaultValue={lead.motherOccupation} 
                            onBlur={(e) => {
                                if (e.target.value !== lead.motherOccupation) {
                                    onUpdate(lead.id, { motherOccupation: e.target.value });
                                }
                            }} 
                            className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none focus:border-primary-500 shadow-sm" 
                        />
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
                            onBlur={(e) => {
                                    if (e.target.value !== lead.notes) {
                                        onUpdate(lead.id, { notes: e.target.value });
                                    }
                            }} 
                            placeholder="Type session recommendations here..."
                            className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-sm font-medium border border-slate-200 dark:border-slate-800 focus:border-primary-500 outline-none transition-all resize-none min-h-[200px]" 
                        />
                    </div>
                    <div className="space-y-4">
                         <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assessment URL</label>
                            <div className="flex gap-2">
                                <input 
                                    defaultValue={lead.testLink} 
                                    onBlur={(e) => {
                                    if (e.target.value !== lead.testLink) {
                                        onUpdate(lead.id, { testLink: e.target.value });
                                    }
                                    }} 
                                    className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500" 
                                />
                                <Button variant="outline" className="rounded-2xl" onClick={() => window.open(lead.testLink, '_blank')} disabled={!lead.testLink}><ExternalLink size={16}/></Button>
                            </div>
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Report PDF Link</label>
                            <input 
                                defaultValue={lead.reportPdfUrl} 
                                onBlur={(e) => {
                                    if (e.target.value !== lead.reportPdfUrl) {
                                        onUpdate(lead.id, { reportPdfUrl: e.target.value });
                                    }
                                }} 
                                placeholder="Paste edumilestones report link here..." 
                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono outline-none border border-slate-200 dark:border-slate-800 focus:border-primary-500" 
                            />
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
                </> )}
              </div>

              {/* Danger Zone */}
              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 space-y-4">
                {!isSessionDone && isAdmin && (
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
                )}

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

                {!isSessionDone && isAdmin && (
                  <Button 
                    variant="danger" 
                    className="w-full h-12 rounded-xl gap-3 text-sm font-bold"
                    onClick={() => {
                        if (confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) {
                            onDelete(lead.id);
                            onClose();
                        }
                    }}
                  >
                      <Trash2 size={18} /> Permanently Delete Lead
                  </Button>
                )}
              </div>
            </div>

            {/* Sticky Mobile Actions */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex gap-3 z-[60]">
               <Button variant="outline" className="w-full h-14 rounded-2xl" onClick={onClose}>Close Student Detail</Button>
          </div>
        </motion.div>
      </motion.div>

      {emailComposerType && lead && (
        <EmailComposer 
          lead={lead}
          onClose={() => setEmailComposerType(null)}
          onSuccess={() => {
            if (emailComposerType === 'report_email') {
                handleStageChange('Report sent');
            } else if (emailComposerType === 'test') {
                handleStageChange('Test sent');
            } else if (emailComposerType === 'onboarding' && normalizeStage(lead.stage) === 'New') {
                handleStageChange('Registration requested');
            }
            setEmailComposerType(null);
            alert('Email sent successfully!');
          }}
          initialSubject={getEmailData(lead, emailComposerType, templates).subject}
          initialBody={getEmailData(lead, emailComposerType, templates).body}
          recipients={getEmailData(lead, emailComposerType, templates).recipients}
        />
      )}
    </>
  );
});

