import React, { useState } from 'react';
import {
  Pill,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  LineChart,
  Settings,
  Shield,
  Keyboard,
  User,
  ChevronDown,
} from 'lucide-react';
import { SyncStatusBadge } from './SyncStatusBadge';
import { StoreLicense, StoreSettings } from '../../types';

interface HeaderProps {
  currentTab: 'pos' | 'inventory' | 'expiry' | 'hub';
  onTabChange: (tab: 'pos' | 'inventory' | 'expiry' | 'hub') => void;
  license: StoreLicense | null;
  licenseStatus: 'active' | 'grace_period' | 'expired' | 'unactivated';
  daysRemaining: number;
  settings: StoreSettings | null;
  onOpenLicenseModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenSettingsModal: () => void;
  onAttendantChange: (name: string) => void;
}

const ATTENDANTS = [
  'Pharm. David Ndunguru',
  'Sarah Kavishe (Dispenser)',
  'Dr. Emmanuel Mushi (Director)',
  'Amina Juma (Cashier)',
];

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  license,
  licenseStatus,
  daysRemaining,
  settings,
  onOpenLicenseModal,
  onOpenShortcutsModal,
  onOpenSettingsModal,
  onAttendantChange,
}) => {
  const [showAttendantMenu, setShowAttendantMenu] = useState(false);
  const currentAttendant = settings?.currentAttendant || ATTENDANTS[0];
  const storeName = settings?.storeName || license?.storeName || 'PharmPulse Dispensary';

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('pos')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 font-bold">
                <Pill className="w-5 h-5 text-white transform -rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-700 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    PharmPulse
                  </span>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    Offline POS
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[180px] sm:max-w-xs">
                  {storeName}
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-200 dark:border-slate-800 pl-4">
              <button
                onClick={() => onTabChange('pos')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'pos'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Counter POS
              </button>

              <button
                onClick={() => onTabChange('inventory')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'inventory'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-4 h-4" />
                Inventory & Batches
              </button>

              <button
                onClick={() => onTabChange('expiry')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'expiry'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Expiry FEFO Control
              </button>

              <button
                onClick={() => onTabChange('hub')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'hub'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LineChart className="w-4 h-4" />
                Owner Supervision Hub
              </button>
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* Sync Badge */}
            <SyncStatusBadge />

            {/* License Badge */}
            <button
              onClick={onOpenLicenseModal}
              title="Store License Status"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                licenseStatus === 'active'
                  ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  : licenseStatus === 'grace_period'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {licenseStatus === 'active'
                  ? 'Licensed'
                  : licenseStatus === 'grace_period'
                  ? `Grace (${daysRemaining}d)`
                  : 'Activate'}
              </span>
            </button>

            {/* Fast Keyboard Guide Button */}
            <button
              onClick={onOpenShortcutsModal}
              title="Keyboard Shortcuts (F2, F4, Esc)"
              className="hidden lg:flex items-center gap-1 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition"
            >
              <Keyboard className="w-4 h-4 text-slate-500" />
              <span className="font-mono text-[10px]">Shortcuts</span>
            </button>

            {/* Attendant Selector */}
            <div className="relative">
              <button
                onClick={() => setShowAttendantMenu(!showAttendantMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
              >
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span className="max-w-[100px] truncate hidden sm:inline-block">{currentAttendant}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showAttendantMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    Active Dispensing Staff
                  </div>
                  {ATTENDANTS.map((attendant) => (
                    <button
                      key={attendant}
                      onClick={() => {
                        onAttendantChange(attendant);
                        setShowAttendantMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${
                        currentAttendant === attendant ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{attendant}</span>
                      {currentAttendant === attendant && <span className="text-teal-600">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={onOpenSettingsModal}
              title="Store Settings & Cloud Config"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
