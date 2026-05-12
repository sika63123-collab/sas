import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Product, CartItem, PaymentMethod, TransactionType } from '../types';
import { CheckCircle, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

export default function Cashier({ initialType = 'sale' }: { initialType?: TransactionType }) {
  const { products, addTransaction, transactions, updateTransaction } = useAppStore();
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

  useEffect(() => {
    setTransactionType(initialType);
    setShowCustomerData(initialType === 'deposit_sale' || initialType === 'deposit_return');
    handleNewInvoice();
  }, [initialType]);

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

  // Selected row for deletion
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const isReturn = transactionType.includes('return');
  const actualPaymentMethod = isReturn ? 'cash' : paymentMethod;
  const invoiceNumber = viewingIndex === -1 ? transactions.length + 1 : viewingIndex + 1;
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const isNew = viewingIndex === -1;

  // Auto-fill deposit amount if full payment is checked
  useEffect(() => {
    if (isFullPayment) {
      setDepositAmount(totalAmount);
    }
  }, [totalAmount, isFullPayment]);

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

    if (transactionType === 'sale' && selectedProduct.stock <= 0) {
      alert('هذا الصنف غير متوفر في المخزن');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === selectedProduct.id);
      if (existing) {
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
      handleAddItem(e);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    if (selectedRowId === id) setSelectedRowId(null);
  };

  const submitTransaction = () => {
    const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';

    if (isEWallet) {
      if (senderWallet.length !== 4 || receiverWallet.length !== 4) {
        alert('يجب ادخال اخر 4 ارقام من المحفظة المرسلة والمستلمة بشكل صحيح');
        return;
      }
    }

    if (!isNew) {
      // Updating an existing deposit invoice or adding a payment
      const existingTx = transactions[viewingIndex];
      const paymentVal = typeof newPaymentAmount === 'number' ? newPaymentAmount : 0;
      
      // Update the original invoice with the new total deposit
      const currentDeposit = typeof existingTx.depositAmount === 'number' ? existingTx.depositAmount : 0;
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
        depositAmount: typeof depositAmount === 'number' ? depositAmount : 0,
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
    if (index < 0 || index >= transactions.length) return;
    const tx = transactions[index];
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
    if (tx.type.includes('deposit')) {
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
    if (viewingIndex === -1 && transactions.length > 0) {
      loadTransaction(transactions.length - 1);
    } else if (viewingIndex > 0) {
      loadTransaction(viewingIndex - 1);
    }
  };

  const handleNext = () => {
    if (viewingIndex !== -1 && viewingIndex < transactions.length - 1) {
      loadTransaction(viewingIndex + 1);
    } else if (viewingIndex === transactions.length - 1) {
      handleNewInvoice();
    }
  };

  const executeSearchGlobalInvoice = () => {
    const text = searchInvoiceText.trim();
    if (!text) return;
    // Find by ID directly
    let idx = transactions.findIndex(t => String(t.id) === text);
    if (idx === -1) {
        // also try finding by invoice number (sequence)
        const num = parseInt(text) - 1;
        if (num >= 0 && num < transactions.length) {
            idx = num;
        }
    }
    if (idx !== -1) {
      if (isReturn) {
         // Load for return
         const originalTx = transactions[idx];
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
         setViewingIndex(-1); // Keep it as a new transaction for return

         if (originalTx.type === 'deposit_sale') {
           setShowCustomerData(true);
           setDepositAmount(originalTx.depositAmount || 0);
           setIsFullPayment((originalTx.depositAmount || 0) === originalTx.totalAmount);
           setCustomerName(originalTx.customerName || '');
           setCustomerPhone(originalTx.customerPhone || '');
           setCustomerAddress(originalTx.customerAddress || '');
           setPageNumber(originalTx.pageNumber || '');
           setIsDelivered(originalTx.isDelivered || false);
         }
         alert('تم تحميل أصناف الفاتورة للمرتجع. احذف الأصناف غير المرتجعة ثم اضغط حفظ الفاتورة.');
      } else {
         loadTransaction(idx);
      }
    } else {
      alert('لم يتم العثور على الفاتورة');
    }
  };



  const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';

  // Soft modern Apple-style UI elements
  const inputTheme = "h-9 border border-gray-200 rounded-lg shadow-sm outline-none px-3 bg-white font-medium text-sm focus:ring-2 focus:ring-blue-100 transition-shadow";
  const labelTheme = "text-sm font-semibold text-gray-600 w-24 shrink-0";

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#f5f5f7] font-sans p-4 pb-0" dir="rtl">
      {/* Maximum compact layout, avoiding stretching */}
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
        
        {/* Top Header / Action Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 w-full flex flex-col gap-4">
          
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
             {/* Title and Invoice No */}
             <div className="flex items-center gap-4 px-2">
               <h2 className={`text-xl font-bold ${isReturn ? 'text-red-500' : 'text-gray-800'}`}>
                 {isReturn ? 'مرتجع المبيعات' : 'شاشة الكاشير'}
               </h2>
               <div className="flex items-center gap-2">
                 <span className="text-gray-500 font-medium text-sm">رقم الفاتورة:</span>
                 <input className={`w-16 h-8 text-center rounded-lg bg-gray-50 border border-gray-200 font-bold focus:outline-none`} value={invoiceNumber} readOnly />
                 <button
                    onClick={() => setShowInvoiceSearchModal(true)}
                    className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 h-8 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    title="بحث برقم الفاتورة"
                 >
                    <Search className="w-3.5 h-3.5" />
                    بحث
                 </button>
               </div>
             </div>

             {/* Navigation and Actions */}
             <div className="flex items-center gap-2">
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
                list="productCodes"
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
                list="productNames"
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
                type="number"
                min="1"
                className={`w-20 text-center ${inputTheme}`}
                value={itemQty}
                onChange={e => setItemQty(e.target.value === '' ? '' : Number(e.target.value))}
                onKeyDown={handleKeyDown}
              />
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
            <button
              onClick={handleAddItem}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold h-9 px-6 rounded-lg text-sm flex items-center justify-center transition-all mr-auto shadow-sm"
            >
              + إضافة
            </button>
          </div>
        </div>

        <datalist id="productNames">
          {itemName.trim().length > 0 && products.map(p => <option key={p.id} value={p.name} />)}
        </datalist>
        <datalist id="productCodes">
          {itemCode.trim().length > 0 && products.map(p => <option key={`code-${p.id}`} value={p.id} />)}
        </datalist>
        <datalist id="globalProductNames">
          {searchProductText.trim().length > 0 && products.map(p => <option key={`g-${p.id}`} value={p.name} />)}
        </datalist>

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
                      <td className="py-3 px-4 font-medium text-gray-800">{item.cartQuantity}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{item.price * item.cartQuantity}</td>
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

        {/* Accordion / Customer Data Toggle */}
        <button 
           onClick={() => setShowCustomerData(!showCustomerData)}
           className="bg-white rounded-full px-4 py-1.5 shadow-sm border border-gray-200 text-gray-500 font-medium text-xs flex items-center gap-1 hover:bg-gray-50 transition-colors mb-4 focus:outline-none"
        >
           بيانات العميل أو العربون {showCustomerData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Customer & Deposit Data (Parallel Width) */}
        {showCustomerData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 w-full flex flex-col md:flex-row gap-6 mb-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Right Side: Customer Info (Vertical) */}
            <div className="flex-1 flex flex-col gap-3">
              <h3 className="text-gray-800 font-bold mb-1 border-b border-gray-100 pb-2">بيانات العميل</h3>
              
              <div className="flex items-center gap-3">
                <label className={labelTheme}>تاريخ السداد:</label>
                <input type="date" className={`flex-1 ${inputTheme}`} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>

              <div className="flex items-center gap-3">
                <label className={labelTheme}>اسم العميل:</label>
                <input className={`flex-1 ${inputTheme}`} value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>

              <div className="flex items-center gap-3">
                <label className={labelTheme}>التليفون:</label>
                <input className={`flex-1 text-left ${inputTheme}`} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr" />
              </div>

              <div className="flex items-center gap-3">
                <label className={labelTheme}>العنوان:</label>
                <input className={`flex-1 ${inputTheme}`} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
              </div>

              <div className="flex items-center gap-3">
                <label className={labelTheme}>حالة التسليم:</label>
                <select className={`flex-1 ${inputTheme}`} value={isDelivered ? 'yes' : 'no'} onChange={(e) => setIsDelivered(e.target.value === 'yes')}>
                  <option value="no">لم يتم التسليم</option>
                  <option value="yes">تم التسليم</option>
                </select>
              </div>
            </div>

            {/* Left Side: Financials/Deposit */}
            <div className="flex-[0.8] flex flex-col gap-3 md:border-r border-gray-100 md:pr-6">
              <h3 className="text-gray-800 font-bold mb-1 border-b border-gray-100 pb-2">تفاصيل السداد</h3>
              
              <div className="flex flex-col gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                  <input type="radio" checked={isFullPayment} onChange={() => { setIsFullPayment(true); isNew ? setDepositAmount(totalAmount) : setNewPaymentAmount(totalAmount - (typeof depositAmount === 'number' ? depositAmount : 0)); }} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                  سداد كلي (غلق المديونية)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                  <input type="radio" checked={!isFullPayment} onChange={() => { setIsFullPayment(false); isNew ? setDepositAmount(0) : setNewPaymentAmount(0); }} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                  سداد جزئي (عربون)
                </label>
              </div>

              <div className="flex items-center gap-3 mt-1">
                 <label className={labelTheme}>إجمالي الفاتورة:</label>
                 <input 
                   className={`flex-1 text-center bg-gray-50 font-bold text-gray-800 ${inputTheme}`} 
                   value={totalAmount.toFixed(2)} 
                   readOnly 
                 />
              </div>

              {!isNew && (
                <div className="flex items-center gap-3">
                   <label className={labelTheme}>المدفوع مسبقاً:</label>
                   <input 
                     className={`flex-1 text-center bg-gray-50 font-bold text-gray-500 ${inputTheme}`} 
                     value={typeof depositAmount === 'number' ? depositAmount.toFixed(2) : '0.00'} 
                     readOnly 
                   />
                </div>
              )}

              {!isFullPayment && (
                <div className="flex items-center gap-3">
                   <label className={labelTheme}>{isNew ? 'العربون:' : 'الدفعة الجديدة (عربون):'}</label>
                   <input 
                     type="number" 
                     className={`flex-1 text-center font-bold text-blue-800 ${inputTheme}`} 
                     value={isNew ? depositAmount : newPaymentAmount} 
                     onChange={e => {
                       const val = e.target.value === '' ? '' : Number(e.target.value);
                       if (isNew) setDepositAmount(val);
                       else setNewPaymentAmount(val);
                     }} 
                   />
                </div>
              )}

              <div className="flex items-center gap-3">
                 <label className={labelTheme}>المتبقي:</label>
                 <input 
                   className={`flex-1 text-center bg-gray-50 text-red-600 font-bold ${inputTheme}`} 
                   value={isFullPayment ? '0.00' : (totalAmount > 0 ? Math.max(0, totalAmount - (typeof depositAmount === 'number' ? depositAmount : 0) - (!isNew ? (typeof newPaymentAmount === 'number' ? newPaymentAmount : 0) : 0)).toFixed(2) : '0.00')} 
                   readOnly 
                 />
              </div>
            </div>
          </div>
        )}



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
