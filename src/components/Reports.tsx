import React, { useState } from 'react';
import { useAppStore } from '../store';
import { FileText, CreditCard, Box, Calendar } from 'lucide-react';
import ProfitMarginReport from './ProfitMarginReport';

const getMethodName = (method: string) => {
  switch(method) {
    case 'visa': return 'فيزا';
    case 'instapay': return 'انستا باي';
    case 'vodafone_cash': return 'فودافون كاش';
    default: return 'نقدي';
  }
};

const getTypeName = (type: string) => {
  switch(type) {
    case 'sale': return { label: 'بيع', color: 'text-green-600 bg-green-50' };
    case 'return': return { label: 'مرتجع', color: 'text-red-600 bg-red-50' };
    case 'deposit_sale': return { label: 'مبيعات عربون', color: 'text-orange-600 bg-orange-50' };
    case 'deposit_return': return { label: 'مرتجع عربون', color: 'text-purple-600 bg-purple-50' };
    case 'deposit_payment': return { label: 'سداد عربون', color: 'text-teal-600 bg-teal-50' };
    case 'installment_payment': return { label: 'سداد قسط', color: 'text-blue-600 bg-blue-50' };
    case 'installment_sale': return { label: 'بيع تقسيط', color: 'text-indigo-600 bg-indigo-50' };
    case 'purchase': return { label: 'فاتورة مشتريات', color: 'text-emerald-600 bg-emerald-50' };
    case 'cash_exchange': return { label: 'تسييل عهدة', color: 'text-amber-600 bg-amber-50' };
    default: return { label: type, color: 'text-gray-600 bg-gray-50' };
  }
};

