'use client';
import { CATEGORY_COLORS, CATEGORY_EMOJI } from './SmartInput';

interface Props {
  expenses: any[];
  loading: boolean;
  onRefresh: () => void;
}

export default function ExpenseList({ expenses, loading, onRefresh }: Props) {
  if (loading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>;
  if (expenses.length === 0) return <div className="text-slate-400 text-sm text-center py-8">No expenses yet. Add one above!</div>;

  return (
    <div className="space-y-2">
      {expenses.map((exp) => {
        const catClass = CATEGORY_COLORS[exp.category] ?? CATEGORY_COLORS.general;
        const catEmoji = CATEGORY_EMOJI[exp.category] ?? '💰';
        const date = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <div key={exp.id} className="card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${catClass}`}>
              {catEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-800 truncate">{exp.description}</p>
                <span className={`category-chip ${catClass} hidden sm:flex`}>{exp.category}</span>
              </div>
              <p className="text-xs text-slate-400">
                {date} &bull; Paid by {exp.paidBy?.name} &bull; {exp.splits?.length} split{exp.splits?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-slate-800">${exp.amount.toFixed(2)}</p>
              <p className="text-xs text-slate-400">{exp.currency}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
