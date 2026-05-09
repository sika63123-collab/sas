import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Package, Plus, Edit2 } from 'lucide-react';

export default function Inventory() {
  const { products, addProduct, updateProductStock, currentUser } = useAppStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');

  const canAddItem = currentUser?.role === 'admin' || currentUser?.permissions?.addItem;

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newPrice || !newStock) return;
    
    // Check if code already exists
    if (products.some(p => p.id === newCode)) {
      alert('هذا الكود مستخدم بالفعل للصنف: ' + products.find(p => p.id === newCode)?.name);
      return;
    }

    addProduct({
      id: newCode,
      name: newName,
      price: Number(newPrice),
      stock: Number(newStock)
    });
    
    setNewCode('');
    setNewName('');
    setNewPrice('');
    setNewStock('');
    setShowAddModal(false);
  };

  const totalItemsAvailable = products.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            المخزن
          </h1>
          <p className="text-gray-500 mt-1">إجمالي الأصناف الموجودة في المحل: <span className="font-bold text-blue-600">{totalItemsAvailable}</span> قطعة</p>
        </div>
        
        {canAddItem && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            إضافة صنف جديد
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right min-w-[500px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-6 py-4 font-semibold text-sm">كود الصنف</th>
              <th className="px-6 py-4 font-semibold text-sm">اسم الصنف</th>
              <th className="px-6 py-4 font-semibold text-sm">السعر (ج.م)</th>
              <th className="px-6 py-4 font-semibold text-sm">الرصيد المتاح</th>
              <th className="px-6 py-4 font-semibold text-sm text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium font-mono text-blue-600">{product.id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                <td className="px-6 py-4 text-gray-700">{product.price}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${product.stock > 5 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                     <button onClick={() => updateProductStock(product.id, 1)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded" title="زيادة المخزون">
                        <Plus className="h-4 w-4" />
                     </button>
                     <button onClick={() => updateProductStock(product.id, -1)} disabled={product.stock <= 0} className="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded disabled:opacity-50" title="تقليل المخزون">
                         <Minus className="h-4 w-4" />
                     </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  لا يوجد أصناف في المخزن حاليا
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">إضافة صنف جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود الصنف</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف</label>
                <input 
                  required
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر (ج.م)</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الابتدائية</label>
                <input 
                  required
                  type="number" 
                  min="0"
                  value={newStock}
                  onChange={e => setNewStock(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Added missing Minus import above for the buttons
import { Minus } from 'lucide-react';
