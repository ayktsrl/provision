import React, { useState, useEffect } from 'react';
import { UserProfile, MonthlyReport, ReportStatus, ProvisionItem, GuestEntry, SupplyEntry } from '../types';
import Layout from './Layout';
import { db } from '../services/db';
import { INITIAL_CATEGORIES } from '../constants/provisionData';
import ProvisionGrid from './ProvisionGrid';
import GuestMealModal from './GuestMealModal';

interface VesselDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

const VesselDashboard: React.FC<VesselDashboardProps> = ({ user, onLogout }) => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<Record<string, ProvisionItem[]>>({});
  const [crewCount, setCrewCount] = useState(25);
  const [guestMealDetails, setGuestMealDetails] = useState<Record<string, GuestEntry[]>>({});
  const [supplyEntries, setSupplyEntries] = useState<SupplyEntry[]>([]);
  const [status, setStatus] = useState<ReportStatus>(ReportStatus.DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSuppliesOpen, setIsSuppliesOpen] = useState(false);

  // ✅ single id for vessel = auth uid (users/{uid})
  const shipAuthUid = user.uid;

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);

      try {
        if (!user.companyId) throw new Error('Missing companyId in user profile.');
        if (!shipAuthUid) throw new Error('Missing vessel auth uid.');

        // ✅ read by shipAuthUid (NOT shipId)
        const report = await db.getReport(user.companyId, month, shipAuthUid);

        if (report && report.items) {
          setItems(report.items);

          const catList = Object.keys(report.items).map((id) => ({
            id,
            name: id.replace('cat_', '').replace(/_/g, ' '),
          }));

          setCategories(catList);
          setCrewCount(report.crewCount ?? 0);
          setGuestMealDetails(report.guestMealDetails || {});
          setSupplyEntries(report.supplyEntries || []);
          setStatus((report.status as ReportStatus) || ReportStatus.DRAFT);
        } else {
          // init from constants
          const initialItems: Record<string, ProvisionItem[]> = {};
          const catList: { id: string; name: string }[] = [];

          INITIAL_CATEGORIES.forEach((cat) => {
            catList.push({ id: cat.id, name: cat.name });
            initialItems[cat.id] = cat.items.map((item) => ({
              ...item,
              openingQty: 0,
              openingPrice: 0,
              purchaseQty: 0,
              purchasePrice: 0,
              closingQty: 0,
            }));
          });

          setCategories(catList);
          setItems(initialItems);
          setGuestMealDetails({});
          setSupplyEntries([]);
          setStatus(ReportStatus.DRAFT);
        }
      } catch (err) {
        console.error('Error loading report:', err);
        alert('Cannot load report. Check Firestore rules + vessel profile (users/{uid}).');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [month, user.companyId, shipAuthUid]);

  // Aggregates
  let openingTotal = 0;
  const suppliesTotal = supplyEntries.reduce((acc, s) => acc + (s.amount || 0), 0);
  let consumptionTotal = 0;

  (Object.values(items) as ProvisionItem[][]).forEach((catItems) => {
    catItems.forEach((item) => {
      openingTotal += item.openingPrice || 0;

      const totalQty = (item.openingQty || 0) + (item.purchaseQty || 0);
      const totalPrice = (item.openingPrice || 0) + (item.purchasePrice || 0);
      const avgPrice = totalQty > 0 ? totalPrice / totalQty : 0;

      consumptionTotal += Math.max(0, totalQty - (item.closingQty || 0)) * avgPrice;
    });
  });

  const guestMeals = (Object.values(guestMealDetails).flat() as GuestEntry[]).reduce(
    (acc: number, entry: GuestEntry) => acc + (entry.meals?.length || 0),
    0
  );

  const daysInMonth = new Date(
    parseInt(month.split('-')[0]),
    parseInt(month.split('-')[1]),
    0
  ).getDate();

  const totalPersonDaysEquivalent = (crewCount * daysInMonth) + (guestMeals / 3);
  const dailyPerPerson = totalPersonDaysEquivalent > 0 ? consumptionTotal / totalPersonDaysEquivalent : 0;

  const handleUpdateItem = (catId: string, idx: number, field: keyof ProvisionItem, value: any) => {
    const newCatItems = [...(items[catId] || [])];
    newCatItems[idx] = { ...newCatItems[idx], [field]: value };
    setItems({ ...items, [catId]: newCatItems });
  };

  const handleDeleteItem = (catId: string, idx: number) => {
    if (confirm('Delete this item from the list?')) {
      const newItems = { ...items };
      newItems[catId] = (items[catId] || []).filter((_, i) => i !== idx);
      setItems(newItems);
    }
  };

  const handleAddItem = (catId: string) => {
    const newItem: ProvisionItem = {
      id: 'item_' + Date.now() + Math.random().toString(36).slice(2, 6),
      nameEn: 'New Item',
      nameTr: '',
      unit: 'KG',
      openingQty: 0,
      openingPrice: 0,
      purchaseQty: 0,
      purchasePrice: 0,
      closingQty: 0,
    };

    setItems({ ...items, [catId]: [...(items[catId] || []), newItem] });
  };

  const handleAddCategory = () => {
    const name = prompt('New Category Header Name:');
    if (name) {
      const id = 'cat_' + name.toLowerCase().replace(/\s+/g, '_');
      if (items[id]) return alert('This header already exists.');
      setCategories([...categories, { id, name }]);
      setItems({ ...items, [id]: [] });
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Delete this section and all items within it?')) {
      const newItems = { ...items };
      delete newItems[id];
      setItems(newItems);
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  const handleSave = async (submit = false) => {
    if (submit && !confirm('Final submission? This locks the report for vessel editing.')) return;

    setSaving(true);

    try {
      if (!user.companyId) throw new Error('Missing companyId');
      if (!shipAuthUid) throw new Error('Missing shipAuthUid (user.uid)');
      if (!user.shipId) throw new Error('Missing shipId in vessel profile (users/{uid})');
      if (!user.shipName) throw new Error('Missing shipName in vessel profile (users/{uid})');

      const rid = `${month}_${shipAuthUid}`;

      const report: MonthlyReport = {
        id: rid,

        companyId: user.companyId,
        shipAuthUid: shipAuthUid,

        month,
        shipId: user.shipId,
        shipName: user.shipName,

        items,
        crewCount,
        guestMeals,
        guestMealDetails,
        supplyEntries,

        openingTotal,
        suppliesTotal,
        closingTotal: openingTotal + suppliesTotal - consumptionTotal,

        consumptionTotal,
        dailyPerPerson,

        status: submit ? ReportStatus.SUBMITTED : ReportStatus.DRAFT,
        updatedAt: Date.now(),
        submittedAt: submit ? Date.now() : undefined,
      };

      await db.saveReport(report);
      setStatus(report.status);
      alert(submit ? 'Report Submitted Successfully.' : 'Progress Saved.');
    } catch (err) {
      console.error('Save error:', err);
      alert('Save failed. Check Firestore rules (reports) + shipAuthUid / companyId fields.');
    } finally {
      setSaving(false);
    }
  };

  const isLocked = status === ReportStatus.SUBMITTED;

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      {isCalendarOpen && (
        <GuestMealModal
          month={month}
          details={guestMealDetails}
          onUpdate={setGuestMealDetails}
          onClose={() => setIsCalendarOpen(false)}
          isLocked={isLocked}
        />
      )}

      {/* Supplies Modal */}
      {isSuppliesOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl p-10 border border-slate-200">
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
              Deliveries (Purchases)
            </h2>

            <div className="space-y-4 mb-10 max-h-[50vh] overflow-y-auto pr-3 no-scrollbar">
              {supplyEntries.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex gap-3 items-center bg-slate-50 p-6 rounded-[28px] border border-slate-100 shadow-sm"
                >
                  <div className="flex-1 space-y-3">
                    <input
                      type="date"
                      disabled={isLocked}
                      className="bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl px-3 py-1.5 border border-slate-700 outline-none block"
                      value={s.date}
                      onChange={(e) => {
                        const next = [...supplyEntries];
                        next[idx].date = e.target.value;
                        setSupplyEntries(next);
                      }}
                    />

                    <input
                      type="text"
                      disabled={isLocked}
                      placeholder="Supplier Name"
                      className="bg-slate-900 text-white text-sm font-black rounded-xl px-4 py-2.5 border border-slate-700 outline-none w-full"
                      value={s.supplier}
                      onChange={(e) => {
                        const next = [...supplyEntries];
                        next[idx].supplier = e.target.value;
                        setSupplyEntries(next);
                      }}
                    />
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Amount $
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      className="bg-slate-900 text-blue-400 border border-slate-700 rounded-xl px-4 py-3 text-sm font-black w-28 text-right shadow-inner"
                      value={s.amount || ''}
                      onChange={(e) => {
                        const next = [...supplyEntries];
                        next[idx].amount = parseFloat(e.target.value) || 0;
                        setSupplyEntries(next);
                      }}
                    />
                  </div>

                  {!isLocked && (
                    <button
                      onClick={() => setSupplyEntries(supplyEntries.filter((_, i) => i !== idx))}
                      className="text-rose-400 p-2.5 hover:bg-rose-50 rounded-2xl transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {supplyEntries.length === 0 && (
                <div className="py-20 text-center text-slate-300 italic text-sm font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
                  No records found
                </div>
              )}

              {!isLocked && (
                <button
                  onClick={() =>
                    setSupplyEntries([
                      ...supplyEntries,
                      { id: Math.random().toString(), date: '', supplier: '', amount: 0 },
                    ])
                  }
                  className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-[11px] font-black uppercase text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all"
                >
                  + Register New Delivery
                </button>
              )}
            </div>

            <button
              onClick={() => setIsSuppliesOpen(false)}
              className="w-full bg-slate-900 text-white py-6 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:bg-black"
            >
              Save & Finish
            </button>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col xl:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                  {user.shipName}
                </h1>
                <div
                  className={`px-4 py-2 rounded-2xl text-[10px] font-black border uppercase shadow-xl ${
                    isLocked ? 'bg-slate-900 border-slate-900 text-white' : 'bg-blue-600 border-blue-600 text-white'
                  }`}
                >
                  {status}
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Provision Master Control Panel
              </p>
            </div>

            <div className="flex flex-wrap gap-6 items-center">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner flex flex-col">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-[0.2em]">
                  Target Period
                </label>
                <input
                  type="month"
                  className="bg-slate-900 text-white font-black text-sm rounded-xl px-4 py-2 border border-slate-700 outline-none"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner flex flex-col">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-[0.2em]">
                  Average Crew
                </label>
                <input
                  disabled={isLocked}
                  type="number"
                  className="bg-slate-900 text-white font-black text-sm rounded-xl px-4 py-2 border border-slate-700 outline-none w-20 text-center"
                  value={crewCount}
                  onChange={(e) => setCrewCount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4 px-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">
                Inventory Ledger
              </h2>

              {!isLocked && (
                <button
                  onClick={handleAddCategory}
                  className="bg-white border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
                >
                  + New Inventory Section
                </button>
              )}
            </div>

            <ProvisionGrid
              categories={categories}
              items={items}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              onDeleteCategory={handleDeleteCategory}
              disabled={isLocked}
            />
          </div>
        </div>

        <div className="xl:w-96 space-y-8">
          <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-10 xl:sticky xl:top-24">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-10 border-b border-slate-50 pb-6 text-center">
              Account Summary
            </h2>

            <div className="space-y-8 mb-12">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tight">
                  Opening Balance
                </span>
                <span className="text-base font-black text-slate-600 font-mono tracking-tighter">
                  ${openingTotal.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-tight">
                    Supplies Purchased
                  </span>
                  <button
                    onClick={() => setIsSuppliesOpen(true)}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest mt-1 underline underline-offset-4 decoration-blue-100"
                  >
                    EDIT LOGS ({supplyEntries.length})
                  </button>
                </div>
                <span className="text-base font-black text-slate-800 font-mono tracking-tighter">
                  ${suppliesTotal.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </span>
              </div>

              <div className="flex justify-between items-center pt-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tight">
                  Total Consumption
                </span>
                <span className="text-2xl font-black text-slate-800 font-mono tracking-tighter">
                  ${consumptionTotal.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </span>
              </div>

              <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tight">
                  Guest Activity
                </span>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-slate-800 tracking-tight">
                      {guestMeals} MEALS
                    </span>
                    <button
                      onClick={() => setIsCalendarOpen(true)}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest border border-blue-200 px-3 py-1.5 rounded-xl shadow-sm"
                    >
                      LOG
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tight">
                  Person-Days Equivalent
                </span>
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest font-mono">
                  {totalPersonDaysEquivalent.toFixed(1)} P/D
                </span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[40px] p-10 text-center border border-slate-800 shadow-2xl mb-10 transition-all hover:scale-[1.02]">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 block mb-6">
                Daily Avg / Person
              </span>

              <div className="flex items-baseline justify-center gap-1 mb-4">
                <span className="text-3xl font-black text-slate-700 font-mono tracking-tighter">$</span>
                <span
                  className={`text-8xl font-black tracking-tighter transition-colors ${
                    dailyPerPerson > 10 ? 'text-rose-400' : 'text-blue-400'
                  }`}
                >
                  {dailyPerPerson.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    dailyPerPerson > 10 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                ></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Target Limit: $10.00
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {!isLocked ? (
                <>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all shadow-sm"
                  >
                    {saving ? 'Processing...' : 'Save As Draft'}
                  </button>

                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-7 rounded-[32px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all hover:scale-[1.03] active:scale-95"
                  >
                    Submit Final Report
                  </button>
                </>
              ) : (
                <div className="p-10 bg-slate-50 rounded-[40px] text-center border border-slate-100 shadow-inner">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    Report Locked
                  </p>
                  <p className="text-[10px] mt-3 italic text-slate-400 font-bold">
                    Waiting for Company Approval
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VesselDashboard;
