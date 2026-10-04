import React, { useState, useEffect } from 'react';
import { db } from './db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { StoreLicense, StoreSettings } from './types';
import { getActiveLicense } from './lib/license';
import { Header } from './components/common/Header';
import { MobileNav } from './components/common/MobileNav';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { ActivationModal } from './components/license/ActivationModal';
import { LicenseInfoModal } from './components/license/LicenseInfoModal';
import { CounterPos } from './components/pos/CounterPos';
import { InventoryManager } from './components/inventory/InventoryManager';
import { ExpiryMonitor } from './components/expiry/ExpiryMonitor';
import { OwnerHub } from './components/supervision/OwnerHub';
import { SettingsModal } from './components/settings/SettingsModal';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'pos' | 'inventory' | 'expiry' | 'hub'>('pos');

  // License state
  const [license, setLicense] = useState<StoreLicense | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<'active' | 'grace_period' | 'expired' | 'unactivated'>('unactivated');
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isLicenseInfoModalOpen, setIsLicenseInfoModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Live Settings
  const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
  const settings: StoreSettings | null = settingsList[0] || null;

  // Initialize DB and Check License on startup
  const checkStatus = async () => {
    await db.seedIfEmpty();
    const licResult = await getActiveLicense();
    setLicense(licResult.license);
    setLicenseStatus(licResult.status);
    setDaysRemaining(licResult.daysRemaining);

    if (licResult.status === 'unactivated' || licResult.status === 'expired') {
      setIsActivationModalOpen(true);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleAttendantChange = async (name: string) => {
    if (settings) {
      await db.settings.update(settings.id, { currentAttendant: name });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 md:pb-0">
      {/* 7-Day Offline Grace Window Alert Banner */}
      {licenseStatus === 'grace_period' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between no-print">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Offline Grace Period Active: {daysRemaining} day(s) remaining before an online re-validation ping is required.
            </span>
          </div>
          <button
            onClick={() => setIsLicenseInfoModalOpen(true)}
            className="underline hover:opacity-80 text-xs font-semibold ml-2"
          >
            Details
          </button>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        license={license}
        licenseStatus={licenseStatus}
        daysRemaining={daysRemaining}
        settings={settings}
        onOpenLicenseModal={() => {
          if (licenseStatus === 'unactivated' || licenseStatus === 'expired') {
            setIsActivationModalOpen(true);
          } else {
            setIsLicenseInfoModalOpen(true);
          }
        }}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onAttendantChange={handleAttendantChange}
      />

      {/* Active Workspace View */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentTab === 'pos' && (
          <CounterPos settings={settings} license={license} />
        )}

        {currentTab === 'inventory' && (
          <InventoryManager settings={settings} license={license} />
        )}

        {currentTab === 'expiry' && (
          <ExpiryMonitor settings={settings} license={license} />
        )}

        {currentTab === 'hub' && (
          <OwnerHub settings={settings} license={license} />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Activation Gate Modal */}
      <ActivationModal
        isOpen={isActivationModalOpen}
        canClose={licenseStatus === 'active' || licenseStatus === 'grace_period'}
        onActivated={(activatedLic) => {
          setLicense(activatedLic);
          setLicenseStatus('active');
          setDaysRemaining(7);
          setIsActivationModalOpen(false);
          checkStatus();
        }}
        onClose={() => setIsActivationModalOpen(false)}
      />

      {/* License Info Modal */}
      {isLicenseInfoModalOpen && (
        <LicenseInfoModal
          license={license}
          daysRemaining={daysRemaining}
          status={licenseStatus}
          onRefresh={checkStatus}
          onClose={() => setIsLicenseInfoModalOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        settings={settings}
        license={license}
        onSaved={checkStatus}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}

export default App;
