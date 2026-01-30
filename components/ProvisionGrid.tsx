
import React from 'react';
import { ProvisionItem } from '../types';

interface ProvisionGridProps {
  categories: { id: string, name: string }[];
  items: Record<string, ProvisionItem[]>;
  onUpdateItem: (catId: string, itemIdx: number, field: keyof ProvisionItem, value: any) => void;
  onDeleteItem: (catId: string, itemIdx: number) => void;
  onAddItem: (catId: string) => void;
  onDeleteCategory: (catId: string) => void;
  disabled?: boolean;
}

const ProvisionGrid: React.FC<ProvisionGridProps> = ({ 
  categories, 
  items, 
  onUpdateItem, 
  onDeleteItem, 
  onAddItem,
  onDeleteCategory,
  disabled 
}) => {

  const renderItemRow = (item: ProvisionItem, catId: string, idx: number) => {
    const totalQty = item.openingQty + item.purchaseQty;
    const totalPrice = item.openingPrice + item.purchasePrice;
    const avgPrice = totalQty > 0 ? totalPrice / totalQty : 0;
    const consumedQty = Math.max(0, totalQty - item.closingQty);
    const consumedPrice = consumedQty * avgPrice;

    const inputClasses = "w-full bg-slate-900 text-white font-bold border border-slate-700 focus:ring-2 focus:ring-blue-500 rounded-lg p-1.5 text-center outline-none transition-all placeholder-slate-500 disabled:opacity-50 disabled:bg-slate-800";
    const descInputClasses = "w-full bg-slate-900 text-white font-bold border border-slate-700 focus:ring-2 focus:ring-blue-500 rounded-lg p-1.5 text-left outline-none transition-all placeholder-slate-500 disabled:opacity-50 disabled:bg-slate-800";

    return (
      <React.Fragment key={item.id}>
        {/* Desktop Row */}
        <tr className="hidden lg:table-row divide-x divide-slate-100 hover:bg-slate-50/50 transition-colors">
          <td className="px-3 py-2">
            <input
              disabled={disabled}
              className={descInputClasses}
              value={item.nameEn}
              placeholder="Item Name"
              onChange={(e) => onUpdateItem(catId, idx, 'nameEn', e.target.value)}
            />
          </td>
          <td className="px-2 py-2">
            <input
              disabled={disabled}
              className={inputClasses + " uppercase text-[10px]"}
              value={item.unit}
              placeholder="Unit"
              onChange={(e) => onUpdateItem(catId, idx, 'unit', e.target.value)}
            />
          </td>
          <td className="p-2 bg-blue-50/10">
            <input disabled={disabled} type="number" className={inputClasses} value={item.openingQty || ''} onChange={(e) => onUpdateItem(catId, idx, 'openingQty', parseFloat(e.target.value) || 0)} />
          </td>
          <td className="p-2 bg-blue-50/10">
            <input disabled={disabled} type="number" className={inputClasses + " text-blue-300"} value={item.openingPrice || ''} onChange={(e) => onUpdateItem(catId, idx, 'openingPrice', parseFloat(e.target.value) || 0)} />
          </td>
          <td className="p-2 bg-green-50/10">
            <input disabled={disabled} type="number" className={inputClasses} value={item.purchaseQty || ''} onChange={(e) => onUpdateItem(catId, idx, 'purchaseQty', parseFloat(e.target.value) || 0)} />
          </td>
          <td className="p-2 bg-green-50/10">
            <input disabled={disabled} type="number" className={inputClasses + " text-green-300"} value={item.purchasePrice || ''} onChange={(e) => onUpdateItem(catId, idx, 'purchasePrice', parseFloat(e.target.value) || 0)} />
          </td>
          <td className="p-2 bg-orange-50/10">
            <input disabled={disabled} type="number" className={inputClasses + " border-orange-700 text-orange-300"} value={item.closingQty || ''} onChange={(e) => onUpdateItem(catId, idx, 'closingQty', parseFloat(e.target.value) || 0)} />
          </td>
          <td className="px-2 py-2 text-center font-black text-slate-800 text-sm">{consumedQty.toFixed(1)}</td>
          <td className="px-2 py-2 text-center font-mono font-black text-blue-700 text-sm">${consumedPrice.toFixed(2)}</td>
          {!disabled && (
            <td className="px-2 py-2 text-center">
              <button onClick={() => onDeleteItem(catId, idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </td>
          )}
        </tr>

        {/* Mobile Card */}
        <tr className="lg:hidden">
          <td colSpan={10} className="p-0 border-none">
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 mb-4 shadow-sm relative overflow-hidden">
               {!disabled && (
                <button 
                  onClick={() => onDeleteItem(catId, idx)}
                  className="absolute top-6 right-6 text-slate-300 hover:text-red-500 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              
              <div className="flex gap-3 items-center mb-6 pr-10">
                <input
                  disabled={disabled}
                  className="flex-1 bg-slate-900 text-white font-black text-base rounded-2xl px-4 py-3 border border-slate-700 outline-none"
                  value={item.nameEn}
                  onChange={(e) => onUpdateItem(catId, idx, 'nameEn', e.target.value)}
                />
                <input
                  disabled={disabled}
                  className="w-16 bg-slate-800 text-white text-[10px] font-black uppercase text-center rounded-xl py-3 border border-slate-700 outline-none"
                  value={item.unit}
                  onChange={(e) => onUpdateItem(catId, idx, 'unit', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/30 p-4 rounded-3xl border border-blue-100/50">
                  <label className="text-[9px] font-black uppercase text-blue-500 block mb-2">Opening Inv</label>
                  <div className="flex gap-2">
                    <input disabled={disabled} type="number" className="w-1/2 bg-slate-900 text-white border border-slate-700 rounded-xl text-center text-xs py-2 font-black" placeholder="Qty" value={item.openingQty || ''} onChange={(e) => onUpdateItem(catId, idx, 'openingQty', parseFloat(e.target.value) || 0)} />
                    <input disabled={disabled} type="number" className="w-1/2 bg-slate-900 text-blue-300 border border-slate-700 rounded-xl text-center text-xs py-2 font-black" placeholder="$" value={item.openingPrice || ''} onChange={(e) => onUpdateItem(catId, idx, 'openingPrice', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="bg-green-50/30 p-4 rounded-3xl border border-green-100/50">
                  <label className="text-[9px] font-black uppercase text-green-500 block mb-2">Purchases</label>
                  <div className="flex gap-2">
                    <input disabled={disabled} type="number" className="w-1/2 bg-slate-900 text-white border border-slate-700 rounded-xl text-center text-xs py-2 font-black" placeholder="Qty" value={item.purchaseQty || ''} onChange={(e) => onUpdateItem(catId, idx, 'purchaseQty', parseFloat(e.target.value) || 0)} />
                    <input disabled={disabled} type="number" className="w-1/2 bg-slate-900 text-green-300 border border-slate-700 rounded-xl text-center text-xs py-2 font-black" placeholder="$" value={item.purchasePrice || ''} onChange={(e) => onUpdateItem(catId, idx, 'purchasePrice', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="bg-orange-50/30 p-4 rounded-3xl border border-orange-100/50">
                  <label className="text-[9px] font-black uppercase text-orange-500 block mb-2">Closing Inv</label>
                  <input disabled={disabled} type="number" className="w-full bg-slate-900 text-orange-300 border border-orange-700 rounded-xl text-center text-sm py-3 font-black" value={item.closingQty || ''} onChange={(e) => onUpdateItem(catId, idx, 'closingQty', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-slate-200">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Consumption</label>
                  <div className="flex flex-col">
                    <span className="text-xl font-black font-mono text-blue-400">${consumedPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{consumedQty.toFixed(1)} {item.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <div className="w-full">
      <div className="overflow-hidden border border-slate-200 rounded-[40px] bg-white shadow-sm">
        <table className="w-full text-[11px] text-left border-collapse table-fixed">
          <thead className="hidden lg:table-header-group">
            <tr className="bg-slate-50 border-b border-slate-200 divide-x divide-slate-100 font-black text-slate-400 uppercase tracking-widest text-[9px]">
              <th className="px-4 py-4 w-48">Description</th>
              <th className="px-2 py-4 w-16 text-center">Unit</th>
              <th className="px-2 py-4 text-center bg-blue-50/40 text-blue-600" colSpan={2}>Opening Inventory</th>
              <th className="px-2 py-4 text-center bg-green-50/40 text-green-600" colSpan={2}>Supply Deliveries</th>
              <th className="px-2 py-4 text-center bg-orange-50/40 text-orange-600">Closing</th>
              <th className="px-2 py-4 text-center bg-slate-900 text-white" colSpan={2}>Monthly Consumption</th>
              {!disabled && <th className="px-2 py-4 w-12 text-center text-rose-400">#</th>}
            </tr>
            <tr className="bg-white border-b border-slate-100 text-[8px] divide-x divide-slate-50 text-slate-300 font-black uppercase">
              <th className="px-4 py-1.5">Item Name</th>
              <th className="px-2 py-1.5 text-center">KG/LT</th>
              <th className="px-2 py-1.5 text-center">Qty</th>
              <th className="px-2 py-1.5 text-center">Val $</th>
              <th className="px-2 py-1.5 text-center">Qty</th>
              <th className="px-2 py-1.5 text-center">Val $</th>
              <th className="px-2 py-1.5 text-center">Qty</th>
              <th className="px-2 py-1.5 text-center bg-slate-800 text-slate-400">Qty</th>
              <th className="px-2 py-1.5 text-center bg-slate-800 text-slate-400">Val $</th>
              {!disabled && <th className="px-2 py-1.5"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map(cat => (
              <React.Fragment key={cat.id}>
                {/* Category Header Row */}
                <tr className="bg-slate-50/30">
                  <td colSpan={10} className="px-6 py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                         <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-lg shadow-blue-100"></div>
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">{cat.name}</h3>
                      </div>
                      {!disabled && (
                        <div className="flex gap-4">
                           <button onClick={() => onAddItem(cat.id)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl transition-all">+ Add Item</button>
                           <button onClick={() => onDeleteCategory(cat.id)} className="text-[10px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest px-3 py-1.5">Remove Category</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {items[cat.id]?.map((item, idx) => renderItemRow(item, cat.id, idx))}
                {(!items[cat.id] || items[cat.id].length === 0) && (
                   <tr><td colSpan={10} className="px-12 py-8 text-center text-[10px] font-bold text-slate-300 uppercase italic tracking-widest">No inventory items in this section</td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProvisionGrid;
