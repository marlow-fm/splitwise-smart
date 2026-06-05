'use client';
import { useState, useEffect, useCallback } from 'react';
import SmartInput from '@/components/SmartInput';
import ExpenseList from '@/components/ExpenseList';
import BalanceSummary from '@/components/BalanceSummary';

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<{ net: any[]; debts: any[] }>({ net: [], debts: [] });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, balRes] = await Promise.all([
        fetch('/api/expenses').then((r) => r.json()),
        fetch('/api/balances').then((r) => r.json()),
      ]);
      setExpenses(Array.isArray(expRes) ? expRes : []);
      setBalances(balRes?.net ? balRes : { net: [], debts: [] });
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, tick]);

  function onExpenseAdded() {
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-6">
      {/* Hero smart input */}
      <section className="card">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Add an Expense</h1>
        <p className="text-slate-500 text-sm mb-4">
          Just type naturally — e.g. <em>&ldquo;Dinner $80 I paid, split with Alex and Jamie&rdquo;</em>
        </p>
        <SmartInput onSuccess={onExpenseAdded} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balances */}
        <section className="md:col-span-1">
          <BalanceSummary data={balances} loading={loading} />
        </section>

        {/* Recent expenses */}
        <section className="md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Recent Expenses</h2>
          <ExpenseList expenses={expenses} loading={loading} onRefresh={loadData} />
        </section>
      </div>
    </div>
  );
}
