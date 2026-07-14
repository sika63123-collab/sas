import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { CashShift, Transaction, Expense, ShiftMachine, ShiftAddition, MachineAddition } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Lock, 
  Unlock, 
  User, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle, 
  Receipt,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Calendar,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  FileText,
  BadgeDollarSign,
  ArrowRightLeft,
  Package,
  ReceiptText,
  Printer,
  Download,
  Trash2,
  Edit3,
  Sun,
  Moon,
  Plus,
  Camera,
  Monitor,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toNum = (v: string | number | undefined | null) => { const n = parseFloat(String(v || '').replace(/,/g, "")); return isNaN(n) ? 0 : n; };

const formatMoney = (val: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);
const formatDate = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' }) + ' - ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};
const formatTime = (isoStr: string) => new Date(isoStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
const getDateKey = (isoStr: string) => isoStr.split('T')[0];

// ─── Shift Calculations (kept from original) ─────────────────────────────
export const getShiftCalculations = (shift: CashShift, transactions: Transaction[], expenses: Expense[]) => {
  const start = shift.openedAt;
  const end = shift.closedAt || new Date().toISOString();
  const shiftTransactions = transactions.filter(t => t.timestamp >= start && t.timestamp <= end);
  const shiftExpenses = expenses.filter(e => e.timestamp >= start && e.timestamp <= end);

  const getAmount = (t: any) => (t.type === 'deposit_sale' || t.type === 'deposit_return' || t.type === 'installment_sale') ? (t.depositAmount || 0) : t.totalAmount;

  const cashSales = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
    .reduce((sum, t) => sum + getAmount(t), 0);

  const standardSales = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'sale').reduce((sum, t) => sum + getAmount(t), 0);
  const depositSales = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'deposit_sale').reduce((sum, t) => sum + getAmount(t), 0);
  const depositPayments = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'deposit_payment').reduce((sum, t) => sum + getAmount(t), 0);
  const installmentSales = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'installment_sale').reduce((sum, t) => sum + getAmount(t), 0);
  const installmentPayments = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'installment_payment').reduce((sum, t) => sum + getAmount(t), 0);

  const manualInflow = shift.manualTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
  const cashReturns = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'return' || t.type === 'deposit_return'))
    .reduce((sum, t) => sum + getAmount(t), 0);
  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cashPurchases = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'purchase').reduce((sum, t) => sum + t.totalAmount, 0);
  const cashExchangeOut = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange').reduce((sum, t) => sum + t.totalAmount, 0);
  const cashExchangeIn = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange_reverse').reduce((sum, t) => sum + t.totalAmount, 0);
  const manualOutflow = shift.manualTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

  const totalInflows = cashSales + manualInflow + cashExchangeIn;
  const totalOutflows = cashReturns + totalExpenses + cashPurchases + cashExchangeOut + manualOutflow;
  const expectedCash = shift.openingCash + totalInflows - totalOutflows;

  return {
    cashSales, standardSales, depositSales, depositPayments, installmentSales, installmentPayments,
    manualInflow, cashReturns, totalExpenses, cashPurchases, cashExchangeOut, cashExchangeIn, manualOutflow,
    totalInflows, totalOutflows, expectedCash
  };
};

// ─── Machine Net Sales (with additions) ───────────────────────────────
const getMachineNetSales = (shift: CashShift): number => {
  if (!shift.machines || shift.machines.length === 0) return 0;
  return shift.machines.reduce((total, m) => {
    const additions = (shift.machineAdditions || [])
      .filter(a => a.machineId === m.id)
      .reduce((sum, a) => sum + a.amount, 0);
    const totalAvailable = toNum(m.opening) + additions;
    return total + (totalAvailable - toNum(m.closing));
  }, 0);
};

