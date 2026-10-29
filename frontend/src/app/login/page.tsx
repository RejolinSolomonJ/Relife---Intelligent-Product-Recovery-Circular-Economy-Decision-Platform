'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store token and user info
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect based on role
      const role = data.user.role;
      if (role === 'super_admin') {
        router.push('/admin');
      } else if (role === 'inspector') {
        router.push('/inspector');
      } else if (role === 'reseller' || role === 'customer') {
        router.push('/shop');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Super Admin', email: 'admin@relife.demo', password: 'admin123' },
    { role: 'Inspector', email: 'inspector@relife.demo', password: 'inspector123' },
    { role: 'Gold Reseller', email: 'reseller1@relife.demo', password: 'reseller123' },
    { role: 'Silver Reseller', email: 'reseller2@relife.demo', password: 'reseller123' },
    { role: 'Bronze Reseller', email: 'reseller3@relife.demo', password: 'reseller123' },
    { role: 'Customer 1', email: 'customer1@relife.demo', password: 'customer123' },
    { role: 'Customer 2', email: 'customer2@relife.demo', password: 'customer123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8">
        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">ReLife AI</h1>
            <p className="text-slate-600">Sign in to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Demo Mode - Use accounts from the table →
            </p>
          </div>
        </div>

        {/* Demo Accounts */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Demo Accounts</h2>
          <p className="text-emerald-200 mb-6 text-sm">
            [DEMO ONLY] Use these credentials to test different roles
          </p>
          
          <div className="space-y-2">
            {demoAccounts.map((account, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="w-full text-left bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {account.role}
                    </div>
                    <div className="text-sm text-emerald-200 mt-1">
                      {account.email}
                    </div>
                  </div>
                  <div className="text-xs text-emerald-300 font-mono bg-black/20 px-2 py-1 rounded">
                    {account.password}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
            <p className="text-xs text-yellow-200">
              <strong>Note:</strong> This is a demo application. All data, prices, and notifications are simulated for demonstration purposes only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
