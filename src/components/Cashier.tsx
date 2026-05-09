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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
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

  const invoiceNumber = transactions.length + 1;

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
    if (isEWallet) {
        setShowCheckoutModal(true);
    } else {
        submitTransaction(); 
    }
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
    setShowCheckoutModal(false);
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
    document.getElementById('itemCodeInput')?.focus();
  };

  const handleSearchInvoice = () => {
    if (!isReturn || !returnInvoiceNo.trim()) return;
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
    
    alert('تم تحميل أصناف الفاتورة، يمكنك حذف الأصناف أو تعديل الكميات للمرتجع');
  };

  const isEWallet = actualPaymentMethod === 'instapay' || actualPaymentMethod === 'vodafone_cash';

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#a3bcc9] font-sans p-2 pb-0" dir="rtl">
      
      {/* Top Header Row */}
      <div className="flex justify-between items-center mb-2 px-2">
        <h2 className={`text-2xl font-bold ${isReturn ? 'text-red-700' : 'text-[#143c75]'}`}>
          {transactionType === 'sale' ? 'مبيعات الكاشير' : 
           transactionType === 'return' ? 'مرتجع كاشير' : 
           transactionType === 'deposit_sale' ? 'مبيعات عربون' : 
           'مرتجع مبيعات عربون'}
        </h2>
        <div className="flex items-center">
          <div className="bg-black text-white px-3 py-1 font-bold text-sm tracking-widest text-center min-w-[100px]">رقم الفاتورة :</div>
          <input className="w-16 h-8 text-center text-sm border-y border-r border-[#6eb1d6] shadow-inner font-bold outline-none bg-white" value={invoiceNumber} readOnly />
          {isReturn ? (
             <button onClick={handleSearchInvoice} className="bg-[#ff6600] text-white px-2 h-8 font-bold flex items-center justify-center border-y border-l border-[#6eb1d6]" title="بحث برقم الحركة">.....</button>
          ) : (
             <button className="bg-[#ff6600] text-white px-2 h-8 font-bold flex items-center justify-center border-y border-l border-[#6eb1d6]">.....</button>
          )}
        </div>
      </div>

      {/* Row 2: Code and Item Name */}
      <div className="flex items-center mb-2 gap-2 px-2">
        <div className="flex items-center">
          <div className="bg-black text-white px-3 py-1 font-bold text-sm text-center min-w-[70px]">الكود :</div>
          <input 
              id="itemCodeInput"
              className="w-24 h-8 text-center text-sm border-y border-r border-[#6eb1d6] shadow-inner outline-none bg-white font-bold" 
              value={itemCode} 
              onChange={e => setItemCode(e.target.value)}
              onKeyDown={handleKeyDown}
              list="productCodes"
              autoFocus
          />
          <button className="bg-[#ff6600] text-white px-2 h-8 font-bold flex items-center justify-center border-y border-l border-[#6eb1d6]">.....</button>
        </div>

        <div className="flex items-center flex-1">
          <div className="bg-black text-white px-3 py-1 font-bold text-sm text-center min-w-[100px]">اسم الصنف :</div>
          <input 
              className="flex-1 h-8 border border-[#6eb1d6] shadow-inner outline-none px-2 text-sm bg-white font-bold" 
              placeholder="بحث..."
              value={itemName} 
              onChange={e => setItemName(e.target.value)}
              list="productNames"
              onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* Row 3: Quantity, Price, Payment Method, Add Button */}
      <div className="flex items-center mb-2 px-2 gap-2">
        <div className="flex items-center flex-shrink-0">
          <div className="bg-black text-white px-3 py-1 font-bold text-sm text-center min-w-[70px]">الكمية :</div>
          <input 
              type="number"
              min="1"
              className="w-16 h-8 text-center text-sm border border-[#6eb1d6] shadow-inner outline-none font-bold" 
              value={itemQty} 
              onChange={e => setItemQty(e.target.value === '' ? '' : Number(e.target.value))}
              onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex items-center flex-shrink-0">
          <div className="bg-black text-white px-3 py-1 font-bold text-sm text-center min-w-[70px]">السعر :</div>
          <input 
              className="w-24 h-8 text-center text-sm border-y border-r border-[#6eb1d6] shadow-inner outline-none bg-white font-bold" 
              value={itemPrice} 
              readOnly 
          />
          <button className="bg-[#ff6600] text-white px-2 h-8 font-bold flex items-center justify-center border-y border-l border-[#6eb1d6]">.....</button>
        </div>

        <div className="flex items-center flex-shrink-0">
          <div className="bg-black text-white px-3 py-1 font-bold text-sm text-center min-w-[110px]">طريقة السداد :</div>
          <select 
              className="w-32 h-8 border border-[#6eb1d6] shadow-inner outline-none bg-white text-sm px-2 disabled:bg-gray-200 disabled:text-gray-500 font-bold"
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
           className="bg-[#64a1e6] hover:bg-[#528cc7] text-white font-bold h-8 px-6 text-sm flex items-center justify-center"
        >
          + إضافة
        </button>
      </div>

      <datalist id="productNames">
        {products.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      <datalist id="productCodes">
        {products.map(p => <option key={`code-${p.id}`} value={p.id} />)}
      </datalist>

      {/* Table Section */}
      <div className="flex-1 bg-[#e9eced] flex flex-col mx-2 border border-[#9eaab3] shadow-inner mt-4 mb-2 overflow-hidden min-h-[150px]">
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

      {/* Bottom Controls */}
      {!isDeposit && (
        <div className="flex justify-between items-center px-2 pb-4 mt-auto">
          {/* Left: Total Amount */}
          <div className="flex items-center shadow-md">
             <div className="bg-black text-white px-4 h-10 flex items-center justify-center text-sm font-bold tracking-wider">
               اجمالي الفاتورة:
             </div>
             <div className="bg-white border-y border-l border-gray-300 h-10 px-8 flex items-center justify-center font-bold text-xl text-black">
               {totalAmount}
             </div>
          </div>

          {/* Right: Buttons */}
          <div className="flex gap-2">
            <button onClick={handleSaveInvoice} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-10 w-24 flex justify-center items-center text-sm shadow hover:bg-[#d8e3ea] transition-colors">
              حفظ
            </button>
            <button onClick={handleNewInvoice} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-10 w-24 flex justify-center items-center text-sm shadow hover:bg-[#d8e3ea] transition-colors">
              جديد
            </button>
          </div>
        </div>
      )}

      {isDeposit && (
        <div className="flex justify-end px-2 pb-4 mt-1">
          <div className="flex gap-2">
            <button onClick={handleNewInvoice} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-10 w-24 flex justify-center items-center text-sm shadow hover:bg-[#d8e3ea] transition-colors">
              جديد
            </button>
            <button onClick={handleSaveInvoice} className="bg-[#e4ebf1] border border-[#a2b5bf] text-[#2c4b63] font-bold h-10 w-24 flex justify-center items-center text-sm shadow hover:bg-[#d8e3ea] transition-colors">
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-2xl text-gray-800">تأكيد الفاتورة والدفع</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-6 text-lg">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                 <span className="font-medium text-gray-600">{isDeposit ? 'قيمة العربون المطلوب:' : 'المبلغ المطلوب:'}</span>
                 <span className="font-bold text-3xl text-green-600">{isDeposit ? typeof depositAmount === 'number' ? depositAmount : 0 : totalAmount} ج.م</span>
              </div>

              {isEWallet && (
                <div className="space-y-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800 font-bold mb-2">بيانات المحفظة (مطلوب)</p>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">اخر 4 ارقام - المحفظة المرسلة</label>
                    <input 
                      type="text" 
                      maxLength={4}
                      value={senderWallet}
                      onChange={e => setSenderWallet(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-gray-300 rounded-lg p-3 text-center tracking-widest text-2xl font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 font-medium">اخر 4 ارقام - المحفظة المستلمة</label>
                    <input 
                      type="text" 
                      maxLength={4}
                      value={receiverWallet}
                      onChange={e => setReceiverWallet(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-gray-300 rounded-lg p-3 text-center tracking-widest text-2xl font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="XXXX"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-xl transition-colors"
                >
                  رجوع
                </button>
                <button 
                  onClick={submitTransaction}
                  disabled={isEWallet && (senderWallet.length !== 4 || receiverWallet.length !== 4)}
                  className="flex-[2] bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-xl"
                >
                  <CheckCircle className="h-6 w-6" />
                  حفظ وطباعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

