'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { initDb, db, Sale, Purchase, Expense, InventoryItem, Product } from '@/lib/db';
import { useSettings } from '@/lib/hooks/useSettings';
import { formatCurrency, formatDate, calculateNetProfit } from '@/lib/utils';

const DashboardCharts = dynamic<{
  lineData: Array<{ name: string; value: number }>;
  barData: Array<{ name: string; revenue: number; expense: number }>;
  pieData: Array<{ name: string; value: number; fill: string }>;
  currency: string;
}>(() => import('../components/DashboardCharts'), { ssr: false });

const categoryColors: Record<string, string> = {
  Biscuits: '#2563eb',
  Chocolates: '#f97316',
  Beverages: '#14b8a6',
  Snacks: '#e11d48',
  Dairy: '#8b5cf6',
};

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const settings = useSettings();
  const currency = settings?.currency ?? 'Rs';

  useEffect(() => {
    const load = async () => {
      await initDb();
      const [salesData, purchaseData, expenseData, inventoryData, productsData] = await Promise.all([
        db.sales.toArray(),
        db.purchases.toArray(),
        db.expenses.toArray(),
        db.inventory.toArray(),
        db.products.toArray(),
      ]);
      setSales(salesData);
      setPurchases(purchaseData);
      setExpenses(expenseData);
      setInventory(inventoryData);
      setProducts(productsData);
    };
    load();
  }, []);

  const today = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    return sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= startOfToday && saleDate < startOfTomorrow;
    });
  }, [sales]);

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return sales.filter((sale) => {
      const date = new Date(sale.date);
      return date >= startOfMonth && date <= endOfMonth;
    });
  }, [sales]);

  const purchasesThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return purchases.filter((purchase) => {
      const date = new Date(purchase.date);
      return date >= startOfMonth && date <= endOfMonth;
    });
  }, [purchases]);

  const expensesThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date >= startOfMonth && date <= endOfMonth;
    });
  }, [expenses]);

  const lowStockCount = useMemo(() => {
    const purchasedProductIds = new Set(purchases.map((purchase) => purchase.productId));

    return inventory.filter((item) => {
      const hasPreviousStock = purchasedProductIds.has(item.productId);
      return (
        (item.quantity > 0 && item.quantity <= item.lowStockThreshold) ||
        (item.quantity === 0 && hasPreviousStock)
      );
    }).length;
  }, [inventory, purchases]);

  const netProfitThisMonth = useMemo(() => {
    return calculateNetProfit(salesThisMonth, products, expensesThisMonth);
  }, [salesThisMonth, products, expensesThisMonth]);

  const lineData = useMemo(() => {
    const points: Record<string, number> = {};
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      points[date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
    }
    sales.forEach((sale) => {
      const label = new Date(sale.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (label in points) {
        points[label] += sale.totalAmount;
      }
    });
    return Object.entries(points).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const barData = useMemo(() => {
    const months: Record<string, { revenue: number; expense: number }> = {};
    for (let i = 0; i < 6; i += 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months[label] = { revenue: 0, expense: 0 };
    }
    sales.forEach((sale) => {
      const label = new Date(sale.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (months[label]) months[label].revenue += sale.totalAmount;
    });
    expenses.forEach((expense) => {
      const label = new Date(expense.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (months[label]) months[label].expense += expense.amount;
    });
    return Object.entries(months)
      .map(([name, values]) => ({ name, ...values }))
      .reverse();
  }, [sales, expenses]);

  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const product = products.find((product) => product.id === item.productId);
        const category = product?.category ?? 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + item.subtotal;
      });
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value, fill: categoryColors[name] || '#0f172a' }))
      .slice(0, 6);
  }, [sales, products]);

  const recentTransactions = useMemo(() => {
    const salesList = sales.map((sale) => ({
      type: 'Sale',
      date: sale.date,
      amount: sale.totalAmount,
      label: `${sale.items.length} item(s)`,
    }));
    const purchaseList = purchases.map((purchase) => ({
      type: 'Purchase',
      date: purchase.date,
      amount: purchase.totalCost,
      label: purchase.productName,
    }));
    return [...salesList, ...purchaseList]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales, purchases]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Revenue overview and live inventory insights" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Sales Today" value={formatCurrency(today.reduce((acc, sale) => acc + sale.totalAmount, 0), currency)} description={`${today.length} transaction(s)`} />
        <StatsCard title="Sales This Month" value={formatCurrency(salesThisMonth.reduce((acc, sale) => acc + sale.totalAmount, 0), currency)} description={`${salesThisMonth.length} sales recorded`} />
        <StatsCard title="Purchases This Month" value={formatCurrency(purchasesThisMonth.reduce((acc, purchase) => acc + purchase.totalCost, 0), currency)} description={`${purchasesThisMonth.length} restocks`} />
        <StatsCard title="Net Profit" value={formatCurrency(netProfitThisMonth, currency)} description="Revenue minus cost and expenses" />
        <StatsCard title="Low Stock Alerts" value={`${lowStockCount}`} description="Products under threshold" />
        <StatsCard title="Total Products" value={`${products.length}`} description="Active product SKUs" />
      </div>

      <DashboardCharts lineData={lineData} barData={barData} pieData={pieData} currency={currency} />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity yet.</p>
            ) : (
              recentTransactions.map((txn, index) => (
                <div key={`${txn.type}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{txn.type}</p>
                    <p className="text-sm text-slate-500">{formatDate(txn.date)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
                    <p>{txn.label}</p>
                    <p>{formatCurrency(txn.amount, currency)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
