'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Trash2, Printer, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { initDb, db, Product, SaleItem, Sale, InventoryItem, Student, StudentLedger } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSettings } from '@/lib/hooks/useSettings';
import { useReactToPrint } from 'react-to-print';
import { useLiveQuery } from 'dexie-react-hooks';

const paymentMethods = ['Cash', 'Card', 'Other'];

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [amountPaying, setAmountPaying] = useState(0);
  const [studentBalance, setStudentBalance] = useState<{charged: number, paid: number, balance: number} | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [receiptAmountPaid, setReceiptAmountPaid] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const settings = useSettings();
  const currency = settings?.currency ?? 'Rs';

  useEffect(() => {
    const load = async () => {
      await initDb();
      const [productData, inventoryData] = await Promise.all([
        db.products.toArray(),
        db.inventory.toArray()
      ]);
      setProducts(productData);
      setInventory(inventoryData);
    };
    load();
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const searchResults = useMemo(() => {
    const term = searchQuery.toLowerCase();
    return products.filter((product) => product.name.toLowerCase().includes(term) || product.barcode.toLowerCase().includes(term));
  }, [products, searchQuery]);

  const studentResults = useLiveQuery(async () => {
    if (!studentSearch || studentSearch.length < 1) return [];
    const all = await db.students.toArray();
    const q = studentSearch.toLowerCase();
    return all.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.fatherName.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [studentSearch]);

  useEffect(() => {
    const loadBalance = async () => {
      if (!selectedStudent?.id) {
        setStudentBalance(null);
        return;
      }
      const ledger = await db.studentLedger
        .where('studentId').equals(selectedStudent.id).toArray();
      const charged = ledger
        .filter(e => e.type !== 'payment')
        .reduce((sum, e) => sum + e.amount, 0);
      const paid = ledger
        .filter(e => e.type === 'payment')
        .reduce((sum, e) => sum + e.amount, 0);
      setStudentBalance({ charged, paid, balance: charged - paid });
    };
    loadBalance();
  }, [selectedStudent?.id]);

  const addToCart = (product: Product) => {
    const inventoryItem = inventory.find((item) => item.productId === product.id);
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      setScanFeedback({ msg: `✗ ${product.name} is out of stock!`, type: 'error' });
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    const existing = cart.find((item) => item.productId === product.id);
    const nextQty = existing ? existing.qty + 1 : 1;
    if (nextQty > inventoryItem.quantity) {
      setScanFeedback({ msg: `✗ Only ${inventoryItem.quantity} in stock for ${product.name}.`, type: 'error' });
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    if (existing) {
      setCart((current) =>
        current.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.unitPrice } : item
        )
      );
    } else {
      setCart((current) => [...current, { productId: product.id as number, productName: product.name, qty: 1, unitPrice: product.price, subtotal: product.price }]);
    }
    setSearchQuery('');
  };

  const handleBarcodeSearch = async (value: string) => {
    const barcode = value.trim();
    if (!barcode) return;

    const product = await db.products.where('barcode').equals(barcode).first();
    if (!product) {
      setScanFeedback({ msg: `✗ No product found for barcode: ${barcode}`, type: 'error' });
      setBarcodeValue('');
      barcodeRef.current?.focus();
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    const inventoryItem = await db.inventory.where('productId').equals(product.id!).first();
    if (inventoryItem && inventoryItem.quantity <= 0) {
      setScanFeedback({ msg: `✗ ${product.name} is out of stock!`, type: 'error' });
      setBarcodeValue('');
      barcodeRef.current?.focus();
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    addToCart(product);
    setScanFeedback({ msg: `✓ ${product.name} added to cart!`, type: 'success' });
    setBarcodeValue('');
    barcodeRef.current?.focus();
    setTimeout(() => setScanFeedback(null), 3000);
  };

  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleBarcodeSearch(barcodeValue);
    }
  };

  const updateQty = (productId: number, qty: number) => {
    const inventoryItem = inventory.find((item) => item.productId === productId);
    const effectiveQty = qty < 1 ? 1 : qty;
    if (inventoryItem && effectiveQty > inventoryItem.quantity) {
      setScanFeedback({ msg: `✗ Cannot exceed stock of ${inventoryItem.quantity}.`, type: 'error' });
      setTimeout(() => setScanFeedback(null), 3000);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, qty: effectiveQty, subtotal: effectiveQty * item.unitPrice }
          : item
      )
    );
  };

  const removeItem = (productId: number) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalAmount = Math.max(0, subtotal - discount);

  const completeSale = async () => {
    if (cart.length === 0) return;
    const saleDate = new Date().toISOString();
    const sale: Sale = {
      items: cart,
      totalAmount,
      discount,
      paymentMethod: selectedStudent ? 'student_account' : paymentMethod,
      studentId: selectedStudent?.id ?? null,
      date: saleDate,
    };
    const id = await db.sales.add(sale);
    await Promise.all(
      cart.map(async (item) => {
        const inventoryItem = await db.inventory.where('productId').equals(item.productId).first();
        if (inventoryItem && inventoryItem.id) {
          const updatedQuantity = Math.max(0, inventoryItem.quantity - item.qty);
          await db.inventory.update(inventoryItem.id, {
            quantity: updatedQuantity,
            lastUpdated: new Date().toISOString(),
          });
        } else {
          await db.inventory.add({
            productId: item.productId,
            quantity: 0,
            lowStockThreshold: 5,
            lastUpdated: new Date().toISOString(),
          });
        }
      })
    );
    const updatedInventory = await db.inventory.toArray();
    setInventory(updatedInventory);

    // If student selected
    if (selectedStudent) {
      // Record the full purchase as charge
      await db.studentLedger.add({
        studentId: selectedStudent.id!,
        type: 'charge',
        amount: totalAmount,
        description: `Purchase - Sale #${id}`,
        date: saleDate,
      });

      // Record amount paid now (if any)
      if (amountPaying > 0) {
        await db.studentLedger.add({
          studentId: selectedStudent.id!,
          type: 'payment',
          amount: amountPaying,
          description: `Payment at sale #${id}`,
          date: saleDate,
        });
      }
    }

    setReceiptSale({ ...sale, id });
    setReceiptStudent(selectedStudent);
    setReceiptAmountPaid(amountPaying);
    setReceiptOpen(true);
    setCart([]);
    setSelectedStudent(null);
    setAmountPaying(0);
    setStudentSearch('');
    setStudentBalance(null);
    setDiscount(0);
    setPaymentMethod('Cash');
  };

  const printReceipt = useReactToPrint({ contentRef: receiptRef as any });

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="POS with scanner, cart, and receipt printing" />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Search product</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Add items to cart</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {searchResults.length} product(s) found
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                🔍 Scan Barcode or Search by Name
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  onKeyDown={handleBarcodeInput}
                  placeholder="📷 Scan barcode with USB scanner or type barcode number + Enter"
                  className="flex-1 border-2 border-blue-300 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={async () => await handleBarcodeSearch(barcodeValue)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {scanFeedback ? (
                <div className={`px-4 py-2 rounded-lg text-sm font-medium mb-3 ${
                  scanFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {scanFeedback.msg}
                </div>
              ) : null}
            </div>

            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔤 Or search product by name..."
                className="w-full border rounded-lg px-4 py-2 pl-9"
              />
              {searchQuery.length > 0 && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-64 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onMouseDown={() => addToCart(product)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                    >
                      {product.image ? (
                        <img src={product.image} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-gray-400">No img</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">Price: ${product.price} | Stock: {inventory.find((entry) => entry.productId === product.id)?.quantity ?? 0}</p>
                      </div>
                      <span className="text-blue-500 text-xs font-medium">+ Add</span>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.length > 0 && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 px-4 py-3 text-sm text-gray-500">
                  No products found
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Cart summary</p>
            <p className="mt-2 text-sm text-slate-600">Tap a product to add it to the cart.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No items in the cart.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.productId} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-900">{item.productName}</td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(item.unitPrice, currency)}</td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(event) => updateQty(item.productId, Number(event.target.value))}
                          className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500"
                        />
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(item.subtotal, currency)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Order summary</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value))}
                  className="w-28 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>

              {/* Student Search */}
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700">Student (optional)</label>

                {/* Show selected student */}
                {selectedStudent ? (
                  <div className="mt-1 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{selectedStudent.name}</p>
                      <p className="text-xs text-gray-500">
                        Roll: {selectedStudent.rollNumber} | Father: {selectedStudent.fatherName}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearch('');
                        setAmountPaying(0);
                        setStudentBalance(null);
                      }}
                      className="text-red-400 hover:text-red-600 text-lg leading-none ml-2"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  // Search input
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                      placeholder="Search by name or roll number..."
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    {showStudentDropdown && studentResults && studentResults.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {studentResults.map(s => (
                          <div
                            key={s.id}
                            onMouseDown={() => {
                              setSelectedStudent(s);
                              setStudentSearch('');
                              setShowStudentDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                          >
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-gray-400">
                              Roll: {s.rollNumber} | Father: {s.fatherName} | Class: {s.class}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {showStudentDropdown && studentSearch.length > 0 &&
                     studentResults?.length === 0 && (
                      <div className="absolute z-50 w-full bg-white border rounded-lg shadow mt-1 px-3 py-2 text-sm text-gray-400">
                        No student found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Student Account Section */}
              {selectedStudent && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Student Account
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Previous Balance:</span>
                      <span className={`font-medium ${
                        (studentBalance?.balance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(studentBalance?.balance ?? 0, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">This Purchase:</span>
                      <span className="font-medium">{formatCurrency(totalAmount, currency)}</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between text-sm font-bold">
                      <span>Total After Sale:</span>
                      <span className="text-red-600">
                        {formatCurrency((studentBalance?.balance ?? 0) + totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Amount Paying Now */}
                  <div className="mt-3">
                    <label className="text-xs font-medium text-gray-600">
                      Amount Paying Now ({currency})
                    </label>
                    <input
                      type="number"
                      value={amountPaying}
                      onChange={e => setAmountPaying(Number(e.target.value))}
                      placeholder="0"
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      max={totalAmount}
                    />
                    {amountPaying < totalAmount && (
                      <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                        <p className="text-xs text-yellow-700">
                          ⚠️ Remaining {formatCurrency(totalAmount - amountPaying, currency)} will be added to student account
                        </p>
                      </div>
                    )}
                    {amountPaying >= totalAmount && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-700">
                          ✅ Fully paid for this purchase
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Payment method</span>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-36 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(totalAmount, currency)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={completeSale}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <CheckCircle className="h-4 w-4" />
              Complete Sale
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Clear cart
            </button>
          </div>
        </section>
      </div>

      {receiptOpen && receiptSale ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-4 py-10">
          <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Sale Receipt</h2>
                <p className="text-sm text-slate-500">{formatDate(receiptSale.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={printReceipt}
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setReceiptOpen(false)}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div ref={receiptRef} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-800">
              <div className="space-y-1">
                <p className="text-base font-semibold">Offline Shop ERP</p>
                <p className="text-slate-600">Sales receipt</p>
                <p className="text-slate-600">{formatDate(receiptSale.date)}</p>
              </div>

              {/* Student Info */}
              {receiptStudent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-800">
                    Student: {receiptStudent.name} (Roll: {receiptStudent.rollNumber})
                  </p>
                  <p className="text-xs text-blue-600">
                    Father: {receiptStudent.fatherName} | Class: {receiptStudent.class}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {receiptSale.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-sm text-slate-600">{item.qty} × {formatCurrency(item.unitPrice, currency)}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.subtotal, currency)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Discount</span>
                  <span>{formatCurrency(receiptSale.discount, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(receiptSale.totalAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Payment</span>
                  <span>{receiptSale.paymentMethod}</span>
                </div>

                {/* Student Payment Info */}
                {receiptStudent && (
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Paid Now</span>
                      <span>{formatCurrency(receiptAmountPaid, currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Remaining Balance</span>
                      <span className="text-red-600">
                        {formatCurrency(receiptSale.totalAmount - receiptAmountPaid, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmClear}
        title="Clear cart"
        description="Remove all items from the cart?"
        confirmText="Clear"
        cancelText="Keep cart"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setCart([]);
          setConfirmClear(false);
        }}
      />
    </div>
  );
}
