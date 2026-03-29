'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PrintWrapper from '@/components/PrintWrapper';
import ConfirmDialog from '@/components/ConfirmDialog';
import { initDb, db, Product, InventoryItem, Purchase, Sale } from '@/lib/db';
import { formatDate } from '@/lib/utils';

interface AdjustForm {
  quantity: number;
  note: string;
  type: 'add' | 'subtract';
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ quantity: 0, note: '', type: 'add' });
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [historyProductId, setHistoryProductId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      await initDb();
      const [productsData, inventoryData] = await Promise.all([db.products.toArray(), db.inventory.toArray()]);
      setProducts(productsData);
      setInventory(inventoryData);
    };
    load();
  }, []);

  const inventoryView = useMemo(() => {
    return inventory
      .map((item) => {
        const product = products.find((product) => product.id === item.productId);
        return {
          ...item,
          productName: product?.name ?? 'Unknown',
          category: product?.category ?? '',
          unit: product?.unit ?? '',
        };
      })
      .filter((item) => {
        if (item.productName === 'Unknown') return false;
        if (filter === 'low') return item.quantity > 0 && item.quantity <= item.lowStockThreshold;
        if (filter === 'out') return item.quantity <= 0;
        return true;
      });
  }, [filter, inventory, products]);

  const historyEntries = useMemo(() => {
    if (!historyProductId) return [];
    const product = products.find((p) => p.id === historyProductId);
    const purchaseEvents = db.purchases
      .where('productId')
      .equals(historyProductId)
      .toArray();
    const saleEvents = db.sales.toArray();
    // eslint-disable-next-line no-console
    console.log({ purchaseEvents, saleEvents });
    return [];
  }, [historyProductId, products]);

  const handleAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustForm({ quantity: 0, note: '', type: 'add' });
    setAdjustOpen(true);
  };

  const saveAdjustment = async () => {
    if (!selectedItem) return;
    const quantityChange = adjustForm.type === 'add' ? adjustForm.quantity : -adjustForm.quantity;
    const updatedQuantity = selectedItem.quantity + quantityChange;
    await db.inventory.update(selectedItem.id as number, {
      quantity: updatedQuantity,
      lastUpdated: new Date().toISOString(),
    });
    setInventory((current) =>
      current.map((item) =>
        item.id === selectedItem.id
          ? { ...item, quantity: updatedQuantity, lastUpdated: new Date().toISOString() }
          : item
      )
    );
    setAdjustOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Track stock levels, adjust inventory, and print reports" />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as 'all' | 'low' | 'out')}
              className="bg-transparent outline-none"
            >
              <option value="all">All stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{inventoryView.length} items displayed</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Low Threshold</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventoryView.map((item) => {
                const status = item.quantity <= 0 ? 'Out' : item.quantity <= item.lowStockThreshold ? 'Low' : 'OK';
                const statusClass = status === 'Out' ? 'bg-red-100 text-red-700' : status === 'Low' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

                return (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-slate-900">{item.productName}</td>
                    <td className="px-4 py-4 text-slate-700">{item.category}</td>
                    <td className="px-4 py-4 text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-4 text-slate-700">{item.unit}</td>
                    <td className="px-4 py-4 text-slate-700">{item.lowStockThreshold}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{status}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleAdjust(item)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="h-4 w-4" />
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PrintWrapper title="Inventory Report" printLabel="Inventory Report">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm print-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3">Low Threshold</th>
                <th className="px-4 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {inventoryView.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="px-4 py-3">{item.productName}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.lowStockThreshold}</td>
                  <td className="px-4 py-3">{formatDate(item.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PrintWrapper>

      <ConfirmDialog
        open={adjustOpen}
        title="Adjust Stock"
        description="Update the current stock quantity and record a reason."
        confirmText="Save"
        cancelText="Cancel"
        onCancel={() => setAdjustOpen(false)}
        onConfirm={saveAdjustment}
      />

      {adjustOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900">Adjust Inventory</h3>
            <p className="mt-2 text-sm text-slate-600">Update stock for the selected product and add a note.</p>
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min={0}
                    value={adjustForm.quantity}
                    onChange={(event) => setAdjustForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span>Type</span>
                  <select
                    value={adjustForm.type}
                    onChange={(event) => setAdjustForm((current) => ({ ...current, type: event.target.value as 'add' | 'subtract' }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                  >
                    <option value="add">Add stock</option>
                    <option value="subtract">Subtract stock</option>
                  </select>
                </label>
              </div>
              <label className="space-y-2 text-sm text-slate-700">
                <span>Note</span>
                <textarea
                  value={adjustForm.note}
                  onChange={(event) => setAdjustForm((current) => ({ ...current, note: event.target.value }))}
                  rows={3}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button onClick={() => setAdjustOpen(false)} className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                  Cancel
                </button>
                <button onClick={saveAdjustment} className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  Save adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
