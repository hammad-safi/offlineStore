'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { initDb, db, Supplier } from '@/lib/db';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Supplier>({
    name: '',
    phone: '',
    email: '',
    address: '',
    createdAt: new Date().toISOString(),
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const load = async () => {
      await initDb();
      const suppliersData = await db.suppliers.toArray();
      setSuppliers(suppliersData);
    };
    load();
  }, []);

  const saveSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name) return;
    if (editId) {
      await db.suppliers.update(editId, form);
      setSuppliers((current) => current.map((item) => (item.id === editId ? { ...item, ...form } : item)));
    } else {
      const id = await db.suppliers.add({ ...form, createdAt: new Date().toISOString() });
      setSuppliers((current) => [...current, { ...form, id }]);
    }
    setForm({ name: '', phone: '', email: '', address: '', createdAt: new Date().toISOString() });
    setEditId(null);
  };

  const editSupplier = (supplier: Supplier) => {
    setEditId(supplier.id || null);
    setForm(supplier);
  };

  const deleteSupplier = async () => {
    if (!editId) return;
    await db.suppliers.delete(editId);
    setSuppliers((current) => current.filter((supplier) => supplier.id !== editId));
    setEditId(null);
    setForm({ name: '', phone: '', email: '', address: '', createdAt: new Date().toISOString() });
    setConfirmDelete(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage supplier contacts and details" />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{editId ? 'Edit Supplier' : 'Add Supplier'}</h2>
            <p className="text-sm text-slate-500">Keep supplier details for purchase tracking.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm({ name: '', phone: '', email: '', address: '', createdAt: new Date().toISOString() });
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" />
            New supplier
          </button>
        </div>

        <form onSubmit={saveSupplier} className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
              required
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Phone</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span>Address</span>
            <input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500"
            />
          </label>
          <div className="lg:col-span-2 flex flex-wrap gap-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700">
              {editId ? 'Update supplier' : 'Save supplier'}
            </button>
            {editId ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete supplier
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Supplier list</h2>
          <p className="text-sm text-slate-500">{suppliers.length} suppliers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold text-slate-900">{supplier.name}</td>
                  <td className="px-4 py-4 text-slate-700">{supplier.phone}</td>
                  <td className="px-4 py-4 text-slate-700">{supplier.email}</td>
                  <td className="px-4 py-4 text-slate-700">{supplier.address}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => editSupplier(supplier)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete supplier"
        description="This will remove the supplier record permanently."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteSupplier}
      />
    </div>
  );
}
