'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  Home,
  Box,
  Layers,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  BarChart4,
  Settings,
  X,
  GraduationCap,
} from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/products', label: 'Products', icon: Box },
  { href: '/inventory', label: 'Inventory', icon: Layers },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/purchases', label: 'Purchases', icon: Truck },
  { href: '/suppliers', label: 'Suppliers', icon: Users },
  { href: '/students', label: 'Students', icon: GraduationCap },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/reports', label: 'Reports', icon: BarChart4 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const settings = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const shopName = settings?.shopName ?? 'Simple Shop';

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-lg lg:hidden"
      >
        <span className="text-lg">☰</span>
        <span>{shopName}</span>
      </button>

      <nav className="hidden w-72 flex-none flex-col border-r border-slate-200 bg-white px-4 py-6 text-slate-800 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
            ERP
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Offline Shop</p>
            <h1 className="text-xl font-semibold">{shopName}</h1>
          </div>
        </div>

        <div className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition hover:bg-slate-100 ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Fully offline ERP system with inventory, sales, purchases, and reports.
        </div>
      </nav>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-2xl transition-transform duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
                  ERP
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Offline Shop</p>
                  <h1 className="text-lg font-semibold text-slate-900">{shopName}</h1>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 px-4 py-4">
              {links.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition hover:bg-slate-100 ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
