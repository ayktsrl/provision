import React, { useState } from 'react';
import { UserProfile } from '../types';
import { auth, db } from '../services/db';
import { createUserWithEmailAndPassword } from 'firebase/auth';

interface SignupProps {
  onSignup: (profile: UserProfile) => void;
  onBack: () => void;
}

const CompanySignup: React.FC<SignupProps> = ({ onSignup, onBack }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) Auth create
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // 2) Write companies/{uid} and users/{uid}
      const profile = await db.createCompanyAfterAuth(formData.companyName);

      // 3) Go in
      onSignup(profile);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const darkInput =
    "w-full bg-slate-900 text-white font-bold border border-slate-700 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-500";

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-10 text-center relative">
          <button
            onClick={onBack}
            className="absolute left-6 top-6 text-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Fleet Registry</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Create Company Account</p>
        </div>

        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Company Name</label>
              <input
                required
                className={darkInput}
                placeholder="Global Maritime Ltd."
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Admin Email</label>
              <input
                required
                type="email"
                className={darkInput}
                placeholder="admin@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Password</label>
              <input
                required
                type="password"
                className={darkInput}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all mt-6 text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Company'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanySignup;
