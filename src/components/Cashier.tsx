import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Product, CartItem, PaymentMethod, TransactionType } from '../types';
import { CheckCircle, Search, X, Plus, Trash2 } from 'lucide-react';

export default function Cashier({ initialType = 'sale', initialInvoiceId, onInvoiceLoaded }: { initialType?: TransactionType; initialInvoiceId?: string | null | undefined; onInvoiceLoaded?: () => void; key?: any }) {
  const { products, addTransaction, transactions, updateTransaction, expenses, expenseTypes, addExpense, addExpenseType, deleteExpenseType } = useAppStore();
  const cashierTransactions = transactions.filter(t => 
    t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'return' || t.type === 'deposit_return'
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactionType, setTransactionType] = useState<TransactionType>(initialType);

  // Form State
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState<number | ''>(1);
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [senderWallet, setSenderWallet] = useState('');
  const [receiverWallet, setReceiverWallet] = useState('');
  const [returnInvoiceNo, setReturnInvoiceNo] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // General Navigation & Search States
  const [viewingIndex, setViewingIndex] = useState<number>(-1);
  const [searchInvoiceText, setSearchInvoiceText] = useState('');
  const [searchProductText, setSearchProductText] = useState('');
  const [showInvoiceSearchModal, setShowInvoiceSearchModal] = useState(false);
  const [showProductSearchModal, setShowProductSearchModal] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number | ''>('');
  const [returnSaleInvoiceSearch, setReturnSaleInvoiceSearch] = useState('');
  const [linkedSaleTransaction, setLinkedSaleTransaction] = useState<{ id: string; items: { productId: string; name: string; quantity: number; price: number }[] } | null>(null);

  useEffect(() => {
    setTransactionType(initialType);
    setShowCustomerData(initialType === 'deposit_sale' || initialType === 'deposit_return');
    // Don't reset if there's a pending invoice to load (coming from deposit invoices list)
    if (!initialInvoiceId) {
      handleNewInvoice();
    }
  }, [initialType]);

  useEffect(() => {
    if (initialInvoiceId) {
      // First reset to ensure clean state
      handleNewInvoice();
      const idx = cashierTransactions.findIndex(t => t.id === initialInvoiceId);
      if (idx !== -1) {
        // Defer to next tick so handleNewInvoice state updates settle
        setTimeout(() => {
          loadTransaction(idx);
          setTransactionType(cashierTransactions[idx].type);
          setShowCustomerData(cashierTransactions[idx].type.includes('deposit'));
          onInvoiceLoaded?.();
        }, 0);
      } else {
        onInvoiceLoaded?.();
      }
    }
  }, [initialInvoiceId]);

  // Deposit States
  const [showCustomerData, setShowCustomerData] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [isDelivered, setIsDelivered] = useState(false);
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Expense States
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenseType, setExpenseType] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [showAddExpenseType, setShowAddExpenseType] = useState(false);
  const [newExpenseTypeName, setNewExpenseTypeName] = useState('');

  // Selected row for deletion
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const isAppInReturnMode = initialType.includes('return');
  const isReturn = transactionType.includes('return');
  const actualPaymentMethod = isReturn ? 'cash' : paymentMethod;
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * (item.cartQuantity || 0)), 0);
  const isNew = viewingIndex === -1;

  const saleTransactions = cashierTransactions.filter(t => !t.type.includes('return'));
  const returnTransactions = cashierTransactions.filter(t => t.type.includes('return'));

  let displayInvoiceNumber = 0;
  if (viewingIndex === -1) {
    displayInvoiceNumber = isAppInReturnMode ? returnTransactions.length + 1 : saleTransactions.length + 1;
  } else {
    const currentTx = cashierTransactions[viewingIndex];
    if (currentTx.type.includes('return')) {
       displayInvoiceNumber = returnTransactions.findIndex(t => t.id === currentTx.id) + 1;
    } else {
       displayInvoiceNumber = saleTransactions.findIndex(t => t.id === currentTx.id) + 1;
    }
  }

  const handleReturnSaleSearch = () => {
    const text = returnSaleInvoiceSearch.trim();
    if (!text) return;
    let foundTx = saleTransactions.find(t => String(t.id) === text);
    if (!foundTx) {
      const num = parseInt(text) - 1;
      if (num >= 0 && num < saleTransactions.length) foundTx = saleTransactions[num];
    }
    if (foundTx) {
      const originalTx = foundTx;
      if (originalTx.type.includes('return')) {
        alert('لا يمكن ارتجاع فاتورة مرتجع');
        return;
      }
      const returnableItems: CartItem[] = originalTx.items.map(item => ({
        product: { id: item.productId, name: item.name, price: item.price, stock: 0, categoryId: '' },
        id: item.productId,
        name: item.name,
        price: item.price,
        stock: 0,
        cartQuantity: item.quantity,
      }));
      setCart(returnableItems);
      setReturnInvoiceNo(originalTx.id);
      setLinkedSaleTransaction({ id: originalTx.id, items: originalTx.items });
      setViewingIndex(-1);

      alert('تم تحميل أصناف الفاتورة للمرتجع. احذف الأصناف غير المرتجعة ثم اضغط حفظ الفاتورة.');
    } else {
      alert('لم يتم العثور على الفاتورة');
    }
  };

  // Auto-fill deposit amount if full payment is checked
  useEffect(() => {
    if (isFullPayment && isNew) {
      setDepositAmount(totalAmount);
    }
  }, [totalAmount, isFullPayment, isNew]);

  // Handle item search by ID/Code or Name
  useEffect(() => {
    if (itemCode) {
      const match = products.find(p => p.id === itemCode || p.barcode === itemCode);
      if (match) {
        setItemName(match.name);
        setItemPrice(match.price);
        setSelectedProduct(match);
      } else if (!itemName) {
        setSelectedProduct(null);
        setItemPrice('');
      }
    }
  }, [itemCode, products]);

  useEffect(() => {
    if (itemName) {
      const match = products.find(p => p.name === itemName);
      if (match) {
        setItemCode(match.id);
        setItemPrice(match.price);
        setSelectedProduct(match);
      }
    }
  }, [itemName, products]);

  // Global keydown for delete button if focusing row (or simply window listener if a row is selected)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if we don't have an input focused
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        
        if (selectedRowId) {
          removeFromCart(selectedRowId);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedRowId]);

  const handleAddItem = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!selectedProduct || !itemQty || itemQty <= 0) return;

    // In return mode, only allow items from the linked sale invoice
    if (isReturn && linkedSaleTransaction) {
      const allowed = linkedSaleTransaction.items.find(i => i.productId === selectedProduct.id);
      if (!allowed) {
        alert('هذا الصنف غير موجود في فاتورة المبيعات المرتبطة');
        return;
      }
      if (Number(itemQty) > allowed.quantity) {
        alert('الكمية المرتجعة لا يمكن أن تتجاوز الكمية المباعة (' + allowed.quantity + ')');
        return;
      }
    }

    if (transactionType === 'sale' && selectedProduct.stock <= 0) {
      alert('هذا الصنف غير متوفر في المخزن');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === selectedProduct.id);
      if (existing) {
        if (isReturn && linkedSaleTransaction) {
          const allowed = linkedSaleTransaction.items.find(i => i.productId === selectedProduct.id);
          if (allowed && existing.cartQuantity + Number(itemQty) > allowed.quantity) {
            alert('الكمية المرتجعة لا يمكن أن تتجاوز الكمية المباعة (' + allowed.quantity + ')');
            return prev;
          }
        }
        if (transactionType === 'sale' && existing.cartQuantity + Number(itemQty) > selectedProduct.stock) {
          alert('لا يوجد كمية كافية في المخزن');
          return prev;
        }
        return prev.map(item =>
          item.id === selectedProduct.id ? { ...item, cartQuantity: item.cartQuantity + Number(itemQty) } : item
        );
      }
      return [...prev, { ...selectedProduct, cartQuantity: Number(itemQty) }];
    });

    // Reset form
    setItemCode('');
    setItemName('');
    setItemQty(1);
    setItemPrice('');
    setSelectedProduct(null);
    document.getElementById('itemCodeInput')?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.id === 'itemQtyInput') {
        handleAddItem(e);
      } else if (target.id === 'itemCodeInput') {
        document.getElementById('itemQtyInput')?.focus();
      }
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    if (selectedRowId === id) setSelectedRowId(null);
  };

  const updateCartQty = (id: string, val: string) => {
    if (val === '') {
      setCart(prev => prev.map(item => item.id === id ? { ...item, cartQuantity: '' as any } : item));
      return;
    }
    const newQty = parseInt(val);
    if (isNaN(newQty) || newQty < 0) return;
    
    if (isReturn && linkedSaleTransaction) {
      const originalItem = linkedSaleTransaction.items.find(i => i.productId === id);
      if (originalItem && newQty > originalItem.quantity) {
         alert('الكمية المرتجعة لا يمكن أن تتجاوز الكمية المباعة (' + originalItem.quantity + ')');
         return;
      }
    }
    
    if (transactionType.includes('sale')) {
      const product = products.find(p => p.id === id);
      if (product && newQty > product.stock) {
        alert('لا يوجد كمية كافية في المخزن');
        return;
      }
    }

    setCart(prev => prev.map(item => item.id === id ? { ...item, cartQuantity: newQty } : item));
  };

  const submitTransaction = () => {
    if (cart.some(item => !item.cartQuantity || item.cartQuantity <= 0)) {
      alert('يجب تحديد كمية صحيحة لجميع الأصناف');
      return;
    }

    const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';

    if (isEWallet) {
      if (senderWallet.length !== 4 || receiverWallet.length !== 4) {
        alert('يجب ادخال اخر 4 ارقام من المحفظة المرسلة والمستلمة بشكل صحيح');
        return;
      }
    }

    if (!isNew) {
      // Updating an existing deposit invoice or adding a payment
      const existingTx = cashierTransactions[viewingIndex];
      const paymentVal = Number(newPaymentAmount) || 0;
      const currentDeposit = Number(existingTx.depositAmount) || 0;

      if (showCustomerData && currentDeposit + paymentVal > existingTx.totalAmount) {
        alert('المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الفاتورة');
        return;
      }
      
      // Update the original invoice with the new total deposit
      updateTransaction(existingTx.id, {
        depositAmount: currentDeposit + paymentVal,
        isDelivered: isDelivered
      });

      // Add a new transaction record for the payment itself ONLY if payment > 0
      if (paymentVal > 0) {
        addTransaction({
          type: 'deposit_payment',
          items: [{
            productId: 'payment',
            name: `دفعة لفاتورة رقم ${viewingIndex + 1} - ${existingTx.customerName || ''}`,
            quantity: 1,
            price: paymentVal
          }],
          totalAmount: paymentVal,
          paymentMethod: actualPaymentMethod,
          ...(isEWallet && { senderWalletLast4: senderWallet, receiverWalletLast4: receiverWallet }),
          customerName: existingTx.customerName,
          paymentDate: paymentDate
        });
        alert('تم تسجيل الدفعة بنجاح وتحديث الفاتورة');
      } else {
        alert('تم تحديث الفاتورة بنجاح');
      }

      handleNewInvoice();
      setShowCheckoutModal(false);
      return;
    }

    const finalType = isReturn 
      ? (showCustomerData ? 'deposit_return' : 'return') 
      : (showCustomerData ? 'deposit_sale' : 'sale');

    if (showCustomerData && Number(depositAmount) > totalAmount) {
      alert('المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الفاتورة');
      return;
    }

    addTransaction({
      type: finalType,
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price
      })),
      totalAmount,
      paymentMethod: actualPaymentMethod,
      ...(isEWallet && !isReturn && { senderWalletLast4: senderWallet, receiverWalletLast4: receiverWallet }),
      ...(isReturn && returnInvoiceNo ? { returnInvoiceNumber: returnInvoiceNo } : {}),
      ...(showCustomerData && {
        customerName,
        customerPhone,
        customerAddress,
        pageNumber,
        depositAmount: Number(depositAmount) || 0,
        isDelivered,
        paymentDate
      })
    });

    handleNewInvoice();
    setShowCheckoutModal(false);
  };

  const handleSaveInvoice = () => {
    if (cart.length === 0) return;
    if (isReturn && !returnInvoiceNo.trim()) {
      alert('يجب ادخال رقم الحركة (الفاتورة الأصلية)');
      return;
    }
    const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';
    if (isEWallet) {
      setShowCheckoutModal(true);
    } else {
      submitTransaction();
    }
  };

  function handleNewInvoice() {
    setTransactionType(initialType);
    setShowCustomerData(initialType === 'deposit_sale');
    setViewingIndex(-1);
    setCart([]);
    setItemCode('');
    setItemName('');
    setItemQty(1);
    setItemPrice('');
    setSelectedProduct(null);
    setPaymentMethod('cash');
    setSenderWallet('');
    setReceiverWallet('');
    setReturnInvoiceNo('');
    setReturnSaleInvoiceSearch('');
    setLinkedSaleTransaction(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setPageNumber('');
    setIsFullPayment(true);
    setDepositAmount('');
    setNewPaymentAmount('');
    setIsDelivered(false);
    setSelectedRowId(null);
    document.getElementById('itemCodeInput')?.focus();
  };

  const loadTransaction = (index: number) => {
    if (index < 0 || index >= cashierTransactions.length) return;
    const tx = cashierTransactions[index];
    setViewingIndex(index);
    setCart(tx.items.map(i => ({ 
      id: i.productId, 
      name: i.name, 
      cartQuantity: i.quantity, 
      price: i.price, 
      stock: 0, 
      product: {id: i.productId, name: i.name, price: i.price, stock: 0, categoryId: ''} 
    })));
    setTransactionType(tx.type);
    if (tx.type === 'deposit_sale') {
        setShowCustomerData(true);
        setCustomerName(tx.customerName || '');
        setCustomerPhone(tx.customerPhone || '');
        setCustomerAddress(tx.customerAddress || '');
        setPageNumber(tx.pageNumber || '');
        setDepositAmount(tx.depositAmount || 0);
        setIsDelivered(tx.isDelivered || false);
        setPaymentDate(tx.paymentDate || new Date().toISOString().split('T')[0]);
        setIsFullPayment(tx.depositAmount === tx.totalAmount);
    } else {
        setShowCustomerData(false);
    }
    setPaymentMethod(tx.paymentMethod as PaymentMethod);
    setReturnInvoiceNo(tx.returnInvoiceNumber || '');
  };

  const handlePrev = () => {
    const relevantTransactions = isAppInReturnMode ? returnTransactions : saleTransactions;
    if (relevantTransactions.length === 0) return;
    
    if (viewingIndex === -1) {
      const lastTx = relevantTransactions[relevantTransactions.length - 1];
      loadTransaction(cashierTransactions.findIndex(t => t.id === lastTx.id));
    } else {
      const currentTx = cashierTransactions[viewingIndex];
      const currentPos = relevantTransactions.findIndex(t => t.id === currentTx.id);
      if (currentPos > 0) {
        const prevTx = relevantTransactions[currentPos - 1];
        loadTransaction(cashierTransactions.findIndex(t => t.id === prevTx.id));
      }
    }
  };

  const handleNext = () => {
    const relevantTransactions = isAppInReturnMode ? returnTransactions : saleTransactions;
    if (relevantTransactions.length === 0) return;
    
    if (viewingIndex !== -1) {
      const currentTx = cashierTransactions[viewingIndex];
      const currentPos = relevantTransactions.findIndex(t => t.id === currentTx.id);
      if (currentPos !== -1 && currentPos < relevantTransactions.length - 1) {
        const nextTx = relevantTransactions[currentPos + 1];
        loadTransaction(cashierTransactions.findIndex(t => t.id === nextTx.id));
      } else if (currentPos === relevantTransactions.length - 1) {
        handleNewInvoice();
      }
    }
  };

  const executeSearchGlobalInvoice = () => {
    const text = searchInvoiceText.trim();
    if (!text) return;
    
    let foundTx = saleTransactions.find(t => String(t.id) === text);
    if (!foundTx) {
        const num = parseInt(text) - 1;
        if (num >= 0 && num < saleTransactions.length) {
            foundTx = saleTransactions[num];
        }
    }
    
    if (foundTx) {
       const globalIdx = cashierTransactions.findIndex(t => t.id === foundTx.id);
       loadTransaction(globalIdx);
       setShowInvoiceSearchModal(false);
    } else {
       alert('لم يتم العثور على الفاتورة');
    }
  };



  const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';

  // Soft modern Apple-style UI elements
  const inputTheme = "h-9 border border-gray-200 rounded-lg shadow-sm outline-none px-3 bg-white font-medium text-sm focus:ring-2 focus:ring-blue-100 transition-shadow";
  const labelTheme = "text-sm font-semibold text-gray-600 w-24 shrink-0";

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#f5f5f7] font-sans p-4 pb-0 gap-4" dir="rtl">
      {/* ===== يمين: الكاشير ===== */}
      <div className="max-w-5xl w-auto min-w-0 overflow-hidden flex flex-col items-center">

        
        {/* Top Header / Action Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 w-full flex flex-col gap-4">
          
          {/* Navigation and Actions - Centered on top */}
          <div className="flex items-center justify-center gap-2">
                    <button onClick={handlePrev} className="bg-white border border-gray-200 px-4 h-9 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1 shadow-sm">
                      السابق
                    </button>
                    <button onClick={handleNext} className="bg-white border border-gray-200 px-4 h-9 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1 shadow-sm">
                      التالي
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button onClick={handleNewInvoice} className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-5 h-9 rounded-lg text-sm font-bold shadow-sm transition-colors">
                  جديد
                </button>
                <button onClick={handleSaveInvoice} disabled={!isNew && !showCustomerData} className="bg-gray-900 border border-transparent text-white disabled:opacity-50 hover:bg-gray-800 px-6 h-9 rounded-lg text-sm font-bold shadow-sm transition-colors">
                  {isNew ? 'حفظ الفاتورة' : 'تحديث وتأكيد'}
                </button>
          </div>

          {/* Title and Invoice No */}
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
             <div className="flex items-center gap-4 px-2">
               <h2 className={`text-xl font-bold ${isReturn ? 'text-red-500' : 'text-gray-800'}`}>
                 {isReturn ? 'مرتجع المبيعات' : 'شاشة الكاشير'}
               </h2>

               {isAppInReturnMode ? (
                 /* Return Mode UI */
                 <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5">
                     <span className="text-gray-500 font-medium text-sm">رقم المرتجع:</span>
                     <input className="w-16 h-8 text-center rounded-lg bg-gray-100 border border-gray-300 font-bold focus:outline-none text-red-600" value={displayInvoiceNumber} readOnly />
                   </div>
                   {isNew ? (
                     <div className="flex items-center gap-1.5">
                       <span className="text-gray-500 font-medium text-sm">رقم فاتورة المبيعات:</span>
                       <input 
                         className="w-20 h-8 text-center rounded-lg bg-white border border-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-100" 
                         value={returnSaleInvoiceSearch} 
                         onChange={e => setReturnSaleInvoiceSearch(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleReturnSaleSearch()}
                         placeholder="رقم"
                       />
                       <button
                         onClick={handleReturnSaleSearch}
                         className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 h-8 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                         title="بحث عن فاتورة المبيعات"
                       >
                         <Search className="w-3.5 h-3.5" />
                         بحث
                       </button>
                     </div>
                   ) : (
                     returnInvoiceNo && (
                       <div className="flex items-center gap-1.5 mr-2">
                         <span className="text-gray-500 font-medium text-sm">من فاتورة مبيعات رقم:</span>
                         <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                           {saleTransactions.findIndex(t => t.id === returnInvoiceNo) + 1 || returnInvoiceNo}
                         </span>
                       </div>
                     )
                   )}
                 </div>
               ) : (
                 /* Normal Mode UI */
                 <div className="flex items-center gap-2">
                   <span className="text-gray-500 font-medium text-sm">رقم الفاتورة:</span>
                   <input className={`w-16 h-8 text-center rounded-lg bg-gray-50 border border-gray-200 font-bold focus:outline-none`} value={displayInvoiceNumber} readOnly />
                   <button
                      onClick={() => setShowInvoiceSearchModal(true)}
                      className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 h-8 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      title="بحث برقم الفاتورة"
                   >
                      <Search className="w-3.5 h-3.5" />
                      بحث
                   </button>
                 </div>
               )}
             </div>
          </div>

        </div>

        {/* Main Cashier Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 w-full flex flex-col gap-3">

          {/* Barcode/Item Entry Row */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className={labelTheme}>الكود:</label>
              <input
                id="itemCodeInput"
                className={`w-28 ${inputTheme}`}
                value={itemCode}
                onChange={e => setItemCode(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-sm font-semibold text-gray-600 shrink-0">اسم الصنف:</label>
              <input
                className={`flex-1 min-w-0 ${inputTheme}`}
                placeholder="اكتب اسم الصنف..."
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                 onClick={() => setShowProductSearchModal(true)}
                 className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 h-9 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                 title="بحث باسم الصنف"
              >
                 <Search className="w-4 h-4" />
                 بحث
              </button>
            </div>
          </div>

          {/* Qty/Price/Payment Row */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className={labelTheme}>الكمية:</label>
              <input
                id="itemQtyInput"
                type="number"
                min="1"
                className={`w-20 text-center ${inputTheme}`}
                value={itemQty}
                onChange={e => setItemQty(e.target.value === '' ? '' : Number(e.target.value))}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={() => handleAddItem()}
                disabled={!selectedProduct || !itemQty || itemQty <= 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white h-9 px-4 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
                title="إضافة الصنف"
              >
                + إضافة
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className={labelTheme}>السعر:</label>
              <input
                className={`w-24 text-center bg-gray-50 !font-bold ${inputTheme}`}
                value={itemPrice}
                readOnly
              />
            </div>
            <div className="flex items-center gap-2">
              <label className={labelTheme}>الدفع:</label>
              <select
                className={`w-32 ${inputTheme}`}
                value={actualPaymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                disabled={isReturn}
              >
                <option value="cash">نقدية</option>
                <option value="visa">فيزا</option>
                <option value="instapay">انستا باي</option>
                <option value="vodafone_cash">فودافون كاش</option>
              </select>
            </div>
            {isEWallet && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-600 shrink-0">المرسل:</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={senderWallet}
                    onChange={e => setSenderWallet(e.target.value.replace(/\D/g, ''))}
                    className={`w-20 text-center tracking-[0.3em] text-base font-mono ${inputTheme}`}
                    placeholder="اخر 4"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-600 shrink-0">المستلم:</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={receiverWallet}
                    onChange={e => setReceiverWallet(e.target.value.replace(/\D/g, ''))}
                    className={`w-20 text-center tracking-[0.3em] text-base font-mono ${inputTheme}`}
                    placeholder="اخر 4"
                  />
                </div>
              </>
            )}
          </div>
        </div>



        {/* Invoice Table Container (Matching width) */}
        <div className="bg-white rounded-t-2xl shadow-sm border border-gray-100 w-full overflow-hidden flex flex-col shrink-0 min-h-[200px]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-center text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 text-gray-500 font-medium">
                <tr>
                  <th className="py-3 px-4 font-semibold text-right pr-6 w-2/5">الصنف</th>
                  <th className="py-3 px-4 font-semibold w-1/5">سعر الوحدة</th>
                  <th className="py-3 px-4 font-semibold w-1/5">الكمية</th>
                  <th className="py-3 px-4 font-semibold w-1/5">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 font-medium bg-gray-50/20">الفاتورة فارغة</td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedRowId(item.id)}
                      className={`cursor-pointer transition-colors ${selectedRowId === item.id ? 'bg-blue-50/80' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-3 px-4 text-right pr-6 font-semibold text-gray-700 flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-400 font-mono mt-0.5">{item.id}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-600">{item.price}</td>
                      <td className="py-3 px-4 font-medium text-gray-800">
                        <input
                          type="number"
                          min="1"
                          className="w-16 text-center border border-gray-200 rounded-md py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
                          value={item.cartQuantity}
                          onChange={(e) => updateCartQty(item.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={!isNew}
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{item.price * (item.cartQuantity || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Price Section directly under the table, attached */}
        <div className="bg-gray-50 rounded-b-2xl border border-t-0 border-gray-100 shadow-sm w-full p-4 flex justify-between items-center mb-4">
           {selectedRowId && (
             <span className="text-xs text-gray-400 font-medium animate-pulse">
               اضغط حذف (Delete) لإزالة الصنف المحدد
             </span>
           )}
           {!selectedRowId && <span></span>}
           <div className="flex items-center gap-3">
             <span className="text-gray-500 font-semibold tracking-wide">إجمالي الفاتورة:</span>
             <span className="text-3xl font-bold tracking-tight text-gray-900">{totalAmount} <span className="text-lg text-gray-500">ج.م</span></span>
           </div>
        </div>





        {/* Checkout Modal */}
        {showCheckoutModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-xl text-gray-800">تأكيد الدفع</h3>
                <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-50/80">
                  <span className="font-medium text-gray-600">المبلغ المطلوب سداده:</span>
                  <span className="font-bold text-3xl text-blue-600">{showCustomerData ? (typeof depositAmount === 'number' ? depositAmount : 0) : totalAmount} <span className="text-sm">ج.م</span></span>
                </div>

                {isEWallet && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-gray-500 font-semibold mb-2">تأكيد بيانات المحفظة الإلكترونية</p>
                    <div>
                      <input
                        type="text"
                        maxLength={4}
                        value={senderWallet}
                        onChange={e => setSenderWallet(e.target.value.replace(/\D/g, ''))}
                        className="w-full border border-gray-200 rounded-xl p-3 text-center tracking-[0.5em] text-2xl font-mono focus:ring-2 focus:ring-blue-100 outline-none transition-shadow"
                        placeholder="المرسِل: اخر 4 ارقام"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        maxLength={4}
                        value={receiverWallet}
                        onChange={e => setReceiverWallet(e.target.value.replace(/\D/g, ''))}
                        className="w-full border border-gray-200 rounded-xl p-3 text-center tracking-[0.5em] text-2xl font-mono focus:ring-2 focus:ring-blue-100 outline-none transition-shadow"
                        placeholder="المستلِم: اخر 4 ارقام"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3.5 rounded-xl transition-colors"
                  >
                    رجوع
                  </button>
                  <button
                    onClick={submitTransaction}
                    disabled={isEWallet && (senderWallet.length !== 4 || receiverWallet.length !== 4)}
                    className="flex-[1.5] bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    تأكيد الدفع
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== شمال: العربون ===== */}
      <div className="w-80 shrink-0 flex flex-col gap-3">
        {/* Deposit Toggle Button - hidden in return mode */}
        {!isReturn && (
        <button
          onClick={() => setShowCustomerData(!showCustomerData)}
          className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full flex items-center justify-between gap-2 transition-all hover:bg-gray-50 ${showCustomerData ? 'ring-2 ring-blue-200' : ''}`}
        >
          <span className="text-lg font-bold text-gray-800">
            {showCustomerData ? 'إخفاء' : 'فتح'} العربون
          </span>
          <span className={`text-xl transition-transform ${showCustomerData ? 'rotate-180' : ''}`}>
            ◀
          </span>
        </button>
        )}

        {/* Deposit Content */}
        {showCustomerData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            <h3 className="text-gray-800 font-bold border-b border-gray-100 pb-2 text-sm">بيانات العميل</h3>
            
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">تاريخ السداد:</label>
                <input type="date" className={`${inputTheme} w-full`} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">اسم العميل:</label>
                <input className={`${inputTheme} w-full`} value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">التليفون:</label>
                <input className={`${inputTheme} w-full text-left`} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr" />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">العنوان:</label>
                <input className={`${inputTheme} w-full`} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">حالة التسليم:</label>
                <select className={`${inputTheme} w-full`} value={isDelivered ? 'yes' : 'no'} onChange={(e) => setIsDelivered(e.target.value === 'yes')}>
                  <option value="no">لم يتم التسليم</option>
                  <option value="yes">تم التسليم</option>
                </select>
              </div>
            </div>

            <h3 className="text-gray-800 font-bold border-b border-gray-100 pb-2 text-sm mt-1">تفاصيل السداد</h3>
            
            <div className="flex flex-col gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                <input type="radio" checked={isFullPayment} onChange={() => { setIsFullPayment(true); isNew ? setDepositAmount(totalAmount) : setNewPaymentAmount(Math.max(0, totalAmount - (Number(depositAmount) || 0))); }} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                سداد كلي (غلق المديونية)
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                <input type="radio" checked={!isFullPayment} onChange={() => { setIsFullPayment(false); isNew ? setDepositAmount(0) : setNewPaymentAmount(0); }} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                سداد جزئي (عربون)
              </label>
            </div>

            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
              <span className="text-sm font-semibold text-gray-500">إجمالي الفاتورة:</span>
              <span className="font-bold text-gray-800">{totalAmount.toFixed(2)} <span className="text-xs">ج.م</span></span>
            </div>

            {!isNew && (
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                <span className="text-sm font-semibold text-gray-500">المدفوع مسبقاً:</span>
                <span className="font-bold text-gray-500">{Number(depositAmount) > 0 ? Number(depositAmount).toFixed(2) : '0.00'} <span className="text-xs">ج.م</span></span>
              </div>
            )}

            {!isFullPayment && (
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">{isNew ? 'العربون:' : 'الدفعة الجديدة (عربون):'}</label>
                <input type="number" className={`${inputTheme} w-full text-center font-bold text-blue-800`} value={isNew ? depositAmount : newPaymentAmount} onChange={e => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  if (isNew) setDepositAmount(val);
                  else setNewPaymentAmount(val);
                }} />
              </div>
            )}

            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
              <span className="text-sm font-semibold text-gray-500">المتبقي:</span>
              <span className="font-bold text-red-600">
                {isFullPayment ? '0.00' : (totalAmount > 0 ? Math.max(0, totalAmount - (Number(depositAmount) || 0) - (!isNew ? (Number(newPaymentAmount) || 0) : 0)).toFixed(2) : '0.00')} <span className="text-xs">ج.م</span>
              </span>
            </div>
          </div>
        )}

        {/* Expenses Toggle Button */}
        {!isReturn && !showCustomerData && (
        <button
          onClick={() => setShowExpenses(!showExpenses)}
          className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full flex items-center justify-between gap-2 transition-all hover:bg-gray-50 ${showExpenses ? 'ring-2 ring-orange-200' : ''}`}
        >
          <span className="text-lg font-bold text-gray-800">
            {showExpenses ? 'إخفاء' : 'فتح'} المصروفات
          </span>
          <span className={`text-xl transition-transform ${showExpenses ? 'rotate-180' : ''}`}>
            ◀
          </span>
        </button>
        )}

        {/* Expenses Content */}
        {showExpenses && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            <h3 className="text-gray-800 font-bold border-b border-gray-100 pb-2 text-sm">تسجيل مصروف</h3>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <span className="text-sm font-semibold text-gray-500">رقم المصروف:</span>
                <span className="font-bold text-gray-800 font-mono">{expenses.length + 1}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">نوع المصروف:</label>
                <div className="flex gap-1.5">
                  <select
                    className={`${inputTheme} flex-1`}
                    value={expenseType}
                    onChange={e => setExpenseType(e.target.value)}
                  >
                    <option value="">اختر نوع المصروف...</option>
                    {expenseTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddExpenseType(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 rounded-lg flex items-center justify-center shadow-sm transition-colors shrink-0"
                    title="إضافة نوع جديد"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {showAddExpenseType && (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col gap-2">
                  <label className="text-xs font-semibold text-blue-600">إضافة نوع مصروف جديد:</label>
                  <div className="flex gap-1.5">
                    <input
                      className={`${inputTheme} flex-1`}
                      placeholder="اسم النوع..."
                      value={newExpenseTypeName}
                      onChange={e => setNewExpenseTypeName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newExpenseTypeName.trim()) {
                          addExpenseType(newExpenseTypeName.trim());
                          setExpenseType(newExpenseTypeName.trim());
                          setNewExpenseTypeName('');
                          setShowAddExpenseType(false);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (newExpenseTypeName.trim()) {
                          addExpenseType(newExpenseTypeName.trim());
                          setExpenseType(newExpenseTypeName.trim());
                          setNewExpenseTypeName('');
                          setShowAddExpenseType(false);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 rounded-lg text-xs font-bold shadow-sm transition-colors shrink-0"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => { setShowAddExpenseType(false); setNewExpenseTypeName(''); }}
                      className="bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 h-9 w-9 rounded-lg flex items-center justify-center shadow-sm transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* List existing types for deletion */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {expenseTypes.map(t => (
                      <span key={t} className="bg-white border border-gray-200 text-xs px-2 py-1 rounded-md flex items-center gap-1 text-gray-600">
                        {t}
                        <button onClick={() => deleteExpenseType(t)} className="text-red-400 hover:text-red-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">المبلغ:</label>
                <input
                  type="number"
                  className={`${inputTheme} w-full text-center font-bold text-orange-700`}
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-semibold text-gray-500">الملاحظات:</label>
                <input
                  className={`${inputTheme} w-full`}
                  placeholder="ملاحظات إضافية..."
                  value={expenseNotes}
                  onChange={e => setExpenseNotes(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!expenseType) { alert('يجب اختيار نوع المصروف'); return; }
                if (!expenseAmount || expenseAmount <= 0) { alert('يجب إدخال مبلغ صحيح'); return; }
                addExpense({
                  expenseType,
                  amount: Number(expenseAmount),
                  notes: expenseNotes,
                });
                alert('تم تسجيل المصروف بنجاح');
                setExpenseType('');
                setExpenseAmount('');
                setExpenseNotes('');
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl shadow-sm transition-colors mt-1"
            >
              حفظ المصروف
            </button>
          </div>
        )}
      </div>

      {/* Invoice Search Modal */}
      {showInvoiceSearchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">بحث برقم الفاتورة</h3>
              <button onClick={() => setShowInvoiceSearchModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <input 
                className={`w-full ${inputTheme} text-center text-lg h-12`} 
                placeholder="أدخل رقم الفاتورة..."
                value={searchInvoiceText}
                onChange={e => setSearchInvoiceText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    executeSearchGlobalInvoice();
                    setShowInvoiceSearchModal(false);
                  }
                }}
                autoFocus
              />
              <button 
                onClick={() => {
                  executeSearchGlobalInvoice();
                  setShowInvoiceSearchModal(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-lg shadow-sm"
              >
                بحث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Search Modal */}
      {showProductSearchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">بحث متقدم باسم الصنف</h3>
              <button onClick={() => setShowProductSearchModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <input 
                className={`w-full ${inputTheme}`} 
                placeholder="ابحث باسم الصنف..."
                value={searchProductText}
                onChange={e => setSearchProductText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-auto flex-1 p-2 space-y-1">
              {searchProductText.trim().length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-medium">
                  اكتب اسم الصنف أو الكود للبحث...
                </div>
              ) : (
                <>
                  {products.filter(p => p.name.includes(searchProductText) || p.id.includes(searchProductText)).map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { 
                        setItemCode(p.id); 
                        setItemName(p.name); 
                        setItemPrice(p.price); 
                        setSelectedProduct(p); 
                        setShowProductSearchModal(false);
                        setSearchProductText('');
                        document.getElementById('itemQtyInput')?.focus();
                      }} 
                      className="p-3 rounded-lg hover:bg-blue-50 cursor-pointer flex justify-between items-center border border-transparent hover:border-blue-100 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{p.name}</span>
                        <span className="text-xs text-gray-400 font-mono mt-1">{p.id}</span>
                      </div>
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{p.price} ج.م</span>
                    </div>
                  ))}
                  {products.filter(p => p.name.includes(searchProductText) || p.id.includes(searchProductText)).length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                      لا توجد نتائج مطابقة لبحثك
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
