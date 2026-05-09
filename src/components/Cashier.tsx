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
    <div className="flex flex-col min-h-full bg-[#b8cdd6] font-sans" dir="rtl">
      
      {/* Top Controls */}
      <div className="p-2 md:p-4 flex flex-col gap-2 border-b border-[#9eb5c0]">
        
        <div className="flex flex-wrap items-center gap-1 justify-end">
           <div className={`h-6 px-3 text-xs font-bold text-white shadow border border-gray-400 flex items-center justify-center ml-auto ${
               transactionType === 'sale' ? 'bg-blue-600' : 
               transactionType === 'return' ? 'bg-red-600' : 
               transactionType === 'deposit_sale' ? 'bg-orange-600' : 
               'bg-purple-600'
             }`}>
             {transactionType === 'sale' ? 'كاشير' : 
              transactionType === 'return' ? 'مرتجع كاشير' : 
              transactionType === 'deposit_sale' ? 'مبيعات عربون' : 'مرتجع مبيعات عربون'}
           </div>

           {isReturn && (
             <>
               <button onClick={handleSearchInvoice} className="bg-[#ff6600] w-6 h-6 flex items-center justify-center border border-gray-400 text-white font-bold text-xs" title="بحث برقم الحركة">...</button>
               <input 
                 className="w-16 h-6 text-center text-sm border shadow-inner outline-none bg-white font-bold text-red-600" 
                 value={returnInvoiceNo} 
                 onChange={e => setReturnInvoiceNo(e.target.value)} 
               />
               <div className="bg-black text-white px-2 py-1 font-bold text-xs tracking-wider">رقم الحركة :</div>
             </>
           )}

           {!isReturn && (
             <button className="bg-[#ff6600] w-6 h-6 flex items-center justify-center border border-gray-400 text-white font-bold text-xs">...</button>
           )}
           <input className="w-16 h-6 text-center text-sm border shadow-inner outline-none bg-gray-100 font-bold" value={invoiceNumber} readOnly />
           <div className="bg-black text-white px-2 py-1 font-bold text-xs tracking-wider whitespace-nowrap">
             {isReturn ? 'رقم فاتورة المرتجع :' : 'رقم الفاتورة :'}
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 justify-end">
          <input className="w-16 h-6 text-center text-sm border shadow-inner outline-none bg-gray-100 hidden sm:block" readOnly />
          <input 
              className="w-full sm:w-48 h-6 border shadow-inner outline-none px-2 text-sm bg-white flex-1 sm:flex-none" 
              value={itemName} 
              onChange={e => setItemName(e.target.value)}
              list="productNames"
              onKeyDown={handleKeyDown}
          />
          <div className="bg-black text-white px-2 py-1 font-bold text-xs sm:w-20 text-center flex-shrink-0">اسم الصنف :</div>
          
          <button className="bg-[#ff6600] w-6 h-6 flex items-center justify-center border border-gray-400 text-white font-bold" onClick={handleAddItem}>...</button>
          <input 
              id="itemCodeInput"
              className="w-20 h-6 text-center text-sm border shadow-inner outline-none" 
              value={itemCode} 
              onChange={e => setItemCode(e.target.value)}
              onKeyDown={handleKeyDown}
              list="productCodes"
              autoFocus
          />
          <div className="bg-black text-white px-2 py-1 font-bold text-xs w-16 text-center flex-shrink-0">الكود :</div>
        </div>

        <div className="flex flex-wrap items-center gap-1 justify-end">
          <select 
              className="w-24 h-6 border shadow-inner outline-none bg-white text-xs px-1 disabled:bg-gray-200 disabled:text-gray-500"
              value={actualPaymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={isReturn}
          >
              <option value="cash">نقدية</option>
              <option value="visa">فيزا</option>
              <option value="instapay">انستا باي</option>
              <option value="vodafone_cash">فودافون كاش</option>
          </select>
          <div className="bg-black text-white px-2 py-1 font-bold text-[10px] w-20 text-center flex-shrink-0">طريقة السداد :</div>
          
          <input 
              className="w-16 h-6 text-center text-sm border shadow-inner outline-none bg-gray-100" 
              value={itemPrice} 
              readOnly 
          />
          <div className="bg-black text-white px-2 py-1 font-bold text-xs w-16 text-center flex-shrink-0">السعر :</div>
          
          <input 
              type="number"
              min="1"
              className="w-16 h-6 text-center text-sm border shadow-inner outline-none" 
              value={itemQty} 
              onChange={e => setItemQty(e.target.value === '' ? '' : Number(e.target.value))}
              onKeyDown={handleKeyDown}
          />
          <div className="bg-black text-white px-2 py-1 font-bold text-xs w-16 text-center flex-shrink-0">الكمية :</div>
        </div>

        {isDeposit && (
          <div className="bg-[#aec3cc] p-2 mt-2 border border-[#83a1b3] shadow-inner mb-2 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               {/* Right Side (Deposit Details) */}
               <div className="flex flex-col gap-2 border-l border-[#83a1b3] pl-4">
                  <div className="flex items-center gap-1 justify-end">
                     <input className="w-24 h-6 text-center text-sm border shadow-inner outline-none font-bold text-red-600 bg-[#e4ebf1]" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))} />
                     <div className="bg-black text-[#8bbdf9] px-2 py-1 font-bold text-xs w-28 text-center border-2 border-white">العربون :</div>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                     <input className="w-24 h-6 text-center text-sm border shadow-inner outline-none bg-gray-100 font-bold" value={totalAmount - (typeof depositAmount === 'number' ? depositAmount : 0)} readOnly />
                     <div className="bg-black text-[#8bbdf9] px-2 py-1 font-bold text-xs w-28 text-center border-2 border-white">سدد الباقى :</div>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                     <div className="w-48 h-6 flex items-center justify-around border shadow-inner bg-white px-2">
                       <label className="flex items-center gap-1 cursor-pointer">
                         <input type="radio" checked={isDelivered} onChange={() => setIsDelivered(true)} className="w-3 h-3 accent-green-600" />
                         <span className="text-[10px] font-bold text-green-700">تم التسليم</span>
                       </label>
                       <label className="flex items-center gap-1 cursor-pointer">
                         <input type="radio" checked={!isDelivered} onChange={() => setIsDelivered(false)} className="w-3 h-3 accent-red-600" />
                         <span className="text-[10px] font-bold text-red-700">لم يسلم</span>
                       </label>
                     </div>
                     <div className="bg-black text-[#8bbdf9] px-2 py-1 font-bold text-xs w-28 text-center border-2 border-white">حالة التسليم :</div>
                  </div>
               </div>

               {/* Left Side (Customer details) */}
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 justify-end">
                     <input className="w-48 h-6 px-1 text-sm border shadow-inner outline-none bg-[#e4ebf1] text-right font-bold" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                     <div className="bg-black text-[#8bbdf9] px-2 py-1 font-bold text-xs w-24 text-center border-2 border-white">التليفون :</div>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                     <input className="w-48 h-6 px-1 text-sm border shadow-inner outline-none bg-[#e4ebf1] text-right font-bold" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                     <div className="bg-black text-[#8bbdf9] px-2 py-1 font-bold text-xs w-24 text-center border-2 border-white">اسم العميل :</div>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                     <input className="w-48 h-6 px-1 text-sm border shadow-inner outline-none bg-[#e4ebf1] text-right font-bold" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                     <div className="bg-black text-[#8bbdf9] px-2 py-1 font-bold text-xs w-24 text-center border-2 border-white">العنوان :</div>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                     <input className="w-48 h-6 px-1 text-sm border shadow-inner outline-none bg-[#e4ebf1] text-right font-bold" value={pageNumber} onChange={e => setPageNumber(e.target.value)} />
                     <div className="bg-black text-[#8bbdf9] px-2 py-1 font-bold text-xs w-24 text-center border-2 border-white">رقم الصفحة :</div>
                  </div>
               </div>
            </div>
          </div>
        )}

      </div>

      <datalist id="productNames">
        {products.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      <datalist id="productCodes">
        {products.map(p => <option key={`code-${p.id}`} value={p.id} />)}
      </datalist>

      {/* Table Section */}
      <div className="flex-1 overflow-auto bg-[#c5d8e1] p-1">
        <div className="bg-white border border-[#83a1b3] min-h-full">
          <table className="w-full text-center text-sm">
            <thead className="bg-[#b8cdd6] text-black border-b border-[#83a1b3]">
              <tr>
                <th className="py-1 px-2 font-bold border-l border-[#83a1b3]">الاجمالي</th>
                <th className="py-1 px-2 font-bold border-l border-[#83a1b3]">الكمية</th>
                <th className="py-1 px-2 font-bold border-l border-[#83a1b3]">سعر الوحدة</th>
                <th className="py-1 px-2 font-bold border-l border-[#83a1b3] text-right w-1/3">اسم الصنف</th>
                <th className="py-1 px-2 font-bold border-l border-[#83a1b3]">الكود</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[#2b6eb5] hover:text-white transition-colors cursor-default text-black bg-transparent">
                  <td className="py-0.5 px-2 font-bold border-l border-[#e0e0e0]">{item.price * item.cartQuantity}</td>
                  <td className="py-0.5 px-2 border-l border-[#e0e0e0]">{item.cartQuantity}</td>
                  <td className="py-0.5 px-2 border-l border-[#e0e0e0]">{item.price}</td>
                  <td className="py-0.5 px-2 border-l border-[#e0e0e0] font-bold text-right truncate">{item.name}</td>
                  <td className="py-0.5 px-2 border-l border-[#e0e0e0]">{item.id}</td>
                  <td className="py-0.5 px-1 text-center">
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-[#9eb5c0]">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#b8cdd6]">
           {/* Actions on the left */}
           <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={handleNewInvoice} className="bg-gray-100 border border-[#83a1b3] shadow px-4 py-1 text-sm font-bold hover:bg-gray-200 flex-1 sm:flex-none">
                جديد
             </button>
             <button onClick={handleSaveInvoice} className="bg-gray-100 border border-[#83a1b3] shadow px-4 py-1 text-sm font-bold hover:bg-gray-200 flex-1 sm:flex-none">
                حفظ
             </button>
           </div>
           
           {/* Total on the right */}
           <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
             <div className="bg-white border-2 border-black px-4 py-1 font-bold text-xl w-full sm:min-w-[120px] text-center shadow-inner tracking-wider">
               {totalAmount}
             </div>
             <div className="bg-black text-white px-2 py-1 flex flex-col justify-center items-center text-xs font-bold leading-none h-10 min-w-[80px]">
                <span>إجمالي</span>
                <span>الفاتورة:</span>
             </div>
           </div>
        </div>
      </div>

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

