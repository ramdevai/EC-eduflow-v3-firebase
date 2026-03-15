import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, LeadStage } from '@/lib/types';
import { differenceInDays } from 'date-fns';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch leads');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
        setError(null);
      } else {
        throw new Error('Expected array of leads');
      }
    } catch (err: any) {
      console.error('Failed to fetch leads:', err);
      setError(err.message);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLead = async (id: number, updates: Partial<Lead>) => {
    if (updates.stage === 'Converted') {
      updates.convertedDate = new Date().toISOString();
    } else if (updates.stage === 'Report Sent') {
      updates.reportSentDate = new Date().toISOString();
    }

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const deleteLead = async (id: number) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const addLead = async (newLead: Partial<Lead>) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      });
      if (!res.ok) throw new Error('Failed to add lead');
      await fetchLeads();
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

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

  return {
    leads,
    loading,
    error,
    reminders,
    fetchLeads,
    updateLead,
    deleteLead,
    addLead
  };
}
