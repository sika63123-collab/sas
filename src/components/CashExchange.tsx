import React, { useState, useEffect, useMemo } from 'react';
import { getStorageItem, setStorageItem } from '../lib/storage';
import {
  Wallet as WalletIcon,
  Banknote,
  Plus,
  ArrowRightLeft,
  Calendar,
  History as HistoryIcon,
  BarChart2,
  FileText,
  Printer,
  X,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Archive,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ======================== TYPES ========================
interface LocalWallet {
  id: string;
  name: string;
  phone?: string;
  initialBalance: number;
  limitReceive?: number;
  limitSend?: number;
  hidden?: boolean;
}

interface LocalTransaction {
  id: string;
  walletId: string | null; // null represents Cash Drawer operations
  type: 'receive' | 'send' | 'cash_deposit' | 'cash_withdraw';
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  affectsCash?: boolean;
  isOffset?: boolean;
  transferRef?: string;
  archived?: boolean;
}

export default function BalancesScreen() {
  // ======================== DATA STATE ========================
  const [wallets, setWallets] = useState<LocalWallet[]>([]);
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null);
  const [cashInitial, setCashInitial] = useState<number>(0);
  const [showHiddenWallets, setShowHiddenWallets] = useState<boolean>(false);
  // ======================== UI STATE ========================
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Modals Visibility
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isCashOpModalOpen, setIsCashOpModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [isDelWalletModalOpen, setIsDelWalletModalOpen] = useState(false);

  // Modal Editing and Params States
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);
  const [walletTargetId, setWalletTargetId] = useState<string>('');
  
  // Wallet Form State
  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wInitialBal, setWInitialBal] = useState('');
  const [wLimitReceive, setWLimitReceive] = useState('');
  const [wLimitSend, setWLimitSend] = useState('');
  const [wHidden, setWHidden] = useState(false);

  // Cash Initial Balance State
  const [cInitBal, setCInitBal] = useState('');

  // Add Transaction Form State
  const [txType, setTxType] = useState<'receive' | 'send'>('receive');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');

  // Cash Operation Form State
  const [cashOpAmount, setCashOpAmount] = useState('');
  const [cashOpNote, setCashOpNote] = useState('');

  // Transfer Form State
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // History Modal Filters
  const [hfType, setHfType] = useState<string>('all');
  const [hfFrom, setHfFrom] = useState<string>('');
  const [hfTo, setHfTo] = useState<string>('');
  const [hfSearch, setHfSearch] = useState<string>('');
  const [hfArchived, setHfArchived] = useState<boolean>(false);

  // All Transactions Modal Filters
  const [afWallet, setAfWallet] = useState<string>('all');
  const [afType, setAfType] = useState<string>('all');
  const [afFrom, setAfFrom] = useState<string>('');
  const [afTo, setAfTo] = useState<string>('');
  const [afSearch, setAfSearch] = useState<string>('');
  const [afArchived, setAfArchived] = useState<boolean>(false);

  // Daily Settlement State
  const [dailyDate, setDailyDate] = useState<string>('');
  const [dailyDayName, setDailyDayName] = useState<string>('');

  // Monthly Report State
  const [monthlyMonth, setMonthlyMonth] = useState<string>('');

  // Archive State
  const [archiveDate, setArchiveDate] = useState<string>('');

  // Edit Transaction Form State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxType, setEditTxType] = useState<'receive' | 'send' | 'cash_deposit' | 'cash_withdraw'>('receive');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxTime, setEditTxTime] = useState('');

  // ======================== LOAD AND SAVE ========================
  useEffect(() => {
    // Load Dark Mode Preference
    const dm = getStorageItem('mahfazty4_dark') === '1';
    if (dm) {
      document.body.classList.add('dark-mode');
    }

    // Load DB
    const r = getStorageItem('mahfazty4');
    if (r) {
      try {
        const parsed = JSON.parse(r);
        if (parsed.wallets) setWallets(parsed.wallets);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.currentWalletId) setCurrentWalletId(parsed.currentWalletId);
        else if (parsed.wallets && parsed.wallets.length > 0) setCurrentWalletId(parsed.wallets[0].id);
        if (parsed.cashInitial !== undefined) setCashInitial(Number(parsed.cashInitial));
        if (parsed.showHiddenWallets !== undefined) setShowHiddenWallets(!!parsed.showHiddenWallets);
      } catch (e) {
        console.error('Failed to parse mahfazty4 database', e);
      }
    }
  }, []);

  const saveToLocalStorage = (
    newWallets: LocalWallet[],
    newTransactions: LocalTransaction[],
    newCurrentWalletId: string | null,
    newCashInitial: number,
    newShowHiddenWallets: boolean
  ) => {
    const data = {
      wallets: newWallets,
      transactions: newTransactions,
      currentWalletId: newCurrentWalletId,
      cashInitial: newCashInitial,
      showHiddenWallets: newShowHiddenWallets,
    };
    setStorageItem('mahfazty4', JSON.stringify(data));
  };

  // Helper State Setters that auto-save
  const updateWallets = (list: LocalWallet[]) => {
    setWallets(list);
    saveToLocalStorage(list, transactions, currentWalletId, cashInitial, showHiddenWallets);
  };

  const updateTransactions = (list: LocalTransaction[]) => {
    setTransactions(list);
    saveToLocalStorage(wallets, list, currentWalletId, cashInitial, showHiddenWallets);
  };

  const updateCurrentWalletId = (id: string | null) => {
    setCurrentWalletId(id);
    saveToLocalStorage(wallets, transactions, id, cashInitial, showHiddenWallets);
  };

  const updateCashInitial = (val: number) => {
    setCashInitial(val);
    saveToLocalStorage(wallets, transactions, currentWalletId, val, showHiddenWallets);
  };

  const updateShowHiddenWallets = (val: boolean) => {
    setShowHiddenWallets(val);
    saveToLocalStorage(wallets, transactions, currentWalletId, cashInitial, val);
  };

  // ======================== TOAST & CONFIRM ========================
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
  };

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const triggerConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  // ======================== DATE & FORMAT HELPERS ========================
  const today = () => new Date().toISOString().slice(0, 10);
  const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fm = (n: number) => Number(n).toLocaleString('en', { maximumFractionDigits: 0 });
  const fd = (d: string) => {
    if (!d) return '-';
    const p = d.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  };
  const fdt = (date: string, time: string) => fd(date) + (time ? ` ${time}` : '');

  // ======================== CALCULATIONS ========================
  const calcWallet = (wid: string) => {
    const w = wallets.find(x => x.id === wid);
    let bal = w ? w.initialBalance : 0;
    transactions
      .filter(t => t.walletId === wid && !t.isOffset)
      .forEach(t => {
        if (t.type === 'receive') bal += t.amount;
        if (t.type === 'send') bal -= t.amount;
      });
    return bal;
  };

  const calcCash = () => {
    let bal = cashInitial;
    transactions
      .filter(t => !t.isOffset)
      .forEach(t => {
        const affectsCash = t.affectsCash !== false;
        if (t.type === 'receive' && affectsCash) bal -= t.amount;
        if (t.type === 'send' && affectsCash) bal += t.amount;
        if (t.type === 'cash_deposit') bal += t.amount;
        if (t.type === 'cash_withdraw') bal -= t.amount;
      });
    return bal;
  };

  const calcTotals = (list: LocalTransaction[]) => {
    let r = { receive: 0, send: 0, cash_deposit: 0, cash_withdraw: 0, count: 0 };
    list.forEach(t => {
      if (t.type === 'receive') r.receive += t.amount;
      if (t.type === 'send') r.send += t.amount;
      if (t.type === 'cash_deposit') r.cash_deposit += t.amount;
      if (t.type === 'cash_withdraw') r.cash_withdraw += t.amount;
      r.count++;
    });
    return r;
  };

  const totalAllWallets = useMemo(() => {
    return wallets.reduce((sum, w) => sum + calcWallet(w.id), 0);
  }, [wallets, transactions]);

  const walletsStats = useMemo(() => {
    return wallets.map(w => {
      const b = calcWallet(w.id);
      
      // Calculate monthly progress
      const now = new Date();
      const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const me = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      const mTxns = transactions.filter(t => !t.archived && !t.isOffset && t.walletId === w.id && t.date >= ms && t.date <= me);
      const mTot = calcTotals(mTxns);
      const nearLimit = (w.limitReceive && mTot.receive >= w.limitReceive * 0.85) || (w.limitSend && mTot.send >= w.limitSend * 0.85);
      const overLimit = (w.limitReceive && mTot.receive >= w.limitReceive) || (w.limitSend && mTot.send >= w.limitSend);

      return {
        ...w,
        balance: b,
        monthReceive: mTot.receive,
        monthSend: mTot.send,
        nearLimit,
        overLimit
      };
    });
  }, [wallets, transactions]);

  // Current active wallet stats
  const activeWallet = useMemo(() => {
    return walletsStats.find(w => w.id === currentWalletId) || null;
  }, [walletsStats, currentWalletId]);

  const activeWalletStats = useMemo(() => {
    if (!currentWalletId) return null;
    const w = wallets.find(x => x.id === currentWalletId);
    if (!w) return null;
    const wTxns = transactions.filter(t => t.walletId === currentWalletId);
    const tot = calcTotals(wTxns);
    const bal = calcWallet(w.id);

    // Monthly Limits
    const now = new Date();
    const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const me = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    const mTxns = transactions.filter(t => !t.archived && !t.isOffset && t.walletId === w.id && t.date >= ms && t.date <= me);
    const monthTot = calcTotals(mTxns);

    // Cash transactions under this wallet month
    const cashTxns = transactions.filter(t => !t.archived && !t.isOffset && t.walletId === null && t.date >= ms && t.date <= me);
    const cashTot = calcTotals(cashTxns);

    const limitReceive = w.limitReceive || 0;
    const limitSend = w.limitSend || 0;
    const pctReceive = limitReceive > 0 ? Math.min(100, (monthTot.receive / limitReceive) * 100) : 0;
    const pctSend = limitSend > 0 ? Math.min(100, (monthTot.send / limitSend) * 100) : 0;

    const limitColor = (pct: number) => {
      if (pct >= 90) return 'bg-red-600 text-red-600';
      if (pct >= 75) return 'bg-orange-500 text-orange-500';
      return 'bg-emerald-600 text-emerald-600';
    };

    const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthName = months[now.getMonth()];

    return {
      totalReceive: tot.receive,
      totalSend: tot.send,
      balance: bal,
      count: tot.count,
      limitReceive,
      limitSend,
      monthReceive: monthTot.receive,
      monthSend: monthTot.send,
      pctReceive,
      pctSend,
      limitColor,
      monthName,
      cashTot
    };
  }, [currentWalletId, wallets, transactions]);

  // ======================== WALLET ACTIONS ========================
  const handleOpenWalletModal = (id: string | null) => {
    setEditingWalletId(id);
    if (id) {
      const w = wallets.find(x => x.id === id);
      if (w) {
        setWName(w.name);
        setWPhone(w.phone || '');
        setWInitialBal(w.initialBalance.toString());
        setWLimitReceive(w.limitReceive ? w.limitReceive.toString() : '');
        setWLimitSend(w.limitSend ? w.limitSend.toString() : '');
        setWHidden(!!w.hidden);
      }
    } else {
      setWName('');
      setWPhone('');
      setWInitialBal('');
      setWLimitReceive('');
      setWLimitSend('');
      setWHidden(false);
    }
    setIsWalletModalOpen(true);
  };

  const handleSaveWallet = () => {
    const name = wName.trim();
    const phone = wPhone.trim();
    const initB = parseFloat(wInitialBal) || 0;
    const limR = parseFloat(wLimitReceive) || 0;
    const limS = parseFloat(wLimitSend) || 0;

    if (!name) {
      showToast('أدخل اسم المحفظة', 'error');
      return;
    }

    let updatedWallets = [...wallets];
    let targetId = currentWalletId;

    if (editingWalletId) {
      updatedWallets = wallets.map(x =>
        x.id === editingWalletId
          ? { ...x, name, phone, initialBalance: initB, limitReceive: limR, limitSend: limS, hidden: wHidden }
          : x
      );
    } else {
      const newId = uid();
      updatedWallets.push({ id: newId, name, phone, initialBalance: initB, limitReceive: limR, limitSend: limS, hidden: wHidden });
      if (!targetId) targetId = newId;
    }

    updateWallets(updatedWallets);
    updateCurrentWalletId(targetId);
    setIsWalletModalOpen(false);
    showToast('تم حفظ المحفظة بنجاح');
  };

  const handleDeleteWallet = (wid: string) => {
    const w = wallets.find(x => x.id === wid);
    if (!w) return;
    const cnt = transactions.filter(t => t.walletId === wid).length;
    if (cnt === 0) {
      triggerConfirm(`حذف محفظة "${w.name}"؟`, () => {
        const list = wallets.filter(x => x.id !== wid);
        const nextId = list.length > 0 ? list[0].id : null;
        updateWallets(list);
        updateCurrentWalletId(nextId);
        showToast('تم حذف المحفظة');
      });
      return;
    }
    
    // Wallet has transactions, trigger transfer/delete modal
    setDeletingWalletId(wid);
    setWalletTargetId('');
    setIsDelWalletModalOpen(true);
  };

  const executeDeleteWalletWithTxns = () => {
    if (!deletingWalletId) return;
    const remainingTxns = transactions.filter(t => t.walletId !== deletingWalletId);
    const remainingWallets = wallets.filter(w => w.id !== deletingWalletId);
    const nextId = remainingWallets.length > 0 ? remainingWallets[0].id : null;

    updateTransactions(remainingTxns);
    updateWallets(remainingWallets);
    updateCurrentWalletId(nextId);
    
    setIsDelWalletModalOpen(false);
    setDeletingWalletId(null);
    showToast('تم حذف المحفظة مع كافة العمليات المرتبطة بها');
  };

  const executeTransferAndClose = () => {
    if (!deletingWalletId || !walletTargetId) {
      showToast('اختر محفظة بديلة لنقل العمليات إليها', 'error');
      return;
    }

    const updatedTxns = transactions.map(t =>
      t.walletId === deletingWalletId ? { ...t, walletId: walletTargetId } : t
    );
    const remainingWallets = wallets.filter(w => w.id !== deletingWalletId);
    const nextId = remainingWallets.length > 0 ? remainingWallets[0].id : null;

    updateTransactions(updatedTxns);
    updateWallets(remainingWallets);
    updateCurrentWalletId(nextId);

    setIsDelWalletModalOpen(false);
    setDeletingWalletId(null);
    showToast('تم نقل العمليات وحذف المحفظة بنجاح');
  };

  // ======================== DATA MUTATIONS ========================
  const handleSaveCashSettings = () => {
    const initCash = parseFloat(cInitBal) || 0;
    updateCashInitial(initCash);
    setIsCashModalOpen(false);
    showToast('تم تعديل رصيد العهدة بنجاح');
  };

  const handleAddTx = () => {
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) {
      showToast('أدخل مبلغاً صحيحاً', 'error');
      return;
    }
    if (!currentWalletId) return;

    const newTx: LocalTransaction = {
      id: uid(),
      walletId: currentWalletId,
      type: txType,
      amount: amt,
      note: txNote.trim(),
      date: today(),
      time: nowTime()
    };

    updateTransactions([...transactions, newTx]);
    setTxAmount('');
    setTxNote('');
    setIsAddTxModalOpen(false);
    showToast('تم تسجيل العملية بنجاح');
  };

  const handleCashOp = (type: 'cash_deposit' | 'cash_withdraw') => {
    const amt = parseFloat(cashOpAmount);
    if (!amt || amt <= 0) {
      showToast('أدخل مبلغاً صحيحاً', 'error');
      return;
    }

    const label = type === 'cash_deposit' ? 'إيداع عهدة' : 'سحب عهدة';
    const newTx: LocalTransaction = {
      id: uid(),
      walletId: null,
      type,
      amount: amt,
      note: cashOpNote.trim() || label,
      date: today(),
      time: nowTime()
    };

    updateTransactions([...transactions, newTx]);
    setCashOpAmount('');
    setCashOpNote('');
    setIsCashOpModalOpen(false);
    showToast(`تم تسجيل ${label} بنجاح`);
  };

  const handleTransfer = () => {
    const amt = parseFloat(transferAmount);
    if (!transferFromId || !transferToId) {
      showToast('اختر المحافظ أولاً', 'error');
      return;
    }
    if (transferFromId === transferToId) {
      showToast('لا يمكن الترحيل لنفس المحفظة', 'error');
      return;
    }
    if (!amt || amt <= 0) {
      showToast('أدخل مبلغاً صحيحاً', 'error');
      return;
    }

    const tRef = uid();
    const date = today();
    const time = nowTime();
    const fromName = wallets.find(w => w.id === transferFromId)?.name || '';
    const toName = wallets.find(w => w.id === transferToId)?.name || '';

    const txSend: LocalTransaction = {
      id: uid(),
      walletId: transferFromId,
      type: 'send',
      amount: amt,
      note: transferNote.trim() || `ترحيل إلى ${toName}`,
      date,
      time,
      transferRef: tRef
    };

    const txReceive: LocalTransaction = {
      id: uid(),
      walletId: transferToId,
      type: 'receive',
      amount: amt,
      note: transferNote.trim() || `ترحيل من ${fromName}`,
      date,
      time,
      transferRef: tRef
    };

    updateTransactions([...transactions, txSend, txReceive]);
    setTransferAmount('');
    setTransferNote('');
    setIsTransferModalOpen(false);
    showToast('تم ترحيل المبلغ بين المحفظتين');
  };

  const handleDeleteTx = (id: string) => {
    triggerConfirm('هل أنت متأكد من حذف العملية؟ سيتم عكس تأثيرها.', () => {
      const list = transactions.filter(t => t.id !== id);
      updateTransactions(list);
      showToast('تم حذف العملية بنجاح');
    });
  };

  const handleOpenEditTx = (tx: LocalTransaction) => {
    setEditingTxId(tx.id);
    setEditTxType(tx.type);
    setEditTxAmount(tx.amount.toString());
    setEditTxNote(tx.note);
    setEditTxDate(tx.date);
    setEditTxTime(tx.time);
    setIsEditTxModalOpen(true);
  };

  const handleSaveEditTx = () => {
    const amt = parseFloat(editTxAmount);
    if (!amt || amt <= 0) {
      showToast('أدخل مبلغاً صحيحاً', 'error');
      return;
    }
    if (!editTxDate) {
      showToast('اختر تاريخاً صحيحاً', 'error');
      return;
    }

    const updated = transactions.map(t => {
      if (t.id === editingTxId) {
        let wId = t.walletId;
        if (editTxType === 'cash_deposit' || editTxType === 'cash_withdraw') {
          wId = null;
        } else if (wId === null) {
          wId = currentWalletId;
        }
        return {
          ...t,
          type: editTxType,
          amount: amt,
          note: editTxNote.trim(),
          date: editTxDate,
          time: editTxTime,
          walletId: wId
        };
      }
      return t;
    });

    updateTransactions(updated);
    setIsEditTxModalOpen(false);
    setEditingTxId(null);
    showToast('تم تعديل العملية بنجاح');
  };

  const handleResetLimits = (wid: string) => {
    triggerConfirm('تصفير حدود الاستلام/الإرسال لهذا الشهر؟ سيتم اعتبار أنك بدأت الشهر من جديد.', () => {
      const now = new Date();
      const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const me = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      
      const mTxns = transactions.filter(
        t => t.walletId === wid && t.date >= ms && t.date <= me && !t.archived && !t.isOffset && (t.type === 'receive' || t.type === 'send')
      );
      const tot = calcTotals(mTxns);
      
      const newOffsets: LocalTransaction[] = [];
      const date = today();
      const time = nowTime();

      if (tot.receive > 0) {
        newOffsets.push({
          id: uid(),
          walletId: wid,
          type: 'send',
          amount: tot.receive,
          note: 'تصفير حد الاستلام',
          date,
          time,
          isOffset: true
        });
      }
      if (tot.send > 0) {
        newOffsets.push({
          id: uid(),
          walletId: wid,
          type: 'receive',
          amount: tot.send,
          note: 'تصفير حد الارسال',
          date,
          time,
          isOffset: true
        });
      }

      if (newOffsets.length > 0) {
        updateTransactions([...transactions, ...newOffsets]);
        showToast('تم تصفير الحدود للشهر الحالي');
      } else {
        showToast('لا توجد عمليات لتصفير الحدود لها');
      }
    });
  };

  // ======================== ARCHIVE ACTIONS ========================
  const executeArchive = () => {
    if (!archiveDate) {
      showToast('اختر التاريخ المطلوب', 'error');
      return;
    }
    const toArchive = transactions.filter(t => !t.archived && !t.isOffset && t.date < archiveDate);
    if (toArchive.length === 0) {
      showToast('لا توجد عمليات مؤرشفة قبل هذا التاريخ', 'error');
      return;
    }

    triggerConfirm(`أرشفة عدد ${toArchive.length} عملية تمت قبل تاريخ ${fd(archiveDate)}؟`, () => {
      const updated = transactions.map(t =>
        (!t.archived && !t.isOffset && t.date < archiveDate) ? { ...t, archived: true } : t
      );
      updateTransactions(updated);
      showToast(`تمت أرشفة ${toArchive.length} عملية بنجاح`);
    });
  };

  const executeRestoreArchive = () => {
    const archivedCount = transactions.filter(t => t.archived).length;
    if (archivedCount === 0) {
      showToast('لا توجد عمليات مؤرشفة لاستعادتها', 'error');
      return;
    }
    triggerConfirm(`استعادة عدد ${archivedCount} عملية من الأرشيف؟`, () => {
      const updated = transactions.map(t => t.archived ? { ...t, archived: false } : t);
      updateTransactions(updated);
      showToast('تمت استعادة العمليات من الأرشيف');
    });
  };

  // ======================== DATE RANGE SETTERS ========================
  const handleOpenDaily = () => {
    setDailyDate(today());
    setIsDailyModalOpen(true);
  };

  useEffect(() => {
    if (dailyDate) {
      const d = new Date(dailyDate + 'T12:00:00');
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      setDailyDayName(dayNames[d.getDay()] || '');
    }
  }, [dailyDate]);

  // ======================== FILTER COMPUTATIONS ========================
  // History Transactions for selected wallet
  const historyList = useMemo(() => {
    let list = transactions.filter(t => t.walletId === currentWalletId || t.walletId === null);
    if (!hfArchived) {
      list = list.filter(t => !t.archived && !t.isOffset);
    }
    if (hfType !== 'all') {
      list = list.filter(t => t.type === hfType);
    }
    if (hfFrom) {
      list = list.filter(t => t.date >= hfFrom);
    }
    if (hfTo) {
      list = list.filter(t => t.date <= hfTo);
    }
    if (hfSearch.trim()) {
      const query = hfSearch.trim().toLowerCase();
      list = list.filter(t => t.note.toLowerCase().includes(query));
    }
    
    // Sort chronologically to calculate correct running balances
    list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));

    // Calculate running balance for this wallet
    const activeW = wallets.find(x => x.id === currentWalletId);
    let runningBalMap: Record<string, number> = {};
    if (activeW) {
      const allWalletTxns = transactions
        .filter(t => t.walletId === currentWalletId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
      
      let cumBal = activeW.initialBalance;
      allWalletTxns.forEach(t => {
        if (t.type === 'receive') cumBal += t.amount;
        if (t.type === 'send') cumBal -= t.amount;
        runningBalMap[t.id] = cumBal;
      });
    }

    return {
      items: list.slice().reverse(), // Display newest first in the table
      runningBalMap,
      totals: calcTotals(list)
    };
  }, [transactions, currentWalletId, hfType, hfFrom, hfTo, hfSearch, hfArchived, wallets]);

  // All Transactions list
  const allTxList = useMemo(() => {
    let list = [...transactions];
    if (!afArchived) {
      list = list.filter(t => !t.archived && !t.isOffset);
    }
    if (afWallet === 'CASH') {
      list = list.filter(t => t.walletId === null);
    } else if (afWallet !== 'all') {
      list = list.filter(t => t.walletId === afWallet);
    }
    if (afType !== 'all') {
      list = list.filter(t => t.type === afType);
    }
    if (afFrom) {
      list = list.filter(t => t.date >= afFrom);
    }
    if (afTo) {
      list = list.filter(t => t.date <= afTo);
    }
    if (afSearch.trim()) {
      const query = afSearch.trim().toLowerCase();
      list = list.filter(t => t.note.toLowerCase().includes(query));
    }

    list.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || b.id.localeCompare(a.id));

    return {
      items: list,
      totals: calcTotals(list)
    };
  }, [transactions, afWallet, afType, afFrom, afTo, afSearch, afArchived]);

  // Daily report calculations
  const dailyReport = useMemo(() => {
    if (!dailyDate) return null;
    
    // Wallets details
    const walletsReport = wallets.map(w => {
      let openBal = w.initialBalance;
      let closeBal = w.initialBalance;
      let dayReceive = 0;
      let daySend = 0;

      transactions
        .filter(t => t.walletId === w.id && !t.isOffset)
        .forEach(t => {
          if (t.date < dailyDate) {
            if (t.type === 'receive') openBal += t.amount;
            if (t.type === 'send') openBal -= t.amount;
          }
          if (t.date <= dailyDate) {
            if (t.type === 'receive') closeBal += t.amount;
            if (t.type === 'send') closeBal -= t.amount;
          }
          if (t.date === dailyDate) {
            if (t.type === 'receive') dayReceive += t.amount;
            if (t.type === 'send') daySend += t.amount;
          }
        });

      return {
        id: w.id,
        name: w.name,
        openBal,
        receive: dayReceive,
        send: daySend,
        closeBal
      };
    });

    const totalWalletsOpen = walletsReport.reduce((sum, w) => sum + w.openBal, 0);
    const totalWalletsClose = walletsReport.reduce((sum, w) => sum + w.closeBal, 0);
    const totalDayReceive = walletsReport.reduce((sum, w) => sum + w.receive, 0);
    const totalDaySend = walletsReport.reduce((sum, w) => sum + w.send, 0);

    // Cash details
    let cashOpen = cashInitial;
    let cashClose = cashInitial;
    let cashDeposit = 0;
    let cashWithdraw = 0;

    transactions
      .filter(t => !t.isOffset)
      .forEach(t => {
        const cashEffect = t.type === 'receive' ? -1 : t.type === 'send' ? 1 : t.type === 'cash_deposit' ? 1 : t.type === 'cash_withdraw' ? -1 : 0;
        if (t.date < dailyDate) {
          cashOpen += cashEffect * t.amount;
        }
        if (t.date <= dailyDate) {
          cashClose += cashEffect * t.amount;
        }
        if (t.date === dailyDate) {
          if (t.type === 'cash_deposit') cashDeposit += t.amount;
          if (t.type === 'cash_withdraw') cashWithdraw += t.amount;
        }
      });

    const netDay = totalDayReceive - totalDaySend;
    const netCashOnly = cashDeposit - cashWithdraw;
    const netCashTotal = netCashOnly + totalDaySend - totalDayReceive;

    const expectedCashClose = cashOpen + netCashTotal;
    const isCashMatched = Math.abs(cashClose - expectedCashClose) < 0.01;

    const expectedWalletClose = totalWalletsOpen + netDay;
    const isWalletMatched = Math.abs(totalWalletsClose - expectedWalletClose) < 0.01;

    const dayTxns = transactions.filter(t => t.date === dailyDate && (t.type === 'receive' || t.type === 'send')).sort((a, b) => a.id.localeCompare(b.id));

    return {
      walletsReport,
      totalWalletsOpen,
      totalWalletsClose,
      totalDayReceive,
      totalDaySend,
      cashOpen,
      cashClose,
      cashDeposit,
      cashWithdraw,
      netDay,
      netCashTotal,
      isMatched: isCashMatched && isWalletMatched,
      mismatchDetails: {
        walletDiff: totalWalletsClose - expectedWalletClose,
        cashDiff: cashClose - expectedCashClose,
        isCashMatched,
        isWalletMatched
      },
      dayTxns
    };
  }, [transactions, wallets, dailyDate, cashInitial]);

  // Monthly report calculations
  const monthlyReport = useMemo(() => {
    if (!monthlyMonth) return null;
    const [y, m] = monthlyMonth.split('-');
    const ms = `${y}-${m}-01`;
    const me = `${y}-${m}-31`;

    const monthlyTxns = transactions.filter(t => !t.archived && !t.isOffset && t.date >= ms && t.date <= me);
    const tot = calcTotals(monthlyTxns);
    const net = tot.receive - tot.send;

    const perWalletReport = wallets.map(w => {
      const wTxns = transactions.filter(t => !t.archived && !t.isOffset && t.walletId === w.id && t.date >= ms && t.date <= me);
      const wt = calcTotals(wTxns);
      return {
        name: w.name,
        receive: wt.receive,
        send: wt.send,
        net: wt.receive - wt.send
      };
    });

    const cashOnlyTxns = transactions.filter(t => !t.archived && !t.isOffset && t.walletId === null && t.date >= ms && t.date <= me);
    const ct = calcTotals(cashOnlyTxns);

    return {
      receive: tot.receive,
      send: tot.send,
      cashDeposit: tot.cash_deposit,
      cashWithdraw: tot.cash_withdraw,
      net,
      perWalletReport,
      cashOnly: {
        deposit: ct.cash_deposit,
        withdraw: ct.cash_withdraw,
        net: ct.cash_deposit - ct.cash_withdraw
      }
    };
  }, [transactions, wallets, monthlyMonth]);

  // Print Daily summary trigger
  const handlePrintDaily = () => {
    window.print();
  };

  // ======================== RENDER CONTROLLER ========================
  const visibleWallets = walletsStats.filter(w => !w.hidden);
  const hiddenWallets = walletsStats.filter(w => w.hidden);
  const walletsToDisplay = showHiddenWallets ? walletsStats : visibleWallets;

  // CSS print styles to inject
  const printStyles = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      #printArea, #printArea * {
        visibility: visible !important;
      }
      #printArea {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        background: white !important;
        color: black !important;
        direction: rtl !important;
        padding: 20px !important;
        box-shadow: none !important;
        margin: 0 !important;
      }
      #printArea table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 15px !important;
      }
      #printArea th, #printArea td {
        border: 1px solid #000 !important;
        padding: 8px 12px !important;
        text-align: center !important;
      }
    }
  `;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full font-sans antialiased" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* ======================== HEADER ======================== */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-5 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="bg-white/20 p-3 rounded-xl backdrop-blur-sm text-2xl">📱</span>
          <div>
            <h1 className="text-xl md:text-2xl font-black">محفظتي <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full mr-2">نظام المحافظ والعهدة المالي</span></h1>
            <p className="text-xs text-red-100 mt-1">تتبع المحافظ الإلكترونية، الأرصدة النقدية، التسويات اليومية والتقارير الشهرية</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm text-center min-w-[110px]">
            <div className="text-[10px] text-red-200">💰 إجمالي المحافظ</div>
            <div className="text-base font-black mt-0.5">{fm(totalAllWallets)} ج.م</div>
          </div>

          <div
            onClick={() => {
              setCInitBal(cashInitial.toString());
              setIsCashModalOpen(true);
            }}
            className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl backdrop-blur-sm text-center min-w-[110px] cursor-pointer hover:bg-white/20 transition-all"
            title="اضغط لتعديل رصيد العهدة الافتتاحي"
          >
            <div className="text-[10px] text-red-200 flex items-center justify-center gap-1">💵 العهدة بالدرج</div>
            <div className="text-base font-black mt-0.5">{fm(calcCash())} ج.م</div>
          </div>

        </div>
      </header>

      {/* ======================== WALLETS BAR ======================== */}
      <section className="flex flex-wrap items-center gap-2 mb-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
        {walletsToDisplay.map(w => {
          const isActive = w.id === currentWalletId;
          return (
            <button
              key={w.id}
              onClick={() => updateCurrentWalletId(w.id)}
              onContextMenu={e => {
                e.preventDefault();
                handleOpenWalletModal(w.id);
              }}
              className={`wallet-btn px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border ${
                isActive
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-500 shadow-md shadow-red-500/10'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500'
              } ${w.hidden ? 'opacity-65' : ''}`}
            >
              {w.hidden && <span>🔒</span>}
              {w.overLimit && <span className="text-red-500 animate-pulse">🔴</span>}
              {!w.overLimit && w.nearLimit && <span className="text-orange-500">🟡</span>}
              <span>{w.name}</span>
              <span className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-xs font-black">
                {fm(w.balance)}
              </span>
            </button>
          );
        })}

        {hiddenWallets.length > 0 && (
          <button
            onClick={() => updateShowHiddenWallets(!showHiddenWallets)}
            className="px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-red-500 hover:text-red-500 transition-all font-bold text-sm"
          >
            {showHiddenWallets ? '🔓 إخفاء المخفية' : `🔒 عرض ${hiddenWallets.length} مخفية`}
          </button>
        )}

        <button
          onClick={() => handleOpenWalletModal(null)}
          className="mr-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all flex items-center gap-1 shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>محفظة جديدة</span>
        </button>
      </section>

      {/* ======================== CONTENT AREA ======================== */}
      <main id="walletContent">
        {activeWallet && activeWalletStats ? (
          <div className="space-y-4">
            {/* Wallet Quick Stats Card */}
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl text-red-600 text-xl">💼</span>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{activeWallet.name}</span>
                      {activeWallet.phone && (
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                          {activeWallet.phone}
                        </span>
                      )}
                    </h2>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">الرصيد الكلي الجاري: <strong className="text-red-600 font-bold">{fm(activeWalletStats.balance)} ج.م</strong></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleOpenWalletModal(activeWallet.id)}
                    className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-gray-200/50 dark:border-slate-600"
                    title="تعديل المحفظة"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWallet(activeWallet.id)}
                    className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-gray-200/50 dark:border-slate-600"
                    title="حذف المحفظة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid 4 columns summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-blue-600 font-bold mb-1">💰 إجمالي الاستلام</div>
                  <div className="text-lg font-black text-blue-700 dark:text-blue-400">{fm(activeWalletStats.totalReceive)}</div>
                </div>

                <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-red-600 font-bold mb-1">💸 إجمالي الارسال</div>
                  <div className="text-lg font-black text-red-700 dark:text-red-400">{fm(activeWalletStats.totalSend)}</div>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-emerald-600 font-bold mb-1">💵 الرصيد الحالي</div>
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">{fm(activeWalletStats.balance)}</div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200/50 dark:border-slate-700 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-gray-500 font-bold mb-1">📋 عدد العمليات</div>
                  <div className="text-lg font-black text-gray-700 dark:text-gray-300">{activeWalletStats.count}</div>
                </div>
              </div>

              {/* Limits and monthly progress */}
              {(activeWalletStats.limitReceive > 0 || activeWalletStats.limitSend > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="font-bold">📏 حدود شهر {activeWalletStats.monthName}</span>
                    <span className="flex items-center gap-3">
                      {(activeWalletStats.pctReceive >= 85 || activeWalletStats.pctSend >= 85) && (
                        <span className="text-red-500 font-semibold animate-pulse">⚠️ شارفت الحدود على الانتهاء</span>
                      )}
                      <button
                        onClick={() => handleResetLimits(activeWallet.id)}
                        className="text-red-600 hover:text-red-700 hover:underline font-bold flex items-center gap-0.5 text-[10px]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        تصفير الحدود
                      </button>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeWalletStats.limitReceive > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-600 dark:text-gray-400">الاستلام المتبقي</span>
                          <span className="font-black text-gray-800 dark:text-gray-200">
                            {fm(activeWalletStats.monthReceive)} / {fm(activeWalletStats.limitReceive)} ج.م
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${activeWalletStats.limitColor(activeWalletStats.pctReceive)}`}
                            style={{ width: `${activeWalletStats.pctReceive}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {activeWalletStats.limitSend > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-600 dark:text-gray-400">الإرسال المتبقي</span>
                          <span className="font-black text-gray-800 dark:text-gray-200">
                            {fm(activeWalletStats.monthSend)} / {fm(activeWalletStats.limitSend)} ج.م
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${activeWalletStats.limitColor(activeWalletStats.pctSend)}`}
                            style={{ width: `${activeWalletStats.pctSend}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly cash only stats */}
              {(activeWalletStats.cashTot.cash_deposit > 0 || activeWalletStats.cashTot.cash_withdraw > 0) && (
                <div className="mt-3 text-[10px] text-gray-400 font-semibold">
                  💵 العهدة هذا الشهر: +{fm(activeWalletStats.cashTot.cash_deposit)} إيداع | -{fm(activeWalletStats.cashTot.cash_withdraw)} سحب عهدة
                </div>
              )}
            </div>

            {/* Quick Actions Buttons */}
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm transition-colors">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                <button
                  onClick={() => {
                    setTxType('receive');
                    setTxAmount('');
                    setTxNote('');
                    setIsAddTxModalOpen(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-bold whitespace-nowrap">إضافة عملية</span>
                </button>

                <button
                  onClick={() => {
                    setCashOpAmount('');
                    setCashOpNote('');
                    setIsCashOpModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-md hover:shadow-lg transition-all"
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-xs font-bold whitespace-nowrap">عهدة الدرج</span>
                </button>

                <button
                  onClick={() => {
                    setTransferFromId(currentWalletId || '');
                    setTransferToId('');
                    setTransferAmount('');
                    setTransferNote('');
                    setIsTransferModalOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-md hover:shadow-lg transition-all"
                >
                  <ArrowRightLeft className="w-6 h-6" />
                  <span className="text-xs font-bold whitespace-nowrap">ترحيل أرصدة</span>
                </button>

                <button
                  onClick={handleOpenDaily}
                  className="bg-violet-600 hover:bg-violet-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-md hover:shadow-lg transition-all"
                >
                  <Calendar className="w-6 h-6" />
                  <span className="text-xs font-bold whitespace-nowrap">تقفيل يومي</span>
                </button>

                <button
                  onClick={() => {
                    setHfType('all');
                    setHfFrom('');
                    setHfTo('');
                    setHfSearch('');
                    setHfArchived(false);
                    setIsHistoryModalOpen(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-md hover:shadow-lg transition-all"
                >
                  <HistoryIcon className="w-6 h-6" />
                  <span className="text-xs font-bold whitespace-nowrap">سجل العمليات</span>
                </button>

                <button
                  onClick={() => {
                    setAfWallet(currentWalletId || 'all');
                    setAfType('all');
                    setAfFrom('');
                    setAfTo('');
                    setAfSearch('');
                    setAfArchived(false);
                    setIsAllModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-md hover:shadow-lg transition-all"
                >
                  <BarChart2 className="w-6 h-6" />
                  <span className="text-xs font-bold whitespace-nowrap">كل المحافظ</span>
                </button>

                <button
                  onClick={() => {
                    setMonthlyMonth('');
                    setIsMonthlyModalOpen(true);
                  }}
                  className="bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center shadow-md hover:shadow-lg transition-all"
                >
                  <FileText className="w-6 h-6" />
                  <span className="text-xs font-bold whitespace-nowrap">تقرير شهري</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-12 text-center text-gray-400 font-bold transition-colors shadow-sm">
            ❌ لا توجد محافظ مضافة حالياً. الرجاء الضغط على زر "محفظة جديدة" بالأعلى للبدء.
          </div>
        )}
      </main>

      {/* ======================== MODALS DEFINITIONS ======================== */}

      {/* 1. Wallet Add/Edit Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" />
                <span>{editingWalletId ? 'تعديل بيانات المحفظة' : 'إضافة محفظة جديدة'}</span>
              </h3>
              <button onClick={() => setIsWalletModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">اسم المحفظة *</label>
                <input
                  type="text"
                  maxLength={30}
                  value={wName}
                  onChange={e => setWName(e.target.value)}
                  placeholder="مثال: محفظة اتصالات"
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 dark:focus:border-red-500 rounded-xl px-4 outline-none font-semibold transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={wPhone}
                  onChange={e => setWPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 dark:focus:border-red-500 rounded-xl px-4 outline-none font-semibold transition-all text-sm"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">الرصيد الافتتاحي للمحفظة</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={wInitialBal}
                  onChange={e => setWInitialBal(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 dark:focus:border-red-500 rounded-xl px-4 outline-none font-semibold transition-all text-sm"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2 py-1.5">
                <input
                  type="checkbox"
                  id="wHidden"
                  checked={wHidden}
                  onChange={e => setWHidden(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 border-gray-300 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="wHidden" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  🔒 إخفاء المحفظة (تظهر فقط عند تفعيل خيار عرض المخفية)
                </label>
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
                <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <span>📏 الحدود الشهرية (اختياري)</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">حد الاستلام الشهري</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={wLimitReceive}
                      onChange={e => setWLimitReceive(e.target.value)}
                      placeholder="مثال: 300,000"
                      className="w-full h-10 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 dark:focus:border-red-500 rounded-lg px-3 outline-none font-semibold text-xs"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">حد الإرسال الشهري</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={wLimitSend}
                      onChange={e => setWLimitSend(e.target.value)}
                      placeholder="مثال: 200,000"
                      className="w-full h-10 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 dark:focus:border-red-500 rounded-lg px-3 outline-none font-semibold text-xs"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end gap-2">
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveWallet}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all"
              >
                💾 حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cash settings modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-600" />
                <span>إعدادات العهدة (النقدية بالدرج)</span>
              </h3>
              <button onClick={() => setIsCashModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">الرصيد الافتتاحي للعهدة المتاحة</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cInitBal}
                  onChange={e => setCInitBal(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-4 outline-none font-semibold text-sm"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                * العهدة النقدية هي الكاش المتوفر لديك بالدرج. تتأثر هذه القيمة بالزيادة والنقصان تلقائياً فور تسجيل أي عمليات سحب أو إيداع أو إرسال واستلام.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end gap-2">
              <button
                onClick={() => setIsCashModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveCashSettings}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                💾 حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Transaction Modal */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" />
                <span>إضافة حركة جديدة للمحفظة</span>
              </h3>
              <button onClick={() => setIsAddTxModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">نوع العملية المنجزة</label>
                <select
                  value={txType}
                  onChange={e => setTxType(e.target.value as 'receive' | 'send')}
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 rounded-xl px-3 outline-none font-semibold text-sm cursor-pointer"
                >
                  <option value="receive">💰 استلام ← المحفظة تزيد والدرج ينقص</option>
                  <option value="send">💸 ارسال ← المحفظة تنقص والدرج يزيد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">قيمة المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="المبلغ ج.م"
                  className="w-full h-12 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 rounded-xl px-4 outline-none font-black text-lg text-center tracking-wide"
                  dir="ltr"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">البيان / الملاحظات (اختياري)</label>
                <input
                  type="text"
                  maxLength={50}
                  value={txNote}
                  onChange={e => setTxNote(e.target.value)}
                  placeholder="اسم الشخص، سبب العملية..."
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-red-500 rounded-xl px-4 outline-none font-semibold text-sm"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end gap-2">
              <button
                onClick={() => setIsAddTxModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddTx}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                ➕ تسجيل المعاملة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Cash operations modal */}
      {isCashOpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-600" />
                <span>عمليات العهدة (النقدية بالدرج)</span>
              </h3>
              <button onClick={() => setIsCashOpModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                * هنا تسجل الحركات النقدية التي تتم على درج المحل مباشرة (ولا تؤثر على أرصدة المحافظ الإلكترونية أبداً).
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={cashOpAmount}
                  onChange={e => setCashOpAmount(e.target.value)}
                  placeholder="المبلغ ج.م"
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-4 outline-none font-black text-lg text-center"
                  dir="ltr"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">البيان (اختياري)</label>
                <input
                  type="text"
                  maxLength={50}
                  value={cashOpNote}
                  onChange={e => setCashOpNote(e.target.value)}
                  placeholder="مثال: فكة، سحب أرباح..."
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-4 outline-none font-semibold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleCashOp('cash_deposit')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1 text-xs shadow-md transition-all"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>💵 إيداع في العهدة</span>
                </button>
                <button
                  onClick={() => handleCashOp('cash_withdraw')}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1 text-xs shadow-md transition-all"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>🏧 سحب من العهدة</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end">
              <button
                onClick={() => setIsCashOpModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Transfer money modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                <span>ترحيل رصيد بين المحافظ</span>
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                * يتم هنا تحويل أرصدة مباشرة من محفظة إلكترونية إلى محفظة أخرى. لن تتأثر قيمة العهدة النقدية في الدرج بهذه العملية.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">من المحفظة</label>
                <select
                  value={transferFromId}
                  onChange={e => setTransferFromId(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-amber-500 rounded-xl px-3 outline-none font-semibold text-sm cursor-pointer"
                >
                  <option value="">-- اختر المحفظة --</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">إلى المحفظة</label>
                <select
                  value={transferToId}
                  onChange={e => setTransferToId(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-amber-500 rounded-xl px-3 outline-none font-semibold text-sm cursor-pointer"
                >
                  <option value="">-- اختر المحفظة --</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">المبلغ المراد ترحيله *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="المبلغ ج.م"
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-amber-500 rounded-xl px-4 outline-none font-black text-lg text-center"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">البيان (اختياري)</label>
                <input
                  type="text"
                  maxLength={50}
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  placeholder="ملاحظات التحويل..."
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-amber-500 rounded-xl px-4 outline-none font-semibold text-sm"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end gap-2">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleTransfer}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                🔄 إتمام الترحيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Active Wallet History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-teal-600" />
                <span>سجل العمليات للمحفظة النشطة</span>
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-850">
                <select
                  value={hfType}
                  onChange={e => setHfType(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-semibold"
                >
                  <option value="all">🔍 الكل</option>
                  <option value="receive">💰 استلام</option>
                  <option value="send">💸 ارسال</option>
                  <option value="cash_deposit">💵 إيداع عهدة</option>
                  <option value="cash_withdraw">🏧 سحب عهدة</option>
                </select>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 font-bold">من</span>
                  <input
                    type="date"
                    value={hfFrom}
                    onChange={e => setHfFrom(e.target.value)}
                    className="px-2 py-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 font-bold">إلى</span>
                  <input
                    type="date"
                    value={hfTo}
                    onChange={e => setHfTo(e.target.value)}
                    className="px-2 py-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg"
                  />
                </div>

                <input
                  type="text"
                  placeholder="🔍 بحث في البيان..."
                  value={hfSearch}
                  onChange={e => setHfSearch(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-semibold mr-auto w-44"
                />

                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hfArchived}
                    onChange={e => setHfArchived(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-teal-600 border-gray-300"
                  />
                  <span>📦 الأرشيف</span>
                </label>

                <button
                  onClick={() => {
                    setHfType('all');
                    setHfFrom('');
                    setHfTo('');
                    setHfSearch('');
                    setHfArchived(false);
                  }}
                  className="p-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-600 dark:text-gray-300 rounded-lg text-xs"
                  title="تصفية التصفية"
                >
                  ✕
                </button>

                <button
                  onClick={() => {
                    const activeW = wallets.find(w => w.id === currentWalletId);
                    if (!activeW) return;
                    const cnt = transactions.filter(t => t.walletId === activeW.id || t.walletId === null).length;
                    if (cnt === 0) {
                      showToast('لا توجد عمليات لحذفها', 'error');
                      return;
                    }
                    triggerConfirm(`مسح جميع المعاملات (${cnt} عملية) للمحفظة والعهدة نهائياً؟`, () => {
                      const list = transactions.filter(t => t.walletId !== activeW.id && t.walletId !== null);
                      updateTransactions(list);
                      showToast('تم تصفير وسجل العمليات بنجاح');
                    });
                  }}
                  className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-950/20 hover:bg-red-100 rounded-lg font-bold text-xs"
                >
                  🗑️ مسح الكل
                </button>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-xl">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-500">
                      <th className="p-3 font-black">نوع العملية</th>
                      <th className="p-3 font-black">المبلغ</th>
                      <th className="p-3 font-black">التأثير</th>
                      <th className="p-3 font-black">التاريخ والوقت</th>
                      <th className="p-3 font-black">البيان / الملاحظات</th>
                      <th className="p-3 font-black">الرصيد الجاري</th>
                      <th className="p-3 font-black text-left">خيارات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {historyList.items.length > 0 ? (
                      historyList.items.map(t => {
                        let tagColor = 'bg-gray-100 text-gray-600';
                        let label = t.type;
                        let effectHtml = '';

                        if (t.type === 'receive') {
                          tagColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20';
                          label = '💰 استلام';
                          effectHtml = `💳 +${fm(t.amount)} | 💵 -${fm(t.amount)}`;
                        } else if (t.type === 'send') {
                          tagColor = 'bg-red-50 text-red-700 dark:bg-red-950/20';
                          label = '💸 ارسال';
                          effectHtml = `💳 -${fm(t.amount)} | 💵 +${fm(t.amount)}`;
                        } else if (t.type === 'cash_deposit') {
                          tagColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20';
                          label = '💵 إيداع عهدة';
                          effectHtml = `💵 +${fm(t.amount)}`;
                        } else if (t.type === 'cash_withdraw') {
                          tagColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/20';
                          label = '🏧 سحب عهدة';
                          effectHtml = `💵 -${fm(t.amount)}`;
                        }

                        const rb = historyList.runningBalMap[t.id];

                        return (
                          <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/10">
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${tagColor}`}>
                                {label}
                              </span>
                            </td>
                            <td className="p-3 font-black text-sm">{fm(t.amount)}</td>
                            <td className="p-3 font-bold text-gray-500 dark:text-gray-400">{effectHtml}</td>
                            <td className="p-3">{fdt(t.date, t.time)}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400 font-medium max-w-[200px] truncate" title={t.note}>
                              {t.note || '-'}
                            </td>
                            <td className="p-3 font-black text-sm">{rb !== undefined ? `${fm(rb)} ج.م` : '-'}</td>
                            <td className="p-3 text-left">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditTx(t)}
                                  className="p-1 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
                                  title="تعديل"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTx(t.id)}
                                  className="p-1 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded transition-colors"
                                  title="حذف"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400 font-bold text-sm">
                          لا توجد عمليات مسجلة متطابقة مع شروط البحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table stats footer */}
              <div className="flex justify-between items-center text-xs text-gray-450 dark:text-gray-400 pt-2 font-bold">
                <div>العدد المصفى: {historyList.totals.count} عملية</div>
                <div className="flex gap-4">
                  <span className="text-blue-600">استلام: {fm(historyList.totals.receive)}</span>
                  <span className="text-red-600">ارسال: {fm(historyList.totals.send)}</span>
                  <span className="text-emerald-600">إيداع عهدة: {fm(historyList.totals.cash_deposit)}</span>
                  <span className="text-amber-600">سحب عهدة: {fm(historyList.totals.cash_withdraw)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. All Transactions Modal */}
      {isAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-600" />
                <span>شاشة عمليات النظام لكافة المحافظ والعهدة</span>
              </h3>
              <button onClick={() => setIsAllModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-850">
                <select
                  value={afWallet}
                  onChange={e => setAfWallet(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <option value="all">كل المحافظ</option>
                  <option value="CASH">💵 العهدة فقط</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <select
                  value={afType}
                  onChange={e => setAfType(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="receive">💰 استلام</option>
                  <option value="send">💸 ارسال</option>
                  <option value="cash_deposit">💵 إيداع عهدة</option>
                  <option value="cash_withdraw">🏧 سحب عهدة</option>
                </select>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 font-bold">من</span>
                  <input
                    type="date"
                    value={afFrom}
                    onChange={e => setAfFrom(e.target.value)}
                    className="px-2 py-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 font-bold">إلى</span>
                  <input
                    type="date"
                    value={afTo}
                    onChange={e => setAfTo(e.target.value)}
                    className="px-2 py-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg"
                  />
                </div>

                <input
                  type="text"
                  placeholder="🔍 بحث في الملاحظات..."
                  value={afSearch}
                  onChange={e => setAfSearch(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-semibold mr-auto w-44"
                />

                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={afArchived}
                    onChange={e => setAfArchived(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 border-gray-300 animate-pulse"
                  />
                  <span>📦 الأرشيف</span>
                </label>

                <button
                  onClick={() => {
                    setAfWallet('all');
                    setAfType('all');
                    setAfFrom('');
                    setAfTo('');
                    setAfSearch('');
                    setAfArchived(false);
                  }}
                  className="p-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-600 dark:text-gray-300 rounded-lg text-xs animate-[fadeIn_0.2s]"
                  title="تصفية التصفية"
                >
                  ✕
                </button>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-xl">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-500">
                      <th className="p-3 font-black">المحفظة / الحساب</th>
                      <th className="p-3 font-black">نوع العملية</th>
                      <th className="p-3 font-black">المبلغ</th>
                      <th className="p-3 font-black">التاريخ والوقت</th>
                      <th className="p-3 font-black">البيان / الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {allTxList.items.length > 0 ? (
                      allTxList.items.map(t => {
                        let tagColor = 'bg-gray-100 text-gray-600';
                        let label = t.type;
                        
                        if (t.type === 'receive') {
                          tagColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20';
                          label = '💰 استلام';
                        } else if (t.type === 'send') {
                          tagColor = 'bg-red-50 text-red-700 dark:bg-red-950/20';
                          label = '💸 ارسال';
                        } else if (t.type === 'cash_deposit') {
                          tagColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20';
                          label = '💵 إيداع عهدة';
                        } else if (t.type === 'cash_withdraw') {
                          tagColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/20';
                          label = '🏧 سحب عهدة';
                        }

                        const wName = t.walletId === null ? '💵 العهدة بالدرج' : wallets.find(x => x.id === t.walletId)?.name || '---';

                        return (
                          <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/10">
                            <td className="p-3 font-black text-gray-900 dark:text-gray-100">{wName}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${tagColor}`}>
                                {label}
                              </span>
                            </td>
                            <td className="p-3 font-black text-sm">{fm(t.amount)} ج.م</td>
                            <td className="p-3">{fdt(t.date, t.time)}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400 font-medium">{t.note || '-'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 font-bold text-sm">
                          لا توجد عمليات متطابقة مع شروط البحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table stats footer */}
              <div className="flex justify-between items-center text-xs text-gray-450 dark:text-gray-400 pt-2 font-bold">
                <div>العدد الكلي: {allTxList.totals.count} عملية</div>
                <div className="flex gap-4">
                  <span className="text-blue-600">إجمالي استلام: {fm(allTxList.totals.receive)}</span>
                  <span className="text-red-600">إجمالي ارسال: {fm(allTxList.totals.send)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end">
              <button
                onClick={() => setIsAllModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Daily Settlement (تقفيل يومي) Modal */}
      {isDailyModalOpen && dailyReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-600" />
                <span>التقفيل اليومي ومطابقة الخزينة</span>
              </h3>
              <button onClick={() => setIsDailyModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-500">اختر تاريخ اليوم:</span>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={e => setDailyDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-bold"
                />
                <span className="text-sm font-black text-violet-600 mr-2">{dailyDayName}</span>
              </div>

              {/* Printable Area Wrapper */}
              <div id="printArea" className="space-y-4">
                {/* Print Title (Visible only when printing) */}
                <div className="hidden print:block text-center mb-6">
                  <h2 className="text-2xl font-black mb-2">📆 تقرير التقفيل اليومي</h2>
                  <p className="text-sm text-gray-500">التاريخ: {fd(dailyDate)} - يوم {dailyDayName}</p>
                  <p className="text-xs text-gray-400 mt-1">تمت الطباعة في: {today()} {nowTime()}</p>
                </div>

                {/* Wallets Table */}
                <div>
                  <h4 className="text-xs font-black text-gray-500 mb-2">💰 حسابات المحافظ الإلكترونية</h4>
                  <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-500">
                          <th className="p-2.5 font-bold">اسم المحفظة</th>
                          <th className="p-2.5 font-bold text-center">بداية اليوم</th>
                          <th className="p-2.5 font-bold text-center text-emerald-600">💰 استلام</th>
                          <th className="p-2.5 font-bold text-center text-red-600">💸 ارسال</th>
                          <th className="p-2.5 font-bold text-center">نهاية اليوم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReport.walletsReport.map(w => (
                          <tr key={w.id} className="border-b border-gray-100 dark:border-slate-700/50">
                            <td className="p-2.5 font-bold">{w.name}</td>
                            <td className="p-2.5 text-center font-semibold">{fm(w.openBal)}</td>
                            <td className="p-2.5 text-center font-semibold text-emerald-600">+{fm(w.receive)}</td>
                            <td className="p-2.5 text-center font-semibold text-red-600">-{fm(w.send)}</td>
                            <td className="p-2.5 text-center font-bold text-gray-900 dark:text-gray-100">{fm(w.closeBal)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 dark:bg-slate-900 font-bold border-t-2 border-gray-200 dark:border-slate-700">
                          <td className="p-2.5">🔢 إجمالي الأرصدة</td>
                          <td className="p-2.5 text-center">{fm(dailyReport.totalWalletsOpen)}</td>
                          <td className="p-2.5 text-center text-emerald-600">+{fm(dailyReport.totalDayReceive)}</td>
                          <td className="p-2.5 text-center text-red-600">-{fm(dailyReport.totalDaySend)}</td>
                          <td className="p-2.5 text-center text-red-600">{fm(dailyReport.totalWalletsClose)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cash Drawer summary details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800">
                    <h4 className="text-xs font-black text-gray-500 mb-2">💵 تفاصيل حركة العهدة (النقدية بالدرج)</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>رصيد العهدة بداية اليوم:</span>
                        <span className="font-bold">{fm(dailyReport.cashOpen)} ج.م</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>إجمالي إيداعات العهدة:</span>
                        <span className="font-bold">+{fm(dailyReport.cashDeposit)} ج.م</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>إجمالي سحوبات العهدة:</span>
                        <span className="font-bold">-{fm(dailyReport.cashWithdraw)} ج.م</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 border-gray-100 font-bold text-sm">
                        <span>رصيد العهدة نهاية اليوم:</span>
                        <span>{fm(dailyReport.cashClose)} ج.م</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-gray-500 mb-2">📊 صافي حركة الحسابات لليوم</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span>صافي اليوم (كل المحافظ):</span>
                          <span className={`font-bold ${dailyReport.netDay >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fm(dailyReport.netDay)} ج.م {dailyReport.netDay >= 0 ? '🔼' : '🔽'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>صافي درج العهدة:</span>
                          <span className={`font-bold ${dailyReport.netCashTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fm(dailyReport.netCashTotal)} ج.م {dailyReport.netCashTotal >= 0 ? '🔼' : '🔽'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-xs font-bold">الحالة ومطابقة العهدة:</span>
                      <span className={`text-sm font-black px-3 py-1 rounded-lg ${
                        dailyReport.isMatched 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                          : 'bg-red-50 dark:bg-red-950/20 text-red-600'
                      }`}>
                        {dailyReport.isMatched ? '✅ متطابق' : '⚠️ غير متطابق'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* If mismatch, display detailed warnings */}
                {!dailyReport.isMatched && (
                  <div className="bg-red-50 dark:bg-red-950/15 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 dark:text-red-400 space-y-1 font-semibold">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>تنبيه: يوجد فروقات في الحسابات لهذا اليوم</span>
                    </div>
                    {!dailyReport.mismatchDetails.isWalletMatched && (
                      <div>• فرق المحافظ: الأرصدة الحالية {dailyReport.mismatchDetails.walletDiff > 0 ? 'تزيد' : 'تنقص'} بمقدار {fm(Math.abs(dailyReport.mismatchDetails.walletDiff))} ج.م عن المتوقع.</div>
                    )}
                    {!dailyReport.mismatchDetails.isCashMatched && (
                      <div>• فرق العهدة: كاش الدرج {dailyReport.mismatchDetails.cashDiff > 0 ? 'يزيد' : 'ينقص'} بمقدار {fm(Math.abs(dailyReport.mismatchDetails.cashDiff))} ج.م عن المتوقع.</div>
                    )}
                  </div>
                )}

                {/* Detail of today's operations */}
                {dailyReport.dayTxns.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-black text-gray-500 mb-2">📋 تفاصيل عمليات الاستلام والارسال لليوم</h4>
                    <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-500">
                            <th className="p-2 font-bold">المحفظة</th>
                            <th className="p-2 font-bold text-center">نوع العملية</th>
                            <th className="p-2 font-bold text-center">المبلغ</th>
                            <th className="p-2 font-bold">البيان</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyReport.dayTxns.map(t => (
                            <tr key={t.id} className="border-b border-gray-100 dark:border-slate-700/50">
                              <td className="p-2 font-semibold">
                                {t.walletId === null ? '💵 العهدة' : wallets.find(x => x.id === t.walletId)?.name || ''}
                              </td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                  t.type === 'receive' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {t.type === 'receive' ? 'استلام' : 'ارسال'}
                                </span>
                              </td>
                              <td className="p-2 text-center font-black">{fm(t.amount)} ج.م</td>
                              <td className="p-2 text-gray-500 font-medium max-w-[200px] truncate" title={t.note}>{t.note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <button
                onClick={handlePrintDaily}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير اليومي</span>
              </button>

              <button
                onClick={() => setIsDailyModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Monthly Report Modal */}
      {isMonthlyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-pink-600" />
                <span>التقرير والتحليل الشهري</span>
              </h3>
              <button onClick={() => setIsMonthlyModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-500">حدد الشهر المعني:</span>
                <input
                  type="month"
                  value={monthlyMonth}
                  onChange={e => setMonthlyMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-bold"
                />
              </div>

              {monthlyReport ? (
                <div id="printArea" className="space-y-4">
                  {/* Print Title (Visible only when printing) */}
                  <div className="hidden print:block text-center mb-6">
                    <h2 className="text-2xl font-black mb-2">📊 تقرير التحليل المالي الشهري</h2>
                    <p className="text-sm text-gray-500">الشهر: {monthlyMonth}</p>
                    <p className="text-xs text-gray-400 mt-1">تمت الطباعة في: {today()} {nowTime()}</p>
                  </div>

                  {/* Summary Month stats */}
                  <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200/50 p-4 rounded-xl text-xs space-y-3">
                    <h4 className="font-black text-sm text-gray-800 dark:text-gray-200 mb-1 border-b pb-1.5 border-gray-200/60">📊 أرقام الملخص للشهر</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>💰 استلام المحافظ الكلي: <strong className="text-emerald-600 font-bold">{fm(monthlyReport.receive)} ج.م</strong></div>
                      <div>💸 ارسال المحافظ الكلي: <strong className="text-red-600 font-bold">{fm(monthlyReport.send)} ج.م</strong></div>
                      <div>💵 إجمالي إيداعات العهدة: <strong className="text-emerald-600 font-semibold">+{fm(monthlyReport.cashDeposit)}</strong></div>
                      <div>🏧 إجمالي سحوبات العهدة: <strong className="text-red-600 font-semibold">-{fm(monthlyReport.cashWithdraw)}</strong></div>
                    </div>
                    <div className="border-t pt-2 border-gray-200 font-bold text-sm">
                      📊 صافي الشهر (المحافظ فقط): <span className={monthlyReport.net >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fm(monthlyReport.net)} ج.م {monthlyReport.net >= 0 ? '🔼' : '🔽'}</span>
                    </div>
                  </div>

                  {/* Breakdown table */}
                  <div>
                    <h4 className="text-xs font-black text-gray-500 mb-2">💼 تفصيلي حركة المحافظ</h4>
                    <div className="overflow-x-auto border border-gray-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-gray-500">
                            <th className="p-2.5 font-bold">اسم المحفظة</th>
                            <th className="p-2.5 font-bold text-center text-emerald-600">استلام</th>
                            <th className="p-2.5 font-bold text-center text-red-600">ارسال</th>
                            <th className="p-2.5 font-bold text-center">صافي الحركة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyReport.perWalletReport.map((w, i) => (
                            <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50">
                              <td className="p-2.5 font-bold">{w.name}</td>
                              <td className="p-2.5 text-center text-emerald-600">+{fm(w.receive)}</td>
                              <td className="p-2.5 text-center text-red-600">-{fm(w.send)}</td>
                              <td className={`p-2.5 text-center font-black ${w.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {fm(w.net)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50/50 dark:bg-slate-900/50 font-bold border-t border-gray-250">
                            <td className="p-2.5">💵 العهدة بالخزينة فقط</td>
                            <td className="p-2.5 text-center text-emerald-600">+{fm(monthlyReport.cashOnly.deposit)}</td>
                            <td className="p-2.5 text-center text-red-600">-{fm(monthlyReport.cashOnly.withdraw)}</td>
                            <td className={`p-2.5 text-center ${monthlyReport.cashOnly.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {fm(monthlyReport.cashOnly.net)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 font-bold text-sm">
                  الرجاء اختيار الشهر من الأعلى لعرض بيانات التقرير
                </div>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-between items-center">
              {monthlyReport ? (
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة التقرير الشهري</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setIsMonthlyModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Archive transactions Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Archive className="w-5 h-5 text-violet-600" />
                <span>أرشفة العمليات القديمة</span>
              </h3>
              <button onClick={() => setIsArchiveModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                * أرشفة الحركات تساعد على تسريع التطبيق وتنظيم الجداول. سيتم إخفاء العمليات المؤرشفة من جداول وسجل الحركات العادية، ولكن سيتم الاحتفاظ بتأثيرها في الرصيد الكلي. يمكنك استعادتها بأي وقت.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">أرشفة الحركات التي تمت قبل تاريخ:</label>
                <input
                  type="date"
                  value={archiveDate}
                  onChange={e => setArchiveDate(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-violet-500 rounded-xl px-4 outline-none font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={executeArchive}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md transition-all"
                >
                  <Archive className="w-4 h-4" />
                  <span>📦 أرشفة الحركات</span>
                </button>
                
                <button
                  onClick={executeRestoreArchive}
                  className="bg-gray-100 dark:bg-slate-750 text-gray-700 dark:text-gray-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs border border-gray-200 dark:border-slate-650 hover:bg-gray-200 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>♻️ استعادة الكل</span>
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 border rounded-xl p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">
                {transactions.filter(t => t.archived).length > 0
                  ? `📦 إجمالي العمليات المؤرشفة حالياً: ${transactions.filter(t => t.archived).length} عملية من أصل ${transactions.length}`
                  : `📦 لا توجد عمليات مؤرشفة حالياً (إجمالي المعاملات المتاحة: ${transactions.length})`
                }
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end">
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Edit Single Transaction Modal */}
      {isEditTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <span>تعديل تفاصيل العملية</span>
              </h3>
              <button onClick={() => { setIsEditTxModalOpen(false); setEditingTxId(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">نوع العملية</label>
                <select
                  value={editTxType}
                  onChange={e => setEditTxType(e.target.value as any)}
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-3 outline-none font-semibold text-sm cursor-pointer"
                >
                  <option value="receive">💰 استلام ← محفظة + عهدة -</option>
                  <option value="send">💸 ارسال ← محفظة - عهدة +</option>
                  <option value="cash_deposit">💵 إيداع عهدة</option>
                  <option value="cash_withdraw">🏧 سحب عهدة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">المبلغ *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editTxAmount}
                  onChange={e => setEditTxAmount(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-4 outline-none font-black text-sm text-center"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">البيان / الملاحظات</label>
                <input
                  type="text"
                  maxLength={50}
                  value={editTxNote}
                  onChange={e => setEditTxNote(e.target.value)}
                  className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-4 outline-none font-semibold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">التاريخ *</label>
                  <input
                    type="date"
                    value={editTxDate}
                    onChange={e => setEditTxDate(e.target.value)}
                    className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-3 outline-none font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">الوقت</label>
                  <input
                    type="text"
                    value={editTxTime}
                    onChange={e => setEditTxTime(e.target.value)}
                    className="w-full h-11 border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-900 focus:border-blue-500 rounded-xl px-3 outline-none font-semibold text-sm"
                    placeholder="مثال: 09:30 AM"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end gap-2">
              <button
                onClick={() => { setIsEditTxModalOpen(false); setEditingTxId(null); }}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveEditTx}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                💾 حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Delete Wallet Action Options Modal */}
      {isDelWalletModalOpen && deletingWalletId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-gray-50 dark:bg-slate-700 px-6 py-4 border-b border-gray-100 dark:border-slate-600 flex justify-between items-center">
              <h3 className="font-black text-base flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>خيارات حذف المحفظة</span>
              </h3>
              <button onClick={() => { setIsDelWalletModalOpen(false); setDeletingWalletId(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                تنبيه: محفظة "{wallets.find(x => x.id === deletingWalletId)?.name}" تحتوي على عمليات مسجلة بالسجل. ماذا تفعل بالعمليات المنجزة؟
              </p>

              {wallets.length > 1 && (
                <div className="bg-gray-50 dark:bg-slate-900 border p-4 rounded-xl space-y-2.5">
                  <label className="block text-xs font-bold text-gray-500">نقل عمليات المحفظة الحالية إلى:</label>
                  <select
                    value={walletTargetId}
                    onChange={e => setWalletTargetId(e.target.value)}
                    className="w-full h-10 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <option value="">-- اختر محفظة بديلة --</option>
                    {wallets.filter(x => x.id !== deletingWalletId).map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={executeTransferAndClose}
                    disabled={!walletTargetId}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow transition-all ${
                      walletTargetId 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/10'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>🔄 نقل العمليات الحالية للمحفظة البديلة ثم حذفها</span>
                  </button>
                </div>
              )}

              <button
                onClick={executeDeleteWalletWithTxns}
                className="w-full py-2.5 bg-red-50 text-red-600 dark:bg-red-950/20 hover:bg-red-100 rounded-lg font-bold text-xs flex items-center justify-center gap-1 border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>🗑️ حذف المحفظة وكافة العمليات المرتبطة بها نهائياً</span>
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 px-6 py-4 border-t border-gray-100 dark:border-slate-600 flex justify-end">
              <button
                onClick={() => { setIsDelWalletModalOpen(false); setDeletingWalletId(null); }}
                className="px-5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-xs"
              >
                إلغاء الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Confirm Modal Dialog (Custom popup replace standard JS alert/confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-700 animate-[fadeIn_0.15s_ease-out]">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>تنبيه تأكيد الإجراء</span>
              </div>
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/30 px-6 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold shadow"
              >
                تأكيد الإجراء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-xl shadow-2xl text-white font-bold text-xs transition-all duration-300 flex items-center gap-2 animate-[fadeIn_0.3s_ease-out] ${
          toastMsg.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/10' : 'bg-red-600 shadow-red-500/10'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}
