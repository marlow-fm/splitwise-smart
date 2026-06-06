'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BalancesResponse, Expense, RecurringExpense, User } from '@/lib/types';

const ME_KEY = 'house-expense-me';

type HouseContextValue = {
  users: User[];
  meId: string | null;
  setMeId: (id: string) => void;
  expenses: Expense[];
  balances: BalancesResponse;
  recurring: RecurringExpense[];
  loading: boolean;
  refresh: () => Promise<void>;
  addUser: (name: string) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
};

const emptyBalances: BalancesResponse = { net: [], debts: [], monthTotalCents: 0, settlements: [] };

const HouseContext = createContext<HouseContextValue | null>(null);

export function HouseProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [meId, setMeIdState] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<BalancesResponse>(emptyBalances);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const setMeId = useCallback((id: string) => {
    setMeIdState(id);
    localStorage.setItem(ME_KEY, id);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, expensesRes, balancesRes, recurringRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/expenses'),
        fetch('/api/balances'),
        fetch('/api/recurring'),
      ]);

      const [usersData, expensesData, balancesData, recurringData] = await Promise.all([
        usersRes.json(),
        expensesRes.json(),
        balancesRes.json(),
        recurringRes.json(),
      ]);

      const nextUsers = Array.isArray(usersData) ? usersData : [];
      setUsers(nextUsers);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setBalances(balancesData?.debts ? balancesData : emptyBalances);
      setRecurring(Array.isArray(recurringData) ? recurringData : []);

      const stored = localStorage.getItem(ME_KEY);
      if (stored && nextUsers.some((u: User) => u.id === stored)) {
        setMeIdState(stored);
      } else if (nextUsers.length === 1) {
        setMeId(nextUsers[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [setMeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addUser = useCallback(
    async (name: string) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to add person');
      }
      await refresh();
    },
    [refresh],
  );

  const removeUser = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove person');
      if (meId === id) {
        localStorage.removeItem(ME_KEY);
        setMeIdState(null);
      }
      await refresh();
    },
    [meId, refresh],
  );

  const value = useMemo(
    () => ({
      users,
      meId,
      setMeId,
      expenses,
      balances,
      recurring,
      loading,
      refresh,
      addUser,
      removeUser,
    }),
    [users, meId, setMeId, expenses, balances, recurring, loading, refresh, addUser, removeUser],
  );

  return <HouseContext.Provider value={value}>{children}</HouseContext.Provider>;
}

export function useHouse() {
  const ctx = useContext(HouseContext);
  if (!ctx) throw new Error('useHouse must be used within HouseProvider');
  return ctx;
}
