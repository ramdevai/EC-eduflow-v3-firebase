"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import { UserRole } from '@/lib/types';
import { PartnershipsView } from './PartnershipsView';
import { ReferralsView } from './ReferralsView';

export function PartnershipsHub({ onMobileMenuClick, onOpenLead, reloadKey }: {
  onMobileMenuClick?: () => void;
  onOpenLead?: (leadId: string, referralId?: string) => void;
  reloadKey?: number;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === UserRole.Admin;
  const [section, setSection] = useState('referrals');
  return <div>
    <div className="mb-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
      <button type="button" aria-label="Open navigation" onClick={onMobileMenuClick} className="p-2 lg:hidden"><Menu size={18} /></button>
      <div role="tablist" aria-label="Partnership sections" className="flex gap-5">
        {(isAdmin ? ['partnerships', 'referrals'] : ['referrals']).map(tab => <button type="button" role="tab" key={tab}
          aria-selected={section === tab} onClick={() => setSection(tab)}
          className={`border-b-2 py-3 text-sm font-semibold ${section === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500'}`}>
          {tab === 'partnerships' ? 'Partnerships' : 'Referrals'}
        </button>)}
      </div>
    </div>
    <div role="tabpanel">
      {isAdmin && section === 'partnerships' ? <PartnershipsView onMobileMenuClick={onMobileMenuClick} onOpenLead={onOpenLead} />
        : <ReferralsView onOpenLead={onOpenLead} reloadKey={reloadKey} />}
    </div>
  </div>;
}
