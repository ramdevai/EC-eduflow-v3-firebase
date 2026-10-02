"use client";

import React, { useEffect, useState } from 'react';
import { Lead, Referral } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Cake, MessageSquare, Clock, ExternalLink, Loader2, Handshake } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { openWhatsApp } from '@/lib/messaging-utils';
import { safeFormat, safeParseISO } from '@/lib/utils';

interface TodayViewProps {
  leads: Lead[];
  templates?: any[];
  onOpenLead?: (leadId: string) => void;
}

export function TodayView({ leads, templates, onOpenLead }: TodayViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueReferrals, setDueReferrals] = useState<Referral[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);

  useEffect(() => {
    async function fetchTodayEvents() {
      try {
        const res = await fetch('/api/calendar/today');
        const data = await res.json();
        if (res.ok) setEvents(data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTodayEvents();
  }, []);

  useEffect(() => {
    async function fetchDueReferrals() {
      try {
        const res = await fetch('/api/referrals?dueForFollowUp=true');
        const data = await res.json();
        if (res.ok) setDueReferrals(data.referrals || []);
      } catch (err) {
        console.error('Failed to fetch referral follow-ups:', err);
      } finally {
        setLoadingReferrals(false);
      }
    }
    fetchDueReferrals();
  }, []);

  const birthdaysToday = leads.filter(lead => {
    if (!lead.dob) return false;
    const dob = safeParseISO(lead.dob);
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  });

  const birthdayWish = (lead: Lead) => {
    openWhatsApp(lead, 'birthday', templates);
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Scheduled for Today</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event: any) => (
              <Card key={event.id} className="p-5 border-l-4 border-primary-500 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{event.summary}</h4>
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                    {event.start?.dateTime ? safeFormat(event.start.dateTime, 'h:mm a') : 'All Day'}
                  </div>
                </div>
                {event.description && <p className="text-xs text-slate-500 mb-4 line-clamp-2">{event.description}</p>}
                <div className="flex gap-2">
                  {event.hangoutLink && (
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] gap-2" onClick={() => window.open(event.hangoutLink, '_blank')}>
                      <ExternalLink size={12} /> Meet
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] gap-2">
                    <Clock size={12} /> Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed border-2">
            <p className="text-slate-400 italic text-sm">No appointments scheduled for today.</p>
          </Card>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Handshake size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Partner Follow-ups</h2>
        </div>

        {loadingReferrals ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : dueReferrals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dueReferrals.map((referral) => (
              <Card key={referral.id} className="p-5 border-l-4 border-indigo-500 shadow-sm cursor-pointer" onClick={() => onOpenLead?.(referral.leadId)}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{referral.leadName}</h4>
                  <Badge variant="info">{referral.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 mb-4">Referred to {referral.institutionName}</p>
                {referral.lastFollowUpNote && (
                  <p className="text-[11px] text-slate-400 italic mb-2 line-clamp-2">{referral.lastFollowUpNote}</p>
                )}
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  Follow up due {referral.nextFollowUpDate}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed border-2">
            <p className="text-slate-400 italic text-sm">No partner follow-ups due.</p>
          </Card>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
            <Cake size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Birthdays Today</h2>
        </div>

        {birthdaysToday.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {birthdaysToday.map((lead) => (
              <Card key={lead.id} className="p-5 border-l-4 border-pink-500 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{lead.studentName || lead.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Student ID: #{lead.id}</p>
                </div>
                <Button size="sm" className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white gap-2 text-xs" onClick={() => birthdayWish(lead)}>
                  <MessageSquare size={14} /> Wish
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed border-2">
            <p className="text-slate-400 italic text-sm">No birthdays today.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
