import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Product, CartItem, PaymentMethod, TransactionType } from '../types';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle, FileText, Save, RefreshCw, Printer, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';

export default function Cashier({ initialType = 'sale' }: { initialType?: TransactionType }) {
  const { products, addTransaction, transactions, updateTransaction } = useAppStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactionType, setTransactionType] = useState<TransactionType>(initialType);
  const [depositMode, setDepositMode] = useState(initialType.includes('deposit'));
  const [showDepositSection, setShowDepositSection] = useState(initialType.includes('deposit'));

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
  const isDeposit = depositMode;
  const actualPaymentMethod = isReturn ? 'cash' : paymentMethod;

  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  const isViewingHistory = viewingIndex !== null;
  const currentTransaction = isViewingHistory ? transactions[viewingIndex] : null;
  const invoiceNumber = isViewingHistory && currentTransaction ? currentTransaction.id : (transactions.length + 1).toString();

  // Print state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleDepositMode = () => {
    if (depositMode) {
      if (transactionType === 'deposit_sale') setTransactionType('sale');
      else if (transactionType === 'deposit_return') setTransactionType('return');
      setDepositMode(false);
    } else {
      if (transactionType === 'sale') setTransactionType('deposit_sale');
      else if (transactionType === 'return') setTransactionType('deposit_return');
      setDepositMode(true);
      setShowDepositSection(true);
    }
  };

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

    if (transactionType === 'sale' && selectedProduct.stock <= 0) {
      alert('هذا الصنف غير متوفر في المخزن');
      return;
    }

    const price = typeof itemPrice === 'number' ? itemPrice : selectedProduct.price;

    setCart(prev => {
      const existing = prev.find(item => item.id === selectedProduct.id);
      if (existing) {
        if (transactionType === 'sale' && existing.cartQuantity + Number(itemQty) > selectedProduct.stock) {
          alert('لا يوجد كمية كافية في المخزن');
          return prev;
        }
        return prev.map(item =>
          item.id === selectedProduct.id ? { ...item, cartQuantity: item.cartQuantity + Number(itemQty), price } : item
        );
      }
      return [...prev, { ...selectedProduct, price, cartQuantity: Number(itemQty) }];
    });

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

  const updateCartItemPrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, price: newPrice } : item
    ));
  };

  const updateCartItemQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, cartQuantity: newQty } : item
    ));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const handleSaveInvoice = () => {
    if (cart.length === 0) return;

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

    if (isViewingHistory && currentTransaction) {
      if (window.confirm('تحديث الفاتورة الحالية؟')) {
        updateTransaction(currentTransaction.id, {
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
        alert('تم تحديث الفاتورة بنجاح');
        handleNewInvoice();
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

    handleNewInvoice();
  };

  const handlePrintInvoice = () => {
    if (cart.length === 0) {
      alert('الفاتورة فارغة');
      return;
    }
    setShowPrintModal(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى السماح بالنوافق المنبثقة للطباعة');
      return;
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG');
    const timeStr = now.toLocaleTimeString('ar-EG');
    const depositInfo = isDeposit ? `
      <tr><td colspan="2" style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #e65100;">العميل: ${customerName || '---'} | التليفون: ${customerPhone || '---'}</td></tr>
      <tr><td colspan="2" style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #e65100;">العربون: ${typeof depositAmount === 'number' ? depositAmount : 0} ج.م | الباقي: ${(totalAmount - (typeof depositAmount === 'number' ? depositAmount : 0)).toFixed(2)} ج.م</td></tr>
    ` : '';

    printWindow.document.write(`
      <html dir="rtl">
      <head><meta charset="utf-8"><title>فاتورة رقم ${invoiceNumber}</title>
      <style>
        @page { margin: 1cm; }
        body { font-family: 'Cairo', 'Arabic Typesetting', Tahoma, sans-serif; margin: 0; padding: 20px; color: #222; }
        .invoice { max-width: 400px; margin: auto; border: 1px solid #ccc; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px; }
        .header h2 { margin: 0; font-size: 22px; }
        .header p { margin: 2px 0; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #eee; padding: 6px; font-size: 13px; border-bottom: 2px solid #333; }
        td { padding: 5px; font-size: 13px; border-bottom: 1px solid #eee; text-align: center; }
        .total { text-align: left; font-size: 18px; font-weight: bold; padding: 10px 0; border-top: 2px solid #333; margin-top: 10px; }
        .footer { text-align: center; font-size: 11px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
      </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h2>X_PHONE SYSTEM</h2>
            <p>${transactionType === 'sale' ? 'فاتورة بيع' : transactionType === 'return' ? 'فاتورة مرتجع' : transactionType === 'deposit_sale' ? 'فاتورة بيع عربون' : 'فاتورة مرتجع عربون'}</p>
            <p>التاريخ: ${dateStr} | الوقت: ${timeStr}</p>
            <p>رقم الفاتورة: ${invoiceNumber}</p>
          </div>
          <table>
            <thead>
              <tr><th>الكود</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              ${cart.map(item => `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.cartQuantity}</td><td>${item.price}</td><td>${item.price * item.cartQuantity}</td></tr>`).join('')}
            </tbody>
          </table>
          ${depositInfo}
          <div class="total">الإجمالي: ${totalAmount} ج.م</div>
          <p style="text-align: left; font-size: 14px;">طريقة السداد: ${actualPaymentMethod === 'cash' ? 'نقدية' : actualPaymentMethod === 'visa' ? 'فيزا' : actualPaymentMethod === 'instapay' ? 'انستا باي' : 'فودافون كاش'}</p>
          <div class="footer">شكراً لتسوقكم معنا</div>
        </div>
        <script>window.print(); window.close();<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
    setShowPrintModal(false);
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
        setDepositMode(true);
      } else {
        setTransactionType('return');
        setDepositMode(false);
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

    if (tx.type === 'deposit_sale' || tx.type === 'deposit_return') {
      setDepositAmount(tx.depositAmount || 0);
      setCustomerName(tx.customerName || '');
      setCustomerPhone(tx.customerPhone || '');
      setCustomerAddress(tx.customerAddress || '');
      setPageNumber(tx.pageNumber || '');
      setIsDelivered(tx.isDelivered || false);
      setDepositMode(true);
      setShowDepositSection(true);
    } else {
      setDepositMode(false);
      setShowDepositSection(false);
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
        <div className="flex items-center">
          <div className="bg-black text-white px-2 py-0.5 font-bold text-xs tracking-widest text-center min-w-[80px] h-7">رقم الفاتورة :</div>
          <input className="w-12 h-7 text-center text-sm border-y border-r border-[#6eb1d6] shadow-inner font-bold outline-none bg-white" value={invoiceNumber} readOnly />
          <button onClick={() => setShowSearchModal(true)} className="bg-[#ff6600] hover:bg-[#e65c00] text-white px-2 h-7 font-bold flex items-center justify-center border-y border-l border-[#6eb1d6] cursor-pointer text-xs" title="بحث">بحث</button>
        </div>

        <h2 className={`text-lg font-bold flex-1 text-center ${isReturn ? 'text-red-700' : 'text-[#143c75]'}`}>
          {transactionType === 'sale' ? 'شاشة الكاشير' :
            transactionType === 'return' ? 'مرتجع كاشير' :
              transactionType === 'deposit_sale' ? 'شاشة الكاشير - عربون' :
                'مرتجع عربون'}
        </h2>

        <div className="flex items-center gap-1">
          <button onClick={toggleDepositMode} className={`h-7 px-2 text-xs font-bold flex items-center gap-1 border transition-colors ${depositMode ? 'bg-[#e65100] text-white border-[#bf4500]' : 'bg-[#e4ebf1] border-[#a2b5bf] text-[#2c4b63] hover:bg-[#d8e3ea]'}`} title={depositMode ? 'إلغاء تفعيل العربون' : 'تفعيل العربون'}>
            {depositMode ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {depositMode ? 'عربون مفعل' : 'عربون'}
          </button>
          <button onClick={handlePrevious} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-7 px-3 text-xs shadow hover:bg-[#d8e3ea] transition-colors">‹ السابق</button>
          <button onClick={handleNext} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-7 px-3 text-xs shadow hover:bg-[#d8e3ea] transition-colors">التالي ›</button>
          <div className="w-px h-5 bg-gray-400 mx-1"></div>
          <button onClick={handleNewInvoice} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-7 px-4 text-xs shadow hover:bg-[#d8e3ea] transition-colors">جديد</button>
          <button onClick={handlePrintInvoice} className="bg-[#5a8f4c] hover:bg-[#4a7a3e] text-white font-bold h-7 px-3 text-xs shadow transition-colors flex items-center gap-1">
            <Printer className="h-3 w-3" /> طباعة
          </button>
          <button onClick={handleSaveInvoice} className="bg-[#1a5276] hover:bg-[#154360] text-white font-bold h-7 px-4 text-xs shadow transition-colors">حفظ</button>
        </div>
      </div>

      {/* Row 2: Code and Item Name */}
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

      {/* Row 3: Quantity, Price, Payment Method, Add Button */}
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
            type="number"
            className="w-20 h-7 text-center text-sm border border-[#6eb1d6] shadow-inner outline-none bg-white font-bold"
            value={itemPrice}
            onChange={e => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
            onKeyDown={handleKeyDown}
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
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-[8%]">الكود</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-[28%] text-right pr-4">اسم الصنف</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-[13%]">سعر الوحدة</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-[10%]">الكمية</th>
                <th className="py-2 px-2 font-bold text-gray-800 border-l border-white w-[13%]">الإجمالي</th>
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
                  <tr key={item.id + '-' + idx} className="hover:bg-blue-50 transition-colors cursor-default text-black bg-white border-b border-gray-200">
                    <td className="py-1 px-2 border-l border-gray-100 font-bold text-gray-600">{item.id}</td>
                    <td className="py-1 px-2 border-l border-gray-100 font-bold text-right pr-4">{item.name}</td>
                    <td className="py-1 px-2 border-l border-gray-100 font-bold text-gray-700">
                      <input
                        type="number"
                        className="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-sm font-bold outline-none focus:border-blue-500"
                        value={item.price}
                        onChange={e => updateCartItemPrice(item.id, Number(e.target.value))}
                      />
                    </td>
                    <td className="py-1 px-2 border-l border-gray-100 font-bold">
                      <input
                        type="number"
                        min="1"
                        className="w-12 text-center border border-gray-300 rounded px-1 py-0.5 text-sm font-bold outline-none focus:border-blue-500"
                        value={item.cartQuantity}
                        onChange={e => updateCartItemQty(item.id, Number(e.target.value))}
                      />
                    </td>
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

      {/* Deposit Section Toggle Header (visible when deposit mode is on) */}
      {depositMode && (
        <div className="mx-2 mb-1">
          <button
            onClick={() => setShowDepositSection(!showDepositSection)}
            className="flex items-center gap-2 bg-[#e65100] text-white px-3 py-1 font-bold text-sm w-full rounded-t shadow-sm hover:bg-[#d44a00] transition-colors"
          >
            {showDepositSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            بيانات العربون والعملاء
            {!showDepositSection && (
              <span className="text-xs opacity-75 mr-auto">
                {customerName ? `العميل: ${customerName}` : 'مغلق'} 
                {typeof depositAmount === 'number' && depositAmount > 0 ? ` | العربون: ${depositAmount} ج.م` : ''}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Deposit Section Content (collapsible) */}
      {depositMode && showDepositSection && (
        <div className="mx-2 mb-2 bg-[#eaeced] p-2 border border-[#a9b7c2] shadow-sm flex flex-col md:flex-row gap-4 text-sm">
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

      {/* Bottom Controls Bar */}
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

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">طباعة الفاتورة</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <Printer className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-bold">فاتورة رقم: {invoiceNumber}</p>
                <p className="text-gray-600">إجمالي المبلغ: {totalAmount} ج.م</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4" /> طباعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
