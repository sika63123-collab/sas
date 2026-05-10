import React, { useState } from 'react';
import { useAppStore } from '../store';
import { PackagePlus, Code } from 'lucide-react';

export function InventoryAdd() {
  const { products, addProduct } = useAppStore();
  
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [deviceStatus, setDeviceStatus] = useState('جديد');
  const [storage, setStorage] = useState('');
  const [ram, setRam] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = showNewCategoryInput ? customCategory : newCategory;
    
    if (!newCode || !newName || !newCostPrice || !newPrice || !finalCategory) {
      alert('الرجاء إكمال كافة الحقول المطلوبة');
      return;
    }
    
    // Check if code already exists
    if (products.some(p => p.id === newCode)) {
      alert('هذا الكود مستخدم بالفعل للصنف: ' + products.find(p => p.id === newCode)?.name);
      return;
    }

    const isDevice = finalCategory.includes('اجهزة') || finalCategory.includes('أجهزة');

    addProduct({
      id: newCode,
      category: finalCategory,
      name: newName,
      costPrice: Number(newCostPrice),
      price: Number(newPrice),
      stock: newStock ? Number(newStock) : 0,
      ...(isDevice && {
        deviceStatus,
        storage,
        ram
      })
    });
    
    setSuccessMsg(`تمت الاضافة بنجاح للمخزن بمسمي ${newName} وبسعر ${newPrice}`);
    
    setNewCode('');
    setNewCategory('');
    setCustomCategory('');
    setShowNewCategoryInput(false);
    setNewName('');
    setNewCostPrice('');
    setNewPrice('');
    setNewStock('');
    setStorage('');
    setRam('');
    
    // hide success msg after 3 seconds
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const currentCategory = showNewCategoryInput ? customCategory : newCategory;
  const isDevice = currentCategory.includes('اجهزة') || currentCategory.includes('أجهزة');

  return (
    <div className="p-6 max-w-4xl mx-auto w-full" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-blue-600" />
          إضافة أصناف
        </h1>
        <p className="text-gray-500 mt-1">إضافة أصناف جديدة للمخزن</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg font-bold text-center">
            {successMsg}
          </div>
        )}
        <form onSubmit={handleAddProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* المجموعة - أولا */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">المجموعة (القسم)</label>
               {!showNewCategoryInput ? (
                 <div className="flex gap-2">
                   <select 
                     required
                     value={newCategory}
                     onChange={e => {
                       if (e.target.value === 'ADD_NEW') {
                         setShowNewCategoryInput(true);
                         setNewCategory('');
                       } else {
                         setNewCategory(e.target.value);
                       }
                     }}
                     className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold"
                   >
                     <option value="">اختر المجموعة...</option>
                     {categories.map((cat, i) => (
                       <option key={i} value={cat}>{cat}</option>
                     ))}
                     <option value="ADD_NEW" className="text-blue-600 font-bold border-t">+ إضافة مجموعة جديدة</option>
                   </select>
                 </div>
               ) : (
                 <div className="flex gap-2">
                   <input 
                     required
                     type="text" 
                     value={customCategory}
                     onChange={e => setCustomCategory(e.target.value)}
                     className="flex-1 border border-blue-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                     placeholder="اكتب اسم المجموعة الجديدة..."
                     autoFocus
                   />
                   <button 
                     type="button"
                     onClick={() => {
                       setShowNewCategoryInput(false);
                       setCustomCategory('');
                     }}
                     className="text-gray-400 hover:text-red-500 px-2"
                     title="إلغاء"
                   >
                     ×
                   </button>
                 </div>
               )}
             </div>

             {/* كود الصنف - ثانيا */}
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
                   className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                   placeholder="الباركود او كود الصنف"
                 />
               </div>
             </div>

             {/* اسم الصنف */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">اسم الصنف</label>
               <input 
                 required
                 type="text" 
                 value={newName}
                 onChange={e => setNewName(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                 placeholder="اسم الصنف كـ شاشة سامسونج"
               />
             </div>

             {/* سعر التكلفة */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">سعر التكلفة (ج.م)</label>
               <input 
                 required
                 type="number" 
                 min="0"
                 step="0.01"
                 value={newCostPrice}
                 onChange={e => setNewCostPrice(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                 placeholder="0.00"
               />
             </div>

             {/* سعر البيع */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">سعر البيع (ج.م)</label>
               <input 
                 required
                 type="number" 
                 min="0"
                 step="0.01"
                 value={newPrice}
                 onChange={e => setNewPrice(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                 placeholder="0.00"
               />
             </div>

             {/* الكمية */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">الكمية الابتدائية (اختياري)</label>
               <input 
                 type="number" 
                 min="0"
                 value={newStock}
                 onChange={e => setNewStock(e.target.value)}
                 className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                 placeholder="0"
               />
             </div>

             {/* حقول الأجهزة - تظهر فقط إذا كان القسم أجهزة */}
             {isDevice && (
               <>
                 <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-sm font-bold text-blue-800 mb-2">حالة الجهاز</label>
                      <select 
                        value={deviceStatus}
                        onChange={e => setDeviceStatus(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold"
                      >
                        <option value="جديد">جديد</option>
                        <option value="مستعمل">مستعمل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-blue-800 mb-2">المساحة</label>
                      <input 
                        type="text" 
                        value={storage}
                        onChange={e => setStorage(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        placeholder="مثال: 128GB, 256GB..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-blue-800 mb-2">الرام</label>
                      <input 
                        type="text" 
                        value={ram}
                        onChange={e => setRam(e.target.value)}
                        className="w-full border border-blue-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        placeholder="مثال: 8GB, 12GB..."
                      />
                    </div>
                 </div>
               </>
             )}
          </div>
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg transition-colors min-w-[200px]"
            >
              حفظ الصنف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
