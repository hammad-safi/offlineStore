'use client';

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
}

export default function StatsCard({ title, value, description }: StatsCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
      <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
