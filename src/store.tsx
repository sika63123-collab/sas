import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Transaction, InstallmentContract, User, Expense, PaymentMethod, PaymentTransaction, ShiftAccount, ShiftInventoryItem } from './types';
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
  addShiftInventoryItem: (item: Omit<ShiftInventoryItem, 'id'>) => void;
  removeShiftInventoryItem: (id: string) => void;
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
      { id: 'sa1', name: 'النقدية' },
      { id: 'sa2', name: 'ماكينة الفيزا' },
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
    
    const storageData: Record<string, string> = {
      'mobile_shop_transactions': JSON.stringify([]),
      'mobile_shop_installments': JSON.stringify([]),
      'mobile_shop_expenses': JSON.stringify([]),
      'mobile_shop_payment_transactions': JSON.stringify([]),
      'mobile_shop_products': JSON.stringify(products),
      'mobile_shop_users': JSON.stringify(users),
      'mobile_shop_expense_types': JSON.stringify(expenseTypes)
    };
    
    await restoreAllStorage(storageData);
    alert('تم تصفير البيانات بنجاح! تم مسح الحركات والاقساط والمصروفات، مع الاحتفاظ بالأصناف.');
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

  const addShiftInventoryItem = (item: Omit<ShiftInventoryItem, 'id'>) => {
    const newItem: ShiftInventoryItem = { ...item, id: 'si' + Date.now().toString() };
    setShiftInventoryItems(prev => [...prev, newItem]);
  };

  const removeShiftInventoryItem = (id: string) => {
    setShiftInventoryItems(prev => prev.filter(i => i.id !== id));
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
      addShiftInventoryItem,
      removeShiftInventoryItem,
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
