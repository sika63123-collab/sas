import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Transaction, InstallmentContract, User, Expense } from './types';

interface AppContextType {
  products: Product[];
  transactions: Transaction[];
  installmentContracts: InstallmentContract[];
  expenses: Expense[];
  expenseTypes: string[];
  users: User[];
  currentUser: User | null;
  addProduct: (product: Product) => void;
  updateProductStock: (id: string, newStock: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  addInstallmentContract: (contract: Omit<InstallmentContract, 'id' | 'createdAt' | 'customerNumber'>) => void;
  payInstallment: (contractId: string, paymentId: string, paidAmount: number) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'timestamp' | 'expenseNumber'>) => void;
  addExpenseType: (typeName: string) => void;
  deleteExpenseType: (typeName: string) => void;
  login: (code: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (code: string, updates: Partial<User>) => void;
  deleteUser: (code: string) => void;
  restoreData: (data: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('mobile_shop_users');
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
    const savedCode = sessionStorage.getItem('mobile_shop_current_user');
    if (savedCode) {
      const u = users.find(u => u.code === savedCode);
      if (u) return u;
    }
    return null;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('mobile_shop_products');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'ايفون 13 برو', price: 35000, stock: 10 },
      { id: '2', name: 'سامسونج S23', price: 30000, stock: 15 },
      { id: '3', name: 'شاحن ايفون اصلي', price: 800, stock: 50 },
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('mobile_shop_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [installmentContracts, setInstallmentContracts] = useState<InstallmentContract[]>(() => {
    const saved = localStorage.getItem('mobile_shop_installments');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('mobile_shop_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenseTypes, setExpenseTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('mobile_shop_expense_types');
    return saved ? JSON.parse(saved) : ['إيجار', 'كهرباء', 'مياه', 'إنترنت', 'مرتبات', 'مشتريات', 'أخرى'];
  });

  useEffect(() => {
    localStorage.setItem('mobile_shop_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('mobile_shop_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('mobile_shop_installments', JSON.stringify(installmentContracts));
  }, [installmentContracts]);

  useEffect(() => {
    localStorage.setItem('mobile_shop_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('mobile_shop_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('mobile_shop_expense_types', JSON.stringify(expenseTypes));
  }, [expenseTypes]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('mobile_shop_current_user', currentUser.code);
    } else {
      sessionStorage.removeItem('mobile_shop_current_user');
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

  const restoreData = (data: any) => {
    if (data.products) setProducts(data.products);
    if (data.transactions) setTransactions(data.transactions);
    if (data.installmentContracts) setInstallmentContracts(data.installmentContracts);
    if (data.users) setUsers(data.users);
    if (data.expenses) setExpenses(data.expenses);
    if (data.expenseTypes) setExpenseTypes(data.expenseTypes);
    alert('تم الرجوع للنسخة الاحتياطية بنجاح!');
    window.location.reload();
  };

  const addProduct = (product: Product) => {
    setProducts([...products, product]);
  };

  const updateProductStock = (id: string, amountToChange: number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, stock: p.stock + amountToChange } : p
    ));
  };

  const addTransaction = (t: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    setTransactions(prev => [...prev, newTransaction]);

    // Update stock based on transaction type
    const multiplier = (t.type === 'sale' || t.type === 'deposit_sale') ? -1 : 1;
    
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
  };

  const payInstallment = (contractId: string, paymentId: string, paidAmount: number) => {
    setInstallmentContracts(prev => prev.map(contract => {
      if (contract.id === contractId) {
        return {
          ...contract,
          payments: contract.payments.map(payment => {
            if (payment.id === paymentId && !payment.isPaid) {
              return { ...payment, isPaid: true, paidDate: new Date().toISOString(), paidAmount };
            }
            return payment;
          })
        };
      }
      return contract;
    }));
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

  return (
    <AppContext.Provider value={{ 
      products, 
      transactions, 
      installmentContracts,
      expenses,
      expenseTypes,
      users,
      currentUser,
      addProduct, 
      updateProductStock, 
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
      restoreData
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
