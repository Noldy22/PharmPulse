import React, { useState } from 'react';
import { StaffUser, StaffRole } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Users, X, Plus, Key, Check, ShieldAlert, Edit2, Lock } from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  tenantId: string;
  onClose: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  tenantId,
  onClose,
}) => {
  const staffList = useLiveQuery(() => db.staff_users.toArray(), []) || [];
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<StaffRole>('dispenser');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');

  // Editing PIN state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || pin.length < 4) {
      setError('Please provide Name, Username, and a 4-digit PIN.');
      return;
    }

    // Check unique username
    const existing = staffList.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (existing) {
      setError('Username already in use. Please choose another username.');
      return;
    }

    const newUser: StaffUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      role,
      pin: pin.trim(),
      phone: phone.trim() || undefined,
      isActive: true,
      avatarColor:
        role === 'pharmacist'
          ? 'bg-teal-600'
          : role === 'cashier'
          ? 'bg-purple-600'
          : 'bg-blue-600',
      created_at: new Date().toISOString(),
    };

    await db.staff_users.put(newUser);
    await db.logAudit(
      tenantId,
      'STAFF_CREATED',
      'auth',
      `Owner registered new staff: ${newUser.fullName} (${newUser.role})`,
      'Owner'
    );

    setSuccess(`Staff account for ${newUser.fullName} registered successfully.`);
    setFullName('');
    setUsername('');
    setPin('');
    setPhone('');
    setShowAddForm(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUpdatePin = async (user: StaffUser) => {
    if (newPin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }

    await db.staff_users.update(user.id, { pin: newPin.trim() });
    await db.logAudit(
      tenantId,
      'STAFF_PIN_RESET',
      'auth',
      `Owner reset security PIN for staff: ${user.fullName}`,
      'Owner'
    );

    setEditingUserId(null);
    setNewPin('');
    setSuccess(`PIN for ${user.fullName} updated.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleToggleActive = async (user: StaffUser) => {
    if (user.role === 'owner') return; // Cannot deactivate owner
    const newStatus = !user.isActive;
    await db.staff_users.update(user.id, { isActive: newStatus });
    await db.logAudit(
      tenantId,
      'STAFF_STATUS_TOGGLED',
      'auth',
      `Owner ${newStatus ? 'activated' : 'deactivated'} account: ${user.fullName}`,
      'Owner'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col my-auto text-slate-800 dark:text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-base">Staff Account Management (Owner Control)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Registered Staff Profiles ({staffList.length})
            </span>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setError(null);
              }}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Cancel' : 'Register New Attendant'}
            </button>
          </div>

          {/* New Staff Form */}
          {showAddForm && (
            <form onSubmit={handleAddStaff} className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Mrema"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jmrema"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none uppercase font-semibold"
                  >
                    <option value="pharmacist">Pharmacist</option>
                    <option value="dispenser">Dispenser</option>
                    <option value="cashier">Cashier</option>
                    <option value="owner">Co-Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">4-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 5555"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Contact Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0784..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow-xs"
                >
                  Save & Authorize Account
                </button>
              </div>
            </form>
          )}

          {/* Staff Accounts Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">Staff Attendant</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">PIN Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{user.fullName}</div>
                      {user.phone && <div className="text-[10px] text-slate-400">{user.phone}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">@{user.username}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {user.isActive ? (
                        <span className="text-emerald-600 font-semibold text-[11px]">Active</span>
                      ) : (
                        <span className="text-red-500 font-semibold text-[11px]">Disabled</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {editingUserId === user.id ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="password"
                            maxLength={6}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="New PIN"
                            className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border rounded font-mono text-xs outline-none"
                          />
                          <button
                            onClick={() => handleUpdatePin(user)}
                            className="px-2 py-1 bg-teal-600 text-white rounded text-[11px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="px-1.5 py-1 text-slate-400"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingUserId(user.id);
                              setNewPin('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold"
                          >
                            Reset PIN
                          </button>
                          {user.role !== 'owner' && (
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold ${
                                user.isActive
                                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {user.isActive ? 'Deactivate' : 'Enable'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