// ─── Print Helper ─────────────────────────────────────────────────────
function printContent(el: HTMLElement) {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('input').forEach(inp => {
    const span = document.createElement('span');
    span.textContent = inp.value || '0';
    span.style.fontWeight = '700';
    inp.parentNode?.replaceChild(span, inp);
  });
  clone.querySelectorAll('button').forEach(btn => btn.remove());
  const content = clone.innerHTML;
  const win = window.open('', '', 'width=420,height=600');
  if (!win) { alert('⚠️ تم منع النافذة المنبثقة. اسمح بالنوافذ المنبثقة'); return; }
  win.document.write(`
    <html dir="rtl"><head><meta charset="UTF-8"><style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #000; padding: 20px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
      th, td { padding: 6px 4px; text-align: center; border-bottom: 1px solid #ddd; }
      th { font-weight: 600; background: #f5f5f5; }
      .total-row td, .total-row th { font-weight: 700; border-top: 2px solid #333; }
      @media print { body { padding: 0; } }
    </style></head><body>${content}</body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ─── CSV Export ────────────────────────────────────────────────────────
function exportCSV(closedShifts: CashShift[], transactions: Transaction[], expenses: Expense[]) {
  if (!closedShifts.length) { alert('⚠️ لا توجد تقفيلات للتصدير'); return; }
  let csv = 'التاريخ,وقت التقفيل,نوع الوردية,الكاشير,الافتتاحي,المبيعات النقدية,إجمالي الوارد,إجمالي المنصرف,المتوقع,الفعلي,الفرق,ملاحظات\n';
  closedShifts.forEach(s => {
    const m = getShiftCalculations(s, transactions, expenses);
    const machineNet = getMachineNetSales(s);
    const totalExpected = m.expectedCash + machineNet;
    const diff = (s.closingCashActual || 0) - totalExpected;
    const notes = (s.closingNotes || '').replace(/,/g, ' ');
    csv += `${new Date(s.openedAt).toLocaleDateString('ar-EG')},${s.closedAt ? formatTime(s.closedAt) : ''},${s.shiftType || 'صباحي'},${s.cashierName || '—'},${s.openingCash},${m.cashSales},${m.totalInflows},${m.totalOutflows},${totalExpected},${s.closingCashActual || 0},${diff},${notes}\n`;
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'تقفيلات_الورديات.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}


// ═══════════════════════════════════════════════════════════════════════
// ═══ MAIN COMPONENT ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
export default function CashShiftManagement() {
  const { 
    shifts, activeShift, openShift, closeShift, addManualCashTransaction, 
    addShiftAddition, updateShiftAddition, deleteShiftAddition, updateActiveShiftMachines,
    addMachineAddition, deleteMachineAddition,
    transactions, expenses, currentUser 
  } = useAppStore();

  const closedShifts = shifts.filter(s => s.isClosed);
  const lastClosedShift = closedShifts.length > 0 ? closedShifts[closedShifts.length - 1] : null;
  const inheritedOpeningCash = lastClosedShift ? lastClosedShift.closingCashActual : null;

  // ─── Open Shift Form State ──────────────────────────────────────
  const [shiftType, setShiftType] = useState<'صباحي' | 'مسائي'>('صباحي');
  const [cashierName, setCashierName] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [setupMachines, setSetupMachines] = useState<ShiftMachine[]>(() => {
    // ترحيل تلقائي: سحب الأرصدة الختامية من آخر وردية مقفلة
    const closed = shifts.filter(s => s.isClosed);
    const last = closed.length > 0 ? closed[closed.length - 1] : null;
    if (last?.machines && last.machines.length > 0) {
      return last.machines.map(m => ({
        id: m.id,
        name: m.name,
        opening: m.closing || m.opening, // الختامي يبقى الافتتاحي الجديد
        closing: '',
      }));
    }
    return [{ id: 1, name: 'فوري', opening: '', closing: '' }];
  });
  const [nextMachineId, setNextMachineId] = useState(2);
  const [openingCashAmount, setOpeningCashAmount] = useState(() => {
    const closed = shifts.filter(s => s.isClosed);
    const last = closed.length > 0 ? closed[closed.length - 1] : null;
    if (last?.closingCashActual !== undefined && last?.closingCashActual !== null) {
      return String(last.closingCashActual);
    }
    return '';
  });

  // ─── Close Shift Modal State ─────────────────────────────────────
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeMachines, setCloseMachines] = useState<ShiftMachine[]>([]);
  const [closingCashAmount, setClosingCashAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // ─── Dashboard State ────────────────────────────────────────────
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualType, setManualType] = useState<'inflow' | 'outflow'>('inflow');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [showSalesBreakdown, setShowSalesBreakdown] = useState(false);
  const [showPastShifts, setShowPastShifts] = useState(false);
  const [expandedPastShiftId, setExpandedPastShiftId] = useState<string | null>(null);

  // ─── Addition Modal State ────────────────────────────────────────
  const [showAdditionModal, setShowAdditionModal] = useState(false);
  const [additionEditIdx, setAdditionEditIdx] = useState(-1);
  const [additionMachines, setAdditionMachines] = useState<{ id: number; name: string; opening: string; added: string }[]>([]);
  const [additionNotes, setAdditionNotes] = useState('');

  // ─── Inline Machine Addition State ──────────────────────────────
  const [inlineAddMachineId, setInlineAddMachineId] = useState<number | null>(null);
  const [inlineAddAmount, setInlineAddAmount] = useState('');
  const [inlineAddNote, setInlineAddNote] = useState('');

  // ─── Receipt Modals ──────────────────────────────────────────────
  const [showShiftReceipt, setShowShiftReceipt] = useState(false);
  const [showCloseReceipt, setShowCloseReceipt] = useState(false);
  const [closeReceiptShiftId, setCloseReceiptShiftId] = useState<string | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const closeReceiptRef = useRef<HTMLDivElement>(null);

  // Set default cashier name
  useEffect(() => {
    if (currentUser && !cashierName) {
      setCashierName(currentUser.name);
    }
  }, [currentUser]);

  // ─── ترحيل تلقائي: تحديث الفورم لما وردية تتقفل ───────────────
  const prevActiveShiftRef = useRef(activeShift);
  useEffect(() => {
    // اكتشاف لحظة التقفيل: الوردية كانت نشطة والآن مفيش وردية نشطة
    if (prevActiveShiftRef.current && !activeShift) {
      const closed = shifts.filter(s => s.isClosed);
      const last = closed.length > 0 ? closed[closed.length - 1] : null;

      // ترحيل رصيد الخزنة الختامي → افتتاحي الوردية الجديدة
      if (last?.closingCashActual !== undefined && last?.closingCashActual !== null) {
        setOpeningCashAmount(String(last.closingCashActual));
      }

      // ترحيل أرصدة المكينات الختامية → افتتاحي المكينات الجديدة
      if (last?.machines && last.machines.length > 0) {
        setSetupMachines(last.machines.map(m => ({
          id: m.id,
          name: m.name,
          opening: m.closing || m.opening, // الختامي يبقى الافتتاحي
          closing: '',
        })));
        setNextMachineId(Math.max(...last.machines.map(m => m.id)) + 1);
      }
    }
    prevActiveShiftRef.current = activeShift;
  }, [activeShift, shifts]);

  // ─── Active shift calculations ──────────────────────────────────
  const activeMetrics = activeShift ? getShiftCalculations(activeShift, transactions, expenses) : null;

  // ─── Handlers ───────────────────────────────────────────────────
  const handleOpenShift = () => {
    const openingCash = toNum(openingCashAmount) || (inheritedOpeningCash || 0);

    if (!cashierName.trim()) {
      alert('⚠️ الرجاء إدخال اسم الكاشير');
      return;
    }

    openShift(openingCash, {
      shiftType,
      cashierName: cashierName.trim(),
      machines: setupMachines.map(m => ({ ...m })),
      openingNotes: openingNotes.trim() || undefined,
    });

    // Show receipt after opening
    setTimeout(() => setShowShiftReceipt(true), 100);
  };

  const handleOpenCloseModal = () => {
    if (!activeShift || !activeMetrics) return;
    const machines = (activeShift.machines || []).map(m => ({ ...m, closing: m.closing || '' }));
    setCloseMachines(machines);
    setClosingCashAmount('');
    setClosingNotes('');
    setShowCloseModal(true);
  };

  const handleConfirmClose = () => {
    if (!activeShift || !activeMetrics) return;
    const enteredAmount = toNum(closingCashAmount);
    const hasEnteredAmount = closingCashAmount.trim() !== '';
    const actualCash = hasEnteredAmount ? enteredAmount : activeMetrics.expectedCash;

    if (!confirm(`🔒 هل أنت متأكد من تقفيل الوردية؟\nسيتم حفظ البيانات.`)) return;

    closeShift(actualCash, {
      machines: closeMachines,
      closingNotes: closingNotes.trim() || undefined,
    });

    setShowCloseModal(false);
    // Show close receipt
    setTimeout(() => {
      setCloseReceiptShiftId(activeShift.id);
      setShowCloseReceipt(true);
    }, 100);
  };

  const handleAddManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) { alert('يرجى إدخال مبلغ صحيح أكبر من الصفر'); return; }
    if (!manualNotes.trim()) { alert('يرجى إدخال سبب أو ملاحظات للعملية'); return; }
    addManualCashTransaction(manualType, amt, manualNotes.trim());
    setManualAmount('');
    setManualNotes('');
    setShowManualForm(false);
  };

  // ─── Addition Handlers ──────────────────────────────────────────
  const handleOpenAddition = () => {
    if (!activeShift) return;
    const machines = (activeShift.machines || []).map(m => ({
      id: m.id, name: m.name, opening: m.opening, added: ''
    }));
    setAdditionMachines(machines);
    setAdditionNotes('');
    setAdditionEditIdx(-1);
    setShowAdditionModal(true);
  };

  const handleEditAddition = (idx: number) => {
    if (!activeShift?.additions) return;
    const add = activeShift.additions[idx];
    setAdditionMachines(add.machines.map(m => ({ ...m })));
    setAdditionNotes(add.notes || '');
    setAdditionEditIdx(idx);
    setShowAdditionModal(true);
  };

  const handleSaveAddition = () => {
    const addition: ShiftAddition = {
      time: additionEditIdx >= 0 && activeShift?.additions?.[additionEditIdx]
        ? activeShift.additions[additionEditIdx].time
        : new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      machines: additionMachines,
      notes: additionNotes.trim(),
    };
    if (additionEditIdx >= 0) {
      updateShiftAddition(additionEditIdx, addition);
    } else {
      addShiftAddition(addition);
    }
    setShowAdditionModal(false);
  };

  const handleDeleteAddition = (idx: number) => {
    if (!confirm('🗑️ حذف هذه الإضافة؟ لا يمكن التراجع.')) return;
    deleteShiftAddition(idx);
    setShowAdditionModal(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // ═══ RENDER: Opening Shift Screen (no active shift) ═════════════
  // ═══════════════════════════════════════════════════════════════════
  if (!activeShift) {
    const machinesTotal = setupMachines.reduce((s, m) => s + toNum(m.opening), 0);

    return (
      <div className="flex-1 p-4 md:p-8 bg-[#b8cdd6]/30 overflow-y-auto min-h-[calc(100vh-45px)]" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 text-center relative overflow-hidden shadow-xl"
          >
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-2 right-4 w-20 h-20 rounded-full border-2 border-white/20"></div>
              <div className="absolute bottom-1 left-8 w-14 h-14 rounded-full border-2 border-white/15"></div>
            </div>
            <div className="relative z-10">
              <div className="mx-auto w-14 h-14 bg-white/10 text-blue-300 rounded-2xl flex items-center justify-center shadow-inner mb-3">
                <Unlock className="h-7 w-7 animate-pulse" />
              </div>
              <h2 className="text-xl font-black">بدء وردية جديدة</h2>
              <p className="text-xs text-blue-200 font-bold mt-1">سجّل بيانات الوردية والمكينات وجرد الخزنة لبدء العمل</p>
            </div>
          </motion.div>

          {/* Inherited balance notice */}
          {inheritedOpeningCash !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs font-bold flex items-start gap-3"
            >
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-emerald-900 text-[13px]">رصيد الوردية السابقة</h4>
                <p className="text-[11px] text-emerald-700/90 font-medium mt-1">
                  رصيد التقفيل السابق ({formatMoney(inheritedOpeningCash)}) — تم ترحيله تلقائياً في جرد الخزنة أدناه ويمكنك تعديله
                </p>
              </div>
            </motion.div>
          )}

          {/* Shift Type & Cashier */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
          >
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="h-4 w-4 text-indigo-500" /> بيانات الوردية
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-600">نوع الوردية</label>
                <div className="flex rounded-xl overflow-hidden border-2 border-slate-200">
                  <button type="button" onClick={() => setShiftType('صباحي')}
                    className={`flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${shiftType === 'صباحي' ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-inner' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Sun className="h-3.5 w-3.5" /> صباحي
                  </button>
                  <button type="button" onClick={() => setShiftType('مسائي')}
                    className={`flex-1 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${shiftType === 'مسائي' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-inner' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Moon className="h-3.5 w-3.5" /> مسائي
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> اسم الكاشير</span>
                </label>
                <input type="text" value={cashierName} onChange={e => setCashierName(e.target.value)}
                  placeholder="أدخل اسم الكاشير"
                  className="w-full h-10 border-2 border-slate-200 focus:border-blue-400 rounded-xl px-3 font-bold text-sm outline-none transition-all bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600">ملاحظات الافتتاح (اختياري)</label>
              <input type="text" value={openingNotes} onChange={e => setOpeningNotes(e.target.value)}
                placeholder="أي ملاحظات عند بدء الوردية..."
                className="w-full h-9 border-2 border-slate-200 focus:border-blue-400 rounded-xl px-3 font-medium text-xs outline-none transition-all bg-slate-50 focus:bg-white"
              />
            </div>
          </motion.div>

          {/* Machines */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3"
          >
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Monitor className="h-4 w-4 text-blue-500" /> أرصدة المكينات الافتتاحية
            </h3>

            {setupMachines.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <input type="text" value={m.name} placeholder="اسم المكينة"
                  onChange={e => {
                    const arr = [...setupMachines];
                    arr[i] = { ...arr[i], name: e.target.value };
                    setSetupMachines(arr);
                  }}
                  className="flex-1 h-9 border-2 border-slate-200 focus:border-blue-400 rounded-lg px-3 font-bold text-xs outline-none transition-all bg-slate-50 focus:bg-white"
                />
                <input type="number" value={m.opening} placeholder="0.00"
                  onChange={e => {
                    const arr = [...setupMachines];
                    arr[i] = { ...arr[i], opening: e.target.value };
                    setSetupMachines(arr);
                  }}
                  className="w-28 h-9 border-2 border-slate-200 focus:border-blue-400 rounded-lg px-3 font-bold text-xs outline-none transition-all bg-slate-50 focus:bg-white text-center"
                />
                {setupMachines.length > 1 && (
                  <button onClick={() => setSetupMachines(setupMachines.filter((_, j) => j !== i))}
                    className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  ><X className="h-4 w-4" /></button>
                )}
              </div>
            ))}

            <button onClick={() => { setSetupMachines([...setupMachines, { id: nextMachineId, name: '', opening: '', closing: '' }]); setNextMachineId(prev => prev + 1); }}
              className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center gap-1"
            ><Plus className="h-3.5 w-3.5" /> إضافة مكينة</button>

            <div className="flex justify-between items-center bg-blue-50 rounded-xl px-4 py-2.5 border border-blue-100">
              <span className="text-xs font-bold text-blue-700">إجمالي أرصدة المكينات</span>
              <span className="font-black text-sm text-blue-900">{fmt(machinesTotal)} ج.م</span>
            </div>
          </motion.div>

          {/* Cash Inventory - Total Amount */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3"
          >
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Wallet className="h-4 w-4 text-emerald-500" /> جرد الخزنة — بدء الوردية
            </h3>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-600">المبلغ الإجمالي بالخزنة (ج.م)</label>
              <input
                type="text"
                inputMode="decimal"
                value={openingCashAmount}
                onChange={e => { if (e.target.value === '' || /^[0-9]*\.?[0-9]*$/.test(e.target.value)) setOpeningCashAmount(e.target.value); }}
                placeholder="أدخل المبلغ الإجمالي..."
                className="w-full h-12 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl px-4 font-black text-xl text-center outline-none transition-all bg-emerald-50/30 focus:bg-white"
              />
              {toNum(openingCashAmount) > 0 && (
                <div className="flex justify-between items-center bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-700">💰 رصيد الخزنة الافتتاحي</span>
                  <span className="font-black text-sm text-emerald-900">{fmt(toNum(openingCashAmount))} ج.م</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            onClick={handleOpenShift}
            className="w-full h-14 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer text-base hover:scale-[1.01] active:scale-[0.99]"
          >
            <CheckCircle2 className="h-6 w-6 text-indigo-200" />
            تفعيل الوردية وبدء العمل
          </motion.button>

          {/* Past Shifts */}
          {closedShifts.length > 0 && (
            <PastShiftsSection 
              closedShifts={closedShifts} 
              transactions={transactions} 
              expenses={expenses} 
              showPastShifts={showPastShifts}
              setShowPastShifts={setShowPastShifts}
              expandedPastShiftId={expandedPastShiftId}
              setExpandedPastShiftId={setExpandedPastShiftId}
              onViewReceipt={(id) => { setCloseReceiptShiftId(id); setShowCloseReceipt(true); }}
            />
          )}
        </div>

        {/* Close Receipt Modal (for viewing past closings) */}
        <CloseReceiptModal 
          show={showCloseReceipt} 
          onClose={() => setShowCloseReceipt(false)}
          shiftId={closeReceiptShiftId}
          shifts={shifts}
          transactions={transactions}
          expenses={expenses}
          receiptRef={closeReceiptRef}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ═══ RENDER: Active Shift Dashboard ═════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 p-4 md:p-6 bg-[#c5d8e1]/40 flex flex-col space-y-5 overflow-y-auto min-h-[calc(100vh-45px)]" dir="rtl">
      
      {/* ═══ Header Bar ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner relative shrink-0">
            <Clock className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-black text-slate-800">الوردية نشطة</h2>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">#{activeShift.id.slice(-5)}</span>
              {activeShift.shiftType && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeShift.shiftType === 'صباحي' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                  {activeShift.shiftType === 'صباحي' ? '🌅' : '🌙'} {activeShift.shiftType}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-bold mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-slate-500"><User className="h-3 w-3 shrink-0" /> <strong className="text-slate-700 font-extrabold">{activeShift.cashierName || currentUser?.name || '—'}</strong></span>
              <span className="flex items-center gap-1 text-slate-500"><Calendar className="h-3 w-3 shrink-0" /> {formatDate(activeShift.openedAt)}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 self-stretch lg:self-center shrink-0 flex-wrap">
          {/* View Shift Receipt */}
          <button onClick={() => setShowShiftReceipt(true)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold px-3 py-2 rounded-xl text-xs border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Receipt className="h-3.5 w-3.5" /> إيصال الاستلام
          </button>
          {/* Add Addition */}
          <button onClick={handleOpenAddition}
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold px-3 py-2 rounded-xl text-xs border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" /> إضافة
          </button>
          {/* Close Shift */}
          <button onClick={handleOpenCloseModal}
            className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer text-xs"
          >
            <Lock className="h-4 w-4 text-rose-200" /> تقفيل الوردية
          </button>
        </div>
      </div>

      {/* ═══ Additions Badge ═══ */}
      {activeShift.additions && activeShift.additions.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-extrabold text-purple-800 flex items-center gap-2">
            <Camera className="h-4 w-4 text-purple-500" /> إضافات مسجلة: {activeShift.additions.length}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {activeShift.additions.map((a, i) => (
              <button key={i} onClick={() => handleEditAddition(i)}
                className="bg-white border border-purple-200 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                🕐 {a.time}
                <Edit3 className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ─── RIGHT: Cash Balance + Machines + Quick Actions ─── */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Live Cash Balance Card */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-xl border border-indigo-850/30">
            <div className="absolute -left-8 -bottom-8 opacity-[0.07] pointer-events-none">
              <DollarSign className="w-40 h-40" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider">الرصيد الكاش المتوقع بالدرج</span>
                <span className="bg-white/10 text-blue-200 text-[9px] px-2 py-0.5 rounded-md font-bold">
                  الافتتاحي: {formatMoney(activeShift.openingCash)}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                {formatMoney(activeMetrics!.expectedCash)}
              </h1>
              <div className="flex gap-3 text-[10px]">
                <div className="flex-1 bg-emerald-500/15 rounded-lg px-2.5 py-2 text-center border border-emerald-400/10">
                  <span className="text-emerald-300 block font-bold">إجمالي الوارد</span>
                  <span className="text-white font-black text-sm mt-0.5 block">+{formatMoney(activeMetrics!.totalInflows)}</span>
                </div>
                <div className="flex-1 bg-rose-500/15 rounded-lg px-2.5 py-2 text-center border border-rose-400/10">
                  <span className="text-rose-300 block font-bold">إجمالي المنصرف</span>
                  <span className="text-white font-black text-sm mt-0.5 block">-{formatMoney(activeMetrics!.totalOutflows)}</span>
                </div>
              </div>
              <div className="w-full h-[1px] bg-indigo-500/20"></div>
              <div className="space-y-2">
                <span className="text-[10px] text-indigo-300 font-bold block">حركات يدوية سريعة:</span>
                <div className="flex gap-2.5">
                  <button onClick={() => { setManualType('inflow'); setShowManualForm(true); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-3 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  ><PlusCircle className="h-4 w-4 shrink-0" /> إيداع فكة</button>
                  <button onClick={() => { setManualType('outflow'); setShowManualForm(true); }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 px-3 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  ><MinusCircle className="h-4 w-4 shrink-0" /> سحب نثرية</button>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Entry Form */}
          <AnimatePresence>
            {showManualForm && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="bg-white p-4 border border-slate-200/80 shadow-md rounded-2xl space-y-3"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${manualType === 'inflow' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {manualType === 'inflow' ? 'إيداع نقدي للدرج' : 'سحب نقدي من الدرج'}
                  </h3>
                  <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddManualTransaction} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">المبلغ (ج.م):</label>
                      <input type="text" inputMode="decimal" required placeholder="مثال: 200" value={manualAmount}
                        onChange={e => { if (e.target.value === '' || /^[0-9]*\.?[0-9]*$/.test(e.target.value)) setManualAmount(e.target.value); }}
                        className="w-full h-10 border-2 border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white text-center font-black text-lg rounded-xl transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">البيان / السبب:</label>
                      <input type="text" required placeholder="مثال: فكة للدرج" value={manualNotes}
                        onChange={e => setManualNotes(e.target.value)}
                        className="w-full h-10 border-2 border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white px-3 font-bold text-xs rounded-xl transition-all outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all text-xs shadow-md cursor-pointer">
                    تسجيل وحفظ الحركة
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Machines - Opening Balances Only */}
          {activeShift.machines && activeShift.machines.length > 0 && (
            <div className="bg-white border border-slate-200/80 shadow-md rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white px-4 py-3 flex items-center justify-between">
                <h3 className="font-extrabold text-xs flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-200" /> أرصدة المكينات الافتتاحية
                </h3>
                <span className="bg-white/15 text-blue-100 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {activeShift.machines.length} مكينة
                </span>
              </div>
              <div className="p-4 space-y-1.5">
                {activeShift.machines.map(m => {
                  const mAdditions = (activeShift.machineAdditions || []).filter(a => a.machineId === m.id);
                  const mAdditionsTotal = mAdditions.reduce((s, a) => s + a.amount, 0);

                  return (
                  <div key={m.id} className="flex flex-col bg-slate-50 hover:bg-slate-100/70 rounded-lg px-3 py-2.5 transition-colors gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-700">{m.name || '—'}</span>
                      <div className="flex items-center gap-2">
                        {inlineAddMachineId === m.id ? (
                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <input type="number" placeholder="المبلغ" value={inlineAddAmount} onChange={e => setInlineAddAmount(e.target.value)} className="w-16 h-7 text-xs border-none bg-slate-50 rounded px-1 text-center font-bold focus:ring-1 focus:ring-blue-400 outline-none" autoFocus />
                            <input type="text" placeholder="ملاحظة" value={inlineAddNote} onChange={e => setInlineAddNote(e.target.value)} className="w-24 h-7 text-xs border-none bg-slate-50 rounded px-2 font-medium focus:ring-1 focus:ring-blue-400 outline-none" />
                            <button onClick={() => {
                              if (inlineAddAmount && !isNaN(Number(inlineAddAmount))) {
                                addMachineAddition(m.id, Number(inlineAddAmount), inlineAddNote || 'إضافة رصيد');
                                setInlineAddMachineId(null);
                                setInlineAddAmount('');
                                setInlineAddNote('');
                              }
                            }} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded p-1 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                            <button onClick={() => setInlineAddMachineId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded p-1 transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="font-black text-xs text-blue-800 bg-blue-50 rounded-md py-1 px-2.5 shadow-sm border border-blue-100/50">{fmt(toNum(m.opening) + mAdditionsTotal)} ج.م</span>
                            <button onClick={() => setInlineAddMachineId(m.id)} className="bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-full p-1.5 transition-all active:scale-95" title="إضافة رصيد (فلوس المندوب)">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {mAdditions.length > 0 && (
                      <div className="text-[10px] bg-white border border-slate-100 rounded-lg p-2 space-y-1.5 shadow-inner">
                        {mAdditions.map(a => (
                          <div key={a.id} className="flex justify-between items-center text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="font-bold">{a.note}</span>
                              <span className="text-slate-400 font-medium ml-1">({a.time})</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="font-extrabold text-emerald-600">+{fmt(a.amount)}</span>
                               <button onClick={() => deleteMachineAddition(a.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )})}
                <div className="flex justify-between items-center bg-indigo-50 rounded-xl px-3 py-2.5 border-t-2 border-indigo-200 mt-2">
                  <span className="font-black text-xs text-indigo-900">إجمالي الأرصدة (بالإضافات)</span>
                  <span className="font-black text-sm text-indigo-900">{fmt(activeShift.machines.reduce((s, m) => {
                    const mAdds = (activeShift.machineAdditions || []).filter(a => a.machineId === m.id).reduce((sum, a) => sum + a.amount, 0);
                    return s + toNum(m.opening) + mAdds;
                  }, 0))} ج.م</span>
                </div>
              </div>
            </div>
          )}

          {/* Manual Transactions Ledger */}
          <div className="bg-white p-4 border border-slate-200/80 shadow-sm rounded-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500 shrink-0" /> حركات يدوية ({activeShift.manualTransactions.length})
              </h3>
            </div>
            {activeShift.manualTransactions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 font-bold">لا توجد حركات يدوية</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto pr-1">
                {activeShift.manualTransactions.slice().reverse().map(tx => (
                  <div key={tx.id} className="py-2 flex justify-between items-center text-xs hover:bg-slate-50/50 px-2 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      {tx.type === 'inflow' ? (
                        <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg shrink-0"><ArrowUpRight className="h-3.5 w-3.5" /></span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 p-1.5 rounded-lg shrink-0"><ArrowDownRight className="h-3.5 w-3.5" /></span>
                      )}
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">{tx.notes}</span>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{formatTime(tx.timestamp)}</span>
                      </div>
                    </div>
                    <span className={`font-black text-xs shrink-0 ${tx.type === 'inflow' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {tx.type === 'inflow' ? '+' : '-'} {formatMoney(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── LEFT: Detailed Ledger ─── */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Account Statement */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
            <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex items-center gap-2">
              <Receipt className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">كشف حساب الوردية</h3>
                <p className="text-[10px] text-slate-400 font-medium">جميع الحركات النقدية منذ فتح الوردية</p>
              </div>
            </div>

            <div className="p-4 text-xs font-bold text-slate-600">
              {/* Opening Balance */}
              <div className="flex justify-between py-2.5 items-center bg-blue-50/40 px-3 rounded-xl mb-3 border border-blue-100/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0"><Wallet className="h-3.5 w-3.5 text-blue-600" /></div>
                  <span className="text-blue-900 font-extrabold">الرصيد الافتتاحي</span>
                </div>
                <span className="text-blue-900 font-black text-sm">{formatMoney(activeShift.openingCash)}</span>
              </div>

              {/* INFLOWS */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wide">الوارد النقدي</span>
                </div>
                <div className="space-y-0.5 bg-emerald-50/30 rounded-xl border border-emerald-100/40 overflow-hidden">
                  <button onClick={() => setShowSalesBreakdown(!showSalesBreakdown)}
                    className="flex justify-between py-2.5 px-3 items-center w-full hover:bg-emerald-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-emerald-800">المبيعات والتحصيلات</span>
                      {showSalesBreakdown ? <ChevronUp className="h-3 w-3 text-emerald-400" /> : <ChevronDown className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <span className="text-emerald-800 font-black text-sm">+{formatMoney(activeMetrics!.cashSales)}</span>
                  </button>
                  <AnimatePresence>
                    {showSalesBreakdown && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-2.5 space-y-1.5 text-[10.5px] text-emerald-700/80 border-t border-emerald-100/50 pt-2">
                          <div className="flex justify-between"><span>• مبيعات كاشير</span><span>{formatMoney(activeMetrics!.standardSales)}</span></div>
                          <div className="flex justify-between"><span>• مبيعات عربون</span><span>{formatMoney(activeMetrics!.depositSales)}</span></div>
                          <div className="flex justify-between"><span>• تحصيلات عربون</span><span>{formatMoney(activeMetrics!.depositPayments)}</span></div>
                          <div className="flex justify-between"><span>• مبيعات تقسيط</span><span>{formatMoney(activeMetrics!.installmentSales)}</span></div>
                          <div className="flex justify-between"><span>• تحصيلات أقساط</span><span>{formatMoney(activeMetrics!.installmentPayments)}</span></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-emerald-100/50">
                    <div className="flex items-center gap-2"><PlusCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-emerald-800">إيداعات يدوية</span></div>
                    <span className="text-emerald-800 font-black text-sm">+{formatMoney(activeMetrics!.manualInflow)}</span>
                  </div>
                  {activeMetrics!.cashExchangeIn > 0 && (
                    <div className="flex justify-between py-2.5 px-3 items-center border-t border-emerald-100/50">
                      <div className="flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5 text-blue-500 shrink-0" /><span className="text-blue-800">وارد محافظ</span></div>
                      <span className="text-blue-800 font-black text-sm">+{formatMoney(activeMetrics!.cashExchangeIn)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OUTFLOWS */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                  <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wide">المنصرف النقدي</span>
                </div>
                <div className="space-y-0.5 bg-rose-50/30 rounded-xl border border-rose-100/40 overflow-hidden">
                  <div className="flex justify-between py-2.5 px-3 items-center">
                    <div className="flex items-center gap-2"><ArrowDownRight className="h-3.5 w-3.5 text-rose-500 shrink-0" /><span className="text-rose-800">مرتجعات</span></div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.cashReturns)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2"><ReceiptText className="h-3.5 w-3.5 text-rose-500 shrink-0" /><span className="text-rose-800">مصروفات</span></div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2"><Package className="h-3.5 w-3.5 text-rose-500 shrink-0" /><span className="text-rose-800">مشتريات</span></div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.cashPurchases)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5 text-amber-500 shrink-0" /><span className="text-amber-800">تسييل محفظة</span></div>
                    <span className="text-amber-800 font-black text-sm">-{formatMoney(activeMetrics!.cashExchangeOut)}</span>
                  </div>
                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" /><span className="text-rose-800">مسحوبات يدوية</span></div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.manualOutflow)}</span>
                  </div>
                </div>
              </div>

              {/* Expected Balance */}
              <div className="flex justify-between py-3 border-t-2 border-indigo-200 font-black text-slate-900 bg-indigo-50/60 px-4 rounded-xl items-center">
                <div className="flex items-center gap-2 text-indigo-950">
                  <DollarSign className="h-5 w-5 text-indigo-600 animate-pulse shrink-0" />
                  <span className="text-sm font-extrabold">المتوقع بالدرج</span>
                </div>
                <span className="text-indigo-900 text-lg md:text-xl font-extrabold">{formatMoney(activeMetrics!.expectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Past Shifts */}
          <PastShiftsSection 
            closedShifts={closedShifts} 
            transactions={transactions} 
            expenses={expenses}
            showPastShifts={showPastShifts}
            setShowPastShifts={setShowPastShifts}
            expandedPastShiftId={expandedPastShiftId}
            setExpandedPastShiftId={setExpandedPastShiftId}
            onViewReceipt={(id) => { setCloseReceiptShiftId(id); setShowCloseReceipt(true); }}
          />
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      
      {/* Close Shift Modal */}
      <AnimatePresence>
        {showCloseModal && activeMetrics && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowCloseModal(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="bg-gradient-to-r from-rose-700 to-red-800 text-white px-5 py-5 text-center">
                <div className="mx-auto w-12 h-12 bg-white/15 text-rose-200 rounded-2xl flex items-center justify-center mb-3">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-black">تقفيل الوردية</h2>
                <p className="text-xs text-rose-200 font-medium mt-1">أدخل أرصدة المكينات الختامية وجرد الخزنة</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Expected Cash */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> المتوقع بالنظام:</span>
                  <span className="font-black text-lg text-indigo-900">{formatMoney(activeMetrics.expectedCash)}</span>
                </div>

                {/* Close Machines */}
                {closeMachines.length > 0 && (() => {
                  const getMachineOpeningWithAdditions = (mId: number, baseOpening: number) => {
                    const mAdds = (activeShift?.machineAdditions || []).filter(a => a.machineId === mId).reduce((sum, a) => sum + a.amount, 0);
                    return baseOpening + mAdds;
                  };
                  
                  const totalOpening = closeMachines.reduce((s, m) => s + getMachineOpeningWithAdditions(m.id, toNum(m.opening)), 0);
                  const totalClosing = closeMachines.reduce((s, m) => s + toNum(m.closing), 0);
                  const hasAnyClosing = closeMachines.some(m => m.closing !== '' && m.closing !== null && m.closing !== undefined);
                  const machineNetTotal = hasAnyClosing ? totalOpening - totalClosing : 0;

                  return (
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-blue-500" /> أرصدة المكينات
                      </h4>

                      {/* Table Header */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
                        <span>المكينة</span>
                        <span className="w-[60px] text-center">افتتاحي+</span>
                        <span className="w-[80px] text-center">ختامي</span>
                        <span className="w-[68px] text-center">صافي المبيعات</span>
                      </div>

                      {closeMachines.map((m, i) => {
                        const baseOpening = toNum(m.opening);
                        const openingWithAdds = getMachineOpeningWithAdditions(m.id, baseOpening);
                        const closing = toNum(m.closing);
                        const hasClosing = m.closing !== '' && m.closing !== null && m.closing !== undefined;
                        const net = hasClosing ? openingWithAdds - closing : 0;
                        const hasAdds = openingWithAdds > baseOpening;
                        
                        return (
                          <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center bg-slate-50 hover:bg-slate-100/70 rounded-lg px-2.5 py-2 transition-colors">
                            <span className="font-bold text-xs text-slate-700 truncate">{m.name || '—'}</span>
                            
                            <span className={`w-[60px] text-center text-[11px] font-bold rounded py-1 px-1 ${hasAdds ? 'text-emerald-700 bg-emerald-50/80 border border-emerald-100' : 'text-blue-700 bg-blue-50/50'}`} title={hasAdds ? `الأساسي: ${fmt(baseOpening)} + إضافات: ${fmt(openingWithAdds - baseOpening)}` : ''}>
                              {fmt(openingWithAdds)}
                            </span>
                            
                            <input type="number" value={m.closing} placeholder="0.00"
                              onChange={e => {
                                const arr = [...closeMachines];
                                arr[i] = { ...arr[i], closing: e.target.value };
                                setCloseMachines(arr);
                              }}
                              className="w-[80px] h-8 border-2 border-slate-200 focus:border-blue-400 rounded-lg text-center font-bold text-xs outline-none bg-white transition-all"
                            />

                            <span className={`w-[68px] text-center text-[11px] font-extrabold rounded py-1 px-1 ${
                              !hasClosing ? 'text-slate-400 bg-slate-50' :
                              net > 0.01 ? 'text-emerald-700 bg-emerald-50' :
                              net < -0.01 ? 'text-rose-700 bg-rose-50' :
                              'text-slate-500 bg-slate-50'
                            }`}>
                              {hasClosing ? fmt(net) : '—'}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Machine Net Total */}
                      {hasAnyClosing && (
                        <div className="flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2.5 border border-emerald-200 mt-1">
                          <span className="text-[11px] font-extrabold text-emerald-800 flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" /> إجمالي مبيعات المكن
                          </span>
                          <span className="font-black text-sm text-emerald-900">{fmt(machineNetTotal)} ج.م</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Cash Inventory - Total Amount */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-emerald-500" /> جرد الخزنة — التقفيل
                  </h4>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={closingCashAmount}
                    onChange={e => { if (e.target.value === '' || /^[0-9]*\.?[0-9]*$/.test(e.target.value)) setClosingCashAmount(e.target.value); }}
                    placeholder="أدخل المبلغ الإجمالي الموجود بالخزنة..."
                    className="w-full h-12 border-2 border-emerald-200 focus:border-emerald-400 rounded-xl px-4 font-black text-xl text-center outline-none transition-all bg-emerald-50/30 focus:bg-white"
                  />
                </div>

                {/* ═══ Combined Summary: Machine Sales + Drawer ═══ */}
                {(() => {
                  const enteredAmount = toNum(closingCashAmount);
                  const hasEnteredAmount = closingCashAmount.trim() !== '';
                  const machineNetTotal = closeMachines.reduce((s, m) => {
                    const mAdds = (activeShift?.machineAdditions || []).filter(a => a.machineId === m.id).reduce((sum, a) => sum + a.amount, 0);
                    return s + (toNum(m.opening) + mAdds - toNum(m.closing));
                  }, 0);
                  const hasAnyMachineClosing = closeMachines.some(m => m.closing !== '' && m.closing !== null && m.closing !== undefined);
                  const totalExpected = activeMetrics.expectedCash + (hasAnyMachineClosing ? machineNetTotal : 0);

                  if (!hasEnteredAmount && !hasAnyMachineClosing) return null;

                  return (
                    <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200">
                      <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                        <DollarSign className="h-3.5 w-3.5 text-indigo-500" /> ملخص التقفيل
                      </h4>

                      {/* Expected Cash from POS */}
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                        <span>المتوقع بالنظام (مبيعات + وارد - منصرف)</span>
                        <span className="text-indigo-800 font-extrabold">{formatMoney(activeMetrics.expectedCash)}</span>
                      </div>

                      {/* Machine Net */}
                      {hasAnyMachineClosing && (
                        <div className="flex justify-between items-center text-[11px] font-bold text-emerald-700">
                          <span>+ صافي مبيعات المكن</span>
                          <span className="font-extrabold">{formatMoney(machineNetTotal)}</span>
                        </div>
                      )}

                      {/* Grand Total Expected */}
                      <div className="flex justify-between items-center bg-indigo-100/60 rounded-lg px-3 py-2 border border-indigo-200 text-xs font-black text-indigo-900">
                        <span>💰 الإجمالي المتوقع</span>
                        <span className="text-base">{formatMoney(totalExpected)}</span>
                      </div>

                      {/* Actual Drawer */}
                      {hasEnteredAmount && (
                        <>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                            <span>الموجود فعلياً بالخزنة</span>
                            <span className="text-slate-800 font-extrabold">{formatMoney(enteredAmount)}</span>
                          </div>

                          {/* Difference */}
                          {(() => {
                            const diff = enteredAmount - totalExpected;
                            return (
                              <div className={`border rounded-xl p-3 flex items-center justify-between text-xs font-extrabold ${
                                Math.abs(diff) < 0.01 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                diff > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                'bg-rose-50 border-rose-200 text-rose-800'
                              }`}>
                                <div className="flex items-center gap-2">
                                  {Math.abs(diff) < 0.01 ? (
                                    <><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /><span>✅ مضبوط — لا يوجد فرق</span></>
                                  ) : diff > 0 ? (
                                    <><AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" /><span>زيادة في الخزنة</span></>
                                  ) : (
                                    <><AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" /><span>عجز في الخزنة</span></>
                                  )}
                                </div>
                                {Math.abs(diff) >= 0.01 && (
                                  <span className="text-sm">{diff > 0 ? '+' : ''}{formatMoney(diff)}</span>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Close Notes */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">ملاحظات التقفيل (اختياري)</label>
                  <input type="text" value={closingNotes} onChange={e => setClosingNotes(e.target.value)}
                    placeholder="أي ملاحظات عند التقفيل..."
                    className="w-full h-9 border-2 border-slate-200 focus:border-blue-400 rounded-xl px-3 font-medium text-xs outline-none transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowCloseModal(false)}
                    className="flex-1 h-11 border-2 border-slate-200 text-slate-600 font-extrabold rounded-xl hover:bg-slate-50 transition-all text-xs cursor-pointer"
                  >إلغاء</button>
                  <button onClick={handleConfirmClose}
                    className="flex-1 h-11 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold rounded-xl shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  ><Lock className="h-3.5 w-3.5" /> تأكيد التقفيل</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shift Receipt Modal — إيصال استلام وردية مع مقارنة بالوردية السابقة */}
      <AnimatePresence>
        {showShiftReceipt && activeShift && (() => {
          // جلب بيانات آخر وردية مقفلة للمقارنة
          const prevShift = closedShifts.length > 0 ? closedShifts[closedShifts.length - 1] : null;
          const prevCashClosing = prevShift?.closingCashActual;
          const hasPrevShift = prevShift !== null;

          // حساب فرق الخزنة
          const cashDiff = hasPrevShift && prevCashClosing !== undefined && prevCashClosing !== null
            ? activeShift.openingCash - prevCashClosing
            : null;

          return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowShiftReceipt(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" dir="rtl"
            >
              <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white px-5 py-4 text-center">
                <h2 className="text-base font-black flex items-center justify-center gap-2">🚀 إيصال استلام وردية</h2>
                {hasPrevShift && (
                  <p className="text-[10px] text-blue-200 font-medium mt-1">مقارنة مع تقفيل {prevShift.shiftType || 'الوردية'} السابقة ({prevShift.cashierName || '—'})</p>
                )}
              </div>
              <div ref={receiptRef} className="p-5 space-y-3 text-xs">
                {/* بيانات أساسية */}
                <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-bold text-slate-600">📅 التاريخ</span>
                  <span className="font-extrabold text-slate-800">{formatDate(activeShift.openedAt)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-bold text-slate-600">👤 الكاشير</span>
                  <span className="font-extrabold text-slate-800">{activeShift.cashierName || '—'}</span>
                </div>
                {activeShift.shiftType && (
                  <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-bold text-slate-600">نوع الوردية</span>
                    <span className="font-extrabold text-slate-800">{activeShift.shiftType === 'صباحي' ? '🌅' : '🌙'} {activeShift.shiftType}</span>
                  </div>
                )}

                {/* ═══ مقارنة الخزنة ═══ */}
                <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 space-y-2">
                  <span className="font-extrabold text-blue-800 text-[11px] flex items-center gap-1.5">💰 جرد الخزنة</span>
                  {hasPrevShift && prevCashClosing !== undefined && prevCashClosing !== null && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-500">ختامي الوردية السابقة</span>
                      <span className="font-extrabold text-slate-600">{formatMoney(prevCashClosing)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-blue-700">الفعلي عند الاستلام</span>
                    <span className="font-black text-blue-900 text-sm">{formatMoney(activeShift.openingCash)}</span>
                  </div>
                  {cashDiff !== null && (
                    <div className={`flex justify-between items-center rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${
                      Math.abs(cashDiff) < 0.01 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      cashDiff > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      <span>{Math.abs(cashDiff) < 0.01 ? '✅ مطابق' : cashDiff > 0 ? '⬆️ زيادة' : '⬇️ عجز'}</span>
                      {Math.abs(cashDiff) >= 0.01 && <span>{cashDiff > 0 ? '+' : ''}{formatMoney(cashDiff)}</span>}
                    </div>
                  )}
                </div>

                {/* ═══ مقارنة المكينات ═══ */}
                {activeShift.machines && activeShift.machines.length > 0 && (
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 space-y-2">
                    <span className="font-extrabold text-slate-700 text-[11px] flex items-center gap-1.5">🖥️ أرصدة المكينات</span>
                    
                    {/* Header */}
                    {hasPrevShift && prevShift.machines && prevShift.machines.length > 0 && (
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5 items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
                        <span>المكينة</span>
                        <span className="w-[65px] text-center">ختامي سابق</span>
                        <span className="w-[65px] text-center">فعلي حالي</span>
                        <span className="w-[60px] text-center">الفرق</span>
                      </div>
                    )}

                    {activeShift.machines.map(m => {
                      const currentOpening = toNum(m.opening);
                      // البحث عن نفس المكينة في الوردية السابقة
                      const prevMachine = prevShift?.machines?.find(pm => pm.id === m.id || pm.name === m.name);
                      const prevClosing = prevMachine ? toNum(prevMachine.closing) : null;
                      const machineDiff = prevClosing !== null ? currentOpening - prevClosing : null;

                      if (hasPrevShift && prevShift.machines && prevShift.machines.length > 0) {
                        return (
                          <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5 items-center bg-white rounded-lg px-2.5 py-2 border border-slate-100">
                            <span className="font-bold text-xs text-slate-700 truncate">{m.name || '—'}</span>
                            <span className="w-[65px] text-center text-[11px] font-bold text-slate-500">
                              {prevClosing !== null ? fmt(prevClosing) : '—'}
                            </span>
                            <span className="w-[65px] text-center text-[11px] font-extrabold text-blue-800">
                              {fmt(currentOpening)}
                            </span>
                            <span className={`w-[60px] text-center text-[10px] font-extrabold rounded py-0.5 px-1 ${
                              machineDiff === null ? 'text-slate-400' :
                              Math.abs(machineDiff) < 0.01 ? 'text-emerald-600 bg-emerald-50' :
                              machineDiff > 0 ? 'text-amber-700 bg-amber-50' :
                              'text-rose-700 bg-rose-50'
                            }`}>
                              {machineDiff === null ? '—' :
                               Math.abs(machineDiff) < 0.01 ? '✅' :
                               `${machineDiff > 0 ? '+' : ''}${fmt(machineDiff)}`}
                            </span>
                          </div>
                        );
                      }

                      // لو مفيش وردية سابقة — عرض بسيط
                      return (
                        <div key={m.id} className="flex justify-between bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                          <span className="font-bold text-slate-600">{m.name}</span>
                          <span className="font-extrabold text-slate-800">{fmt(currentOpening)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ═══ ملخص صافي الاستلام ═══ */}
                {hasPrevShift && (() => {
                  const totalPrevClosing = (prevCashClosing || 0) + (prevShift.machines || []).reduce((s, m) => s + toNum(m.closing), 0);
                  const totalCurrentOpening = activeShift.openingCash + (activeShift.machines || []).reduce((s, m) => s + toNum(m.opening), 0);
                  const totalDiff = totalCurrentOpening - totalPrevClosing;

                  return (
                    <div className={`rounded-xl p-3.5 border-2 space-y-1.5 ${
                      Math.abs(totalDiff) < 0.01 ? 'bg-emerald-50/60 border-emerald-200' :
                      totalDiff > 0 ? 'bg-amber-50/60 border-amber-200' :
                      'bg-rose-50/60 border-rose-200'
                    }`}>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                        <span>إجمالي ختامي الوردية السابقة</span>
                        <span>{formatMoney(totalPrevClosing)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                        <span>إجمالي الفعلي عند الاستلام</span>
                        <span>{formatMoney(totalCurrentOpening)}</span>
                      </div>
                      <div className={`flex justify-between items-center text-xs font-black rounded-lg px-2 py-1.5 ${
                        Math.abs(totalDiff) < 0.01 ? 'text-emerald-800 bg-emerald-100/60' :
                        totalDiff > 0 ? 'text-amber-800 bg-amber-100/60' :
                        'text-rose-800 bg-rose-100/60'
                      }`}>
                        <span>{Math.abs(totalDiff) < 0.01 ? '✅ الإجمالي مطابق' : totalDiff > 0 ? '⬆️ إجمالي الزيادة' : '⬇️ إجمالي العجز'}</span>
                        {Math.abs(totalDiff) >= 0.01 && <span>{totalDiff > 0 ? '+' : ''}{formatMoney(totalDiff)}</span>}
                      </div>
                    </div>
                  );
                })()}

                {activeShift.openingNotes && (
                  <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100 text-amber-800 font-bold">
                    📝 {activeShift.openingNotes}
                  </div>
                )}
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={() => setShowShiftReceipt(false)} className="flex-1 h-10 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-xs cursor-pointer">إغلاق</button>
                <button onClick={() => receiptRef.current && printContent(receiptRef.current)} className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> طباعة
                </button>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Addition Modal */}
      <AnimatePresence>
        {showAdditionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowAdditionModal(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" dir="rtl"
            >
              <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white px-5 py-4 text-center">
                <h2 className="text-base font-black flex items-center justify-center gap-2">
                  📸 {additionEditIdx >= 0 ? 'تعديل الإضافة' : 'إضافة جديدة'}
                </h2>
              </div>
              <div className="p-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5 text-blue-500" /> قيمة الإضافة لكل مكينة
                </h4>
                {additionMachines.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="flex-1 text-xs font-bold text-slate-700">{m.name || '—'}</span>
                    <span className="text-[10px] text-blue-500 font-medium">افتتاحي: {fmt(toNum(m.opening))}</span>
                    <input type="number" value={m.added} placeholder="0.00"
                      onChange={e => {
                        const arr = [...additionMachines];
                        arr[i] = { ...arr[i], added: e.target.value };
                        setAdditionMachines(arr);
                      }}
                      className="w-24 h-8 border-2 border-slate-200 focus:border-purple-400 rounded-lg text-center font-bold text-xs outline-none bg-white"
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">ملاحظات (اختياري)</label>
                  <input type="text" value={additionNotes} onChange={e => setAdditionNotes(e.target.value)}
                    placeholder="ملاحظات الإضافة..."
                    className="w-full h-9 border-2 border-slate-200 focus:border-purple-400 rounded-xl px-3 font-medium text-xs outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAdditionModal(false)} className="flex-1 h-10 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-xs cursor-pointer">إلغاء</button>
                  {additionEditIdx >= 0 && (
                    <button onClick={() => handleDeleteAddition(additionEditIdx)}
                      className="h-10 px-4 border-2 border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 text-xs cursor-pointer flex items-center gap-1"
                    ><Trash2 className="h-3.5 w-3.5" /> حذف</button>
                  )}
                  <button onClick={handleSaveAddition}
                    className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  ><Save className="h-3.5 w-3.5" /> {additionEditIdx >= 0 ? 'حفظ التعديلات' : 'حفظ الإضافة'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close Receipt Modal */}
      <CloseReceiptModal 
        show={showCloseReceipt} 
        onClose={() => setShowCloseReceipt(false)}
        shiftId={closeReceiptShiftId}
        shifts={shifts}
        transactions={transactions}
        expenses={expenses}
        receiptRef={closeReceiptRef}
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// ═══ Sub-Components ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════

function PastShiftsSection({ closedShifts, transactions, expenses, showPastShifts, setShowPastShifts, expandedPastShiftId, setExpandedPastShiftId, onViewReceipt }: {
  closedShifts: CashShift[];
  transactions: Transaction[];
  expenses: Expense[];
  showPastShifts: boolean;
  setShowPastShifts: (v: boolean) => void;
  expandedPastShiftId: string | null;
  setExpandedPastShiftId: (v: string | null) => void;
  onViewReceipt: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
      <button onClick={() => setShowPastShifts(!showPastShifts)}
        className="w-full px-4 py-3.5 flex items-center justify-between font-extrabold text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer select-none"
      >
        <span className="flex items-center gap-2"><History className="h-4 w-4 text-slate-500 shrink-0" /> الورديات السابقة ({closedShifts.length})</span>
        {showPastShifts ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>

      <AnimatePresence>
        {showPastShifts && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 space-y-2.5 max-h-[350px] overflow-y-auto">
              {/* CSV Export */}
              <button onClick={() => exportCSV(closedShifts, transactions, expenses)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
              ><Download className="h-3.5 w-3.5" /> تصدير CSV</button>

              {/* ═══ Daily Summary Section ═══ */}
              {(() => {
                // Group shifts by date
                const shiftsByDate: Record<string, CashShift[]> = {};
                closedShifts.forEach(s => {
                  const dateKey = getDateKey(s.openedAt);
                  if (!shiftsByDate[dateKey]) shiftsByDate[dateKey] = [];
                  shiftsByDate[dateKey].push(s);
                });

                // Only show dates that have at least one shift
                const dates = Object.keys(shiftsByDate).sort().reverse();
                if (dates.length === 0) return null;

                return (
                  <div className="space-y-2">
                    {dates.map(dateKey => {
                      const dayShifts = shiftsByDate[dateKey];
                      if (dayShifts.length === 0) return null;

                      const morningShift = dayShifts.find(s => s.shiftType === 'صباحي');
                      const eveningShift = dayShifts.find(s => s.shiftType === 'مسائي');

                      // Calculate combined metrics
                      let totalCashSales = 0;
                      let totalInflows = 0;
                      let totalOutflows = 0;
                      let totalManualInflow = 0;
                      let totalManualOutflow = 0;
                      let totalExpenses = 0;

                      dayShifts.forEach(s => {
                        const m = getShiftCalculations(s, transactions, expenses);
                        totalCashSales += m.cashSales;
                        totalInflows += m.totalInflows;
                        totalOutflows += m.totalOutflows;
                        totalManualInflow += m.manualInflow;
                        totalManualOutflow += m.manualOutflow;
                        totalExpenses += m.totalExpenses;
                      });

                      const firstShift = morningShift || dayShifts[0];
                      const lastShift = eveningShift || dayShifts[dayShifts.length - 1];
                      const dayOpeningCash = firstShift.openingCash;
                      const dayClosingCash = lastShift.closingCashActual || 0;
                      const dayDate = new Date(dateKey + 'T00:00:00');
                      const dayLabel = dayDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                      return (
                        <div key={dateKey} className="bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border border-indigo-200/70 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                              📊 ملخص يوم {dayLabel}
                            </span>
                            <div className="flex gap-1">
                              {morningShift && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">🌅 صباحي</span>}
                              {eveningShift && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">🌙 مسائي</span>}
                              {!morningShift && !eveningShift && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{dayShifts.length} وردية</span>}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="bg-white/80 rounded-lg px-2.5 py-1.5 border border-indigo-100/50">
                              <span className="text-slate-500 block font-bold">الرصيد الافتتاحي</span>
                              <span className="font-black text-blue-900">{formatMoney(dayOpeningCash)}</span>
                            </div>
                            <div className="bg-white/80 rounded-lg px-2.5 py-1.5 border border-indigo-100/50">
                              <span className="text-slate-500 block font-bold">الرصيد الختامي</span>
                              <span className="font-black text-indigo-900">{formatMoney(dayClosingCash)}</span>
                            </div>
                            <div className="bg-white/80 rounded-lg px-2.5 py-1.5 border border-emerald-100/50">
                              <span className="text-emerald-600 block font-bold">إجمالي المبيعات النقدية</span>
                              <span className="font-black text-emerald-800">{formatMoney(totalCashSales)}</span>
                            </div>
                            <div className="bg-white/80 rounded-lg px-2.5 py-1.5 border border-rose-100/50">
                              <span className="text-rose-600 block font-bold">إجمالي المصروفات</span>
                              <span className="font-black text-rose-800">{formatMoney(totalExpenses)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-bold px-1">
                            <span className="text-emerald-700">+ إجمالي الوارد: {formatMoney(totalInflows)}</span>
                            <span className="text-rose-700">- إجمالي المنصرف: {formatMoney(totalOutflows)}</span>
                          </div>

                          {/* Shift handover info */}
                          {morningShift && eveningShift && (
                            <div className="bg-white/60 border border-blue-100 rounded-lg px-2.5 py-2 text-[10px]">
                              <span className="font-extrabold text-blue-800 block mb-1">🔄 تسليم الوردية</span>
                              <div className="flex justify-between text-slate-600 font-bold">
                                <span>ختامي الصباحي ({morningShift.cashierName || '—'})</span>
                                <span className="text-blue-800 font-extrabold">{formatMoney(morningShift.closingCashActual || 0)}</span>
                              </div>
                              <div className="flex justify-between text-slate-600 font-bold">
                                <span>افتتاحي المسائي ({eveningShift.cashierName || '—'})</span>
                                <span className="text-blue-800 font-extrabold">{formatMoney(eveningShift.openingCash)}</span>
                              </div>
                              {(() => {
                                const handoverDiff = eveningShift.openingCash - (morningShift.closingCashActual || 0);
                                if (Math.abs(handoverDiff) > 0.01) {
                                  return (
                                    <div className={`flex justify-between font-extrabold mt-0.5 ${handoverDiff > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      <span>{handoverDiff > 0 ? 'إضافة عند التسليم' : 'فرق عند التسليم'}</span>
                                      <span>{handoverDiff > 0 ? '+' : ''}{formatMoney(handoverDiff)}</span>
                                    </div>
                                  );
                                }
                                return <div className="text-emerald-600 font-extrabold mt-0.5">✅ تسليم مطابق</div>;
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {closedShifts.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold text-center py-8">لا توجد ورديات سابقة</p>
              ) : (
                closedShifts.slice().reverse().map(shift => {
                  const metrics = getShiftCalculations(shift, transactions, expenses);
                  const actual = shift.closingCashActual || 0;
                  const machineNet = getMachineNetSales(shift);
                  const diff = actual - (metrics.expectedCash + machineNet);
                  const isExpanded = expandedPastShiftId === shift.id;

                  return (
                    <div key={shift.id} className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden">
                      <div onClick={() => setExpandedPastShiftId(isExpanded ? null : shift.id)}
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/40 text-xs font-bold text-slate-600 transition-all select-none"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-indigo-50 text-indigo-800 text-[10px] px-2 py-0.5 rounded-md font-extrabold">#{shift.id.slice(-5)}</span>
                            {shift.shiftType && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${shift.shiftType === 'صباحي' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                {shift.shiftType === 'صباحي' ? '🌅' : '🌙'} {shift.shiftType}
                              </span>
                            )}
                            {shift.cashierName && <span className="text-[9px] text-slate-400 font-medium">👤 {shift.cashierName}</span>}
                          </div>
                          <span className="text-slate-400 block text-[9.5px]">{formatDate(shift.openedAt)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-slate-400 block text-[9px] font-medium">الفعلي</span>
                            <span className="text-slate-800 font-black text-sm">{formatMoney(actual)}</span>
                          </div>
                          {Math.abs(diff) > 0.01 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {diff > 0 ? '+' : ''}{formatMoney(diff)}
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 space-y-1.5">
                              <div className="flex justify-between"><span>الافتتاحي</span><span>{formatMoney(shift.openingCash)}</span></div>
                              <div className="flex justify-between text-emerald-700"><span>+ وارد</span><span>{formatMoney(metrics.totalInflows)}</span></div>
                              <div className="flex justify-between text-rose-700"><span>- منصرف</span><span>{formatMoney(metrics.totalOutflows)}</span></div>
                              <div className="flex justify-between text-indigo-700 border-t border-slate-200 pt-1.5"><span>المتوقع</span><span className="font-extrabold">{formatMoney(metrics.expectedCash)}</span></div>
                              <div className="flex justify-between font-black text-slate-900 bg-slate-100/50 p-2 rounded-lg"><span>الفعلي</span><span className="text-indigo-900 text-sm">{formatMoney(actual)}</span></div>
                              {Math.abs(diff) > 0.01 && (
                                <div className={`flex justify-between p-2 rounded-lg font-extrabold ${diff > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                                  <span>{diff > 0 ? 'فائض' : 'عجز'}</span>
                                  <span>{diff > 0 ? '+' : ''}{formatMoney(diff)}</span>
                                </div>
                              )}
                              {/* Machines summary */}
                              {shift.machines && shift.machines.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-slate-200">
                                  <span className="text-[10px] text-slate-500 font-extrabold">🖥️ المكينات:</span>
                                  {shift.machines.map(m => {
                                    const mAdds = (shift.machineAdditions || []).filter(a => a.machineId === m.id).reduce((sum, a) => sum + a.amount, 0);
                                    const machNet = (toNum(m.opening) + mAdds) - toNum(m.closing);
                                    return (
                                      <div key={m.id} className="flex justify-between text-[10px]">
                                        <span>{m.name}</span>
                                        <span className="flex items-center gap-1.5">
                                          <span className="text-slate-400">{fmt(toNum(m.opening) + mAdds)} → {fmt(toNum(m.closing))}</span>
                                          <span className={`font-extrabold ${machNet > 0.01 ? 'text-emerald-600' : machNet < -0.01 ? 'text-rose-600' : 'text-slate-400'}`}>({fmt(machNet)})</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                  <div className="flex justify-between text-[10px] font-extrabold text-emerald-700 border-t border-slate-200 pt-1">
                                    <span>إجمالي مبيعات المكن</span>
                                    <span>{fmt(getMachineNetSales(shift))}</span>
                                  </div>
                                </div>
                              )}
                              <button onClick={() => onViewReceipt(shift.id)}
                                className="w-full mt-2 py-2 bg-indigo-50 text-indigo-700 font-extrabold rounded-lg text-[11px] hover:bg-indigo-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              ><Receipt className="h-3 w-3" /> عرض الإيصال الكامل</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── Close Receipt Modal ──────────────────────────────────────────────
function CloseReceiptModal({ show, onClose, shiftId, shifts, transactions, expenses, receiptRef }: {
  show: boolean;
  onClose: () => void;
  shiftId: string | null;
  shifts: CashShift[];
  transactions: Transaction[];
  expenses: Expense[];
  receiptRef: React.RefObject<HTMLDivElement | null>;
}) {
  const shift = shiftId ? shifts.find(s => s.id === shiftId) : null;
  if (!shift) return null;

  const metrics = getShiftCalculations(shift, transactions, expenses);
  const actual = shift.closingCashActual || 0;
  const machineNet = getMachineNetSales(shift);
  const diff = actual - (metrics.expectedCash + machineNet);

  // جلب كل ورديات نفس اليوم للملخص اليومي
  const shiftDateKey = getDateKey(shift.openedAt);
  const sameDayShifts = shifts.filter(s => s.isClosed && getDateKey(s.openedAt) === shiftDateKey);
  const hasDailySummary = sameDayShifts.length > 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" dir="rtl"
          >
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-4 text-center">
              <h2 className="text-base font-black flex items-center justify-center gap-2">🔒 إيصال تقفيل وردية</h2>
            </div>
            <div ref={receiptRef} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500 block text-[10px]">📅 بدء</span><span className="font-bold text-slate-800">{formatDate(shift.openedAt)}</span></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500 block text-[10px]">🔒 تقفيل</span><span className="font-bold text-slate-800">{shift.closedAt ? formatDate(shift.closedAt) : '—'}</span></div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-bold text-slate-600">👤 {shift.cashierName || '—'}</span>
                {shift.shiftType && <span className="font-bold text-slate-600">{shift.shiftType === 'صباحي' ? '🌅' : '🌙'} {shift.shiftType}</span>}
              </div>

              {/* Machines */}
              {shift.machines && shift.machines.length > 0 && (() => {
                const machineNetTotal = getMachineNetSales(shift);
                return (
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                    <span className="font-extrabold text-slate-700 text-[11px]">🖥️ المكينات</span>
                    <table className="w-full text-[11px]">
                      <thead><tr className="text-slate-500 border-b border-slate-200">
                        <th className="text-right py-1 font-bold">المكينة</th><th className="text-center py-1 font-bold">افتتاحي</th><th className="text-center py-1 font-bold">ختامي</th><th className="text-center py-1 font-bold">صافي المبيعات</th>
                      </tr></thead>
                      <tbody>
                        {shift.machines.map(m => {
                          const mAdds = (shift.machineAdditions || []).filter(a => a.machineId === m.id).reduce((sum, a) => sum + a.amount, 0);
                          const net = (toNum(m.opening) + mAdds) - toNum(m.closing);
                          return (
                            <tr key={m.id} className="border-b border-slate-100">
                              <td className="py-1.5 text-right font-bold text-slate-700">{m.name}</td>
                              <td className="py-1.5 text-center text-slate-600">{fmt(toNum(m.opening) + mAdds)}</td>
                              <td className="py-1.5 text-center text-slate-600">{fmt(toNum(m.closing))}</td>
                              <td className={`py-1.5 text-center font-extrabold ${net > 0.01 ? 'text-emerald-600' : net < -0.01 ? 'text-rose-600' : 'text-slate-400'}`}>{fmt(net)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-emerald-200">
                          <td className="py-1.5 text-right font-black text-slate-800" colSpan={3}>إجمالي مبيعات المكن</td>
                          <td className="py-1.5 text-center font-black text-emerald-700 text-sm">{fmt(machineNetTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}

              {/* Statement Summary */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-[11px] font-bold text-slate-600">
                <div className="flex justify-between"><span>الافتتاحي</span><span>{formatMoney(shift.openingCash)}</span></div>
                <div className="flex justify-between text-emerald-700"><span>+ وارد</span><span>{formatMoney(metrics.totalInflows)}</span></div>
                <div className="flex justify-between text-rose-700"><span>- منصرف</span><span>{formatMoney(metrics.totalOutflows)}</span></div>
                <div className="flex justify-between text-indigo-700 border-t border-slate-200 pt-1.5 font-extrabold"><span>المتوقع</span><span>{formatMoney(metrics.expectedCash)}</span></div>
                <div className="flex justify-between font-black text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                  <span>الفعلي عند التقفيل</span><span className="text-indigo-900 text-sm">{formatMoney(actual)}</span>
                </div>
                {Math.abs(diff) > 0.01 && (
                  <div className={`flex justify-between p-2 rounded-lg font-extrabold ${diff > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    <span>{diff > 0 ? 'فائض' : 'عجز'}</span><span>{diff > 0 ? '+' : ''}{formatMoney(diff)}</span>
                  </div>
                )}
              </div>

              {/* ═══ ملخص اليوم الكامل — يظهر لو في أكتر من شيفت في نفس اليوم ═══ */}
              {hasDailySummary && (() => {
                const dayDate = new Date(shiftDateKey + 'T00:00:00');
                const dayLabel = dayDate.toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' });

                let grandCashSales = 0;
                let grandInflows = 0;
                let grandOutflows = 0;
                let grandExpenses = 0;
                let grandMachineNet = 0;

                const shiftSummaries = sameDayShifts.map(s => {
                  const m = getShiftCalculations(s, transactions, expenses);
                  const sMachineNet = getMachineNetSales(s);
                  grandCashSales += m.cashSales;
                  grandInflows += m.totalInflows;
                  grandOutflows += m.totalOutflows;
                  grandExpenses += m.totalExpenses;
                  grandMachineNet += sMachineNet;
                  return { shift: s, metrics: m, machineNet: sMachineNet };
                });

                const firstShift = sameDayShifts[0];
                const lastShift = sameDayShifts[sameDayShifts.length - 1];
                const dayOpening = firstShift.openingCash;
                const dayClosing = lastShift.closingCashActual || 0;

                return (
                  <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/60 rounded-xl p-3.5 border-2 border-indigo-200 space-y-3">
                    <div className="text-center border-b border-indigo-200 pb-2">
                      <span className="text-xs font-black text-indigo-900 flex items-center justify-center gap-1.5">
                        📊 ملخص اليوم الكامل — {dayLabel}
                      </span>
                      <span className="text-[10px] text-indigo-500 font-bold">{sameDayShifts.length} ورديات</span>
                    </div>

                    {/* ملخص كل شيفت */}
                    <div className="space-y-2">
                      {shiftSummaries.map(({ shift: s, metrics: m, machineNet: mn }) => (
                        <div key={s.id} className="bg-white/80 rounded-lg p-2.5 border border-indigo-100/60 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-extrabold text-indigo-800 flex items-center gap-1">
                              {s.shiftType === 'صباحي' ? '🌅' : s.shiftType === 'مسائي' ? '🌙' : '📋'} {s.shiftType || 'وردية'} — {s.cashierName || '—'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {formatTime(s.openedAt)} → {s.closedAt ? formatTime(s.closedAt) : '—'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                            <div className="text-center">
                              <span className="text-slate-400 block font-medium">مبيعات نقدية</span>
                              <span className="font-extrabold text-emerald-700">{formatMoney(m.cashSales)}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-slate-400 block font-medium">مبيعات مكن</span>
                              <span className="font-extrabold text-blue-700">{formatMoney(mn)}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-slate-400 block font-medium">الفعلي</span>
                              <span className="font-extrabold text-indigo-800">{formatMoney(s.closingCashActual || 0)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* التوتال اليومي */}
                    <div className="bg-indigo-100/60 rounded-lg p-3 space-y-1.5 border border-indigo-200">
                      <span className="text-[10px] font-black text-indigo-900 block">💰 التوتال اليومي</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                        <div className="flex justify-between text-slate-600">
                          <span>افتتاحي اليوم</span>
                          <span>{formatMoney(dayOpening)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>ختامي اليوم</span>
                          <span>{formatMoney(dayClosing)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>إجمالي المبيعات النقدية</span>
                          <span>{formatMoney(grandCashSales)}</span>
                        </div>
                        <div className="flex justify-between text-blue-700">
                          <span>إجمالي مبيعات المكن</span>
                          <span>{formatMoney(grandMachineNet)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>إجمالي الوارد</span>
                          <span>{formatMoney(grandInflows)}</span>
                        </div>
                        <div className="flex justify-between text-rose-700">
                          <span>إجمالي المنصرف</span>
                          <span>{formatMoney(grandOutflows)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-indigo-200/60 rounded-lg px-2.5 py-2 text-xs font-black text-indigo-900 mt-1 border border-indigo-300/50">
                        <span>🏆 صافي اليوم الكامل</span>
                        <span className="text-sm">{formatMoney(dayClosing)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              {shift.closingNotes && (
                <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100 text-amber-800 font-bold">
                  📝 {shift.closingNotes}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={onClose} className="flex-1 h-10 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-xs cursor-pointer">إغلاق</button>
              <button onClick={() => receiptRef.current && printContent(receiptRef.current)} className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5">
                <Printer className="h-3.5 w-3.5" /> طباعة
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
