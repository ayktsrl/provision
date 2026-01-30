
import React, { useState } from 'react';
import { GuestEntry } from '../types';

interface GuestMealModalProps {
  month: string; // YYYY-MM
  details: Record<string, GuestEntry[]>;
  onUpdate: (details: Record<string, GuestEntry[]>) => void;
  onClose: () => void;
  isLocked: boolean;
}

const GuestMealModal: React.FC<GuestMealModalProps> = ({ month, details, onUpdate, onClose, isLocked }) => {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  
  const dateStr = `${month}-${String(selectedDay).padStart(2, '0')}`;
  const currentDayEntries = details[dateStr] || [];

  const addGuest = () => {
    if (isLocked) return;
    const newEntry: GuestEntry = {
      id: Math.random().toString(36).substr(2, 9),
      remark: '',
      meals: []
    };
    onUpdate({ ...details, [dateStr]: [...currentDayEntries, newEntry] });
  };

  const updateEntry = (id: string, field: keyof GuestEntry, value: any) => {
    if (isLocked) return;
    const newEntries = currentDayEntries.map(e => e.id === id ? { ...e, [field]: value } : e);
    onUpdate({ ...details, [dateStr]: newEntries });
  };

  const deleteEntry = (id: string) => {
    if (isLocked) return;
    onUpdate({ ...details, [dateStr]: currentDayEntries.filter(e => e.id !== id) });
  };

  const toggleMeal = (id: string, meal: string) => {
    if (isLocked) return;
    const entry = currentDayEntries.find(e => e.id === id);
    if (!entry) return;
    const newMeals = entry.meals.includes(meal)
      ? entry.meals.filter(m => m !== meal)
      : [...entry.meals, meal];
    updateEntry(id, 'meals', newMeals);
  };

  // Fix: Cast flattened array to GuestEntry[] to resolve 'unknown' type in reduce callback.
  const totalMeals = (Object.values(details).flat() as GuestEntry[]).reduce((acc, entry) => acc + entry.meals.length, 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Guest Activity Log</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">{month}</p>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-slate-200 rounded-3xl transition-all">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Calendar Picker Sidebar */}
          <div className="w-full lg:w-96 border-r border-slate-100 overflow-y-auto p-8 bg-slate-50/30 no-scrollbar">
            <div className="grid grid-cols-7 lg:grid-cols-4 gap-3">
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dStr = `${month}-${String(day).padStart(2, '0')}`;
                const dayMealsCount = (details[dStr] || []).reduce((acc, e) => acc + e.meals.length, 0);
                
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative p-4 rounded-3xl border transition-all flex flex-col items-center justify-center min-h-[72px] ${
                      selectedDay === day
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-200 scale-105 z-10'
                        : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-[10px] font-black opacity-50 mb-1">{day}</span>
                    {dayMealsCount > 0 && (
                      <span className={`text-[11px] font-black ${selectedDay === day ? 'text-white' : 'text-blue-600'}`}>
                        {dayMealsCount} M
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Editor Area */}
          <div className="flex-1 flex flex-col p-10 overflow-y-auto bg-white no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">
                Entries for {dateStr}
              </h3>
              {!isLocked && (
                <button
                  onClick={addGuest}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Guest
                </button>
              )}
            </div>

            {currentDayEntries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[48px] p-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-slate-300 text-sm font-black uppercase tracking-[0.3em]">No registered guests</p>
              </div>
            ) : (
              <div className="space-y-6">
                {currentDayEntries.map((guest) => (
                  <div key={guest.id} className="bg-slate-50 border border-slate-100 rounded-[32px] p-8 flex flex-col md:flex-row items-start md:items-center gap-8 shadow-sm">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3 px-1">Identity / Designation</label>
                      <input
                        disabled={isLocked}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/20 shadow-inner"
                        placeholder="e.g. Agent, Class Surveyor, Owner Representative"
                        value={guest.remark}
                        onChange={(e) => updateEntry(guest.id, 'remark', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Meal Selection</label>
                      <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
                        {['B', 'L', 'D'].map((m) => (
                          <button
                            key={m}
                            disabled={isLocked}
                            onClick={() => toggleMeal(guest.id, m)}
                            className={`w-12 h-12 rounded-xl text-xs font-black transition-all ${
                              guest.meals.includes(m)
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-transparent text-slate-500 hover:text-white'
                            }`}
                            title={m === 'B' ? 'Breakfast' : m === 'L' ? 'Lunch' : 'Dinner'}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    {!isLocked && (
                      <button
                        onClick={() => deleteEntry(guest.id)}
                        className="p-4 text-slate-300 hover:text-rose-500 transition-all self-end md:self-auto hover:bg-rose-50 rounded-2xl"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
            <div className="p-6 bg-slate-900 rounded-[32px] shadow-2xl border border-slate-800 text-center min-w-[160px]">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Monthly Total</span>
              <span className="text-4xl font-black text-blue-400 font-mono tracking-tighter">
                {totalMeals}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 leading-loose uppercase tracking-widest max-w-[220px]">
              <span className="text-slate-800">Equivalent Days:</span> <br/>
              {totalMeals} Meals / 3 = <span className="text-blue-600 font-black">{(totalMeals / 3).toFixed(1)} P/D</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-full sm:w-80 py-6 bg-blue-600 text-white text-xs font-black uppercase tracking-[0.3em] rounded-3xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100"
          >
            Confirm & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestMealModal;
