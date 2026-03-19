"use client";

import React, { useEffect, useState } from 'react';
import { Lead } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Cake, MessageSquare, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { getWhatsAppLink } from '@/lib/messaging-utils';

interface TodayViewProps {
  leads: Lead[];
  templates?: any[];
}

export function TodayView({ leads, templates }: TodayViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const birthdaysToday = leads.filter(lead => {
    if (!lead.dob) return false;
    const dob = new Date(lead.dob);
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  });

  const birthdayWish = (lead: Lead) => {
    window.open(getWhatsAppLink(lead, 'birthday', templates), '_blank');
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
                    {event.start?.dateTime ? format(parseISO(event.start.dateTime), 'h:mm a') : 'All Day'}
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
                  <h4 className="font-bold text-slate-900 dark:text-white">{lead.name}</h4>
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
