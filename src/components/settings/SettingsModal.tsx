import React, { useState } from 'react';
import { StoreSettings, StoreLicense } from '../../types';
import { db } from '../../db/db';
import {
  Settings,
  X,
  Building,
  Cloud,
  Database,
  Check,
  RefreshCw,
  AlertCircle,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  testSupabaseConnection,
} from '../../lib/supabase';
import { syncEngine } from '../../lib/syncEngine';

interface SettingsModalProps {
  isOpen: boolean;
  settings: StoreSettings | null;
  license: StoreLicense | null;
  onSaved: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  license,
  onSaved,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'cloud' | 'database'>('profile');

  // Store Profile State
  const [storeName, setStoreName] = useState(settings?.storeName || 'AuraCare Pharmacy');
  const [tagline, setTagline] = useState(settings?.tagline || 'Community Dispensary & Healthcare');
  const [address, setAddress] = useState(settings?.address || 'Plot 44, Kenyatta Avenue');
  const [phone, setPhone] = useState(settings?.phone || '+255 784 920 110');
  const [email, setEmail] = useState(settings?.email || 'dispensary@auracarepharm.com');
  const [tinNumber, setTinNumber] = useState(settings?.tinNumber || 'TIN-114-889-402');
  const [currencySymbol, setCurrencySymbol] = useState(settings?.currencySymbol || 'TSh');
  const [taxRate, setTaxRate] = useState<number>(settings?.taxRate || 0);

  // Cloud / Supabase State
  const initialCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(initialCreds.url);
  const [supabaseKey, setSupabaseKey] = useState(initialCreds.anonKey);
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (settings) {
        await db.settings.update(settings.id, {
          storeName,
          tagline,
          address,
          phone,
          email,
          tinNumber,
          currencySymbol,
          taxRate: Number(taxRate),
        });
      }
      setMessage('Pharmacy profile updated successfully.');
      setTimeout(() => setMessage(null), 3000);
      onSaved();
    } catch {
      setMessage('Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCloud = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    setMessage('Supabase connection parameters saved.');
    setTimeout(() => setMessage(null), 3000);
    // Trigger sync check
    if (navigator.onLine) {
      syncEngine.triggerSync();
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setTestResult(null);
    const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setTestResult(res);
    setTestingConn(false);
  };

  // Export Database backup to JSON
  const handleExportBackup = async () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      storeName,
      products: await db.products.toArray(),
      batches: await db.batches.toArray(),
      sales: await db.sales.toArray(),
      sale_items: await db.sale_items.toArray(),
      stock_adjustments: await db.stock_adjustments.toArray(),
      license: await db.license.toArray(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pharmpulse_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reset to Demo Data
  const handleResetDemo = async () => {
    if (window.confirm('Reset all local data back to initial demo formulary and seed records?')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-800 dark:text-slate-100 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-base">Store Configuration & Cloud Sync</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Pharmacy Profile
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'cloud'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Remote Supabase Sync
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'database'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Backup & Reset
          </button>
        </div>

        <div className="p-6">
          {message && (
            <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* TAB 1: Pharmacy Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Store / Dispensary Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Address / Location</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">TIN / Tax Reg No</label>
                  <input
                    type="text"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">VAT Rate (0 = Exempt)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Profile Details
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Cloud Sync / Supabase */}
          {activeTab === 'cloud' && (
            <form onSubmit={handleSaveCloud} className="space-y-4 text-xs">
              <p className="text-slate-500">
                Connect your offline-first PharmPulse terminal with a cloud PostgreSQL database hosted on Supabase:
              </p>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Supabase Project URL</label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Supabase Public Anon Key</label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'
                  }`}
                >
                  {testResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConn || !supabaseUrl}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConn ? 'animate-spin' : ''}`} />
                  Test Remote Connection
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Cloud Credentials
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Database Backup & Reset */}
          {activeTab === 'database' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-teal-600" /> Export JSON Snapshot Backup
                </h4>
                <p className="text-slate-500">
                  Export all products, sales history, batches, and license configuration into a single portable JSON file.
                </p>
                <button
                  onClick={handleExportBackup}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold shadow-xs transition"
                >
                  Download Offline Database Backup (.json)
                </button>
              </div>

              <div className="p-4 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20 space-y-2">
                <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-red-600" /> Reset to Demo Formulary
                </h4>
                <p className="text-red-600/80 dark:text-red-400/80 text-[11px]">
                  Erases current local records and restores the initial pharmaceutical catalog (15+ medicines, active batches, and sample sales).
                </p>
                <button
                  onClick={handleResetDemo}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold shadow-xs transition"
                >
                  Reset All Local Data & Re-seed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
