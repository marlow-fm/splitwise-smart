'use client';

import { useState } from 'react';
import type { Tab } from '@/lib/types';
import TabNav from '@/components/TabNav';
import ExpenseForm from '@/components/ExpenseForm';
import RecurringPanel from '@/components/RecurringPanel';
import BalancesView from '@/components/BalancesView';
import HistoryView from '@/components/HistoryView';
import PeoplePanel from '@/components/PeoplePanel';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('add');

  return (
    <div className="space-y-5">
      <TabNav active={tab} onChange={setTab} />

      {tab === 'add' && (
        <div className="space-y-6">
          <ExpenseForm />
          <RecurringPanel />
        </div>
      )}

      {tab === 'balances' && <BalancesView />}

      {tab === 'history' && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">History</h2>
          <HistoryView />
        </section>
      )}

      {tab === 'people' && <PeoplePanel />}
    </div>
  );
}
