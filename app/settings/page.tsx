'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { initDb, db, exportDatabase, Product, Supplier, Expense, Purchase, Sale, InventoryItem, Setting } from '@/lib/db';
import { downloadJson, formatDate } from '@/lib/utils';

interface SettingsState {
  shopName: string;
  currency: string;
  address: string;
  phone: string;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const defaultSettings: SettingsState = {
  shopName: 'My Offline Shop',
  currency: 'Rs',
  address: '123 Retail Street',
  phone: '+880 1234 567890',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const load = async () => {
      await initDb();
      const stored = await db.settings.toArray();
      if (stored.length > 0) {
        setSettings({
          shopName: stored.find((item) => item.key === 'shopName')?.value || defaultSettings.shopName,
          currency: stored.find((item) => item.key === 'currency')?.value || defaultSettings.currency,
          address: stored.find((item) => item.key === 'address')?.value || defaultSettings.address,
          phone: stored.find((item) => item.key === 'phone')?.value || defaultSettings.phone,
        });
      }
    };
    load();

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await Promise.all(
      Object.entries(settings).map(([key, value]) => db.settings.put({ key, value }))
    );
  };

  const handleExport = async () => {
    const exportData = await exportDatabase();
    downloadJson(exportData, `shop-erp-backup-${formatDate(new Date())}.json`);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text) as {
      products: Product[];
      inventory: InventoryItem[];
      purchases: Purchase[];
      sales: Sale[];
      suppliers: Supplier[];
      expenses: Expense[];
      settings: Setting[];
    };
    await db.transaction('rw', [db.products, db.inventory, db.purchases, db.sales, db.suppliers, db.expenses, db.settings], async () => {
      await Promise.all([
        db.products.clear(),
        db.inventory.clear(),
        db.purchases.clear(),
        db.sales.clear(),
        db.suppliers.clear(),
        db.expenses.clear(),
        db.settings.clear(),
      ]);
      await Promise.all([
        db.products.bulkAdd(data.products),
        db.inventory.bulkAdd(data.inventory),
        db.purchases.bulkAdd(data.purchases),
        db.sales.bulkAdd(data.sales),
        db.suppliers.bulkAdd(data.suppliers),
        db.expenses.bulkAdd(data.expenses),
        db.settings.bulkAdd(data.settings),
      ]);
    });
    setConfirmClear(false);
    window.location.reload();
  };

  const clearData = async () => {
    await db.transaction('rw', [db.products, db.inventory, db.purchases, db.sales, db.suppliers, db.expenses, db.settings], async () => {
      await Promise.all([
        db.products.clear(),
        db.inventory.clear(),
        db.purchases.clear(),
        db.sales.clear(),
        db.suppliers.clear(),
        db.expenses.clear(),
        db.settings.clear(),
      ]);
    });
    setConfirmClear(false);
    window.location.reload();
  };

  const promptInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choiceResult = await installPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Update shop settings, backup, and install app" />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <form onSubmit={saveSettings} className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>Shop Name</span>
            <input
              value={settings.shopName}
              onChange={(event) => setSettings((current) => ({ ...current, shopName: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              required
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Currency Symbol</span>
            <select
              value={settings.currency}
              onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              required
            >
              <option value="Rs">Rs (Pakistani Rupee)</option>
              <option value="PKR">PKR</option>
              <option value="$">$ (US Dollar)</option>
              <option value="€">€ (Euro)</option>
              <option value="£">£ (Pound)</option>
              <option value="৳">৳ (Bangladeshi Taka)</option>
              <option value="₹">₹ (Indian Rupee)</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Address</span>
            <input
              value={settings.address}
              onChange={(event) => setSettings((current) => ({ ...current, address: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Phone</span>
            <input
              value={settings.phone}
              onChange={(event) => setSettings((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
          </label>
          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
              Save settings
            </button>
            {installPrompt ? (
              <button
                type="button"
                onClick={promptInstall}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Install PWA
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export All Data
        </button>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          Import JSON Backup
          <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </label>
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          className="inline-flex items-center justify-center gap-2 rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Clear All Data
        </button>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all data"
        description="This will delete every record in the database. This action cannot be undone."
        confirmText="Clear data"
        cancelText="Cancel"
        onCancel={() => setConfirmClear(false)}
        onConfirm={clearData}
      />
    </div>
  );
}
