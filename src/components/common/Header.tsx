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
  Crown,
  User,
  LogOut,
  Lock,
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { SyncStatusBadge } from './SyncStatusBadge';
import { StoreLicense, StoreSettings, StaffUser } from '../../types';

interface HeaderProps {
  currentTab: 'pos' | 'inventory' | 'expiry' | 'hub';
  onTabChange: (tab: 'pos' | 'inventory' | 'expiry' | 'hub') => void;
  currentUser: StaffUser;
  license: StoreLicense | null;
  licenseStatus: 'active' | 'grace_period' | 'expired' | 'unactivated';
  daysRemaining: number;
  settings: StoreSettings | null;
  onOpenLicenseModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenMyShiftModal: () => void;
  onLockTerminal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  license,
  licenseStatus,
  daysRemaining,
  settings,
  onOpenLicenseModal,
  onOpenShortcutsModal,
  onOpenSettingsModal,
  onOpenMyShiftModal,
  onLockTerminal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isOwner = currentUser.role === 'owner';
  const storeName = settings?.storeName || license?.storeName || 'PharmPulse Dispensary';

  return (
    <header
      className={`sticky top-0 z-40 border-b shadow-xs transition-colors no-print ${
        isOwner
          ? 'bg-slate-900 border-slate-800 text-white'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Title */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => onTabChange(isOwner ? 'hub' : 'pos')}
            >
              <div
                className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-md font-bold ${
                  isOwner ? 'bg-amber-600 shadow-amber-600/30' : 'bg-teal-600 shadow-teal-600/30'
                }`}
              >
                <Pill className="w-5 h-5 transform -rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight">
                    PharmPulse
                  </span>
                  <span
                    className={`hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      isOwner
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    }`}
                  >
                    {isOwner ? '★ Director / Owner Mode' : 'Counter Dispenser'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                  {storeName}
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-6 border-l border-slate-200 dark:border-slate-800 pl-4">
              {/* Counter POS */}
              <button
                onClick={() => onTabChange('pos')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'pos'
                    ? isOwner
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Counter POS
              </button>

              {/* Inventory */}
              <button
                onClick={() => onTabChange('inventory')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'inventory'
                    ? isOwner
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-4 h-4" />
                {isOwner ? 'Master Inventory & Costs' : 'Formulary Stock Lookup'}
              </button>

              {/* Expiry Alerts */}
              <button
                onClick={() => onTabChange('expiry')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'expiry'
                    ? isOwner
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Expiry FEFO Control
              </button>

              {/* Owner Supervision Hub — ONLY VISIBLE IF OWNER! */}
              {isOwner && (
                <button
                  onClick={() => onTabChange('hub')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentTab === 'hub'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                  }`}
                >
                  <LineChart className="w-4 h-4" />
                  Owner Supervision Hub
                </button>
              )}
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
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : licenseStatus === 'grace_period'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-600'
                  : 'bg-red-500/20 text-red-300 border-red-600'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              <span>
                {licenseStatus === 'active'
                  ? 'Licensed'
                  : licenseStatus === 'grace_period'
                  ? `Grace (${daysRemaining}d)`
                  : 'Activate'}
              </span>
            </button>

            {/* My Shift Register Button (for normal staff) */}
            {!isOwner && (
              <button
                onClick={onOpenMyShiftModal}
                title="View My Shift Sales and Drawer Count"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 transition active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">My Shift Drawer</span>
              </button>
            )}

            {/* Fast Keyboard Guide Button */}
            <button
              onClick={onOpenShortcutsModal}
              title="Keyboard Shortcuts (F2, F4, Esc)"
              className="hidden lg:flex items-center gap-1 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              <Keyboard className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-[10px]">Shortcuts</span>
            </button>

            {/* Authenticated User Account Popover */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition shadow-xs ${
                  isOwner
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 hover:bg-amber-950/60'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                    isOwner ? 'bg-amber-600' : currentUser.avatarColor || 'bg-teal-600'
                  }`}
                >
                  {isOwner ? <Crown className="w-3.5 h-3.5" /> : currentUser.fullName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight truncate max-w-[110px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {/* Account Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs text-slate-800 dark:text-slate-100 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="px-4 py-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">
                      Authenticated Attendant
                    </span>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      {isOwner && <Crown className="w-4 h-4 text-amber-500" />}
                      <span>{currentUser.fullName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Username: @{currentUser.username} • Role: <strong className="uppercase">{currentUser.role}</strong>
                    </div>
                  </div>

                  <div className="py-1">
                    {!isOwner && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenMyShiftModal();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        <Wallet className="w-4 h-4 text-teal-600" />
                        <span>My Shift Register & Drawer</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLockTerminal();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold"
                    >
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span>Lock Terminal / Switch Staff</span>
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLockTerminal();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400 font-medium"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out from Terminal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button (Only accessible if Owner!) */}
            {isOwner && (
              <button
                onClick={onOpenSettingsModal}
                title="Store Settings & Cloud Backend Configuration"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
