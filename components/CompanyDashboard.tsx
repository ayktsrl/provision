
import React, { useState, useEffect } from 'react';
import { UserProfile, MonthlyReport, ReportStatus, Ship, ProvisionItem } from '../types';
import Layout from './Layout';
import { db } from '../services/db';
import ProvisionGrid from './ProvisionGrid';

interface CompanyDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ user, onLogout }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const [ships, setShips] = useState<Ship[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShipId, setEditingShipId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [reviewReport, setReviewReport] = useState<MonthlyReport | null>(null);

  const [vesselFormData, setVesselFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedShips, fetchedReports] = await Promise.all([
        db.getShips(user.companyId),
        db.getReports(user.companyId, monthKey)
      ]);
      setShips(fetchedShips);
      setReports(fetchedReports);
    } catch (e) {
      console.error("Error loading fleet data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  const handleSubmitVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShipId) {
      await db.updateShip(editingShipId, {
        shipName: vesselFormData.name,
        email: vesselFormData.email,
        password: vesselFormData.password
      });
    } else {
      await db.createShip(user.companyId, vesselFormData.name, vesselFormData.email, vesselFormData.password);
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleUnlock = async (shipId: string) => {
    if (confirm('Unlock this report? This will allow the vessel to edit it again (Revert to Draft).')) {
      await db.updateReportStatus(monthKey, shipId, ReportStatus.DRAFT);
      loadData();
    }
  };

  const handleSaveReview = async () => {
    if (!reviewReport) return;
    await db.saveReport(reviewReport);
    setReviewReport(null);
    loadData();
  };

  const updateReviewItem = (catId: string, idx: number, field: keyof ProvisionItem, value: any) => {
    if (!reviewReport) return;
    const newItems = { ...reviewReport.items };
    newItems[catId][idx] = { ...newItems[catId][idx], [field]: value };
    
    let consumption = 0;
    (Object.values(newItems).flat() as ProvisionItem[]).forEach(item => {
      const totalQty = item.openingQty + item.purchaseQty;
      const totalPrice = item.openingPrice + item.purchasePrice;
      const avgPrice = totalQty > 0 ? totalPrice / totalQty : 0;
      consumption += Math.max(0, totalQty - item.closingQty) * avgPrice;
    });

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const totalPersonDays = (reviewReport.crewCount * daysInMonth) + (reviewReport.guestMeals / 3);
    
    setReviewReport({ 
      ...reviewReport, 
      items: newItems, 
      consumptionTotal: consumption,
      dailyPerPerson: totalPersonDays > 0 ? consumption / totalPersonDays : 0
    });
  };

  const filteredShips = ships.filter(s => showArchived ? s.isArchived : !s.isArchived);

  const darkInputClasses = "w-full bg-slate-900 text-white border border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/20 placeholder-slate-500 transition-all";

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Fleet Operations</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight">Active Management Dashboard • {monthKey}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-900 p-2 px-5 rounded-2xl border border-slate-800 flex items-center gap-4 shadow-xl">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Period:</span>
            <select 
              className="font-black text-white bg-transparent outline-none cursor-pointer text-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1} className="bg-slate-900">{new Date(0, i).toLocaleString('en', {month: 'long'})}</option>
              ))}
            </select>
            <select 
              className="font-black text-white bg-transparent outline-none cursor-pointer text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
            </select>
          </div>

          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              showArchived ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            {showArchived ? 'Active Fleet' : 'Archived Fleet'}
          </button>
          
          <button 
            onClick={() => { setEditingShipId(null); setVesselFormData({name:'', email:'', password:''}); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-3xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-200 transition-all active:scale-95"
          >
            + Register Vessel
          </button>
        </div>
      </div>

      {reviewReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[40px] w-full max-w-7xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Review Report: {reviewReport.shipName}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{monthKey} Correction Mode</p>
              </div>
              <button onClick={() => setReviewReport(null)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20 no-scrollbar">
               <div className="bg-white rounded-[32px] border border-slate-200 p-10 flex flex-wrap gap-12 shadow-sm">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Total Consumption</span>
                    <p className="font-black text-slate-800 text-4xl font-mono tracking-tighter">${reviewReport.consumptionTotal.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Daily Cost / Person</span>
                    <p className={`text-4xl font-black font-mono tracking-tighter ${reviewReport.dailyPerPerson > 10 ? 'text-rose-500' : 'text-blue-600'}`}>${reviewReport.dailyPerPerson.toFixed(2)}</p>
                  </div>
                  <div className="w-full lg:w-auto">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-3">Crew Adjustment</span>
                    <input 
                      type="number" 
                      className="bg-slate-900 text-white font-black text-xl rounded-2xl px-6 py-4 w-32 border border-slate-700 outline-none shadow-lg shadow-slate-100" 
                      value={reviewReport.crewCount} 
                      onChange={e => setReviewReport({...reviewReport, crewCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
               </div>

               <ProvisionGrid 
                  categories={Object.keys(reviewReport.items).map(id => ({ id, name: id.replace('cat_', '').replace(/_/g, ' ') }))}
                  items={reviewReport.items}
                  onUpdateItem={updateReviewItem}
                  onDeleteItem={() => {}}
                  onAddItem={() => {}}
                  onDeleteCategory={() => {}}
                  disabled={false}
               />
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center">
               <p className="text-xs font-bold text-slate-400 italic">Caution: Edits made here directly update the vessel ledger.</p>
               <div className="flex gap-4">
                  <button onClick={() => setReviewReport(null)} className="px-10 py-5 text-xs font-black uppercase text-slate-400 tracking-widest">Cancel</button>
                  <button onClick={handleSaveReview} className="px-16 py-5 bg-slate-900 text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 hover:bg-black">Commit Corrections</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10 border border-slate-200">
            <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter">
              {editingShipId ? 'Edit Vessel' : 'New Vessel Registry'}
            </h2>
            <form onSubmit={handleSubmitVessel} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Vessel Name</label>
                <input required className={darkInputClasses} placeholder="MV Explorer" value={vesselFormData.name} onChange={(e) => setVesselFormData({ ...vesselFormData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Login Email</label>
                <input required type="email" className={darkInputClasses} placeholder="vessel01@fleet.com" value={vesselFormData.email} onChange={(e) => setVesselFormData({ ...vesselFormData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-widest">Password</label>
                <input required type="text" className={darkInputClasses} placeholder="Master Key" value={vesselFormData.password} onChange={(e) => setVesselFormData({ ...vesselFormData, password: e.target.value })} />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-xs font-black uppercase text-slate-400 tracking-widest">Discard</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all hover:bg-blue-700">Save Vessel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-32"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div></div>
      ) : (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vessel Information</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Consumption</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Daily Cost</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShips.map((ship) => {
                  const report = reports.find(r => r.shipId === ship.shipId);
                  const isSubmitted = report?.status === ReportStatus.SUBMITTED;

                  return (
                    <tr key={ship.shipId} className={`hover:bg-slate-50/80 transition-all ${ship.isArchived ? 'opacity-40 grayscale' : ''}`}>
                      <td className="px-8 py-10">
                        <div>
                          <p className="font-black text-slate-900 text-2xl tracking-tighter uppercase">{ship.shipName}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">ID: {ship.email} • PW: <span className="text-blue-500">{ship.password}</span></p>
                        </div>
                      </td>
                      <td className="px-8 py-10 text-center">
                        <span className={`inline-flex px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                          isSubmitted ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : report ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-300'
                        }`}>
                          {report?.status || 'No Report'}
                        </span>
                      </td>
                      <td className="px-8 py-10 text-right">
                        <span className="font-black text-slate-700 text-xl font-mono tracking-tighter">
                          {report ? `$${report.consumptionTotal.toLocaleString(undefined, {minimumFractionDigits:1})}` : '-'}
                        </span>
                      </td>
                      <td className="px-8 py-10 text-right">
                        {report ? (
                          <span className={`font-black text-3xl tracking-tighter font-mono ${report.dailyPerPerson > 10 ? 'text-rose-500' : 'text-blue-600'}`}>
                            ${report.dailyPerPerson.toFixed(2)}
                          </span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-8 py-10">
                        <div className="flex gap-4">
                          {report && (
                            <button onClick={() => setReviewReport(JSON.parse(JSON.stringify(report)))} className="bg-blue-600 text-white p-4 rounded-3xl shadow-xl shadow-blue-100 transition-all hover:scale-110 active:scale-95" title="Review Report">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          )}
                          {!ship.isArchived && (
                            <button onClick={() => { setEditingShipId(ship.shipId); setVesselFormData({name:ship.shipName, email:ship.email, password:ship.password}); setIsModalOpen(true); }} className="bg-slate-100 text-slate-500 p-4 rounded-3xl hover:bg-slate-200 transition-all shadow-sm">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </button>
                          )}
                          {isSubmitted && !ship.isArchived && (
                            <button onClick={() => handleUnlock(ship.shipId)} className="bg-amber-100 text-amber-700 p-4 rounded-3xl hover:bg-amber-200 transition-all shadow-xl shadow-amber-50" title="Unlock Report">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                            </button>
                          )}
                          <button 
                            onClick={() => db.updateShipArchived(ship.shipId, !ship.isArchived).then(loadData)}
                            className={`p-4 rounded-3xl transition-all shadow-sm ${ship.isArchived ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-50 text-rose-300 hover:bg-rose-100 hover:text-rose-600'}`}
                          >
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CompanyDashboard;
