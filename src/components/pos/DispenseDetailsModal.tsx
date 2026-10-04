import React, { useState } from 'react';
import { User, Stethoscope, FileText, X, ShieldAlert, Check } from 'lucide-react';

interface DispenseDetailsModalProps {
  isOpen: boolean;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorRegNo: string;
  notes: string;
  hasPomItems: boolean;
  onSave: (details: {
    patientName: string;
    patientPhone: string;
    doctorName: string;
    doctorRegNo: string;
    notes: string;
  }) => void;
  onClose: () => void;
}

export const DispenseDetailsModal: React.FC<DispenseDetailsModalProps> = ({
  isOpen,
  patientName: initialPatientName,
  patientPhone: initialPatientPhone,
  doctorName: initialDoctorName,
  doctorRegNo: initialDoctorRegNo,
  notes: initialNotes,
  hasPomItems,
  onSave,
  onClose,
}) => {
  const [patientName, setPatientName] = useState(initialPatientName);
  const [patientPhone, setPatientPhone] = useState(initialPatientPhone);
  const [doctorName, setDoctorName] = useState(initialDoctorName);
  const [doctorRegNo, setDoctorRegNo] = useState(initialDoctorRegNo);
  const [notes, setNotes] = useState(initialNotes);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ patientName, patientPhone, doctorName, doctorRegNo, notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm">Patient & Prescription Dispensing Records</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {hasPomItems && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Prescription-Only Medicine (POM) Flagged:</span>
                <p className="text-[11px] mt-0.5">
                  Regulations require recording Patient Name and Prescribing Doctor details for POM formulary audit trails.
                </p>
              </div>
            </div>
          )}

          {/* Patient Details */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Patient Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Patient Full Name {hasPomItems && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={hasPomItems}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Grace Makau"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="e.g. 0784 123 456"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Doctor Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" /> Prescriber / Doctor Reference
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Doctor / Clinic Name {hasPomItems && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={hasPomItems}
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. J. Mwita (Aga Khan)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Doctor Medical Reg No
                </label>
                <input
                  type="text"
                  value={doctorRegNo}
                  onChange={(e) => setDoctorRegNo(e.target.value)}
                  placeholder="e.g. MCT/2018/4892"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Dispensing Notes / Dosage */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Dosage Instructions / Special Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take 1 tablet twice daily after meals for 5 days..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 shadow"
            >
              <Check className="w-3.5 h-3.5" /> Save Dispense Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
