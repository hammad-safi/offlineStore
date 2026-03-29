import Dexie, { Table } from 'dexie';
import { seedDatabase } from './seed';

export interface Product {
  id?: number;
  name: string;
  category: string;
  barcode: string;
  price: number;
  costPrice: number;
  unit: string;
  image: string;
  description: string;
  createdAt: string;
}

export interface InventoryItem {
  id?: number;
  productId: number;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: string;
}

export interface Purchase {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  supplier?: string;
  date: string;
  note?: string;
}

export interface SaleItem {
  productId: number;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  discount: number;
  paymentMethod: string;
  date: string;
}

export interface Supplier {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface Expense {
  id?: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface Setting {
  key: string;
  value: string;
}

class ShopDB extends Dexie {
  products!: Table<Product, number>;
  inventory!: Table<InventoryItem, number>;
  purchases!: Table<Purchase, number>;
  sales!: Table<Sale, number>;
  suppliers!: Table<Supplier, number>;
  expenses!: Table<Expense, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('ShopERP');
    this.version(1).stores({
      products: '++id,name,category,barcode,price,costPrice,unit,createdAt',
      inventory: '++id,productId,quantity,lowStockThreshold,lastUpdated',
      purchases: '++id,productId,productName,quantity,costPrice,totalCost,supplier,date',
      sales: '++id,date,totalAmount,discount,paymentMethod',
      suppliers: '++id,name,phone,email,address,createdAt',
      expenses: '++id,title,amount,category,date',
      settings: 'key',
    });
  }
}

export const db = new ShopDB();

export async function deduplicateProducts() {
  const allProducts = await db.products.toArray();
  const seen = new Map<string, number>();
  const toDelete: number[] = [];

  for (const product of allProducts) {
    const key = product.barcode ?? product.name;
    if (seen.has(key)) {
      if (product.id) toDelete.push(product.id);
    } else if (product.id) {
      seen.set(key, product.id);
    }
  }

  if (toDelete.length > 0) {
    await db.products.bulkDelete(toDelete);
  }

  const validProductIds = (await db.products.toArray()).map((product) => product.id!).filter(Boolean);
  const allInventory = await db.inventory.toArray();
  const orphanedInventory = allInventory.filter((item) => !validProductIds.includes(item.productId)).map((item) => item.id!).filter(Boolean);
  if (orphanedInventory.length > 0) {
    await db.inventory.bulkDelete(orphanedInventory);
  }

  const allInv = await db.inventory.toArray();
  const seenProductIds = new Set<number>();
  const dupInv: number[] = [];
  for (const inv of allInv) {
    if (seenProductIds.has(inv.productId)) {
      if (inv.id) dupInv.push(inv.id);
    } else {
      seenProductIds.add(inv.productId);
    }
  }
  if (dupInv.length > 0) {
    await db.inventory.bulkDelete(dupInv);
  }
}

export async function initDb() {
  await db.open();
  await deduplicateProducts();
  const count = await db.products.count();
  if (count === 0) {
    await seedDatabase();
  }
}

export async function exportDatabase() {
  const [products, inventory, purchases, sales, suppliers, expenses, settings] = await Promise.all([
    db.products.toArray(),
    db.inventory.toArray(),
    db.purchases.toArray(),
    db.sales.toArray(),
    db.suppliers.toArray(),
    db.expenses.toArray(),
    db.settings.toArray(),
  ]);

  return {
    products,
    inventory,
    purchases,
    sales,
    suppliers,
    expenses,
    settings,
  };
}
