import type { Expense, Product, Sale } from './db';

export const formatCurrency = (amount: number, currency = 'Rs') => {
  return `${currency} ${amount.toFixed(2)}`;
};

export const currencyFormatter = (value: number, currency = 'Rs') => {
  return formatCurrency(value, currency);
};

export const formatDate = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : 'Invalid date';
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const downloadJson = (data: unknown, fileName = 'shop-erp-backup.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const calculateCOGS = (sales: Sale[], products: Product[]) => {
  return sales.reduce((total, sale) => {
    return sale.items.reduce((saleSum, item) => {
      const product = products.find((product) => product.id === item.productId);
      const costPrice = product?.costPrice ?? 0;
      return saleSum + costPrice * item.qty;
    }, total);
  }, 0);
};

export const calculateNetProfit = (sales: Sale[], products: Product[], expenses: Expense[]) => {
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalCOGS = calculateCOGS(sales, products);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return totalRevenue - totalCOGS - totalExpenses;
};

export const DEFAULT_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAWUlEQVR4Xu3BAQ0AAADCIPunNscwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4F0GAAE2ApH4AAAAAElFTkSuQmCC';
