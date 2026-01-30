
import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { db } from '../services/db';

interface LoginProps {
  onLogin: (profile: UserProfile) => void;
  onNavigateToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigateToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Try Vessel login first
      const ship = await db.authenticateVessel(email, password);
      
      if (ship) {
        const profile: UserProfile = {
          uid: ship.shipId,
          email: ship.email,
          role: UserRole.VESSEL,
          companyId: ship.companyId || 'company_001',
          shipId: ship.shipId,
          shipName: ship.shipName,
        };
        onLogin(profile);
      } else {
        // 2. If no vessel found, check for Manager (Admin) login
        // Mock admin check based on email containing 'admin' or password being 'admin123'
        if (email.toLowerCase().includes('admin') || password === 'admin123') {
          setTimeout(() => {
            const mockProfile: UserProfile = {
              uid: 'mock_uid_admin',
              email: email || 'admin@company.com',
              role: UserRole.COMPANY,
              companyId: 'company_001',
            };
            onLogin(mockProfile);
          }, 500);
        } else {
          setError('Invalid credentials. Please check your email and password.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login. Please check your database connection.');
      setLoading(false);
    }
  };

  const darkInput = "w-full bg-slate-900 text-white font-bold border border-slate-700 rounded-xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder-slate-500 text-sm";

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-100 min-h-screen">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-12 text-center relative">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/40">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Provision Tracker</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Ship Provision Tracking System</p>
        </div>
        
        <div className="p-10 pt-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">User Email</label>
              <input
                type="email"
                className={darkInput}
                placeholder="mail@fleet.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Password / Master Key</label>
              <input
                type="password"
                className={darkInput}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-200 disabled:opacity-50 active:scale-95 mt-4"
            >
              {loading ? 'Checking Credentials...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-12 text-center border-t border-slate-50 pt-8">
            <button 
              onClick={(e) => { e.preventDefault(); onNavigateToSignup(); }}
              className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] hover:text-blue-600 transition-colors"
            >
              Register New Company
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
