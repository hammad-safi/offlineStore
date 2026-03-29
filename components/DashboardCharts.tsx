'use client';

import { Cell, Line, LineChart, Bar, BarChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface DashboardChartsProps {
  lineData: Array<{ name: string; value: number }>;
  barData: Array<{ name: string; revenue: number; expense: number }>;
  pieData: Array<{ name: string; value: number; fill: string }>;
  currency: string;
}

export default function DashboardCharts({ lineData, barData, pieData, currency }: DashboardChartsProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Daily Sales (30 days)</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `${value}`} />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Revenue vs Expenses</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} />
                <Legend />
                <Bar dataKey="revenue" fill="#2563eb" />
                <Bar dataKey="expense" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Top Sales by Product</h3>
          </div>
          <div className="h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData.filter((entry) => entry.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {pieData.filter((entry) => entry.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(Number(value), currency), 'Sales']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">No sales category data available yet.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
