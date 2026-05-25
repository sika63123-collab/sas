import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { User, UserPermissions } from '../types';

const defaultPermissions: UserPermissions = {
  cashier: false, cashierReturn: false, cashExchange: false, depositSale: false, depositReturn: false, depositPay: false,
  storeQuantities: false, itemCard: false, addItem: false,
  installmentsAdd: false, installmentsPay: false, installmentsLate: false,
  settings: false, reports: false
};

export function Settings() {
  const { users, addUser, updateUser, deleteUser, currentUser, products, transactions, installmentContracts, expenses, expenseTypes, restoreData, clearData, shifts, shiftAccounts, addShiftAccount, updateShiftAccount, removeShiftAccount } = useAppStore();
  
  const [editingCode, setEditingCode] = useState<string | null>(null);
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);

  const [walletEditingId, setWalletEditingId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletSubLabel, setWalletSubLabel] = useState('');
  const [walletNumber, setWalletNumber] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (u: User) => {
    setEditingCode(u.code);
    setCode(u.code);
    setName(u.name);
    setRole(u.role);
    setPassword(u.password || '');
    setPermissions(u.permissions);
  };

  const handleCancel = () => {
    setEditingCode(null);
    setCode('');
    setName('');
    setPassword('');
    setRole('user');
    setPermissions(defaultPermissions);
  };

  const handleSave = () => {
    if (!code || !name) {
      alert("الرجاء إدخال الاسم وكود المستخدم");
      return;
    }
    if (code.length > 2) {
      alert('كود الدخول يجب ان يكون رقمين كحد اقصى');
      return;
    }

    if (editingCode) {
      updateUser(editingCode, { code, name, role, password, permissions });
    } else {
      if (users.find(u => u.code === code)) {
        alert('هذا الكود مستخدم من قبل');
        return;
      }
      addUser({ code, name, role, password, permissions });
    }
    handleCancel();
  };

  const handleEditWallet = (a: any) => {
    setWalletEditingId(a.id);
    setWalletName(a.name);
    setWalletSubLabel(a.subLabel || '');
    setWalletNumber(a.walletNumber || '');
  };

  const handleCancelWallet = () => {
    setWalletEditingId(null);
    setWalletName('');
    setWalletSubLabel('');
    setWalletNumber('');
  };

  const handleSaveWallet = () => {
    if (!walletName) {
      alert("الرجاء إدخال اسم المحفظة");
      return;
    }
    if (walletEditingId) {
      updateShiftAccount(walletEditingId, { name: walletName, subLabel: walletSubLabel, walletNumber });
    } else {
      addShiftAccount({ name: walletName, subLabel: walletSubLabel, walletNumber });
    }
    handleCancelWallet();
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBackup = () => {
    const data = {
      products,
      transactions,
      installmentContracts,
      users,
      expenses,
      expenseTypes,
      shifts
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xphone_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('هل أنت متأكد من استرجاع البيانات؟ سيتم مسح البيانات الحالية!')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const contents = event.target?.result as string;
          const data = JSON.parse(contents);
          restoreData(data);
        } catch (err) {
          alert("حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف نسخ احتياطي صحيح.");
        }
      };
      reader.readAsText(file);
    }
    // reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const Checkbox = ({ id, label }: { id: keyof UserPermissions, label: string }) => (
    <div className="flex items-center justify-start gap-3 mb-2 w-full">
       <input 
          type="checkbox" 
          checked={permissions[id]}
          onChange={() => togglePermission(id)}
          className="w-4 h-4 accent-blue-600 cursor-pointer rounded-sm border-gray-300" 
       />
       <label className="text-sm font-bold select-none cursor-pointer text-gray-800" onClick={() => togglePermission(id)}>{label}</label>
    </div>
  );

  if (currentUser?.role !== 'admin') {
     return <div className="p-8 text-center text-red-600 font-bold text-2xl">غير مصرح لك بالدخول لهذه الصفحة.</div>;
  }

  return (
    <div className="p-6 bg-[#b0bec5] min-h-[calc(100vh-64px)] overflow-auto" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Top Row: Users & Form */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
               {/* Left (Visual Right) - User Form */}
               <div className="w-full lg:flex-1 bg-white p-6 shadow-sm border border-gray-300 min-h-[400px]">
                  <h3 className="font-bold text-2xl mb-6 text-blue-900 border-b-2 border-gray-100 pb-2 flex justify-between items-center">
                     {editingCode ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                     {editingCode && <button onClick={handleCancel} className="text-sm text-gray-500 hover:text-red-500">إلغاء التعديل</button>}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-6">
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-red-500 text-sm">*</span>
                            <label className="font-bold text-sm text-gray-700">الاسم</label>
                        </div>
                        <input className="w-full h-10 border border-gray-300 px-3 outline-none text-right font-medium" value={name} onChange={e => setName(e.target.value)} />
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-red-500 text-sm">*</span>
                            <label className="font-bold text-sm text-gray-700">كود المستخدم (للدخول)</label>
                        </div>
                        <input className="w-full h-10 border border-gray-300 px-3 outline-none text-right font-medium" placeholder="رقمين فقط" value={code} onChange={e => setCode(e.target.value)} maxLength={2} />
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-red-500 text-sm">*</span>
                            <label className="font-bold text-sm text-gray-700">كلمة المرور</label>
                        </div>
                        <input type="password" className="w-full h-10 border border-gray-300 px-3 outline-none text-right font-medium" value={password} onChange={e => setPassword(e.target.value)} />
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-red-500 text-sm">*</span>
                            <label className="font-bold text-sm text-gray-700">الدور</label>
                        </div>
                        <select className="w-full h-10 border border-gray-300 px-3 outline-none text-right font-medium bg-white" value={role} onChange={e => setRole(e.target.value as any)}>
                           <option value="user">كاشير</option>
                           <option value="admin">مدير</option>
                        </select>
                     </div>
                  </div>

                  <div className="mb-6 relative pt-4">
                     <h4 className="absolute -top-3 right-4 bg-blue-100 text-blue-800 font-bold px-4 py-1 rounded text-sm shadow-sm">
                        صلاحيات النظام (كاشير)
                     </h4>
                     <div className="border border-blue-200 bg-gray-50/50 p-6 pt-8 flex flex-wrap justify-between gap-6">
                         
                         {/* الحركة */}
                         <div className="flex-1 min-w-[200px] bg-white border border-gray-200 p-4 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 font-bold text-sm text-gray-700">
                               خانة الحركة
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <Checkbox id="cashier" label="كاشير" />
                                <Checkbox id="cashierReturn" label="مرتجع كاشير" />
                                <Checkbox id="cashExchange" label="تسييل / تبادل عهدة" />
                                <Checkbox id="depositSale" label="مبيعات عربون" />
                                <Checkbox id="depositPay" label="سداد وتسليم عربون" />
                                <Checkbox id="depositReturn" label="مرتجع مبيعات عربون" />
                            </div>
                         </div>

                         {/* المخزن */}
                         <div className="flex-1 min-w-[200px] bg-white border border-gray-200 p-4 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 font-bold text-sm text-gray-700">
                               خانة المخزن
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <Checkbox id="storeQuantities" label="كميات الاصناف" />
                                <Checkbox id="itemCard" label="كارت الصنف" />
                                <Checkbox id="addItem" label="اضافة صنف جديد" />
                            </div>
                         </div>

                         {/* الاقساط */}
                         <div className="flex-1 min-w-[200px] bg-white border border-gray-200 p-4 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 font-bold text-sm text-gray-700">
                               الاقساط
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <Checkbox id="installmentsAdd" label="اضافة عميل" />
                                <Checkbox id="installmentsPay" label="تسديد قسط عميل" />
                                <Checkbox id="installmentsLate" label="الاقساط المتأخرة" />
                            </div>
                         </div>

                         {/* التقارير */}
                         <div className="flex-1 min-w-[200px] bg-white border border-gray-200 p-4 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 font-bold text-sm text-gray-700">
                               إضافية
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <Checkbox id="reports" label="التقارير" />
                            </div>
                         </div>

                     </div>
                  </div>

                  <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-2.5 shadow-md transition-colors text-sm rounded-sm">
                     {editingCode ? 'تعديل المستخدم' : 'حفظ المستخدم'}
                  </button>
               </div>

               {/* Right (Visual Left) - Users List */}
               <div className="w-full lg:w-[30%] bg-white p-6 shadow-sm border border-gray-300 min-h-[400px]">
                  <div className="flex justify-between mb-4 border-b pb-2 items-center">
                     <h3 className="font-bold text-xl text-blue-900">المستخدمين</h3>
                     <button onClick={handleCancel} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 shadow-sm font-bold">
                        مستخدم جديد +
                     </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                     {users.map(u => (
                        <div key={u.code} className="border border-gray-200 p-3 flex justify-between items-center group hover:bg-blue-50/50 relative">
                           <div className="text-right">
                              <div className="font-bold text-gray-800 text-sm">
                                 {u.name} <span className="font-normal text-gray-500 text-xs">(كود: {u.code})</span>
                              </div>
                              <div className="text-blue-600 text-xs font-bold mt-1">
                                 {u.role === 'admin' ? 'مدير' : 'كاشير'}
                              </div>
                           </div>
                           <button onClick={() => handleEdit(u)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold px-4 py-1.5 rounded-sm">
                              تعديل
                           </button>
                           {u.code !== '01' && (
                             <button
                               onClick={() => {
                                 if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
                                   deleteUser(u.code);
                                 }
                               }}
                               className="absolute -top-2 -left-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               ×
                             </button>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Middle Row: Wallets Management */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
               <div className="w-full lg:flex-1 bg-white p-6 shadow-sm border border-gray-300 min-h-[300px]">
                  <h3 className="font-bold text-2xl mb-6 text-indigo-900 border-b-2 border-gray-100 pb-2 flex justify-between items-center">
                     {walletEditingId ? 'تعديل محفظة إلكترونية' : 'إضافة محفظة إلكترونية جديدة'}
                     {walletEditingId && <button onClick={handleCancelWallet} className="text-sm text-gray-500 hover:text-red-500">إلغاء التعديل</button>}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6 mb-6">
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-red-500 text-sm">*</span>
                            <label className="font-bold text-sm text-gray-700">اسم المحفظة / المنصة</label>
                        </div>
                        <input className="w-full h-10 border border-gray-300 px-3 outline-none text-right font-medium" placeholder="مثل: فودافون كاش، انستا باي..." value={walletName} onChange={e => setWalletName(e.target.value)} />
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <label className="font-bold text-sm text-gray-700">وصف إضافي (اختياري)</label>
                        </div>
                        <input className="w-full h-10 border border-gray-300 px-3 outline-none text-right font-medium" placeholder="مثل: محفظة 1" value={walletSubLabel} onChange={e => setWalletSubLabel(e.target.value)} />
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <label className="font-bold text-sm text-gray-700">رقم المحفظة (اختياري)</label>
                        </div>
                        <input className="w-full h-10 border border-gray-300 px-3 outline-none text-right font-medium" placeholder="مثل: 01012345678" value={walletNumber} onChange={e => setWalletNumber(e.target.value)} />
                     </div>
                  </div>

                  <button onClick={handleSaveWallet} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-2.5 shadow-md transition-colors text-sm rounded-sm">
                     {walletEditingId ? 'تعديل المحفظة' : 'حفظ المحفظة'}
                  </button>
               </div>

               <div className="w-full lg:w-[30%] bg-white p-6 shadow-sm border border-gray-300 min-h-[300px]">
                  <div className="flex justify-between mb-4 border-b pb-2 items-center">
                     <h3 className="font-bold text-xl text-indigo-900">المحافظ الإلكترونية</h3>
                     <button onClick={handleCancelWallet} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 shadow-sm font-bold">
                        محفظة جديدة +
                     </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                     {shiftAccounts.map((a: any) => (
                        <div key={a.id} className="border border-gray-200 p-3 flex justify-between items-center group hover:bg-indigo-50/50 relative">
                           <div className="text-right">
                              <div className="font-bold text-gray-800 text-sm">
                                 {a.name}
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                 {a.subLabel && <span className="ml-2">{a.subLabel}</span>}
                                 {a.walletNumber && <span>({a.walletNumber})</span>}
                              </div>
                           </div>
                           <button onClick={() => handleEditWallet(a)} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-bold px-4 py-1.5 rounded-sm">
                              تعديل
                           </button>
                           <button
                             onClick={() => {
                               if (window.confirm('هل أنت متأكد من حذف هذه المحفظة؟ قد يؤثر ذلك على تقارير الأرصدة المرتبطة بها.')) {
                                 removeShiftAccount(a.id);
                               }
                             }}
                             className="absolute -top-2 -left-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             ×
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Bottom Row: Backup & Restore */}
            <div className="bg-white p-6 shadow-sm border border-gray-300">
                <h3 className="font-bold text-xl mb-6 text-gray-800 border-b pb-2">النسخ الاحتياطي والاسترجاع</h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                   {/* Backup */}
                   <div className="flex-1 bg-blue-50/30 border border-blue-200 p-8 flex flex-col items-center justify-center text-center gap-3">
                      <h4 className="text-blue-900 font-bold text-lg">أخذ نسخة احتياطية</h4>
                      <p className="text-sm text-blue-700 font-medium">يتم حفظ جميع بيانات البرنامج بصيغة ملف</p>
                      <button onClick={handleBackup} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 shadow-md transition-colors text-sm w-48 rounded-sm">
                         حفظ نسخة احتياطية
                      </button>
                   </div>

                   {/* Restore */}
                   <div className="flex-1 bg-amber-50/30 border border-amber-200 p-8 flex flex-col items-center justify-center text-center gap-3">
                      <h4 className="text-amber-900 font-bold text-lg">استرجاع نسخة احتياطية</h4>
                      <p className="text-sm text-amber-700 font-medium">قم باختيار ملف النسخة الاحتياطية لاسترجاع البيانات</p>
                      <input 
                         type="file" 
                         accept=".json" 
                         className="hidden" 
                         ref={fileInputRef}
                         onChange={handleRestore}
                      />
                      <button onClick={() => fileInputRef.current?.click()} className="mt-2 bg-[#d87c12] hover:bg-[#c26d0e] text-white font-bold px-6 py-2.5 shadow-md transition-colors text-sm w-48 rounded-sm">
                         رفع ملف النسخة الاحتياطية
                      </button>
                   </div>
                </div>

                {/* Clear Data Section */}
                <div className="mt-6 border-t pt-6">
                   <div className="bg-red-50/30 border border-red-200 p-8 flex flex-col items-center justify-center text-center gap-3 w-full md:w-1/2 mx-auto">
                      <h4 className="text-red-900 font-bold text-lg">تصفير النظام (مسح البيانات)</h4>
                      <p className="text-sm text-red-700 font-medium">هذا الإجراء سيقوم بمسح جميع الفواتير والمصروفات والأقساط، ولكنه سيحتفظ بأسماء وأرصدة الأصناف المسجلة فقط.</p>
                      <button 
                        onClick={() => {
                          if (window.confirm('تحذير: هل أنت متأكد من مسح جميع الحركات والفواتير؟ (لا يمكن التراجع عن هذه الخطوة)')) {
                            clearData();
                          }
                        }} 
                        className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 shadow-md transition-colors text-sm w-48 rounded-sm"
                      >
                         مسح البيانات الآن
                      </button>
                   </div>
                </div>
            </div>

        </div>
    </div>
  );
}
