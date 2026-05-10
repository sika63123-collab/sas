import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Product, CartItem, PaymentMethod, TransactionType } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, FileText, Save, RefreshCw } from 'lucide-react';

export default function Cashier({ initialType = 'sale' }: { initialType?: TransactionType }) {
  const { products, addTransaction, transactions } = useAppStore();
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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Deposit States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [isDelivered, setIsDelivered] = useState(false);

  const isReturn = transactionType.includes('return');
  const isDeposit = transactionType.includes('deposit');
  const actualPaymentMethod = isReturn ? 'cash' : paymentMethod;

  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const isViewingHistory = viewingIndex !== null;
  const currentTransaction = isViewingHistory ? transactions[viewingIndex] : null;
  const invoiceNumber = isViewingHistory && currentTransaction ? currentTransaction.id : transactions.length + 1;

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

  const handleAddItem = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!selectedProduct || !itemQty || itemQty <= 0) return;

    // For sales, check stock
    if (transactionType === 'sale' && selectedProduct.stock <= 0) {
      alert('هذا الصنف غير متوفر في المخزن');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === selectedProduct.id);
      if (existing) {
        // Check stock constraint for sales
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
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const handleSaveInvoice = () => {
    if (cart.length === 0) return;

    // For returns, require return invoice no
    if (isReturn && !returnInvoiceNo.trim()) {
      alert('يجب ادخال رقم الحركة (الفاتورة الأصلية)');
      return;
    }

    const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';
    if (isEWallet && !isReturn) {
      if (senderWallet.length !== 4 || receiverWallet.length !== 4) {
        alert('يجب ادخال اخر 4 ارقام من المحفظة المرسلة والمستلمة بشكل صحيح');
        return;
      }
    }

    submitTransaction();
  };

  const submitTransaction = () => {
    const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';

    if (isEWallet) {
      if (senderWallet.length !== 4 || receiverWallet.length !== 4) {
        alert('يجب ادخال اخر 4 ارقام من المحفظة المرسلة والمستلمة بشكل صحيح');
        return;
      }
    }

    addTransaction({
      type: transactionType,
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
      ...(isDeposit && {
        customerName,
        customerPhone,
        customerAddress,
        pageNumber,
        depositAmount: typeof depositAmount === 'number' ? depositAmount : 0,
        isDelivered
      })
    });

    // Reset
    handleNewInvoice();
  };

  const handleNewInvoice = () => {
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
    setDepositAmount('');
    setIsDelivered(false);
    setViewingIndex(null);
    document.getElementById('itemCodeInput')?.focus();
  };

  const handleSearchInvoice = () => {
    if (!returnInvoiceNo.trim()) return;
    // Try finding by exact id, or by 1-based index (since invoice format right now just uses length + 1 on creation)
    let originalTx = transactions.find(t => String(t.id) === returnInvoiceNo);
    if (!originalTx) {
      const index = parseInt(returnInvoiceNo) - 1;
      if (index >= 0 && index < transactions.length) {
        originalTx = transactions[index];
      }
    }

    if (!originalTx) {
      alert('لم يتم العثور على الفاتورة');
      return;
    }

    if (originalTx.type.includes('return')) {
      alert('لا يمكن ارتجاع فاتورة مرتجع');
      return;
    }

    // Load original items into the cart
    const returnableItems: CartItem[] = originalTx.items.map(item => ({
      product: { id: item.productId, name: item.name, price: item.price, stock: 0 },
      id: item.productId,
      name: item.name,
      price: item.price,
      stock: 0,
      cartQuantity: item.quantity,
    }));
    setCart(returnableItems);

    if (originalTx.type === 'deposit_sale') {
      setDepositAmount(originalTx.depositAmount || 0);
      setCustomerName(originalTx.customerName || '');
      setCustomerPhone(originalTx.customerPhone || '');
      setCustomerAddress(originalTx.customerAddress || '');
      setPageNumber(originalTx.pageNumber || '');
      setIsDelivered(originalTx.isDelivered || false);
    }

    const foundIndex = transactions.findIndex(t => t.id === originalTx?.id);
    if (foundIndex !== -1) {
      setViewingIndex(foundIndex);
    }

    if (isReturn) {
      if (originalTx.type === 'deposit_sale') {
        setTransactionType('deposit_return');
      } else {
        setTransactionType('return');
      }
      alert('تم تحميل أصناف الفاتورة للمرتجع. يمكنك تعديل الكميات أو حذف الأصناف التي لن يتم إرجاعها.');
    } else {
      alert('تم تحميل الفاتورة للعرض أو الاستعلام.');
    }
  };

  const handlePrevious = () => {
    let newIndex = viewingIndex === null ? transactions.length - 1 : viewingIndex - 1;
    if (newIndex >= 0 && newIndex < transactions.length) {
      setViewingIndex(newIndex);
      loadTransactionFromHistory(transactions[newIndex]);
    }
  };

  const handleNext = () => {
    if (viewingIndex !== null) {
      let newIndex = viewingIndex + 1;
      if (newIndex < transactions.length) {
        setViewingIndex(newIndex);
        loadTransactionFromHistory(transactions[newIndex]);
      } else {
        handleNewInvoice();
      }
    }
  };

  const loadTransactionFromHistory = (tx: any) => {
    setCart(tx.items.map((item: any) => ({
      product: { id: item.productId, name: item.name, price: item.price, stock: 0 },
      id: item.productId,
      name: item.name,
      price: item.price,
      stock: 0,
      cartQuantity: item.quantity,
    })));

    if (tx.type === 'deposit_sale') {
      setDepositAmount(tx.depositAmount || 0);
      setCustomerName(tx.customerName || '');
      setCustomerPhone(tx.customerPhone || '');
      setCustomerAddress(tx.customerAddress || '');
      setPageNumber(tx.pageNumber || '');
      setIsDelivered(tx.isDelivered || false);
    }

    setTransactionType(tx.type);
    setPaymentMethod(tx.paymentMethod);
    if (tx.eWalletDetails) {
      setSenderWallet(tx.eWalletDetails.sender || '');
      setReceiverWallet(tx.eWalletDetails.receiver || '');
    }
  };

  const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#a3bcc9] font-sans p-2 pb-0" dir="rtl">

      {/* Top Header Row */}
      <div className="flex items-center mb-1 px-2 gap-2 flex-wrap">
        {/* Invoice number + search */}
        <div className="flex items-center">
          <div className="bg-black text-white px-2 py-0.5 font-bold text-xs tracking-widest text-center min-w-[80px] h-7">رقم الفاتورة :</div>
          <input className="w-12 h-7 text-center text-sm border-y border-r border-[#6eb1d6] shadow-inner font-bold outline-none bg-white" value={invoiceNumber} readOnly />
          <button onClick={() => setShowSearchModal(true)} className="bg-[#ff6600] hover:bg-[#e65c00] text-white px-2 h-7 font-bold flex items-center justify-center border-y border-l border-[#6eb1d6] cursor-pointer text-xs" title="بحث">بحث</button>
        </div>

        {/* Title */}
        <h2 className={`text-lg font-bold flex-1 text-center ${isReturn ? 'text-red-700' : 'text-[#143c75]'}`}>
          {transactionType === 'sale' ? 'مبيعات الكاشير' :
            transactionType === 'return' ? 'مرتجع كاشير' :
              transactionType === 'deposit_sale' ? 'مبيعات عربون' :
                'مرتجع مبيعات عربون'}
        </h2>

        {/* Action Buttons - centered */}
        <div className="flex items-center gap-1">
          <button onClick={handlePrevious} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-7 px-3 text-xs shadow hover:bg-[#d8e3ea] transition-colors">‹ السابق</button>
          <button onClick={handleNext} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-7 px-3 text-xs shadow hover:bg-[#d8e3ea] transition-colors">التالي ›</button>
          <div className="w-px h-5 bg-gray-400 mx-1"></div>
          <button onClick={handleNewInvoice} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-7 px-4 text-xs shadow hover:bg-[#d8e3ea] transition-colors">جديد</button>
          <button onClick={handleSaveInvoice} className="bg-[#1a5276] hover:bg-[#154360] text-white font-bold h-7 px-4 text-xs shadow transition-colors">حفظ</button>
        </div>
      </div>

      {/* Row 2: Code and Item Name - compact */}
      <div className="flex items-center mb-1 gap-2 px-2">
        <div className="flex items-center">
          <div className="bg-black text-white px-2 py-0.5 font-bold text-xs text-center min-w-[55px] h-7">الكود :</div>
          <input
            id="itemCodeInput"
            className="w-20 h-7 text-center text-sm border-y border-r border-[#6eb1d6] shadow-inner outline-none bg-white font-bold"
            value={itemCode}
            onChange={e => setItemCode(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="flex items-center w-[300px]">
          <div className="bg-black text-white px-2 py-0.5 font-bold text-xs text-center min-w-[80px] h-7">اسم الصنف :</div>
          <input
            className="flex-1 h-7 border-y border-r border-[#6eb1d6] shadow-inner outline-none px-2 text-sm bg-white font-bold"
            placeholder="بحث..."
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={() => setShowProductModal(true)} className="bg-[#ff6600] hover:bg-[#e65c00] cursor-pointer text-white px-2 h-7 font-bold flex items-center justify-center border-y border-l border-[#6eb1d6] text-xs">...</button>
        </div>
      </div>

      {/* Row 3: Quantity, Price, Payment Method, Add Button - compact */}
      <div className="flex items-center mb-1 px-2 gap-2">
        <div className="flex items-center flex-shrink-0">
          <div className="bg-black text-white px-2 py-0.5 font-bold text-xs text-center min-w-[55px] h-7">الكمية :</div>
          <input
            type="number"
            min="1"
            className="w-14 h-7 text-center text-sm border border-[#6eb1d6] shadow-inner outline-none font-bold"
            value={itemQty}
            onChange={e => setItemQty(e.target.value === '' ? '' : Number(e.target.value))}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex items-center flex-shrink-0">
          <div className="bg-black text-white px-2 py-0.5 font-bold text-xs text-center min-w-[55px] h-7">السعر :</div>
          <input
            className="w-20 h-7 text-center text-sm border border-[#6eb1d6] shadow-inner outline-none bg-white font-bold"
            value={itemPrice}
            readOnly
          />
        </div>

        <div className="flex items-center flex-shrink-0">
          <div className="bg-black text-white px-2 py-0.5 font-bold text-xs text-center min-w-[90px] h-7">طريقة السداد :</div>
          <select
            className="w-28 h-7 border border-[#6eb1d6] shadow-inner outline-none bg-white text-xs px-2 disabled:bg-gray-200 disabled:text-gray-500 font-bold"
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

        {isEWallet && !isReturn && (
          <div className="flex items-center gap-1 bg-[#eaeced] px-2 h-7 border border-[#6eb1d6]">
            <div className="text-xs font-bold text-blue-900">مرسل:</div>
            <input className="w-10 h-5 text-center text-xs border border-gray-400 outline-none font-bold placeholder-gray-300" maxLength={4} value={senderWallet} onChange={e => setSenderWallet(e.target.value.replace(/\D/g, ''))} />
            <div className="text-xs font-bold text-blue-900 mr-1">مستلم:</div>
            <input className="w-10 h-5 text-center text-xs border border-gray-400 outline-none font-bold placeholder-gray-300" maxLength={4} value={receiverWallet} onChange={e => setReceiverWallet(e.target.value.replace(/\D/g, ''))} />
          </div>
        )}


        <button
          onClick={handleAddItem}
          className="bg-[#64a1e6] hover:bg-[#528cc7] text-white font-bold h-7 px-5 text-sm flex items-center justify-center"
        >
          + إضافة
        </button>
      </div>



      {/* Table Section */}
      <div className="bg-[#e9eced] flex flex-col mr-2 ml-auto border border-[#9eaab3] shadow-inner mt-1 mb-1 overflow-hidden" style={{ height: '220px', width: '70%' }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-center text-sm">
            <thead className="bg-[#eaeced] border-b border-[#a9b7c2] sticky top-0" style={{ zIndex: 10 }}>
              <tr>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-1/6">الكود</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-1/3 text-right pr-4">اسم الصنف</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-1/6">سعر الوحدة</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-1/6">الكمية</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-1/6">الاجمالي</th>
                <th className="py-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400 font-bold">الفاتورة فارغة، يرجى إضافة عناصر.</td>
                </tr>
              ) : (
                cart.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors cursor-default text-black bg-white border-b border-gray-200">
                    <td className="py-1 px-2 border-l border-gray-100 font-bold text-gray-600">{item.id}</td>
                    <td className="py-1 px-2 border-l border-gray-100 font-bold text-right pr-4">{item.name}</td>
                    <td className="py-1 px-2 border-l border-gray-100 font-bold text-gray-700">{item.price}</td>
                    <td className="py-1 px-2 border-l border-gray-100 font-bold">{item.cartQuantity}</td>
                    <td className="py-1 px-2 border-l border-gray-100 font-bold text-gray-800">{item.price * item.cartQuantity}</td>
                    <td className="py-1 px-1 text-center">
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDeposit && (
        <div className="mx-2 mb-2 bg-[#eaeced] p-2 border border-[#a9b7c2] shadow-sm flex flex-col md:flex-row gap-4 text-sm mt-auto">
          {/* Right Box (Customer & Delivery Data) */}
          <div className="flex-1 flex flex-col gap-2 order-2 md:order-1">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center">
                <div className="bg-black text-white px-3 py-1 font-bold text-center min-w-[100px] h-8 flex flex-col justify-center">تاريخ السداد :</div>
                <input type="date" className="flex-1 h-8 px-2 border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold" />
              </div>
              <div className="flex-1 flex items-center">
                <div className="bg-black text-white px-3 py-1 font-bold text-center min-w-[100px] h-8 flex flex-col justify-center">رقم البطاقة :</div>
                <input className="flex-1 h-8 px-2 border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold text-left" value={pageNumber} onChange={e => setPageNumber(e.target.value)} dir="ltr" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center">
                <div className="bg-[#4988e0] text-white px-3 py-1 font-bold text-center min-w-[100px] h-8 flex flex-col justify-center">التليفون :</div>
                <input className="flex-1 h-8 px-2 border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold text-left" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr" />
              </div>
              <div className="flex-1 flex items-center">
                <div className="bg-[#4988e0] text-white px-3 py-1 font-bold text-center min-w-[100px] h-8 flex flex-col justify-center">العنوان :</div>
                <input className="flex-1 h-8 px-2 border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center">
                <div className="bg-[#4988e0] text-white px-3 py-1 font-bold text-center min-w-[100px] h-8 flex flex-col justify-center">اسم العميل :</div>
                <input className="flex-1 h-8 px-2 border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="flex-1 flex items-center">
                <div className="bg-black text-white px-3 py-1 font-bold text-center min-w-[100px] h-8 flex flex-col justify-center">التسليم :</div>
                <select className="flex-1 h-8 px-2 border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold" value={isDelivered ? 'yes' : 'no'} onChange={(e) => setIsDelivered(e.target.value === 'yes')}>
                  <option value="no">لم يتم التسليم</option>
                  <option value="yes">تم التسليم</option>
                </select>
              </div>
            </div>
          </div>

          {/* Left Box (Financials) */}
          <div className="w-full md:w-[350px] flex flex-col gap-2 md:border-r border-[#a9b7c2] md:pr-4 order-1 md:order-2 shrink-0">
            <div className="flex items-center">
              <div className="bg-black text-white px-3 py-1 font-bold text-center min-w-[140px] h-8 flex flex-col justify-center tracking-wide">العربون :</div>
              <input type="number" className="flex-1 h-8 text-center border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold text-black" value={depositAmount} onChange={e => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="flex items-center">
              <div className="bg-black text-white px-3 py-1 font-bold text-center min-w-[140px] h-8 flex flex-col justify-center tracking-wide">سدد الباقى :</div>
              <input className="flex-1 h-8 text-center border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-[#e9eced] font-bold text-black" value={totalAmount > 0 ? (totalAmount - (typeof depositAmount === 'number' ? depositAmount : 0)).toFixed(2) : '0'} readOnly />
            </div>
            <div className="flex items-center">
              <div className="bg-black text-white px-3 py-1 font-bold text-center min-w-[140px] h-8 flex flex-col justify-center tracking-wide">إجمالي الفاتورة :</div>
              <input className="flex-1 h-8 text-center border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold text-black" value={totalAmount > 0 ? totalAmount.toFixed(2) : '0'} readOnly />
            </div>
            <div className="flex items-center">
              <div className="bg-black text-white px-3 py-1 font-bold text-center min-w-[140px] h-8 flex flex-col justify-center tracking-wide">طريقة السداد :</div>
              <select
                className="flex-1 h-8 px-2 border-y border-l border-[#6eb1d6] shadow-inner outline-none bg-white font-bold"
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
          </div>
        </div>
      )}
      {/* Bottom Controls Bar - total only */}
      <div className="flex justify-between items-center px-2 pb-3 mt-auto">
        <div className="flex items-center shadow-md">
          <div className="bg-black text-white px-3 h-9 flex items-center justify-center text-sm font-bold tracking-wider">اجمالي الفاتورة:</div>
          <div className="bg-white border-y border-l border-gray-300 h-9 px-6 flex items-center justify-center font-bold text-xl text-black">{totalAmount}</div>
        </div>
      </div>


      {/* Search Invoice Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">{isReturn ? 'بحث عن فاتورة (للمرتجع)' : 'بحث عن فاتورة'}</h3>
              <button onClick={() => setShowSearchModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-bold text-sm">{isReturn ? 'رقم الفاتورة الأصلي' : 'رقم الفاتورة'}</label>
                <input
                  type="text"
                  value={returnInvoiceNo}
                  onChange={e => setReturnInvoiceNo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none tracking-widest text-lg"
                  placeholder="أدخل رقم الفاتورة..."
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearchInvoice();
                      setShowSearchModal(false);
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    handleSearchInvoice();
                    setShowSearchModal(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  بحث وتحميل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">بحث عن صنف</h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={productSearchTerm}
                onChange={e => setProductSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                placeholder="ابحث بالكود أو اسم الصنف..."
                autoFocus
              />
            </div>
            <div className="overflow-auto flex-1 bg-gray-50 p-4">
              <div className="space-y-2">
                {productSearchTerm.trim() === '' ? (
                  <div className="text-center text-gray-500 py-8 font-bold text-lg">
                    يرجى كتابة اسم أو كود الصنف للبحث...
                  </div>
                ) : (
                  <>
                    {products.filter(p => p.name.includes(productSearchTerm) || p.id.includes(productSearchTerm) || (p.barcode && p.barcode.includes(productSearchTerm))).map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setItemCode(p.id);
                          setItemName(p.name);
                          setItemPrice(p.price);
                          setSelectedProduct(p);
                          setShowProductModal(false);
                          setProductSearchTerm('');
                        }}
                        className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors flex justify-between items-center"
                      >
                        <div className="flex gap-4">
                          <div className="bg-gray-100 px-3 py-1 rounded text-sm font-bold text-gray-600">{p.id}</div>
                          <div className="font-bold text-gray-800 text-lg">{p.name}</div>
                        </div>
                        <div className="flex gap-6 items-center">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 font-bold">الرصيد</div>
                            <div className={`font-bold ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{p.stock}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 font-bold">السعر</div>
                            <div className="font-bold text-blue-700 text-lg">{p.price} ج.م</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {products.filter(p => p.name.includes(productSearchTerm) || p.id.includes(productSearchTerm) || (p.barcode && p.barcode.includes(productSearchTerm))).length === 0 && (
                      <div className="text-center text-gray-500 py-8 font-bold">لم يتم العثور على أصناف</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

