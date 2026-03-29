'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PrintWrapper from '@/components/PrintWrapper';
import { initDb, db, Product, Purchase, Sale, Expense, InventoryItem } from '@/lib/db';
import { calculateNetProfit, downloadJson, formatDate, formatCurrency } from '@/lib/utils';
import { useSettings } from '@/lib/hooks/useSettings';

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ReportsPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [range, setRange] = useState({ from: getLocalDateString(thirtyDaysAgo), to: getLocalDateString(today) });
  const settings = useSettings();
  const currency = settings?.currency ?? 'Rs';

  useEffect(() => {
    const load = async () => {
      await initDb();
      const [productsData, purchaseData, salesData, expenseData, inventoryData] = await Promise.all([
        db.products.toArray(),
        db.purchases.toArray(),
        db.sales.toArray(),
        db.expenses.toArray(),
        db.inventory.toArray(),
      ]);
      setProducts(productsData);
      setPurchases(purchaseData);
      setSales(salesData);
      setExpenses(expenseData);
      setInventory(inventoryData);
    };
    load();
  }, []);

  const { from, to } = useMemo(() => {
    const [fromYear, fromMonth, fromDay] = range.from.split('-').map(Number);
    const [toYear, toMonth, toDay] = range.to.split('-').map(Number);

    const fromDate = new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0);
    const toDate = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999);

    return { from: fromDate, to: toDate };
  }, [range]);

  useEffect(() => {
    console.log('=== DEBUG SALES ===');
    console.log('Total sales in DB:', sales.length);
    sales.forEach((s) => console.log('Sale date raw:', s.date, '| Amount:', s.totalAmount));
    console.log('From filter:', from.toISOString());
    console.log('To filter:', to.toISOString());
  }, [sales, from, to]);

  const filteredSales = useMemo(() => {
    const filtered = sales.filter((sale) => {
      const date = new Date(sale.date);
      return date >= from && date <= to;
    });
    console.log('Reports filter', { from, to, totalSales: sales.length, filteredSales: filtered.length, filtered });
    return filtered;
  }, [from, to, sales]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const date = new Date(purchase.date);
      return date >= from && date <= to;
    });
  }, [from, to, purchases]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date >= from && date <= to;
    });
  }, [from, to, expenses]);

  const totalSales = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalPurchases = filteredPurchases.reduce((acc, purchase) => acc + purchase.totalCost, 0);
  const totalExpenses = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  const netProfit = useMemo(
    () => calculateNetProfit(filteredSales, products, filteredExpenses),
    [filteredSales, products, filteredExpenses]
  );

  const bestSelling = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        counts[item.productName] = (counts[item.productName] || 0) + item.qty;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
  }, [filteredSales]);

  const inventoryValue = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const product = products.find((product) => product.id === item.productId);
      return acc + (product?.costPrice || 0) * item.quantity;
    }, 0);
  }, [inventory, products]);

  const handleExport = () => {
    downloadJson({ sales: filteredSales, purchases: filteredPurchases, expenses: filteredExpenses }, `reports-${range.from}-to-${range.to}.json`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Sales, purchase, profit and inventory reports" />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700">
            <span>From</span>
            <input
              type="date"
              value={range.from}
              onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>To</span>
            <input
              type="date"
              value={range.to}
              onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
          </label>
          <button
            type="button"
            onClick={handleExport}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-slate-500">Total sales</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(totalSales, currency)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-slate-500">Total purchases</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(totalPurchases, currency)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-slate-500">Net profit</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(netProfit, currency)}</p>
        </div>
      </div>

      <PrintWrapper title="Profit & Loss Report" printLabel="Profit & Loss Report">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Sales Report</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Total sales</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(totalSales, currency)}</p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Items sold</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{filteredSales.reduce((acc, sale) => acc + sale.items.reduce((sum, item) => sum + item.qty, 0), 0)}</p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Best selling</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{bestSelling[0]?.name || 'N/A'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Inventory Valuation</h3>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Current inventory value</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(inventoryValue, currency)}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Best Selling Products</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bestSelling.length === 0 ? (
                <div className="rounded-3xl bg-white p-4 text-sm text-slate-500">No items sold in this range</div>
              ) : (
                bestSelling.map((item) => (
                  <div key={item.name} className="rounded-3xl bg-white p-4 shadow-sm">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.qty} sold</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </PrintWrapper>
    </div>
  );
}
