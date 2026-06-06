'use client';

import { useState } from 'react';
import { useHouse } from '@/context/HouseContext';

export default function PeoplePanel() {
  const { users, meId, setMeId, addUser, removeUser } = useHouse();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError('');
    try {
      await addUser(name.trim());
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="card space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">Housemates</h2>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Add a name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={adding || !name.trim()} className="btn-primary px-4">
          {adding ? '…' : 'Add'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {users.length === 0 ? (
        <p className="text-sm text-slate-500">Add everyone in your house to get started.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: u.color }}
                />
                <span className="text-sm font-medium text-slate-700">{u.name}</span>
                {meId === u.id && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {meId !== u.id && (
                  <button
                    type="button"
                    onClick={() => setMeId(u.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    This is me
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeUser(u.id)}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
