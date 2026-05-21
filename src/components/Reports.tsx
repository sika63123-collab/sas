import React, { useState } from 'react';
import { useAppStore } from '../store';
import { FileText, CreditCard, Box, Calendar, Wallet, Plus, Trash2, UserCheck, Lock, Unlock, Key } from 'lucide-react';
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
    default: return { label: type, color: 'text-gray-600 bg-gray-50' };
  }
};

export default function Reports({ view = 'cash' }: { view?: 'visa' | 'cash' | 'shift' | 'item-card' | 'profit-margin' }) {
  const { 
    transactions, 
    expenses, 
    installmentContracts,
    shiftAccounts,
    shiftInventoryItems,
    addShiftAccount,
    removeShiftAccount,
    addShiftInventoryItem,
    removeShiftInventoryItem,
    users,
    currentUser,
    login,
    logout
  } = useAppStore();

  const saleTransactions = transactions.filter(t => t.type === 'sale' || t.type === 'deposit_sale');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- Dynamic Shift Closing States ---
  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({});
  const [handoverBalances, setHandoverBalances] = useState<Record<string, number>>({});
  
  const [openingInventory, setOpeningInventory] = useState<Record<string, number>>({});
  const [handoverInventory, setHandoverInventory] = useState<Record<string, number>>({});

  // Handover confirmation state
  const [isHandoverConfirmed, setIsHandoverConfirmed] = useState(false);
  const [handoverUser, setHandoverUser] = useState<string | null>(null);
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');

  // Add Account inline state
  const [showAddAccountRow, setShowAddAccountRow] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccSubLabel, setNewAccSubLabel] = useState('');

  // Add Inventory Item inline state
  const [showAddItemRow, setShowAddItemRow] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Filter transactions by selected date range
  const dailyTransactions = transactions.filter(t => {
    const dateStr = t.timestamp.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });

  // Helper to calculate actual paid/returned amount
  const getAmount = (t: any) => (t.type === 'deposit_sale' || t.type === 'deposit_return' || t.type === 'installment_sale') ? (t.depositAmount || 0) : t.totalAmount;

  // --- Cash Account Logic ---
  const cashSales = dailyTransactions.filter(t => t.paymentMethod === 'cash' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale')).reduce((sum, t) => sum + getAmount(t), 0);
  const cashReturns = dailyTransactions.filter(t => t.paymentMethod === 'cash' && (t.type === 'return' || t.type === 'deposit_return')).reduce((sum, t) => sum + getAmount(t), 0);
  const netCash = cashSales - cashReturns;

  // --- Expenses Logic ---
  const dailyExpenses = expenses.filter(e => {
    const dateStr = e.timestamp.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashAfterExpenses = netCash - totalExpenses;

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
  const elecSales = electronicTransactions.filter(t => t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale').reduce((sum, t) => sum + getAmount(t), 0);
  const elecReturns = electronicTransactions.filter(t => t.type === 'return' || t.type === 'deposit_return').reduce((sum, t) => sum + getAmount(t), 0);
  const netElec = elecSales - elecReturns;

  // --- Per Payment Method Breakdown for Shift ---
  const cashPurchases = dailyTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'purchase').reduce((sum, t) => sum + t.totalAmount, 0);

  const visaSales = dailyTransactions.filter(t => t.paymentMethod === 'visa' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale')).reduce((sum, t) => sum + getAmount(t), 0);
  const visaReturns = dailyTransactions.filter(t => t.paymentMethod === 'visa' && (t.type === 'return' || t.type === 'deposit_return')).reduce((sum, t) => sum + getAmount(t), 0);

  const vodafoneSales = dailyTransactions.filter(t => t.paymentMethod === 'vodafone_cash' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale')).reduce((sum, t) => sum + getAmount(t), 0);
  const vodafoneReturns = dailyTransactions.filter(t => t.paymentMethod === 'vodafone_cash' && (t.type === 'return' || t.type === 'deposit_return')).reduce((sum, t) => sum + getAmount(t), 0);

  const instapaySales = dailyTransactions.filter(t => t.paymentMethod === 'instapay' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale')).reduce((sum, t) => sum + getAmount(t), 0);
  const instapayReturns = dailyTransactions.filter(t => t.paymentMethod === 'instapay' && (t.type === 'return' || t.type === 'deposit_return')).reduce((sum, t) => sum + getAmount(t), 0);

  const isChargingMachine = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('فوري') || n.includes('امان') || n.includes('ضامن') || n.includes('شحن');
  };

  const getSystemFlows = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('نقدي') || n.includes('كاش') || n === 'النقدية') {
      return { inward: cashSales, outward: cashReturns + totalExpenses + cashPurchases };
    }
    if (n.includes('فيزا')) {
      return { inward: visaSales, outward: visaReturns };
    }
    if (n.includes('انستا') || n.includes('insta')) {
      return { inward: instapaySales, outward: instapayReturns };
    }
    if (n.includes('فودافون') || n.includes('vodafone')) {
      return { inward: vodafoneSales, outward: vodafoneReturns };
    }
    return null;
  };

  const getAccountColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('نقدي') || n.includes('كاش') || n === 'النقدية') return 'emerald';
    if (n.includes('فيزا')) return 'blue';
    if (n.includes('فودافون') || n.includes('vodafone')) return 'red';
    if (n.includes('انستا') || n.includes('insta')) return 'purple';
    if (n.includes('فوري')) return 'orange';
    if (n.includes('امان')) return 'amber';
    if (n.includes('ضامن')) return 'indigo';
    return 'gray';
  };

  // Shift balance rows
  const shiftAccountRows = shiftAccounts.map(acc => {
    const opening = openingBalances[acc.id] ?? 0;
    const handover = handoverBalances[acc.id] ?? 0;
    const isMachine = isChargingMachine(acc.name);
    const net = isMachine ? (opening - handover) : Math.abs(handover - opening);
    const sysFlows = getSystemFlows(acc.name);

    return {
      ...acc,
      opening,
      handover,
      net,
      isMachine,
      sysFlows
    };
  });

  const totalOpening = shiftAccountRows.reduce((s, m) => s + m.opening, 0);
  const totalHandover = shiftAccountRows.reduce((s, m) => s + m.handover, 0);
  const totalNet = shiftAccountRows.reduce((s, m) => s + m.net, 0);

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
      case 'shift': return 'تقفيل وردية';
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
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
            <div className="bg-emerald-100 p-3 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-900 font-bold mb-1">صافي الصندوق بعد المصروفات</div>
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

      {view === 'shift' && (
        <div className="space-y-8">

          {/* Accounts & Balances Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-[#1e293b] text-white p-5 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="bg-slate-700 p-2 rounded-lg"><Wallet className="h-6 w-6 text-emerald-400" /></span>
                الحسابات والأرصدة (جرد الخزنة والمحافظ ومكينات الشحن)
              </h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                تقفيل الوردية اليومي
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#f8fafc] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold w-[35%] text-slate-800">الحساب</th>
                    <th className="px-6 py-4 font-bold text-center w-[20%]">رصيد افتتاحي (ج.م)</th>
                    <th className="px-6 py-4 font-bold text-center w-[25%]">استلام الوردية / رصيد حالي</th>
                    <th className="px-6 py-4 font-bold text-center w-[15%]">الصافي</th>
                    <th className="px-4 py-4 font-bold text-center w-[5%]">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shiftAccountRows.map((m) => {
                    const color = getAccountColor(m.name);
                    const sysFlows = m.sysFlows;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-base">{m.name}</span>
                            {m.subLabel && <span className="text-xs text-slate-500 mt-0.5">{m.subLabel}</span>}
                            {sysFlows && (
                              <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block w-fit mt-1.5 font-bold">
                                حسابات النظام: {sysFlows.inward - sysFlows.outward >= 0 ? '+' : ''}{sysFlows.inward - sysFlows.outward} ج.م (وارد: {sysFlows.inward} | صادر: {sysFlows.outward})
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            value={openingBalances[m.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setOpeningBalances(prev => ({ ...prev, [m.id]: val }));
                            }}
                            placeholder="0"
                            className="w-full max-w-[120px] mx-auto border-2 border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-center text-base font-bold text-slate-800 outline-none transition-all"
                            dir="ltr"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            value={handoverBalances[m.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setHandoverBalances(prev => ({ ...prev, [m.id]: val }));
                            }}
                            placeholder="0"
                            className="w-full max-w-[120px] mx-auto border-2 border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-lg px-3 py-2 text-center text-base font-bold text-slate-800 outline-none transition-all"
                            dir="ltr"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-base font-extrabold px-3 py-1.5 rounded-lg ${
                            m.isMachine
                              ? (m.net > 0 ? 'text-emerald-700 bg-emerald-50' : m.net < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-500 bg-slate-50')
                              : 'text-blue-700 bg-blue-50'
                          }`}>
                            {m.isMachine && m.net > 0 ? `+${m.net}` : m.net} ج.م
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {/* Defaults sa1 - sa7 can't be deleted */}
                          {!['sa1', 'sa2', 'sa3', 'sa4', 'sa5', 'sa6', 'sa7'].includes(m.id) ? (
                            <button
                              onClick={() => {
                                removeShiftAccount(m.id);
                                setOpeningBalances(prev => { const c = {...prev}; delete c[m.id]; return c; });
                                setHandoverBalances(prev => { const c = {...prev}; delete c[m.id]; return c; });
                              }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add Account Inline Form */}
                  {showAddAccountRow ? (
                    <tr className="bg-slate-50/50">
                      <td className="px-6 py-4" colSpan={2}>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="اسم الحساب (مثال: فودافون كاش)"
                            value={newAccName}
                            onChange={(e) => setNewAccName(e.target.value)}
                            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-bold"
                          />
                          <input
                            type="text"
                            placeholder="رقم المحفظة / تفاصيل (اختياري)"
                            value={newAccSubLabel}
                            onChange={(e) => setNewAccSubLabel(e.target.value)}
                            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-bold"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center" colSpan={3}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              if (!newAccName.trim()) return;
                              addShiftAccount({ name: newAccName, subLabel: newAccSubLabel });
                              setNewAccName('');
                              setNewAccSubLabel('');
                              setShowAddAccountRow(false);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            حفظ الحساب
                          </button>
                          <button
                            onClick={() => {
                              setNewAccName('');
                              setNewAccSubLabel('');
                              setShowAddAccountRow(false);
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="px-6 py-4" colSpan={5}>
                        <button
                          onClick={() => setShowAddAccountRow(true)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all"
                        >
                          <Plus className="h-4 w-4" />
                          إضافة حساب جديد
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-[#f8fafc]">
                  <tr className="font-extrabold text-slate-800 text-base">
                    <td className="px-6 py-4 text-right">الإجمالي</td>
                    <td className="px-6 py-4 text-center font-mono">{totalOpening} ج.م</td>
                    <td className="px-6 py-4 text-center font-mono">{totalHandover} ج.م</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1.5 rounded-lg text-lg text-blue-800 bg-blue-100 font-extrabold">
                        {totalNet} ج.م
                      </span>
                    </td>
                    <td className="px-4 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Small Items Inventory Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-[#0f172a] text-white p-5 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <span className="bg-slate-800 p-2 rounded-lg"><Box className="h-6 w-6 text-blue-400" /></span>
                جرد الأصناف الصغيرة (ميموري، فلاشات، كروت شحن...)
              </h2>
              <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full font-bold">
                جرد عيني يومي
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-[#f8fafc] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold w-[45%] text-slate-800">الصنف</th>
                    <th className="px-6 py-4 font-bold text-center w-[20%]">رصيد افتتاحي (العدد)</th>
                    <th className="px-6 py-4 font-bold text-center w-[20%]">استلام الوردية (العدد الحالي)</th>
                    <th className="px-6 py-4 font-bold text-center w-[10%]">المنصرف</th>
                    <th className="px-4 py-4 font-bold text-center w-[5%]">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shiftInventoryItems.map((item) => {
                    const opening = openingInventory[item.id] ?? 0;
                    const handover = handoverInventory[item.id] ?? 0;
                    const sold = opening - handover;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 text-base">{item.name}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            value={openingInventory[item.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setOpeningInventory(prev => ({ ...prev, [item.id]: val }));
                            }}
                            placeholder="0"
                            className="w-full max-w-[120px] mx-auto border-2 border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg px-3 py-2 text-center text-base font-bold text-slate-800 outline-none transition-all"
                            dir="ltr"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min="0"
                            value={handoverInventory[item.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setHandoverInventory(prev => ({ ...prev, [item.id]: val }));
                            }}
                            placeholder="0"
                            className="w-full max-w-[120px] mx-auto border-2 border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-lg px-3 py-2 text-center text-base font-bold text-slate-800 outline-none transition-all"
                            dir="ltr"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-base font-extrabold px-3 py-1.5 rounded-lg ${
                            sold > 0 ? 'text-orange-700 bg-orange-50' : sold < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-500 bg-slate-50'
                          }`}>
                            {sold} قطع
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {!['si1', 'si2'].includes(item.id) ? (
                            <button
                              onClick={() => {
                                removeShiftInventoryItem(item.id);
                                setOpeningInventory(prev => { const c = {...prev}; delete c[item.id]; return c; });
                                setHandoverInventory(prev => { const c = {...prev}; delete c[item.id]; return c; });
                              }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add Item Inline Form */}
                  {showAddItemRow ? (
                    <tr className="bg-slate-50/50">
                      <td className="px-6 py-4" colSpan={2}>
                        <input
                          type="text"
                          placeholder="اسم الصنف الجديد (مثال: ميموري 64 جيجا)"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-bold"
                        />
                      </td>
                      <td className="px-6 py-4 text-center" colSpan={3}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              if (!newItemName.trim()) return;
                              addShiftInventoryItem({ name: newItemName });
                              setNewItemName('');
                              setShowAddItemRow(false);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            حفظ الصنف
                          </button>
                          <button
                            onClick={() => {
                              setNewItemName('');
                              setShowAddItemRow(false);
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="px-6 py-4" colSpan={5}>
                        <button
                          onClick={() => setShowAddItemRow(true)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all"
                        >
                          <Plus className="h-4 w-4" />
                          إضافة صنف جرد جديد
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification & Handover Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <span className="bg-blue-50 p-2 rounded-lg"><UserCheck className="h-6 w-6 text-blue-600" /></span>
              تسليم واستلام الوردية
            </h2>

            <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirmHandover"
                  checked={isHandoverConfirmed}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setShowLoginModal(true);
                    } else {
                      setIsHandoverConfirmed(false);
                      setHandoverUser(null);
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="confirmHandover" className="text-base font-bold text-slate-700 cursor-pointer select-none">
                  تأكيد استلام الوردية من الموظف التالي
                </label>
              </div>

              {isHandoverConfirmed && handoverUser && (
                <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2 font-bold text-base shadow-sm">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  تم استلام الوردية بواسطة: {handoverUser}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex justify-between items-center w-full sm:w-[400px]">
                <span className="text-base font-bold text-slate-600">إجمالي الفارق المالي بالوردية:</span>
                <span className={`text-2xl font-black ${
                  totalHandover - totalOpening >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>{totalHandover - totalOpening} ج.م</span>
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Lock className="h-5 w-5" />
                  تقفيل الوردية وتسجيل الخروج
                </button>
              </div>
            </div>
          </div>

          {/* User Code Verification Modal */}
          {showLoginModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full text-center space-y-6 animate-in fade-in zoom-in duration-200">
                <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Key className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">تأكيد هوية الموظف المستلم</h3>
                  <p className="text-xs text-slate-500 mt-1">برجاء إدخال كود الدخول الخاص بك لتأكيد الاستلام</p>
                </div>

                <div className="space-y-2">
                  <input
                    type="password"
                    maxLength={2}
                    placeholder="••"
                    value={loginCode}
                    onChange={(e) => {
                      setLoginCode(e.target.value);
                      setLoginError('');
                    }}
                    autoFocus
                    className="w-full text-center text-4xl h-16 border-2 border-slate-200 rounded-xl shadow-inner focus:border-blue-500 outline-none tracking-[1em] font-bold"
                  />
                  {loginError && <p className="text-sm text-rose-600 font-bold">{loginError}</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!loginCode) return;
                      const matched = users.find(u => u.code === loginCode);
                      if (matched) {
                        const success = login(loginCode);
                        if (success) {
                          setHandoverUser(matched.name);
                          setIsHandoverConfirmed(true);
                          setShowLoginModal(false);
                          setLoginCode('');
                          setLoginError('');
                        } else {
                          setLoginError('كود غير صحيح');
                        }
                      } else {
                        setLoginError('المستخدم غير موجود');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
                  >
                    تأكيد الاستلام
                  </button>
                  <button
                    onClick={() => {
                      setShowLoginModal(false);
                      setLoginCode('');
                      setLoginError('');
                      setIsHandoverConfirmed(false);
                      setHandoverUser(null);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
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
