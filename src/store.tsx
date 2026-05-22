import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Transaction, InstallmentContract, User, Expense, PaymentMethod, PaymentTransaction, ShiftAccount, ShiftInventoryItem, TransactionType, ManualCashTransaction, CashShift } from './types';
import { getStorageItem, setStorageItem, restoreAllStorage, getSessionItem, setSessionItem, removeSessionItem } from './lib/storage';

interface AppContextType {
  products: Product[];
  transactions: Transaction[];
  installmentContracts: InstallmentContract[];
  expenses: Expense[];
  expenseTypes: string[];
  users: User[];
  currentUser: User | null;
  paymentTransactions: PaymentTransaction[];
  addProduct: (product: Product) => void;
  updateProductStock: (id: string, newStock: number) => void;
  updateProductPrice: (id: string, newPrice: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  addInstallmentContract: (contract: Omit<InstallmentContract, 'id' | 'createdAt' | 'customerNumber'>) => void;
  payInstallment: (contractId: string, paymentId: string, paidAmount: number, paymentMethod: PaymentMethod, walletLast4?: string, receiverWalletLast4?: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'timestamp' | 'expenseNumber'>) => void;
  addExpenseType: (typeName: string) => void;
  deleteExpenseType: (typeName: string) => void;
  login: (code: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (code: string, updates: Partial<User>) => void;
  deleteUser: (code: string) => void;
  restoreData: (data: any) => Promise<void>;
  clearData: () => Promise<void>;
  addPaymentTransaction: (pt: Omit<PaymentTransaction, 'id'>) => void;
  selectedContractIdForPayment: string | null;
  setSelectedContractIdForPayment: (id: string | null) => void;
  shiftAccounts: ShiftAccount[];
  shiftInventoryItems: ShiftInventoryItem[];
  addShiftAccount: (account: Omit<ShiftAccount, 'id'>) => void;
  removeShiftAccount: (id: string) => void;
  updateShiftAccount: (id: string, updates: Partial<ShiftAccount>) => void;
  addShiftInventoryItem: (item: Omit<ShiftInventoryItem, 'id'>) => void;
  removeShiftInventoryItem: (id: string) => void;
  addCashExchange: (amount: number, targetMethod: 'vodafone_cash' | 'instapay', walletLast4: string, note?: string, exchangeRecordNumber?: string) => void;
  shifts: CashShift[];
  activeShift: CashShift | undefined;
  openShift: (openingCash: number) => void;
  closeShift: () => void;
  addManualCashTransaction: (type: 'inflow' | 'outflow', amount: number, notes: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = getStorageItem('mobile_shop_users');
    if (saved) return JSON.parse(saved);
    // Default admin
    return [{
      code: '01',
      name: 'المدير الافتراضي',
      role: 'admin',
      permissions: {
        cashier: true, cashierReturn: true, depositSale: true, depositReturn: true, depositPay: true,
        storeQuantities: true, itemCard: true, addItem: true,
        installmentsAdd: true, installmentsPay: true, installmentsLate: true,
        settings: true, reports: true
      }
    }];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedCode = getSessionItem('mobile_shop_current_user');
    if (savedCode) {
      const u = users.find(u => u.code === savedCode);
      if (u) return u;
    }
    return null;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = getStorageItem('mobile_shop_products');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'ايفون 13 برو', price: 35000, stock: 10 },
      { id: '2', name: 'سامسونج S23', price: 30000, stock: 15 },
      { id: '3', name: 'شاحن ايفون اصلي', price: 800, stock: 50 },
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = getStorageItem('mobile_shop_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [installmentContracts, setInstallmentContracts] = useState<InstallmentContract[]>(() => {
    const saved = getStorageItem('mobile_shop_installments');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = getStorageItem('mobile_shop_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenseTypes, setExpenseTypes] = useState<string[]>(() => {
    const saved = getStorageItem('mobile_shop_expense_types');
    return saved ? JSON.parse(saved) : ['إيجار', 'كهرباء', 'مياه', 'إنترنت', 'مرتبات', 'مشتريات', 'أخرى'];
  });

  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>(() => {
    const saved = getStorageItem('mobile_shop_payment_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedContractIdForPayment, setSelectedContractIdForPayment] = useState<string | null>(null);

  const [shiftAccounts, setShiftAccounts] = useState<ShiftAccount[]>(() => {
    const saved = getStorageItem('mobile_shop_shift_accounts');
    return saved ? JSON.parse(saved) : [
      { id: 'sa3', name: 'فودافون كاش', subLabel: 'محفظة 1' },
      { id: 'sa4', name: 'انستا باي' },
      { id: 'sa5', name: 'فوري' },
      { id: 'sa6', name: 'امان' },
      { id: 'sa7', name: 'ضامن' },
    ];
  });

  const [shiftInventoryItems, setShiftInventoryItems] = useState<ShiftInventoryItem[]>(() => {
    const saved = getStorageItem('mobile_shop_shift_inventory');
    return saved ? JSON.parse(saved) : [
      { id: 'si1', name: 'ميموري' },
      { id: 'si2', name: 'فلاشات' },
    ];
  });

  const [shifts, setShifts] = useState<CashShift[]>(() => {
    const saved = getStorageItem('mobile_shop_shifts');
    return saved ? JSON.parse(saved) : [];
  });


  useEffect(() => {
    setStorageItem('mobile_shop_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    setStorageItem('mobile_shop_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    setStorageItem('mobile_shop_installments', JSON.stringify(installmentContracts));
  }, [installmentContracts]);

  useEffect(() => {
    setStorageItem('mobile_shop_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    setStorageItem('mobile_shop_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    setStorageItem('mobile_shop_expense_types', JSON.stringify(expenseTypes));
  }, [expenseTypes]);

  useEffect(() => {
    setStorageItem('mobile_shop_payment_transactions', JSON.stringify(paymentTransactions));
  }, [paymentTransactions]);

  useEffect(() => {
    setStorageItem('mobile_shop_shift_accounts', JSON.stringify(shiftAccounts));
  }, [shiftAccounts]);

  useEffect(() => {
    setStorageItem('mobile_shop_shift_inventory', JSON.stringify(shiftInventoryItems));
  }, [shiftInventoryItems]);

  useEffect(() => {
    setStorageItem('mobile_shop_shifts', JSON.stringify(shifts));
  }, [shifts]);


  useEffect(() => {
    if (currentUser) {
      setSessionItem('mobile_shop_current_user', currentUser.code);
    } else {
      removeSessionItem('mobile_shop_current_user');
    }
  }, [currentUser]);

  const login = (code: string) => {
    const user = users.find(u => u.code === code);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addUser = (user: User) => setUsers(prev => [...prev, user]);
  const updateUser = (code: string, updates: Partial<User>) => 
    setUsers(prev => prev.map(u => u.code === code ? { ...u, ...updates } : u));
  const deleteUser = (code: string) => 
    setUsers(prev => prev.filter(u => u.code !== code));

  const activeShift = shifts.find(s => !s.isClosed);

  const openShift = (openingCash: number) => {
    if (shifts.some(s => !s.isClosed)) {
      alert('يوجد وردية مفتوحة بالفعل، يجب إغلاقها أولاً!');
      return;
    }
    const newShift: CashShift = {
      id: Date.now().toString(),
      openedAt: new Date().toISOString(),
      isClosed: false,
      openingCash,
      manualTransactions: []
    };
    setShifts(prev => [...prev, newShift]);
  };

  const closeShift = () => {
    setShifts(prev => {
      const active = prev.find(s => !s.isClosed);
      if (!active) return prev;

      const nowStr = new Date().toISOString();
      const start = active.openedAt;

      // Filter transactions within shift timeframe
      const shiftTransactions = transactions.filter(t => t.timestamp >= start && t.timestamp <= nowStr);
      const shiftExpenses = expenses.filter(e => e.timestamp >= start && e.timestamp <= nowStr);

      const getAmount = (t: any) => (t.type === 'deposit_sale' || t.type === 'deposit_return' || t.type === 'installment_sale') ? (t.depositAmount || 0) : t.totalAmount;

      // 1. Sales & Collections in cash
      const cashSales = shiftTransactions
        .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
        .reduce((sum, t) => sum + getAmount(t), 0);

      // 2. Manual Inflows
      const manualInflow = active.manualTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);

      // 3. Cash Returns
      const cashReturns = shiftTransactions
        .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && (t.type === 'return' || t.type === 'deposit_return'))
        .reduce((sum, t) => sum + getAmount(t), 0);

      // 4. Expenses (paid in cash)
      const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

      // 5. Purchases (paid in cash)
      const cashPurchases = shiftTransactions
        .filter(t => t.paymentMethod === 'cash' && t.type === 'purchase')
        .reduce((sum, t) => sum + t.totalAmount, 0);

      // 6. Cash Exchanges Out (تسييل عهدة - منصرف من الدرج)
      const cashExchangeOut = shiftTransactions
        .filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange')
        .reduce((sum, t) => sum + t.totalAmount, 0);

      // 7. Manual Outflows
      const manualOutflow = active.manualTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

      const expectedCash = active.openingCash + cashSales + manualInflow - cashReturns - totalExpenses - cashPurchases - cashExchangeOut - manualOutflow;

      const updatedShifts = prev.map(s => {
        if (s.id === active.id) {
          return {
            ...s,
            closedAt: nowStr,
            isClosed: true,
            closingCashActual: expectedCash
          };
        }
        return s;
      });

      const newShift: CashShift = {
        id: Date.now().toString(),
        openedAt: nowStr,
        isClosed: false,
        openingCash: expectedCash,
        manualTransactions: []
      };

      return [...updatedShifts, newShift];
    });
  };

  const addManualCashTransaction = (type: 'inflow' | 'outflow', amount: number, notes: string) => {
    setShifts(prev => prev.map(s => {
      if (!s.isClosed) {
        const newTransaction: ManualCashTransaction = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          type,
          amount,
          notes,
          timestamp: new Date().toISOString()
        };
        return {
          ...s,
          manualTransactions: [...s.manualTransactions, newTransaction]
        };
      }
      return s;
    }));
  };

  const restoreData = async (data: any) => {

    // Build the storage entries
    const storageData: Record<string, string> = {};
    if (data.products) {
      setProducts(data.products);
      storageData['mobile_shop_products'] = JSON.stringify(data.products);
    }
    if (data.transactions) {
      setTransactions(data.transactions);
      storageData['mobile_shop_transactions'] = JSON.stringify(data.transactions);
    }
    if (data.installmentContracts) {
      setInstallmentContracts(data.installmentContracts);
      storageData['mobile_shop_installments'] = JSON.stringify(data.installmentContracts);
    }
    if (data.users) {
      setUsers(data.users);
      storageData['mobile_shop_users'] = JSON.stringify(data.users);
    }
    if (data.expenses) {
      setExpenses(data.expenses);
      storageData['mobile_shop_expenses'] = JSON.stringify(data.expenses);
    }
    if (data.expenseTypes) {
      setExpenseTypes(data.expenseTypes);
      storageData['mobile_shop_expense_types'] = JSON.stringify(data.expenseTypes);
    }
    if (data.shiftAccounts) {
      setShiftAccounts(data.shiftAccounts);
      storageData['mobile_shop_shift_accounts'] = JSON.stringify(data.shiftAccounts);
    }
    if (data.shiftInventoryItems) {
      setShiftInventoryItems(data.shiftInventoryItems);
      storageData['mobile_shop_shift_inventory'] = JSON.stringify(data.shiftInventoryItems);
    }
    if (data.shifts) {
      setShifts(data.shifts);
      storageData['mobile_shop_shifts'] = JSON.stringify(data.shifts);
    }

    // Write all data to storage before reloading
    await restoreAllStorage(storageData);

    alert('تم الرجوع للنسخة الاحتياطية بنجاح!');
    window.location.reload();
  };

  const addPaymentTransaction = (pt: Omit<PaymentTransaction, 'id'>) => {
    const newPt: PaymentTransaction = {
      ...pt,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    };
    setPaymentTransactions(prev => [...prev, newPt]);
  };

  const clearData = async () => {
    setTransactions([]);
    setInstallmentContracts([]);
    setExpenses([]);
    setPaymentTransactions([]);
    setShifts([]);
    
    const storageData: Record<string, string> = {
      'mobile_shop_transactions': JSON.stringify([]),
      'mobile_shop_installments': JSON.stringify([]),
      'mobile_shop_expenses': JSON.stringify([]),
      'mobile_shop_payment_transactions': JSON.stringify([]),
      'mobile_shop_shifts': JSON.stringify([]),
      'mobile_shop_products': JSON.stringify(products),
      'mobile_shop_users': JSON.stringify(users),
      'mobile_shop_expense_types': JSON.stringify(expenseTypes)
    };
    
    await restoreAllStorage(storageData);
    alert('تم تصفير البيانات بنجاح! تم مسح الحركات والاقساط والمصروفات والورديات، مع الاحتفاظ بالأصناف.');
    window.location.reload();
  };

  const addProduct = (product: Product) => {
    const existing = products.find(p => p.id === product.id);
    if (existing) {
      // تحديث الصنف الحالي
      setProducts(prev => prev.map(p => 
        p.id === product.id 
          ? { 
              ...p, 
              name: product.name || p.name,
              category: product.category || p.category,
              stock: p.stock + product.stock, 
              costPrice: product.costPrice !== undefined ? product.costPrice : p.costPrice,
              price: product.price !== undefined ? product.price : p.price
            } 
          : p
      ));
      
      // تسجيل حركة الشراء وتغذية المخزن
      if (product.stock > 0) {
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          type: 'purchase',
          items: [{
            productId: product.id,
            name: product.name,
            quantity: product.stock,
            price: product.costPrice || product.price
          }],
          totalAmount: (product.costPrice || product.price) * product.stock,
          paymentMethod: 'cash'
        };
        setTransactions(prev => [...prev, newTransaction]);
      }
    } else {
      // إضافة صنف جديد لأول مرة
      setProducts([...products, product]);
      if (product.stock > 0) {
        const newTransaction: Transaction = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          type: 'purchase',
          items: [{
            productId: product.id,
            name: product.name,
            quantity: product.stock,
            price: product.costPrice || product.price
          }],
          totalAmount: (product.costPrice || product.price) * product.stock,
          paymentMethod: 'cash'
        };
        setTransactions(prev => [...prev, newTransaction]);
      }
    }
  };

  const updateProductStock = (id: string, amountToChange: number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, stock: p.stock + amountToChange } : p
    ));
  };

