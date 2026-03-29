'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Printer, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ImageUpload from '@/components/ImageUpload';
import ConfirmDialog from '@/components/ConfirmDialog';
import PrintWrapper from '@/components/PrintWrapper';
import { initDb, db, Product, InventoryItem } from '@/lib/db';
import { DEFAULT_IMAGE, formatCurrency } from '@/lib/utils';
import { useSettings } from '@/lib/hooks/useSettings';

const QRGenerator = dynamic(() => import('../../components/QRGenerator'), { ssr: false });
const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false });

const categories = ['Biscuits', 'Chocolates', 'Beverages', 'Snacks', 'Dairy'];
const units = ['pcs', 'kg', 'litre', 'bottle', 'pack'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const settings = useSettings();
  const currency = settings?.currency ?? 'Rs';
  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<Product>({
    name: '',
    category: 'Biscuits',
    barcode: '',
    price: 0,
    costPrice: 0,
    unit: 'pcs',
    image: DEFAULT_IMAGE,
    description: '',
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    const load = async () => {
      await initDb();
      const [productData, inventoryData] = await Promise.all([db.products.toArray(), db.inventory.toArray()]);
      setProducts(productData);
      setInventory(inventoryData);
    };
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = search.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const openNewProduct = () => {
    setSelectedProduct(null);
    setForm({
      name: '',
      category: 'Biscuits',
      barcode: '',
      price: 0,
      costPrice: 0,
      unit: 'pcs',
      image: DEFAULT_IMAGE,
      description: '',
      createdAt: new Date().toISOString(),
    });
    setOpenForm(true);
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setForm(product);
    setOpenForm(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.category) return;

    const barcodeValue = form.barcode?.trim() ?? '';
    const productData = { ...form, barcode: barcodeValue };

    if (selectedProduct?.id) {
      await db.products.update(selectedProduct.id, productData);
      setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...item, ...productData } : item)));
    } else {
      const id = await db.products.add({ ...productData, createdAt: new Date().toISOString() });
      await db.inventory.add({ productId: id as number, quantity: 0, lowStockThreshold: 10, lastUpdated: new Date().toISOString() });
      setProducts((current) => [...current, { ...(productData as Product), id }]);
    }
    setOpenForm(false);
  };

  const removeProduct = async () => {
    if (!selectedProduct?.id) return;
    await db.products.delete(selectedProduct.id);
    await db.inventory.where('productId').equals(selectedProduct.id).delete();
    setProducts((current) => current.filter((item) => item.id !== selectedProduct.id));
    setConfirmDelete(false);
    setOpenForm(false);
  };

  const updateBarcode = (value: string) => {
    setForm((current) => ({ ...current, barcode: value }));
  };

  const productInventory = (productId?: number) => inventory.find((item) => item.productId === productId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Add, edit, and print product QR labels"
        action={
          <button type="button" onClick={openNewProduct} className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        }
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, category, or barcode"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-brand-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Sale Price</th>
                <th className="px-4 py-3">Cost Price</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.name} className="h-12 w-12 rounded-3xl object-cover" />
                      <div>
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-white ${
                              product.barcode ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}
                          >
                            ● {product.barcode ? 'Has Barcode' : 'Name Only'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{product.category}</td>
                  <td className="px-4 py-4 text-slate-700">{product.barcode}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCurrency(product.price, currency)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatCurrency(product.costPrice, currency)}</td>
                  <td className="px-4 py-4 text-slate-700">{product.unit}</td>
                  <td className="px-4 py-4 text-slate-700">{productInventory(product.id)?.quantity ?? 0}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditProduct(product)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition hover:bg-slate-100">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setOpenForm(true);
                          setConfirmDelete(true);
                        }}
                        className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openForm ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/40 px-4 py-10">
          <div className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{selectedProduct ? 'Edit product' : 'Add product'}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{selectedProduct ? selectedProduct.name : 'New product'}</h2>
              </div>
              <button onClick={() => setOpenForm(false)} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                Close
              </button>
            </div>
            <form onSubmit={saveProduct} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    <span>Name</span>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-700">
                    <span>Category</span>
                    <select
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
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
                    <span className="text-sm font-medium">Barcode <span className="text-gray-400 font-normal">(optional)</span></span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Scan with USB scanner or type manually"
                        value={form.barcode}
                        onChange={(event) => updateBarcode(event.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
                        autoComplete="off"
                      />
                      {form.barcode ? <span className="text-emerald-600 text-sm self-center">✓ Set</span> : null}
                    </div>
                    <p className="text-xs text-gray-400">Point USB scanner at product packet and scan, or type the number printed under the barcode</p>
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span>Unit</span>
                    <select
                      value={form.unit}
                      onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
                    >
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    <span>Sale Price</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span>Cost Price</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.costPrice}
                      onChange={(event) => setForm((current) => ({ ...current, costPrice: Number(event.target.value) }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
                      required
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm text-slate-700">
                  <span>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    rows={4}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">
                    {selectedProduct ? 'Update Product' : 'Save Product'}
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <ImageUpload value={form.image} onChange={(value) => setForm((current) => ({ ...current, image: value }))} />
                {form.barcode ? (
                  <div id="qr-preview" className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">QR Label Preview</h3>
                    <QRGenerator value={form.barcode} />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">QR Label Preview</h3>
                    <p className="text-sm text-slate-500">Enter a barcode to see a QR preview.</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <PrintWrapper title="Print QR Labels" printLabel="QR Labels">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="mb-3 grid place-items-center">
                <QRCodeSVG value={product.barcode || product.name} size={120} includeMargin />
              </div>
              <p className="font-semibold text-slate-900">{product.name}</p>
              <p className="text-sm text-slate-600">{formatCurrency(product.price, currency)}</p>
              <p className="text-xs text-slate-500 mt-2">{product.barcode}</p>
            </div>
          ))}
        </div>
      </PrintWrapper>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product"
        description="This will remove the product and its inventory record. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={removeProduct}
      />
    </div>
  );
}