export default function Reports({ view = 'cash' }: { view?: 'visa' | 'cash' | 'item-card' | 'profit-margin' }) {
  const { 
    transactions, 
    expenses, 
    installmentContracts
  } = useAppStore();

  const saleTransactions = transactions.filter(t => t.type === 'sale' || t.type === 'deposit_sale');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter transactions by selected date range
  const dailyTransactions = transactions.filter(t => {
    const dateStr = t.timestamp.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });

  // Helper to calculate actual paid/returned amount
  const getAmount = (t: any) => (t.type === 'deposit_sale' || t.type === 'deposit_return' || t.type === 'installment_sale') ? (t.depositAmount || 0) : t.totalAmount;

  // --- Cash Account Logic ---
  const cashSales = dailyTransactions.filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale')).reduce((sum, t) => sum + getAmount(t), 0);
  const cashReturns = dailyTransactions.filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && (t.type === 'return' || t.type === 'deposit_return')).reduce((sum, t) => sum + getAmount(t), 0);
  const cashExchangeOut = dailyTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange').reduce((sum, t) => sum + t.totalAmount, 0);
  const netCash = cashSales - cashReturns;

  // --- Expenses Logic ---
  const dailyExpenses = expenses.filter(e => {
    const dateStr = e.timestamp.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashAfterExpenses = netCash - totalExpenses - cashExchangeOut;

  // --- Cash Account Ledger Logic ---
  const ledgerEntries = (() => {
    const entries: {
      id: string;
      invoiceNumber: string;
      time: string;
      type: string;
      description: string;
      inward: number;
      outward: number;
      rawTimestamp: string;
    }[] = [];

    // Filter cash transactions
    const dailyCashTransactions = dailyTransactions.filter(t => t.paymentMethod === 'cash');

    dailyCashTransactions.forEach(t => {
      let inward = 0;
      let outward = 0;
      let description = '';
      let invoiceNumber = '';

      const itemsList = t.items && t.items.length > 0
        ? t.items.map(item => `${item.name} (${item.quantity}×${item.price})`).join(', ')
        : '';

      // Get invoice number display
      if (t.type === 'sale' || t.type === 'deposit_sale') {
        const saleIdx = saleTransactions.findIndex(tx => tx.id === t.id);
        invoiceNumber = saleIdx >= 0 ? String(saleIdx + 1) : t.id;
      } else if (t.type === 'installment_sale') {
        const contractIdx = installmentContracts.findIndex(c => 
          c.customerName === t.customerName && 
          c.customerPhone === t.customerPhone
        );
        invoiceNumber = contractIdx >= 0 ? `عقد #${contractIdx + 1}` : '—';
      } else if (t.type === 'return' || t.type === 'deposit_return') {
        const returnTransactionsList = transactions.filter(tx => tx.type === 'return' || tx.type === 'deposit_return');
        const returnIdx = returnTransactionsList.findIndex(tx => tx.id === t.id);
        invoiceNumber = returnIdx >= 0 ? String(returnIdx + 1) : t.id;
      } else if (t.type === 'purchase') {
        const purchaseTransactions = transactions.filter(tx => tx.type === 'purchase');
        const purchaseIdx = purchaseTransactions.findIndex(tx => tx.id === t.id);
        invoiceNumber = purchaseIdx >= 0 ? String(purchaseIdx + 1) : t.id;
      } else if (t.type === 'cash_exchange') {
        invoiceNumber = t.exchangeRecordNumber || '—';
      } else {
        invoiceNumber = '—';
      }

      // Determine amounts and description based on transaction type
      switch (t.type) {
        case 'sale':
          inward = t.totalAmount;
          description = `بيع نقدية: ${itemsList}`;
          break;
        case 'deposit_sale':
          inward = t.depositAmount || 0;
          description = `بيع عربون: ${itemsList} (العميل: ${t.customerName || '—'})`;
          break;
        case 'installment_sale':
          inward = t.depositAmount || 0;
          description = `مقدم قسط: ${itemsList} (العميل: ${t.customerName || '—'})`;
          break;
        case 'deposit_payment':
          inward = t.totalAmount;
          let linkedInvoiceDisplay = '';
          if (t.items && t.items[0] && t.items[0].name) {
            linkedInvoiceDisplay = t.items[0].name;
          } else {
            linkedInvoiceDisplay = `سداد دفعة عربون`;
          }
          description = `${linkedInvoiceDisplay} (العميل: ${t.customerName || '—'})`;
          break;
        case 'installment_payment':
          inward = t.totalAmount;
          description = `سداد قسط (العميل: ${t.customerName || '—'})`;
          break;
        case 'return':
          outward = t.totalAmount;
          description = `مرتجع مبيعات نقدية: ${itemsList}`;
          if (t.returnInvoiceNumber) {
            const origIdx = saleTransactions.findIndex(tx => tx.id === t.returnInvoiceNumber);
            const origInvoiceDisplay = origIdx >= 0 ? String(origIdx + 1) : t.returnInvoiceNumber;
            description += ` (لفاتورة رقم: ${origInvoiceDisplay})`;
          }
          break;
        case 'deposit_return':
          outward = t.depositAmount || 0;
          description = `مرتجع عربون: ${itemsList} (العميل: ${t.customerName || '—'})`;
          break;
        case 'purchase':
          outward = t.totalAmount;
          description = `فاتورة مشتريات (مخزن): ${itemsList}`;
          break;
        case 'cash_exchange':
          outward = t.totalAmount;
          description = `منصرف كاش - تسييل عهدة (محفظة: *${t.senderWalletLast4 || '—'})${t.customerName ? ` - ${t.customerName}` : ''}`;
          break;
        default:
          inward = t.totalAmount;
          description = `${getTypeName(t.type).label}: ${itemsList}`;
      }

      entries.push({
        id: t.id,
        invoiceNumber,
        time: `${new Date(t.timestamp).toLocaleDateString('en-GB')} ${new Date(t.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
        type: t.type,
        description,
        inward,
        outward,
        rawTimestamp: t.timestamp
      });
    });

    // Add expenses
    dailyExpenses.forEach(e => {
      entries.push({
        id: e.id,
        invoiceNumber: String(e.expenseNumber),
        time: `${new Date(e.timestamp).toLocaleDateString('en-GB')} ${new Date(e.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
        type: 'expense',
        description: `مصروف: ${e.expenseType} (${e.notes || '—'})`,
        inward: 0,
        outward: e.amount,
        rawTimestamp: e.timestamp
      });
    });

    // Sort entries chronologically
    return entries.sort((a, b) => a.rawTimestamp.localeCompare(b.rawTimestamp));
  })();

  // --- Electronic Account Logic ---
  const electronicTransactions = dailyTransactions.filter(t => t.paymentMethod !== 'cash');
  const elecSales = electronicTransactions.filter(t => t.type !== 'cash_exchange' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale')).reduce((sum, t) => sum + getAmount(t), 0);
  const elecReturns = electronicTransactions.filter(t => t.type !== 'cash_exchange' && (t.type === 'return' || t.type === 'deposit_return')).reduce((sum, t) => sum + getAmount(t), 0);
  const netElec = elecSales - elecReturns;


  // --- Electronic Account Ledger Logic ---
  const electronicLedgerEntries = (() => {
    const entries: {
      id: string;
      invoiceNumber: string;
      time: string;
      type: string;
      description: string;
      inward: number;
      outward: number;
      rawTimestamp: string;
    }[] = [];

    electronicTransactions.forEach(t => {
      let inward = 0;
      let outward = 0;
      let description = '';
      let invoiceNumber = '';

      const itemsList = t.items && t.items.length > 0
        ? t.items.map(item => `${item.name} (${item.quantity}×${item.price})`).join(', ')
        : '';

      // Get invoice number display
      if (t.type === 'sale' || t.type === 'deposit_sale') {
        const saleIdx = saleTransactions.findIndex(tx => tx.id === t.id);
        invoiceNumber = saleIdx >= 0 ? String(saleIdx + 1) : t.id;
      } else if (t.type === 'installment_sale') {
        const contractIdx = installmentContracts.findIndex(c => 
          c.customerName === t.customerName && 
          c.customerPhone === t.customerPhone
        );
        invoiceNumber = contractIdx >= 0 ? `عقد #${contractIdx + 1}` : '—';
      } else if (t.type === 'return' || t.type === 'deposit_return') {
        const returnTransactionsList = transactions.filter(tx => tx.type === 'return' || tx.type === 'deposit_return');
        const returnIdx = returnTransactionsList.findIndex(tx => tx.id === t.id);
        invoiceNumber = returnIdx >= 0 ? String(returnIdx + 1) : t.id;
      } else if (t.type === 'cash_exchange') {
        invoiceNumber = t.exchangeRecordNumber || '—';
      } else {
        invoiceNumber = '—';
      }

      // Determine amounts and description based on transaction type
      const methodLabel = getMethodName(t.paymentMethod);
      const walletsInfo = (t.senderWalletLast4 || t.receiverWalletLast4)
        ? ` (من: ${t.senderWalletLast4 ? `*${t.senderWalletLast4}` : '—'} | إلى: ${t.receiverWalletLast4 ? `*${t.receiverWalletLast4}` : '—'})`
        : '';

      switch (t.type) {
        case 'sale':
          inward = t.totalAmount;
          description = `بيع ${methodLabel}: ${itemsList}${walletsInfo}`;
          break;
        case 'deposit_sale':
          inward = t.depositAmount || 0;
          description = `بيع عربون ${methodLabel}: ${itemsList} (العميل: ${t.customerName || '—'})${walletsInfo}`;
          break;
        case 'installment_sale':
          inward = t.depositAmount || 0;
          description = `مقدم قسط ${methodLabel}: ${itemsList} (العميل: ${t.customerName || '—'})${walletsInfo}`;
          break;
        case 'deposit_payment':
          inward = t.totalAmount;
          let linkedInvoiceDisplay = '';
          if (t.items && t.items[0] && t.items[0].name) {
            linkedInvoiceDisplay = t.items[0].name;
          } else {
            linkedInvoiceDisplay = `سداد دفعة عربون`;
          }
          description = `${linkedInvoiceDisplay} ${methodLabel} (العميل: ${t.customerName || '—'})${walletsInfo}`;
          break;
        case 'installment_payment':
          inward = t.totalAmount;
          description = `سداد قسط ${methodLabel} (العميل: ${t.customerName || '—'})${walletsInfo}`;
          break;
        case 'return':
          outward = t.totalAmount;
          description = `مرتجع مبيعات ${methodLabel}: ${itemsList}${walletsInfo}`;
          if (t.returnInvoiceNumber) {
            const origIdx = saleTransactions.findIndex(tx => tx.id === t.returnInvoiceNumber);
            const origInvoiceDisplay = origIdx >= 0 ? String(origIdx + 1) : t.returnInvoiceNumber;
            description += ` (لفاتورة رقم: ${origInvoiceDisplay})`;
          }
          break;
        case 'deposit_return':
          outward = t.depositAmount || 0;
          description = `مرتجع عربون ${methodLabel}: ${itemsList} (العميل: ${t.customerName || '—'})${walletsInfo}`;
          break;
        case 'cash_exchange':
          inward = t.totalAmount;
          description = `وارد ${methodLabel} - تسييل عهدة (محفظة: *${t.senderWalletLast4 || '—'})${t.customerName ? ` - ${t.customerName}` : ''}`;
          break;
        default:
          inward = t.totalAmount;
          description = `${getTypeName(t.type).label} ${methodLabel}: ${itemsList}${walletsInfo}`;
      }

      entries.push({
        id: t.id,
        invoiceNumber,
        time: `${new Date(t.timestamp).toLocaleDateString('en-GB')} ${new Date(t.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
        type: t.type,
        description,
        inward,
        outward,
        rawTimestamp: t.timestamp
      });
    });

    // Sort entries chronologically
    return entries.sort((a, b) => a.rawTimestamp.localeCompare(b.rawTimestamp));
  })();

  const getTitle = () => {
    switch(view) {
      case 'cash': return 'كشف حساب نقدي';
      case 'visa': return 'كشف حساب الفيزا والإلكتروني';
      case 'item-card': return 'كارت الصنف';
      case 'profit-margin': return 'تقرير هامش الربح';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 w-full">
      
      {/* Header & Date Filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          {getTitle()}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-semibold text-sm">من تاريخ:</span>
            <div className="relative">
               <input 
                 type="date" 
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-44 text-left font-semibold text-sm text-gray-700"
                 dir="ltr"
               />
               <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 font-semibold text-sm">إلى تاريخ:</span>
            <div className="relative">
               <input 
                 type="date" 
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-44 text-left font-semibold text-sm text-gray-700"
                 dir="ltr"
               />
               <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {view === 'cash' && (
      <>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 w-full">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-right">
            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
              <div className="text-xs text-emerald-700 font-bold mb-1">إجمالي المبيعات النقدية</div>
              <div className="text-lg font-black text-emerald-800">{cashSales} ج.م</div>
            </div>
            <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
              <div className="text-xs text-red-700 font-bold mb-1">إجمالي المرتجعات النقدية</div>
              <div className="text-lg font-black text-red-800">{cashReturns} ج.م</div>
            </div>
            <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100">
              <div className="text-xs text-orange-700 font-bold mb-1">إجمالي المصروفات</div>
              <div className="text-lg font-black text-orange-800">{totalExpenses} ج.م</div>
            </div>
            {cashExchangeOut > 0 && (
              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                <div className="text-xs text-amber-700 font-bold mb-1">تسييل عهدة (تحويل للمحافظ)</div>
                <div className="text-lg font-black text-amber-800">{cashExchangeOut} ج.م</div>
              </div>
            )}
            <div className="bg-emerald-100 p-3 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-900 font-bold mb-1">صافي الصندوق</div>
              <div className="text-xl font-black text-emerald-950">{netCashAfterExpenses} ج.م</div>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full mt-6">
          <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-blue-100 p-1 rounded-md"><FileText className="h-5 w-5 text-blue-700" /></span>
              تفاصيل حركة الصندوق (كشف الحساب النقدي)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-bold border-b text-center w-24">رقم فاتورة</th>
                  <th className="px-4 py-3 font-bold border-b text-center w-44">التاريخ</th>
                  <th className="px-4 py-3 font-bold border-b text-right">البيان</th>
                  <th className="px-4 py-3 font-bold border-b text-center w-32">الوارد</th>
                  <th className="px-4 py-3 font-bold border-b text-center w-32">الصادر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">لا توجد حركات نقدية مسجلة في هذا اليوم</td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 text-center font-mono font-bold text-gray-700">{entry.invoiceNumber}</td>
                      <td className="px-4 py-3 text-center text-gray-500" dir="ltr">{entry.time}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-medium">{entry.description}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold bg-green-50/10">
                        {entry.inward > 0 ? `${entry.inward} ج.م` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-red-600 font-bold bg-red-50/10">
                        {entry.outward > 0 ? `${entry.outward} ج.م` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
      )}

      {view === 'visa' && (
      <>
        {/* Visa Summary Cards */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-700 font-bold mb-1">إجمالي المبيعات الإلكترونية</div>
              <div className="text-lg font-black text-blue-800">{elecSales} ج.م</div>
            </div>
            <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
              <div className="text-xs text-red-700 font-bold mb-1">إجمالي المرتجعات الإلكترونية</div>
              <div className="text-lg font-black text-red-800">{elecReturns} ج.م</div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-900 font-bold mb-1">الصافي الإلكتروني</div>
              <div className="text-xl font-black text-blue-950">{netElec} ج.م</div>
            </div>
          </div>
        </div>

        {/* Visa Ledger Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full mt-6">
          <div className="bg-blue-50/50 border-b border-blue-100 p-4 flex justify-between items-center">
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
              <span className="bg-blue-200 p-1 rounded-md"><CreditCard className="h-5 w-5 text-blue-700" /></span>
              تفاصيل حركة الحساب الإلكتروني (فيزا، محفظة)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-bold border-b text-center w-24">رقم فاتورة</th>
                  <th className="px-4 py-3 font-bold border-b text-center w-44">التاريخ</th>
                  <th className="px-4 py-3 font-bold border-b text-right">البيان</th>
                  <th className="px-4 py-3 font-bold border-b text-center w-32">الوارد</th>
                  <th className="px-4 py-3 font-bold border-b text-center w-32">الصادر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {electronicLedgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">لا توجد حركات إلكترونية مسجلة في هذا اليوم</td>
                  </tr>
                ) : (
                  electronicLedgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 text-center font-mono font-bold text-gray-700">{entry.invoiceNumber}</td>
                      <td className="px-4 py-3 text-center text-gray-500" dir="ltr">{entry.time}</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-medium">{entry.description}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-bold bg-green-50/10">
                        {entry.inward > 0 ? `${entry.inward} ج.م` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-red-600 font-bold bg-red-50/10">
                        {entry.outward > 0 ? `${entry.outward} ج.م` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
      )}



      {view === 'item-card' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Box className="h-5 w-5 text-gray-700" />
               <h3 className="font-bold text-gray-800">حركة الأصناف</h3>
             </div>
             <span className="text-xs text-gray-500">يرحل كل الأصناف التي يتم بيعها أو استرجاعها</span>
          </div>
          
          <div className="p-0 overflow-x-auto">
            {dailyTransactions.length === 0 ? (
               <div className="p-8 text-center text-gray-500">لا توجد حركات في هذا اليوم</div>
            ) : (
              <table className="w-full text-right text-sm min-w-[500px]">
                 <thead className="bg-gray-50 text-gray-600">
                   <tr>
                     <th className="px-6 py-3 font-semibold border-b">الوقت</th>
                     <th className="px-6 py-3 font-semibold border-b">عملية</th>
                     <th className="px-6 py-3 font-semibold border-b">طريقة الدفع</th>
                     <th className="px-6 py-3 font-semibold border-b">الأصناف (الكمية × السعر)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {dailyTransactions.map(t => (
                     <tr key={t.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 text-gray-500 whitespace-nowrap" dir="ltr">{new Date(t.timestamp).toLocaleTimeString('ar-EG')}</td>
                       <td className="px-6 py-4">
                         <div className="flex flex-col items-start gap-1">
                           <span className={`font-medium px-2 py-0.5 rounded ${getTypeName(t.type).color}`}>
                             {getTypeName(t.type).label}
                           </span>
                           {t.returnInvoiceNumber && (() => {
                             const origIdx = saleTransactions.findIndex(tx => tx.id === t.returnInvoiceNumber);
                             const origInvoiceDisplay = origIdx >= 0 ? String(origIdx + 1) : t.returnInvoiceNumber;
                             return (
                               <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1 rounded">
                                 فاتورة رقم: {origInvoiceDisplay}
                               </span>
                             );
                           })()}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {getMethodName(t.paymentMethod)}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <ul className="space-y-1">
                            {t.items.map((item, idx) => (
                               <li key={idx} className="flex gap-2">
                                 <span className="font-bold text-gray-800">{item.id}</span>
                                 <span className="text-gray-400">|</span>
                                 <span className="font-medium text-gray-800">{item.name}</span>
                                 <span className="text-gray-400">|</span>
                                 <span className="text-gray-600">{item.quantity} قطع</span>
                                 <span className="text-gray-400">|</span>
                                 <span className="text-gray-600">{item.price} ج.م</span>
                               </li>
                            ))}
                          </ul>
                          {(t.type === 'deposit_sale' || t.type === 'deposit_return') && (
                            <div className="mt-2 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded inline-block">
                              عربون: {t.depositAmount || 0} ج.م | 
                              متبقي: {t.totalAmount - (t.depositAmount || 0)} ج.م | 
                              العميل: {t.customerName} ({t.customerPhone}) {t.customerAddress ? `- ${t.customerAddress}` : ''} | 
                              {t.isDelivered ? 'تم استلام العميل' : 'لم يتم استلام العميل'}
                            </div>
                          )}
                           {t.type === 'installment_sale' && (
                             <div className="mt-2 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded inline-block">
                               مقدم: {t.depositAmount || 0} ج.م | 
                               إجمالي سعر الجهاز: {t.totalAmount} ج.م | 
                               متبقي: {t.totalAmount - (t.depositAmount || 0)} ج.م | 
                               العميل: {t.customerName} ({t.customerPhone}) {t.customerAddress ? `- ${t.customerAddress}` : ''}
                             </div>
                           )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {view === 'profit-margin' && (
        <ProfitMarginReport startDate={startDate} endDate={endDate} />
      )}
    </div>
  );
}
