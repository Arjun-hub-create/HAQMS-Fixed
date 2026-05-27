'use client';

/**
 * Challenge 5 — Missing Feature Implementation:
 * src/app/patients/[id]/history-records/page.js
 *
 * This page was completely missing, causing a 404 when clicking
 * "View Diagnostic Reports Details (Legacy App)" from the patient modal.
 *
 * This page fetches the full patient record including all appointments
 * and renders a clean diagnostic history timeline.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Stethoscope,
} from 'lucide-react';

const STATUS_CONFIG = {
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  },
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  CONFIRMED: {
    label: 'Confirmed',
    icon: CheckCircle2,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
};

export default function PatientHistoryRecords() {
  const { id } = useParams();
  const router = useRouter();
  const { token, API_BASE_URL, user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!id) return;

    const fetchPatientHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError('Patient not found. The record may have been deleted.');
          } else if (res.status === 401) {
            router.push('/login');
          } else {
            setError('Failed to load patient records. Please try again.');
          }
          return;
        }

        const data = await res.json();
        // Handle both old and new API shapes
        setPatient(data.data || data);
      } catch (err) {
        console.error('[HISTORY] Fetch error:', err);
        setError('Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientHistory();
  }, [id, token, API_BASE_URL, user]);

  const appointments = patient?.appointments || [];
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate)
  );

  const stats = {
    total: appointments.length,
    completed: appointments.filter((a) => a.status === 'COMPLETED').length,
    cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
    pending: appointments.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status)).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="pulse-loader mx-auto">
              <div></div>
              <div></div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">Loading patient records...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-600 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <div className="glass p-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Error Loading Records</h2>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-600 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Patient Header Card */}
        <div className="glass p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="p-4 bg-teal-500/10 rounded-2xl w-fit">
              <User className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {patient?.name}
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {patient?.gender} &bull; Age {patient?.age}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 text-xs font-bold uppercase tracking-wider border border-teal-500/20">
                  Patient Record
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {patient?.phoneNumber}
                </span>
                {patient?.email && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {patient?.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Medical Background */}
        <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5" />
            Medical Background
          </h2>
          {patient?.medicalHistory ? (
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-6">
              {patient.medicalHistory}
            </p>
          ) : (
            <p className="text-slate-400 text-sm italic">No medical history on record.</p>
          )}
        </div>

        {/* Appointment Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Visits', value: stats.total, color: 'text-slate-700 dark:text-slate-200' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-600' },
            { label: 'Cancelled', value: stats.cancelled, color: 'text-rose-500' },
            { label: 'Upcoming', value: stats.pending, color: 'text-amber-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs font-semibold text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Appointment History Timeline */}
        <div className="glass rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-500" />
              Diagnostic History &amp; Appointment Records
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {sortedAppointments.length} appointment{sortedAppointments.length !== 1 ? 's' : ''} on record — most recent first
            </p>
          </div>

          {sortedAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-semibold">No appointments recorded for this patient.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedAppointments.map((appt) => {
                const statusCfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusCfg.icon;
                const apptDate = new Date(appt.appointmentDate);

                return (
                  <div key={appt.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Date Column */}
                    <div className="flex-shrink-0 w-28 text-center">
                      <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                        {apptDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className="text-xs text-slate-400 font-semibold">
                        {apptDate.toLocaleDateString('en-US', { year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {apptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            {appt.doctor?.name || 'Physician Record'}
                          </p>
                          {appt.doctor?.specialization && (
                            <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                              {appt.doctor.specialization}
                            </p>
                          )}
                        </div>
                        <span
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusCfg.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      </div>

                      {appt.reason && (
                        <p className="mt-2 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 leading-5">
                          <span className="font-bold text-slate-400 uppercase tracking-wide">Reason: </span>
                          {appt.reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
