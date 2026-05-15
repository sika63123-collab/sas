import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Tag, Filter, Check } from 'lucide-react';

export default function Pricing() {
  const { products, updateProductPrice } = useAppStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  // Track editing prices locally
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handlePriceChange = (id: string, value: string) => {
    setEditingPrices(prev => ({ ...prev, [id]: value }));
    setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleSavePrice = (id: string) => {
    const newPrice = Number(editingPrices[id]);
    if (isNaN(newPrice) || newPrice < 0) {
      alert('سعر غير صحيح');
      return;
    }
    updateProductPrice(id, newPrice);
    setEditingPrices(prev => { const n = { ...prev }; delete n[id]; return n; });
    setSavedIds(prev => new Set(prev).add(id));
    setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-blue-600" />
            التسعير
          </h1>
          <p className="text-gray-500 mt-1">تعديل أسعار البيع للأصناف</p>
        </div>
        
        <div className="flex items-center gap-3">
          {categories.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <Filter className="h-4 w-4 text-gray-500" />
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-gray-700 outline-none cursor-pointer"
              >
                <option value="all">كل المجموعات</option>
                {categories.map((cat, i) => (
                  <option key={i} value={cat as string}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-6 py-4 font-semibold text-sm">كود الصنف</th>
              <th className="px-6 py-4 font-semibold text-sm">المجموعة</th>
              <th className="px-6 py-4 font-semibold text-sm">اسم الصنف</th>
              <th className="px-6 py-4 font-semibold text-sm">السعر الحالي</th>
              <th className="px-6 py-4 font-semibold text-sm">السعر الجديد</th>
              <th className="px-6 py-4 font-semibold text-sm text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map(product => {
              const isEditing = editingPrices[product.id] !== undefined;
              const isSaved = savedIds.has(product.id);
              return (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium font-mono text-blue-600">{product.id}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {product.category ? (
                      <button 
                        onClick={() => setSelectedCategory(product.category!)}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-md cursor-pointer transition-colors font-medium"
                      >
                        {product.category}
                      </button>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-gray-700 font-bold">{product.price}</td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      className="w-28 h-9 text-center border border-gray-200 rounded-lg font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                      placeholder={String(product.price)}
                      value={editingPrices[product.id] ?? ''}
                      onChange={e => handlePriceChange(product.id, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && isEditing) handleSavePrice(product.id);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isSaved ? (
                      <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" />
                        تم
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSavePrice(product.id)}
                        disabled={!isEditing}
                        className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 h-8 rounded-lg text-sm font-bold shadow-sm transition-colors"
                      >
                        حفظ
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  لا يوجد أصناف مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
