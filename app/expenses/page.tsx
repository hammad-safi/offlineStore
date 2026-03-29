'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PrintWrapper from '@/components/PrintWrapper';
import { initDb, db, Expense } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSettings } from '@/lib/hooks/useSettings';

const categories = ['Rent', 'Utilities', 'Transport', 'Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState({ title: '', amount: 0, category: 'Other', date: new Date().toISOString().slice(0, 10), note: '' });
  const settings = useSettings();
  const currency = settings?.currency ?? 'Rs';
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    const load = async () => {
      await initDb();
      setExpenses(await db.expenses.toArray());
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return expenses.filter((item) => filterCategory === 'All' || item.category === filterCategory);
  }, [expenses, filterCategory]);

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const expense: Expense = {
      title: form.title,
      amount: form.amount,
      category: form.category,
      date: new Date(form.date).toISOString(),
      note: form.note,
    };
    const id = await db.expenses.add(expense);
    setExpenses((current) => [{ ...expense, id }, ...current]);
    setForm({ title: '', amount: 0, category: 'Other', date: new Date().toISOString().slice(0, 10), note: '' });
  };

  const totalExpenses = filtered.reduce((acc, item) => acc + item.amount, 0);

  const deleteExpense = async (expense: Expense) => {
    if (!expense.id) return;
    const confirmed = window.confirm('Delete this expense?');
    if (!confirmed) return;

    await db.expenses.delete(expense.id);
    setExpenses((current) => current.filter((item) => item.id !== expense.id));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track every shop expense and print monthly totals" />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <form onSubmit={saveExpense} className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <label className="space-y-2 text-sm text-slate-700">
              <span>Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span>Amount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span>Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span>Note</span>
                <input
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                />
              </label>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Expense total</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(totalExpenses, currency)}</p>
              </div>
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
            </div>
          </div>
        </form>
      </div>

      <PrintWrapper title="Expense Log" printLabel="Expense Log">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Filter</p>
            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="All">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm print-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{expense.title}</td>
                    <td className="px-4 py-3 text-slate-700">{expense.category}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(expense.amount, currency)}</td>
                    <td className="px-4 py-3 text-slate-700">{expense.note || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteExpense(expense)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PrintWrapper>
    </div>
  );
}