  const updateProductPrice = (id: string, newPrice: number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, price: newPrice } : p
    ));
  };

  const addTransaction = (t: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    setTransactions(prev => [...prev, newTransaction]);

    // Update stock based on transaction type (skip for payment records)
    if (t.type !== 'deposit_payment' && t.type !== 'installment_payment') {
      const multiplier = (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'installment_sale') ? -1 : 1;
    
      let currentProducts = [...products];
      t.items.forEach(item => {
        const pIndex = currentProducts.findIndex(p => p.id === item.productId);
        if (pIndex !== -1) {
          currentProducts[pIndex] = {
            ...currentProducts[pIndex],
            stock: currentProducts[pIndex].stock + (item.quantity * multiplier)
          };
        }
      });
      setProducts(currentProducts);
    }
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addInstallmentContract = (contract: Omit<InstallmentContract, 'id' | 'createdAt' | 'customerNumber'>) => {
    // Check if the customer already exists by name or phone
    const existing = installmentContracts.find(c => 
      c.customerName.trim() === contract.customerName.trim() || 
      (c.customerPhone && contract.customerPhone && c.customerPhone.trim() === contract.customerPhone.trim())
    );

    const cNum = existing 
                 ? existing.customerNumber 
                 : (installmentContracts.length > 0 ? Math.max(...installmentContracts.map(c => c.customerNumber || 0)) + 1 : 1);

    const newContract: InstallmentContract = {
      ...contract,
      id: Date.now().toString(),
      customerNumber: cNum,
      createdAt: new Date().toISOString()
    };
    setInstallmentContracts(prev => [...prev, newContract]);

    // تسجيل حركة بيع تقسيط في التقارير
    addTransaction({
      type: 'installment_sale',
      totalAmount: contract.purchasePrice,
      depositAmount: contract.downPayment,
      paymentMethod: contract.downPaymentMethod || 'cash',
      items: [{
        productId: '',
        name: contract.deviceName,
        quantity: 1,
        price: contract.purchasePrice,
      }],
      customerName: contract.customerName,
      customerPhone: contract.customerPhone,
      customerAddress: contract.customerAddress,
      senderWalletLast4: contract.downPaymentWalletLast4,
      receiverWalletLast4: contract.downPaymentReceiverWalletLast4,
    });
  };

  const payInstallment = (contractId: string, paymentId: string, paidAmount: number, paymentMethod: PaymentMethod, walletLast4?: string, receiverWalletLast4?: string) => {
    let customerName = '';
    let customerPhone = '';
    
    setInstallmentContracts(prev => prev.map(contract => {
      if (contract.id === contractId) {
        customerName = contract.customerName;
        customerPhone = contract.customerPhone;
        return {
          ...contract,
          payments: contract.payments.map(payment => {
            if (payment.id === paymentId && !payment.isPaid) {
              return { ...payment, isPaid: true, paidDate: new Date().toISOString(), paidAmount, paymentMethod, walletLast4, receiverWalletLast4 };
            }
            return payment;
          })
        };
      }
      return contract;
    }));

    // Add transaction for shift reporting
    if (customerName) {
      addTransaction({
        type: 'installment_payment',
        totalAmount: paidAmount,
        paymentMethod: paymentMethod,
        items: [],
        customerName: customerName,
        customerPhone: customerPhone,
        senderWalletLast4: walletLast4,
        receiverWalletLast4: receiverWalletLast4,
      });
    }
  };

  const addExpense = (e: Omit<Expense, 'id' | 'timestamp' | 'expenseNumber'>) => {
    const newExpense: Expense = {
      ...e,
      id: Date.now().toString(),
      expenseNumber: expenses.length + 1,
      timestamp: new Date().toISOString(),
    };
    setExpenses(prev => [...prev, newExpense]);
  };

  const addExpenseType = (typeName: string) => {
    if (!expenseTypes.includes(typeName.trim())) {
      setExpenseTypes(prev => [...prev, typeName.trim()]);
    }
  };

  const deleteExpenseType = (typeName: string) => {
    setExpenseTypes(prev => prev.filter(t => t !== typeName));
  };

  const addShiftAccount = (account: Omit<ShiftAccount, 'id'>) => {
    const newAccount: ShiftAccount = { ...account, id: 'sa' + Date.now().toString() };
    setShiftAccounts(prev => [...prev, newAccount]);
  };

  const removeShiftAccount = (id: string) => {
    setShiftAccounts(prev => prev.filter(a => a.id !== id));
  };

  const updateShiftAccount = (id: string, updates: Partial<ShiftAccount>) => {
    setShiftAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const addShiftInventoryItem = (item: Omit<ShiftInventoryItem, 'id'>) => {
    const newItem: ShiftInventoryItem = { ...item, id: 'si' + Date.now().toString() };
    setShiftInventoryItems(prev => [...prev, newItem]);
  };

  const removeShiftInventoryItem = (id: string) => {
    setShiftInventoryItems(prev => prev.filter(i => i.id !== id));
  };

  const addCashExchange = (amount: number, targetMethod: 'vodafone_cash' | 'instapay', walletLast4: string, note?: string, exchangeRecordNumber?: string) => {
    const exchangeId = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const now = new Date().toISOString();
    const methodLabel = targetMethod === 'vodafone_cash' ? 'فودافون كاش' : 'انستا باي';
    const noteText = note ? ` - ${note}` : '';

    // حركة 1: كاش خارج من الدرج (OUT)
    const cashOutTransaction: Transaction = {
      id: exchangeId + '_cash_out',
      timestamp: now,
      type: 'cash_exchange' as TransactionType,
      items: [],
      totalAmount: amount,
      paymentMethod: 'cash',
      senderWalletLast4: walletLast4,
      linkedExchangeId: exchangeId,
      customerName: `تسييل عهدة → ${methodLabel}${noteText}`,
      exchangeRecordNumber,
    };

    // حركة 2: وارد للمحفظة الإلكترونية (IN)
    const walletInTransaction: Transaction = {
      id: exchangeId + '_wallet_in',
      timestamp: now,
      type: 'cash_exchange' as TransactionType,
      items: [],
      totalAmount: amount,
      paymentMethod: targetMethod,
      senderWalletLast4: walletLast4,
      linkedExchangeId: exchangeId,
      customerName: `تسييل عهدة من الكاش${noteText}`,
      exchangeRecordNumber,
    };

    setTransactions(prev => [...prev, cashOutTransaction, walletInTransaction]);
  };

  return (
    <AppContext.Provider value={{ 
      products, 
      transactions, 
      installmentContracts,
      expenses,
      expenseTypes,
      users,
      currentUser,
      paymentTransactions,
      addProduct, 
      updateProductStock, 
      updateProductPrice,
      addTransaction,
      updateTransaction,
      addInstallmentContract,
      payInstallment,
      addExpense,
      addExpenseType,
      deleteExpenseType,
      login,
      logout,
      addUser,
      updateUser,
      deleteUser,
      restoreData,
      clearData,
      addPaymentTransaction,
      selectedContractIdForPayment,
      setSelectedContractIdForPayment,
      shiftAccounts,
      shiftInventoryItems,
      addShiftAccount,
      removeShiftAccount,
      updateShiftAccount,
      addShiftInventoryItem,
      removeShiftInventoryItem,
      addCashExchange,
      shifts,
      activeShift,
      openShift,
      closeShift,
      addManualCashTransaction,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
