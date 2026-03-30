'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Printer, Phone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { initDb, db, Student, StudentLedger } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSettings } from '@/lib/hooks/useSettings';

interface StudentBalance {
  totalCharged: number;
  totalPaid: number;
  balance: number;
}

export default function StudentKhataPage() {
  const params = useParams();
  const studentId = Number(params.id);
  const [student, setStudent] = useState<Student | null>(null);
  const [ledger, setLedger] = useState<StudentLedger[]>([]);
  const [balance, setBalance] = useState<StudentBalance>({ totalCharged: 0, totalPaid: 0, balance: 0 });
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const settings = useSettings();
  const currency = settings?.currency ?? 'Rs';

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    await initDb();

    const studentData = await db.students.get(studentId);
    if (!studentData) return;

    const ledgerData = await db.studentLedger
      .where('studentId').equals(studentId)
      .sortBy('date');

    setStudent(studentData);
    setLedger(ledgerData);

    // Calculate balance
    const totalCharged = ledgerData
      .filter(e => e.type === 'charge' || e.type === 'purchase')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalPaid = ledgerData
      .filter(e => e.type === 'payment')
      .reduce((sum, e) => sum + e.amount, 0);

    setBalance({
      totalCharged,
      totalPaid,
      balance: totalCharged - totalPaid
    });
  };

  const printStudentKhata = () => {
    if (!student || !ledger) return;

    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <html>
        <head>
          <title>Khata - ${student.name}</title>
          <style>
            body { font-family: Arial; padding: 20px; font-size: 13px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .shop-name { font-size: 20px; font-weight: bold; }
            .student-info { margin: 15px 0; padding: 10px; background: #f5f5f5; }
            .info-row { display: flex; justify-content: space-between; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #333; color: white; padding: 8px; text-align: left; }
            td { padding: 6px 8px; border-bottom: 1px solid #eee; }
            .balance-row { font-weight: bold; font-size: 16px; background: #fff3cd; }
            .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #666; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="shop-name">Simple Shop</p>
            <p>Student Account Statement</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="student-info">
            <div class="info-row">
              <span><b>Student Name:</b> ${student.name}</span>
              <span><b>Roll No:</b> ${student.rollNumber}</span>
            </div>
            <div class="info-row">
              <span><b>Father Name:</b> ${student.fatherName}</span>
              <span><b>Class:</b> ${student.class}</span>
            </div>
            <div class="info-row">
              <span><b>Father Phone:</b> ${student.fatherPhone}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit (Rs)</th>
                <th>Credit (Rs)</th>
              </tr>
            </thead>
            <tbody>
              ${ledger.map(entry => `
                <tr>
                  <td>${new Date(entry.date).toLocaleDateString()}</td>
                  <td>${entry.description}</td>
                  <td>${entry.type !== 'payment' ? entry.amount.toFixed(2) : ''}</td>
                  <td>${entry.type === 'payment' ? entry.amount.toFixed(2) : ''}</td>
                </tr>
              `).join('')}
              <tr class="balance-row">
                <td colspan="2">BALANCE REMAINING</td>
                <td colspan="2">Rs ${balance.balance.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Total Charged: Rs ${balance.totalCharged.toFixed(2)} |
               Total Paid: Rs ${balance.totalPaid.toFixed(2)} |
               Balance: Rs ${balance.balance.toFixed(2)}</p>
            <p>Thank you!</p>
          </div>

          <script>window.onload = () => window.print()</script>
        </body>
      </html>
    `);
  };

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="🎓 Student Khata" description={`Account details for ${student.name}`} />

      {/* Student Info Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-semibold">{student.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Roll No</p>
            <p className="font-semibold">{student.rollNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Father</p>
            <p className="font-semibold">{student.fatherName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Class</p>
            <p className="font-semibold">{student.class}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Father Phone</p>
            <p className="font-semibold">{student.fatherPhone}</p>
          </div>
          <a
            href={`tel:${student.fatherPhone}`}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        </div>
      </div>

      {/* Account Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">💰 Account Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Charged</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(balance.totalCharged, currency)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(balance.totalPaid, currency)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Balance Left</p>
            <p className={`text-2xl font-bold ${balance.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(balance.balance, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Transaction History</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">DR</th>
                <th className="text-right py-2">CR</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="py-2">{formatDate(entry.date)}</td>
                  <td className="py-2">{entry.description}</td>
                  <td className="text-right py-2">
                    {entry.type !== 'payment' ? formatCurrency(entry.amount, currency) : ''}
                  </td>
                  <td className="text-right py-2">
                    {entry.type === 'payment' ? formatCurrency(entry.amount, currency) : ''}
                  </td>
                </tr>
              ))}
              <tr className="bg-yellow-50 font-bold">
                <td colSpan={2} className="py-3 text-center">BALANCE REMAINING</td>
                <td colSpan={2} className="text-right py-3">
                  {formatCurrency(balance.balance, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => setChargeModalOpen(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Add Charge
        </button>
        <button
          onClick={() => setPaymentModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Record Payment
        </button>
        <button
          onClick={printStudentKhata}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer className="h-4 w-4 inline mr-2" />
          Print Khata
        </button>
      </div>

      {/* Add Charge Modal */}
      {chargeModalOpen && (
        <ChargeModal
          studentId={studentId}
          onClose={() => setChargeModalOpen(false)}
          onSave={() => {
            setChargeModalOpen(false);
            loadStudentData();
          }}
        />
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <PaymentModal
          studentId={studentId}
          onClose={() => setPaymentModalOpen(false)}
          onSave={() => {
            setPaymentModalOpen(false);
            loadStudentData();
          }}
        />
      )}
    </div>
  );
}

function ChargeModal({ studentId, onClose, onSave }: { studentId: number; onClose: () => void; onSave: () => void }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await db.studentLedger.add({
      studentId,
      type: 'charge',
      amount: Number(amount),
      description: description || 'Purchase',
      date: new Date().toISOString()
    });

    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Charge</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (Rs) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2"
              placeholder="Purchase description"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Add Charge
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ studentId, onClose, onSave }: { studentId: number; onClose: () => void; onSave: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await db.studentLedger.add({
      studentId,
      type: 'payment',
      amount: Number(amount),
      description: note || 'Payment received',
      date: new Date().toISOString()
    });

    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Record Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (Rs) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2"
              placeholder="Payment note"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}