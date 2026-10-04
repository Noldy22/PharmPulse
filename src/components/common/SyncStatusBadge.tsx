import React, { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle, Database, ChevronRight } from 'lucide-react';
import { syncEngine, SyncEngineState } from '../../lib/syncEngine';
import { db } from '../../db/db';
import { SyncOutboxItem } from '../../types';

export const SyncStatusBadge: React.FC = () => {
  const [state, setState] = useState<SyncEngineState>({
    status: 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: navigator.onLine,
  });
  const [showModal, setShowModal] = useState(false);
  const [outboxItems, setOutboxItems] = useState<SyncOutboxItem[]>([]);
  const [syncingManual, setSyncingManual] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((updated) => {
      setState(updated);
    });
    return () => unsubscribe();
  }, []);

  const openOutboxModal = async () => {
    const items = await db.sync_outbox.toArray();
    setOutboxItems(items);
    setShowModal(true);
  };

  const handleManualSync = async () => {
    setSyncingManual(true);
    await syncEngine.triggerSync();
    const items = await db.sync_outbox.toArray();
    setOutboxItems(items);
    setSyncingManual(false);
  };

  // Badge visual configuration
  const getBadgeStyle = () => {
    if (!state.isOnline) {
      return {
        bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        label: `Offline (${state.pendingCount} pending)`,
        icon: WifiOff,
      };
    }
    if (state.status === 'syncing' || syncingManual) {
      return {
        bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        dot: 'bg-blue-500 animate-ping',
        label: 'Syncing...',
        icon: RefreshCw,
      };
    }
    if (state.status === 'error') {
      return {
        bg: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800',
        dot: 'bg-red-500',
        label: 'Sync Error',
        icon: AlertCircle,
      };
    }
    if (state.pendingCount > 0) {
      return {
        bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        label: `Pending Sync (${state.pendingCount})`,
        icon: RefreshCw,
      };
    }
    return {
      bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      label: 'Local-First Synced',
      icon: CheckCircle,
    };
  };

  const style = getBadgeStyle();
  const IconComponent = style.icon;

  return (
    <>
      <button
        onClick={openOutboxModal}
        title="Click to inspect local outbox queue and manual sync"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 ${style.bg}`}
      >
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <IconComponent className={`w-3.5 h-3.5 ${state.status === 'syncing' || syncingManual ? 'animate-spin' : ''}`} />
        <span>{style.label}</span>
      </button>

      {/* Outbox and Sync Diagnostic Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm">Offline Outbox & Cloud Sync Status</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block">Network Connection</span>
                  <span className="font-bold flex items-center gap-1.5 mt-0.5">
                    {state.isOnline ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-500" /> Online (Internet Active)
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-amber-500" /> Offline (Local-Only Mode)
                      </>
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block">Outbox Queue</span>
                  <span className="font-bold block mt-0.5 font-mono text-teal-600 dark:text-teal-400">
                    {state.pendingCount} records awaiting push
                  </span>
                </div>
              </div>

              {state.errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300">
                  <div className="font-bold">Sync Failure Message:</div>
                  <div className="font-mono mt-0.5 text-[11px]">{state.errorMessage}</div>
                </div>
              )}

              {/* Pending Queue List */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Pending Outbox Mutations</h4>
                {outboxItems.length === 0 ? (
                  <div className="p-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                    Outbox queue is empty. All local changes are synchronized with PostgreSQL!
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs">
                    {outboxItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.action === 'INSERT'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}
                          >
                            {item.action}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.table}</span>
                        </div>
                        <span className="text-slate-400 truncate max-w-[120px]">{item.recordId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500">
                  Last Sync:{' '}
                  {state.lastSyncedAt
                    ? new Date(state.lastSyncedAt).toLocaleTimeString()
                    : 'Not synced yet'}
                </span>

                <button
                  onClick={handleManualSync}
                  disabled={syncingManual || !state.isOnline}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingManual ? 'animate-spin' : ''}`} />
                  Sync Outbox Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
