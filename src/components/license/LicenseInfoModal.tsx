import React, { useState } from 'react';
import { StoreLicense } from '../../types';
import { ShieldCheck, Calendar, Cpu, RefreshCw, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDateTime } from '../../lib/formatters';
import { revalidateLicense } from '../../lib/license';

interface LicenseInfoModalProps {
  license: StoreLicense | null;
  daysRemaining: number;
  status: 'active' | 'grace_period' | 'expired' | 'unactivated';
  onClose: () => void;
  onRefresh: () => void;
}

export const LicenseInfoModal: React.FC<LicenseInfoModalProps> = ({
  license,
  daysRemaining,
  status,
  onClose,
  onRefresh,
}) => {
  const [revalidating, setRevalidating] = useState(false);
  const [revalidateMsg, setRevalidateMsg] = useState<string | null>(null);

  if (!license) return null;

  const handleRevalidate = async () => {
    setRevalidating(true);
    setRevalidateMsg(null);
    try {
      const res = await revalidateLicense();
      setRevalidateMsg(res.message);
      onRefresh();
    } catch {
      setRevalidateMsg('Unable to revalidate. Please check your internet connection.');
    } finally {
      setRevalidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-base">Store License & Activation</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              status === 'active'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : status === 'grace_period'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}
          >
            {status === 'active' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-sm">
                {status === 'active'
                  ? 'Terminal Active & Verified'
                  : status === 'grace_period'
                  ? `Offline Grace Window: ${daysRemaining} Days Remaining`
                  : 'License Verification Required'}
              </div>
              <p className="text-xs mt-1 opacity-90">
                {status === 'active'
                  ? 'All local features and POS workflows are fully active.'
                  : `Please connect this device to the internet before the 7-day grace period concludes.`}
              </p>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500">Store Name:</span>
              <span className="font-bold">{license.storeName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500">License Key:</span>
              <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">{license.licenseKey}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500">Plan Tier:</span>
              <span className="font-bold uppercase px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300">
                {license.plan}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500">Hardware ID:</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{license.hardwareFingerprint}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-500">Last Verified Ping:</span>
              <span>{formatDateTime(license.lastOnlinePing)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Term Expiry:</span>
              <span>{formatDateTime(license.validUntil)}</span>
            </div>
          </div>

          {revalidateMsg && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg text-xs text-teal-700 dark:text-teal-300">
              {revalidateMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleRevalidate}
              disabled={revalidating}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${revalidating ? 'animate-spin' : ''}`} />
              Revalidate License Online
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
