import { db, Product, InventoryItem, Supplier, Expense, Purchase, Sale } from './db';
import { DEFAULT_IMAGE } from './utils';

const categories = ['Biscuits', 'Chocolates', 'Beverages', 'Snacks', 'Dairy'];

const sampleProducts: Product[] = [
  {
    name: 'Creamy Biscuit',
    category: 'Biscuits',
    barcode: '1234567000011',
    price: 1.75,
    costPrice: 1.1,
    unit: 'pcs',
    image: DEFAULT_IMAGE,
    description: 'Crunchy milk-flavored biscuit.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Chocolate Bar',
    category: 'Chocolates',
    barcode: '1234567000028',
    price: 2.5,
    costPrice: 1.5,
    unit: 'pcs',
    image: DEFAULT_IMAGE,
    description: 'Dark chocolate bar.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Sparkling Soda',
    category: 'Beverages',
    barcode: '1234567000035',
    price: 1.25,
    costPrice: 0.8,
    unit: 'bottle',
    image: DEFAULT_IMAGE,
    description: 'Refreshing carbonated drink.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Potato Chips',
    category: 'Snacks',
    barcode: '1234567000042',
    price: 1.95,
    costPrice: 1.0,
    unit: 'bag',
    image: DEFAULT_IMAGE,
    description: 'Salty potato chips.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Yogurt Drink',
    category: 'Dairy',
    barcode: '1234567000059',
    price: 1.8,
    costPrice: 1.1,
    unit: 'bottle',
    image: DEFAULT_IMAGE,
    description: 'Creamy yoghurt beverage.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Salted Crackers',
    category: 'Biscuits',
    barcode: '1234567000066',
    price: 1.65,
    costPrice: 0.95,
    unit: 'pack',
    image: DEFAULT_IMAGE,
    description: 'Crispy salted crackers.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Milk Chocolate',
    category: 'Chocolates',
    barcode: '1234567000073',
    price: 2.3,
    costPrice: 1.4,
    unit: 'pcs',
    image: DEFAULT_IMAGE,
    description: 'Smooth milk chocolate.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Energy Drink',
    category: 'Beverages',
    barcode: '1234567000080',
    price: 2.15,
    costPrice: 1.25,
    unit: 'can',
    image: DEFAULT_IMAGE,
    description: 'Boost of energy.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Cheese Crackers',
    category: 'Snacks',
    barcode: '1234567000097',
    price: 2.1,
    costPrice: 1.2,
    unit: 'pack',
    image: DEFAULT_IMAGE,
    description: 'Cheesy crispy snack.',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Fresh Cheese',
    category: 'Dairy',
    barcode: '1234567000103',
    price: 3.25,
    costPrice: 2.1,
    unit: 'piece',
    image: DEFAULT_IMAGE,
    description: 'Soft fresh cheese.',
    createdAt: new Date().toISOString(),
  },
];

const sampleSuppliers: Supplier[] = [
  {
    name: 'Apex Wholesale',
    phone: '+1234567890',
    email: 'orders@apex.com',
    address: '12 Market Road',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Fresh Foods',
    phone: '+1987654321',
    email: 'contact@freshfoods.com',
    address: '88 Commerce Ave',
    createdAt: new Date().toISOString(),
  },
];

const sampleExpenses: Expense[] = [
  { title: 'Shop Rent', amount: 220, category: 'Rent', date: new Date().toISOString(), note: 'Monthly rent' },
  { title: 'Electricity Bill', amount: 65, category: 'Utilities', date: new Date().toISOString(), note: 'Power and lights' },
  { title: 'Transport', amount: 45, category: 'Transport', date: new Date().toISOString(), note: 'Delivery fees' },
];

const samplePurchases: Purchase[] = [
  {
    productId: 1,
    productName: 'Creamy Biscuit',
    quantity: 50,
    costPrice: 1.1,
    totalCost: 55,
    supplier: 'Apex Wholesale',
    date: new Date().toISOString(),
    note: 'Restock biscuits',
  },
  {
    productId: 3,
    productName: 'Sparkling Soda',
    quantity: 40,
    costPrice: 0.8,
    totalCost: 32,
    supplier: 'Fresh Foods',
    date: new Date().toISOString(),
    note: 'Summer beverages',
  },
  {
    productId: 5,
    productName: 'Yogurt Drink',
    quantity: 30,
    costPrice: 1.1,
    totalCost: 33,
    supplier: 'Fresh Foods',
    date: new Date().toISOString(),
    note: 'Dairy delivery',
  },
];

const sampleSales: Sale[] = [
  {
    items: [
      { productId: 1, productName: 'Creamy Biscuit', qty: 3, unitPrice: 1.75, subtotal: 5.25 },
      { productId: 2, productName: 'Chocolate Bar', qty: 2, unitPrice: 2.5, subtotal: 5.0 },
    ],
    totalAmount: 10.25,
    discount: 0,
    paymentMethod: 'Cash',
    date: new Date().toISOString(),
  },
  {
    items: [
      { productId: 4, productName: 'Potato Chips', qty: 4, unitPrice: 1.95, subtotal: 7.8 },
    ],
    totalAmount: 7.8,
    discount: 0,
    paymentMethod: 'Card',
    date: new Date().toISOString(),
  },
  {
    items: [
      { productId: 3, productName: 'Sparkling Soda', qty: 5, unitPrice: 1.25, subtotal: 6.25 },
    ],
    totalAmount: 6.25,
    discount: 0,
    paymentMethod: 'Cash',
    date: new Date().toISOString(),
  },
  {
    items: [
      { productId: 6, productName: 'Salted Crackers', qty: 2, unitPrice: 1.65, subtotal: 3.3 },
      { productId: 8, productName: 'Energy Drink', qty: 1, unitPrice: 2.15, subtotal: 2.15 },
    ],
    totalAmount: 5.45,
    discount: 0,
    paymentMethod: 'Cash',
    date: new Date().toISOString(),
  },
  {
    items: [
      { productId: 10, productName: 'Fresh Cheese', qty: 1, unitPrice: 3.25, subtotal: 3.25 },
    ],
    totalAmount: 3.25,
    discount: 0,
    paymentMethod: 'Card',
    date: new Date().toISOString(),
  },
];

const settings = [
  { key: 'shopName', value: 'My Offline Shop' },
  { key: 'currency', value: '$' },
  { key: 'address', value: '123 Retail Street' },
  { key: 'phone', value: '+880 1234 567890' },
];

export async function seedDatabase() {
  const count = await db.products.count();
  if (count > 0) return;

  const productIds = await Promise.all(sampleProducts.map((product) => db.products.add(product)));
  const inventoryItems: InventoryItem[] = productIds.map((productId) => ({
    productId,
    quantity: 0,
    lowStockThreshold: 5,
    lastUpdated: new Date().toISOString(),
  }));

  await Promise.all([
    db.inventory.bulkAdd(inventoryItems),
    db.settings.bulkPut(settings),
  ]);
}
