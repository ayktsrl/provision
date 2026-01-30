
import React from 'react';
import { UserProfile } from '../types';
import { db } from '../services/db';

interface LayoutProps {
  user: UserProfile;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  const isLocal = db.isLocal();

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
              </div>
              <span className="font-black text-lg tracking-tight text-slate-800 hidden lg:block uppercase">PROVISION TRACKER</span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
              isLocal 
                ? 'bg-amber-50 border-amber-100 text-amber-600' 
                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isLocal ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              {isLocal ? 'Offline Mode' : 'Cloud Connected'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden xs:block">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{user.role === 'company' ? 'MANAGER' : 'VESSEL'}</p>
              <p className="text-sm font-bold text-slate-700">{user.shipName || user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
