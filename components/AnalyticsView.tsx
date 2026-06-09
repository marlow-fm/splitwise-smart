'use client';

import { useMemo, useState } from 'react';
import { useHouse } from '@/context/HouseContext';
import { formatMoney } from '@/lib/money';
import {
  analyticsSummary,
  utilitiesMonthly,
  VIEW_META,
  type AnalyticsView,
  type ChartBar,
} from '@/lib/analytics';

const VIEWS: { id: AnalyticsView; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'category', label: 'Category' },
  { id: 'payer', label: 'Who paid' },
  { id: 'share', label: 'Per person' },
];

const BAR_COLORS = [
  '#16a34a',
  '#059669',
  '#10b981',
  '#34d399',
  '#6ee7b7',
  '#22c55e',
  '#15803d',
  '#047857',
];

function barColor(bar: ChartBar, index: number): string {
  return bar.color ?? BAR_COLORS[index % BAR_COLORS.length];
}

function BarChart({
  bars,
  horizontal = false,
}: {
  bars: ChartBar[];
  horizontal?: boolean;
}) {
  if (bars.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">No data for this view.</p>;
  }

  const max = Math.max(...bars.map((b) => b.valueCents), 1);

  if (horizontal) {
    return (
      <ul className="space-y-3">
        {bars.map((bar, i) => {
          const pct = (bar.valueCents / max) * 100;
          const color = barColor(bar, i);
          return (
            <li key={bar.id}>
              <div className="flex justify-between text-sm mb-1 gap-2">
                <span className="font-medium text-slate-700 truncate">
                  {bar.sublabel ? `${bar.sublabel} ` : ''}
                  {bar.label}
                </span>
                <span className="text-slate-600 shrink-0 font-medium">
                  {formatMoney(bar.valueCents)}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  const chartHeight = 160;
  const barWidth = Math.min(48, Math.max(24, 280 / bars.length - 8));

  return (
    <div className="overflow-x-auto pb-1">
      <svg
        width={Math.max(bars.length * (barWidth + 12), 280)}
        height={chartHeight + 36}
        className="mx-auto"
        role="img"
        aria-label="Spending bar chart"
      >
        {bars.map((bar, i) => {
          const h = (bar.valueCents / max) * chartHeight;
          const x = i * (barWidth + 12) + 6;
          const y = chartHeight - h;
          const color = barColor(bar, i);
          return (
            <g key={bar.id}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={6}
                fill={color}
                className="transition-all duration-500"
              />
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-slate-600 text-[10px] font-medium"
              >
                {bar.valueCents >= 10000
                  ? `$${Math.round(bar.valueCents / 100)}`
                  : `$${(bar.valueCents / 100).toFixed(0)}`}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-slate-500 text-[11px]"
              >
                {bar.label}
              </text>
              {bar.sublabel && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 26}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px]"
                >
                  {bar.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AnalyticsView() {
  const { expenses, loading } = useHouse();
  const [view, setView] = useState<AnalyticsView>('monthly');
  const [showUtilities, setShowUtilities] = useState(false);

  const summary = useMemo(() => analyticsSummary(expenses), [expenses]);

  const bars = useMemo(() => {
    if (showUtilities && view === 'monthly') {
      return utilitiesMonthly(expenses);
    }
    return VIEW_META[view].compute(expenses);
  }, [expenses, view, showUtilities]);

  const meta = VIEW_META[view];
  const useHorizontal = view !== 'monthly' || showUtilities;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="card h-24 animate-pulse bg-slate-50" />
        <div className="card h-64 animate-pulse bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-br from-green-50 to-white border-green-100">
        <p className="text-xs text-slate-500 uppercase tracking-wide">All-time house spend</p>
        <p className="text-3xl font-bold text-slate-800 mt-1">
          {formatMoney(summary.totalCents)}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
          <span>
            Avg / month: <strong>{formatMoney(summary.avgMonthCents)}</strong>
          </span>
          <span>
            Top category: <strong>{summary.topCategory}</strong>
          </span>
        </div>
      </div>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Spending analytics</h2>
          <p className="text-xs text-slate-400 mt-0.5">Switch views to explore your data</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setView(v.id);
                setShowUtilities(false);
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                view === v.id && !showUtilities
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
              }`}
            >
              {v.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setView('monthly');
              setShowUtilities(true);
            }}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              showUtilities
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
            }`}
          >
            Utilities
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            {showUtilities ? 'Utilities by month' : meta.title}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {showUtilities ? 'Electric, water, wifi, rent, etc.' : meta.description}
          </p>
          <BarChart bars={bars} horizontal={useHorizontal} />
        </div>

        {bars.length > 0 && (
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            Based on {expenses.length} expense{expenses.length === 1 ? '' : 's'}
            {view === 'monthly' && !showUtilities && summary.monthCount > 0
              ? ` · last ${bars.length} month${bars.length === 1 ? '' : 's'} shown`
              : ''}
          </p>
        )}
      </section>
    </div>
  );
}
