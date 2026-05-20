import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { PackagePlus, Code } from 'lucide-react';

export function InventoryAdd() {
  const { products, addProduct } = useAppStore();
  
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastMatchedCode, setLastMatchedCode] = useState('');

  // Device specific fields
  const [deviceCondition, setDeviceCondition] = useState('جديد');
  const [deviceStorage, setDeviceStorage] = useState('');
  const [deviceRam, setDeviceRam] = useState('');

  const predefinedCategories = ['اجهزة', 'اكسسوارات'];
  const categories = Array.from(new Set([...predefinedCategories, ...products.map(p => p.category).filter(Boolean)]));

  const isExistingProduct = products.find(p => p.id === newCode);

  useEffect(() => {
    if (!newCode) {
      if (lastMatchedCode) {
        setNewName('');
        setNewCategory('');
        setCustomCategory('');
        setNewCostPrice('');
        setNewPrice('');
        setNewStock('');
        setLastMatchedCode('');
      }
      return;
    }

    const existing = products.find(p => p.id === newCode);
    if (existing) {
      if (existing.id !== lastMatchedCode) {
        setNewName(existing.name || '');
        setNewCategory(existing.category || '');
        setNewCostPrice(existing.costPrice?.toString() || '');
        setNewPrice(existing.price?.toString() || '');
        setLastMatchedCode(existing.id);

        // Auto focus the stock input field to type quantity
        setTimeout(() => {
          const stockInput = document.getElementById('newStockInput');
          if (stockInput) {
            (stockInput as HTMLInputElement).focus();
            (stockInput as HTMLInputElement).select();
          }
        }, 100);
      }
    } else {
      if (lastMatchedCode) {
        setLastMatchedCode('');
      }
    }
  }, [newCode, products, lastMatchedCode]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = newCategory === 'NEW' ? customCategory : newCategory;
    
    if (!newCode || !newName || !newCostPrice || !newPrice || !finalCategory) return;

    let finalName = newName;
    const isExisting = products.some(p => p.id === newCode);
    if (!isExisting && finalCategory === 'اجهزة') {
      const specs = [deviceStorage, deviceRam && `${deviceRam} RAM`, deviceCondition].filter(Boolean).join(' - ');
      if (specs) {
        finalName += ` (${specs})`;
      }
    }

    addProduct({
      id: newCode,
      category: finalCategory,
      name: finalName,
      costPrice: Number(newCostPrice),
      price: Number(newPrice),
      stock: newStock ? Number(newStock) : 0
    });
    
    if (isExisting) {
      setSuccessMsg(`تم تحديث الصنف "${finalName}" بنجاح وإضافة كمية قدرها ${newStock || 0} قطعة للمخزن.`);
    } else {
      setSuccessMsg(`تمت الاضافة بنجاح للمخزن بمسمي ${finalName} وبسعر ${newPrice}`);
    }
    
    setNewCode('');
    setNewCategory('');
    setCustomCategory('');
    setNewName('');
    setNewCostPrice('');
    setNewPrice('');
    setNewStock('');
    setDeviceCondition('جديد');
    setDeviceStorage('');
    setDeviceRam('');
    setLastMatchedCode('');
    
    // hide success msg after 3 seconds
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PackagePlus className={`h-6 w-6 ${isExistingProduct ? 'text-emerald-600' : 'text-blue-600'}`} />
          {isExistingProduct ? 'تغذية المخزن / إضافة كمية' : 'اضافة اصناف'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isExistingProduct ? 'تحديث رصيد وأسعار صنف مسجل بالفعل في المخزن' : 'اضافة اصناف جديدة للمخزن'}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg font-bold text-center">
            {successMsg}
          </div>
        )}

        {isExistingProduct && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-4 rounded-xl flex items-start gap-3">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600 mt-0.5">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 text-base">تغذية رصيد الصنف: {isExistingProduct.name}</h4>
              <p className="text-sm text-blue-700 mt-1">
                الرصيد الحالي في المخزن: <strong className="text-blue-950 font-bold">{isExistingProduct.stock} قطعة</strong>. 
                سيتم إضافة الكمية الجديدة المدخلة أدناه إلى الرصيد الحالي وتحديث أسعار التكلفة والبيع وفقاً لمدخلاتك.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleAddProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             
             {/* Category Field - Moved to the first block */}
             <div className="flex flex-col gap-2">
               <label className="block text-sm font-medium text-gray-700">المجموعة (القسم)</label>
               <select 
                 required
                 value={newCategory}
                 onChange={e => setNewCategory(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
               >
                 <option value="" disabled>-- إختر المجموعة --</option>
                 {categories.map((cat, i) => (
                   <option key={i} value={cat}>{cat}</option>
                 ))}
                 <option value="NEW" className="font-bold text-blue-600">+ إضافة مجموعة جديدة</option>
               </select>

               {newCategory === 'NEW' && (
                 <input 
                   required
                   type="text" 
                   value={customCategory}
                   onChange={e => setCustomCategory(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none mt-2"
                   placeholder="اسم المجموعة الجديدة..."
                   autoFocus
                 />
               )}
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">اسم الصنف</label>
               <input 
                 required
                 type="text" 
                 value={newName}
                 onChange={e => setNewName(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="اسم الصنف كـ شاشة سامسونج"
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">كود الصنف</label>
               <div className="relative">
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                   <Code className="h-5 w-5 text-gray-400" />
                 </div>
                 <input 
                   required
                   type="text" 
                   value={newCode}
                   onChange={e => setNewCode(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                   placeholder="الباركود او كود الصنف"
                 />
               </div>
             </div>

             {/* Dynamic Device Fields */}
             {!isExistingProduct && (newCategory === 'اجهزة' || (newCategory === 'NEW' && customCategory === 'اجهزة')) && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">حالة الجهاز</label>
                     <select 
                       value={deviceCondition} 
                       onChange={e => setDeviceCondition(e.target.value)}
                       className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                     >
                        <option value="جديد">جديد</option>
                        <option value="مستعمل">مستعمل</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">المساحة</label>
                     <input 
                       type="text"
                       value={deviceStorage} 
                       onChange={e => setDeviceStorage(e.target.value)}
                       className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono text-left"
                       placeholder="مثال: 128GB"
                       dir="ltr"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">الرام</label>
                     <input 
                       type="text"
                       value={deviceRam} 
                       onChange={e => setDeviceRam(e.target.value)}
                       className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-mono text-left"
                       placeholder="مثال: 8GB"
                       dir="ltr"
                     />
                  </div>
                </div>
             )}

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">سعر التكلفة (ج.م)</label>
               <input 
                 required
                 type="number" 
                 min="0"
                 step="0.01"
                 value={newCostPrice}
                 onChange={e => setNewCostPrice(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="0.00"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">سعر البيع (ج.م)</label>
               <input 
                 required
                 type="number" 
                 min="0"
                 step="0.01"
                 value={newPrice}
                 onChange={e => setNewPrice(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="0.00"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 {isExistingProduct ? 'الكمية المضافة (الوارد الجديد)' : 'الكمية الابتدائية (اختياري)'}
               </label>
               <input 
                 id="newStockInput"
                 type="number" 
                 min="0"
                 value={newStock}
                 onChange={e => setNewStock(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-900"
                 placeholder={isExistingProduct ? 'مثال: 5' : '0'}
               />
             </div>
          </div>
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              type="submit"
              className={`font-bold py-2.5 px-8 rounded-lg transition-colors min-w-[200px] text-white shadow-sm hover:shadow ${
                isExistingProduct 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isExistingProduct ? 'تأكيد إضافة الكمية والأسعار' : 'حفظ الصنف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
