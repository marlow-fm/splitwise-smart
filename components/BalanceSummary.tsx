'use client';

interface Props {
  data: { net: any[]; debts: any[] };
  loading: boolean;
}

export default function BalanceSummary({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="card space-y-2">
        <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  const { debts } = data;

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold text-slate-700">Balances</h2>

      {debts.length === 0 ? (
        <p className="text-slate-400 text-sm">All settled up!</p>
      ) : (
        <ul className="space-y-2">
          {debts.map((d, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <span className="font-medium text-slate-700">{d.fromName}</span>
                <span className="text-slate-400 mx-1">owes</span>
                <span className="font-medium text-slate-700">{d.toName}</span>
              </div>
              <span className="font-semibold text-red-500">${d.amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      {data.net.length > 0 && (
        <details className="text-xs">
          <summary className="text-slate-400 cursor-pointer hover:text-slate-600">Net balances</summary>
          <ul className="mt-2 space-y-1">
            {data.net.map((n) => (
              <li key={n.userId} className="flex justify-between">
                <span className="text-slate-600">{n.name}</span>
                <span className={n.net >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {n.net >= 0 ? '+' : ''}{n.net.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
