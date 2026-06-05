'use client';
import { useState, useEffect } from 'react';

type User = { id: string; name: string };

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to add user');
      } else {
        setNewName('');
        await fetchUsers();
      }
    } catch {
      setError('Failed to add user');
    } finally {
      setAdding(false);
    }
  }

  async function deleteUser(id: string) {
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      setUsers(u => u.filter(x => x.id !== id));
    } catch {
      setError('Failed to delete user');
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-700 mb-3">People</h2>
      <form onSubmit={addUser} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add a person (e.g. Alex)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {adding ? 'Adding...' : 'Add'}
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-slate-400 text-sm">No people yet. Add someone above.</p>
      ) : (
        <ul className="space-y-2">
          {users.map(u => (
            <li key={u.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-slate-700">{u.name}</span>
              <button
                onClick={() => deleteUser(u.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
