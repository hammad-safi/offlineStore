'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
  const settings = useSettings();
  const currency = settings?.currency ?? 'Rs';

  const parseDate = (value: string | Date) => {
    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const cleanupInvalidSaleDates = async () => {
      await initDb();
      const sales = await db.sales.toArray();
      const invalidSales = sales.filter((sale) => {
        const date = parseDate(sale.date);
        return date === null;
      });
      if (invalidSales.length > 0) {
        await Promise.all(
          invalidSales.map((sale) =>
            sale.id ? db.sales.update(sale.id, { date: new Date().toISOString() }) : Promise.resolve(0)
          )
        );
      }
    };
    cleanupInvalidSaleDates();
  }, []);

  const dashboardData = useLiveQuery(
    async () => {
      await initDb();
      const [salesData, purchaseData, expenseData, inventoryData, productsData] = await Promise.all([
        db.sales.toArray(),
        db.purchases.toArray(),
        db.expenses.toArray(),
        db.inventory.toArray(),
        db.products.toArray(),
      ]);

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const todaySales = salesData.filter((sale) => {
        const saleDate = parseDate(sale.date);
        if (!saleDate) return false;
        return (
          saleDate.getDate() === startOfToday.getDate() &&
          saleDate.getMonth() === startOfToday.getMonth() &&
          saleDate.getFullYear() === startOfToday.getFullYear()
        );
      });

      const salesThisMonth = salesData.filter((sale) => {
        const saleDate = parseDate(sale.date);
        if (!saleDate) return false;
        return (
          saleDate.getMonth() === startOfMonth.getMonth() &&
          saleDate.getFullYear() === startOfMonth.getFullYear()
        );
      });

      const purchasesThisMonth = purchaseData.filter((purchase) => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfMonth && purchaseDate <= endOfMonth;
      });

      const expensesThisMonth = expenseData.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
      });

      const purchasedProductIds = new Set(purchaseData.map((purchase) => purchase.productId));
      const lowStockCount = inventoryData.filter((item) => {
        const hasPreviousStock = purchasedProductIds.has(item.productId);
        return (
          (item.quantity > 0 && item.quantity <= item.lowStockThreshold) ||
          (item.quantity === 0 && hasPreviousStock)
        );
      }).length;

      const netProfitThisMonth = calculateNetProfit(salesThisMonth, productsData, expensesThisMonth);

      const linePoints: Record<string, number> = {};
      for (let offset = 29; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        linePoints[date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
      }
      salesData.forEach((sale) => {
        const saleDate = parseDate(sale.date);
        if (!saleDate) return;
        const label = saleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (label in linePoints) {
          linePoints[label] += sale.totalAmount;
        }
      });
      const lineData = Object.entries(linePoints).map(([name, value]) => ({ name, value }));

      const months: Record<string, { revenue: number; expense: number }> = {};
      for (let i = 0; i < 6; i += 1) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months[label] = { revenue: 0, expense: 0 };
      }
      salesData.forEach((sale) => {
        const saleDate = parseDate(sale.date);
        if (!saleDate) return;
        const label = saleDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (months[label]) months[label].revenue += sale.totalAmount;
      });
      expenseData.forEach((expense) => {
        const expenseDate = parseDate(expense.date);
        if (!expenseDate) return;
        const label = expenseDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (months[label]) months[label].expense += expense.amount;
      });
      const barData = Object.entries(months)
        .map(([name, values]) => ({ name, ...values }))
        .reverse();

      const categoryTotals: Record<string, number> = {};
      salesData.forEach((sale) => {
        sale.items.forEach((item) => {
          const product = productsData.find((product) => product.id === item.productId);
          const category = product?.category ?? 'Other';
          categoryTotals[category] = (categoryTotals[category] || 0) + item.subtotal;
        });
      });
      const pieData = Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value, fill: categoryColors[name] || '#0f172a' }))
        .slice(0, 6);

      const recentTransactions = [
        ...salesData.map((sale) => ({
          type: 'Sale' as const,
          date: sale.date,
          amount: sale.totalAmount,
          label: `${sale.items.length} item(s)`,
        })),
        ...purchaseData.map((purchase) => ({
          type: 'Purchase' as const,
          date: purchase.date,
          amount: purchase.totalCost,
          label: purchase.productName,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      return {
        salesData,
        purchaseData,
        expenseData,
        inventoryData,
        productsData,
        todaySales,
        salesThisMonth,
        purchasesThisMonth,
        expensesThisMonth,
        lowStockCount,
        netProfitThisMonth,
        lineData,
        barData,
        pieData,
        recentTransactions,
      };
    },
    []
  ) ?? {
    salesData: [],
    purchaseData: [],
    expenseData: [],
    inventoryData: [],
    productsData: [],
    todaySales: [],
    salesThisMonth: [],
    purchasesThisMonth: [],
    expensesThisMonth: [],
    lowStockCount: 0,
    netProfitThisMonth: 0,
    lineData: [],
    barData: [],
    pieData: [],
    recentTransactions: [],
  };

  const {
    salesData: sales,
    purchaseData: purchases,
    expenseData: expenses,
    inventoryData: inventory,
    productsData: products,
    todaySales: today,
    salesThisMonth,
    purchasesThisMonth,
    expensesThisMonth,
    lowStockCount,
    netProfitThisMonth,
    lineData,
    barData,
    pieData,
    recentTransactions,
  } = dashboardData;

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
