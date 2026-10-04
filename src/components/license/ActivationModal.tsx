import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Building2,
  Phone,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { activateLicense, generateHardwareFingerprint } from '../../lib/license';
import { StoreLicense } from '../../types';

interface ActivationModalProps {
  isOpen: boolean;
  onActivated: (license: StoreLicense) => void;
  canClose?: boolean;
  onClose?: () => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onActivated,
  canClose = false,
  onClose,
}) => {
  const [storeName, setStoreName] = useState('');
  const [ownerContact, setOwnerContact] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    generateHardwareFingerprint().then((fp) => setFingerprint(fp));
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerContact.trim() || !licenseKey.trim()) {
      setError('Please provide Store Name, Owner Contact, and License Key.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeLicense = await activateLicense({
        storeName: storeName.trim(),
        ownerContact: ownerContact.trim(),
        licenseKey: licenseKey.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        onActivated(activeLicense);
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Activation failed. Please verify the license key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col my-auto text-slate-800 dark:text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 p-5 text-white text-center relative flex-shrink-0">
          <div className="inline-flex p-2.5 rounded-2xl bg-white/10 backdrop-blur-md mb-2 shadow-inner border border-white/20">
            <ShieldCheck className="w-7 h-7 text-teal-200" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">PharmPulse Store Activation</h2>
          <p className="text-xs text-teal-100 mt-1 max-w-sm mx-auto leading-relaxed">
            Offline-First Pharmacy Management System. Register this dispensing terminal to enable local counter sales and sync.
          </p>

          {canClose && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Pharmacy / Store Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. AuraCare Central Pharmacy"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Owner / Manager Contact
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={ownerContact}
                    onChange={(e) => setOwnerContact(e.target.value)}
                    placeholder="e.g. +255 784 920 110"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  License Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    placeholder="PHARM-XXXX-XXXX-XXXX"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Hardware Fingerprint & Grace Period Info */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
                <Cpu className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="block font-medium text-[10px] text-slate-500">Terminal Fingerprint</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {fingerprint || 'Computing...'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="block font-medium text-[10px] text-slate-500">Offline Resilience</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    7-Day Rolling Grace
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-600 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Store Activated Successfully! Launching PharmPulse...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Validating Key & Initializing Database...</span>
              ) : success ? (
                <span>Activated!</span>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Activate Terminal & Begin Operations
                </>
              )}
            </button>
          </form>

          {/* Grace policy explanation footnote */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
            <p>
              Once activated, this terminal operates completely offline without internet. All sales and inventory deplete locally in IndexedDB. If offline for more than 7 consecutive days, simply connect to the internet to refresh validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
