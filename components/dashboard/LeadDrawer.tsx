"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Phone, 
  Mail, 
  GraduationCap, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Lead, LeadStage, TEST_LINKS } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: (id: number, updates: Partial<Lead>) => void;
  onDelete: (id: number) => void;
  stages: LeadStage[];
}

export function LeadDrawer({ lead, onClose, onUpdate, onDelete, stages }: LeadDrawerProps) {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-950 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-9 h-9 p-0">
            <X size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => {
                if (confirm('Delete this lead?')) {
                  onDelete(lead.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">
          <header>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="info">Lead ID: #{lead.id}</Badge>
              <Badge variant="default">{format(parseISO(lead.inquiryDate), 'MMM d, yyyy')}</Badge>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {lead.name}
            </h2>
            <div className="flex flex-col gap-3 mt-6">
              <a href={`tel:${lead.phone}`} className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-primary-600 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Phone size={16} />
                </div>
                <span className="font-mono font-medium">{lead.phone}</span>
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-primary-600 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Mail size={16} />
                  </div>
                  <span className="font-mono font-medium">{lead.email}</span>
                </a>
              )}
            </div>
          </header>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Pipeline Status</h3>
            <div className="grid grid-cols-1 gap-4">
              <select 
                value={lead.stage}
                onChange={(e) => onUpdate(lead.id, { stage: e.target.value as LeadStage })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Academic</h3>
              <Card className="p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Grade</p>
                  <p className="text-base font-bold">{lead.grade || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Board</p>
                  <p className="text-base font-bold">{lead.board || 'N/A'}</p>
                </div>
              </Card>
            </section>
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Assessment</h3>
              <Card className="p-4 space-y-4">
                 <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Test Status</p>
                  <p className="text-base font-bold">{lead.testLink ? 'Link Sent' : 'Not Started'}</p>
                </div>
                {lead.stage === 'Details Requested' && (
                  <select 
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    onChange={(e) => onUpdate(lead.id, { testLink: e.target.value, stage: 'Test Sent' })}
                  >
                    <option value="">Select Assessment...</option>
                    {Object.entries(TEST_LINKS).map(([name, link]) => (
                      <option key={name} value={link}>{name}</option>
                    ))}
                  </select>
                )}
              </Card>
            </section>
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Counseling Notes</h3>
              <MessageSquare size={14} className="text-slate-400" />
            </div>
            <textarea 
              className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
              placeholder="Record career discussion notes, interests, and follow-up plans..."
              defaultValue={lead.notes}
              onBlur={(e) => onUpdate(lead.id, { notes: e.target.value })}
            />
          </section>

          <section className="pb-10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Appointments & Billing</h3>
            <Card className="p-5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Appointment</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Schedule Date/Time</p>
                  </div>
                </div>
                <input 
                  type="datetime-local"
                  className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-xs font-bold outline-none"
                  defaultValue={lead.appointmentTime}
                  onBlur={(e) => onUpdate(lead.id, { appointmentTime: e.target.value, stage: 'Appt Scheduled' })}
                />
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Payment Status</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Professional Fees</p>
                  </div>
                </div>
                <button 
                  onClick={() => onUpdate(lead.id, { feesPaid: !lead.feesPaid })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    lead.feesPaid ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    lead.feesPaid ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </Card>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
