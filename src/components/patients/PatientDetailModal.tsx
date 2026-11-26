import type { ReactNode } from 'react';
import { CalendarClock, History, IdCard, Mail, MapPin, MessageSquareText, Phone, Stethoscope } from 'lucide-react';
import Modal from '../common/Modal';
import AppointmentStatus from '../appointments/AppointmentStatus';
import PatientAlertChip from './PatientAlertChip';
import {
  formatDaysAgo,
  formatRelativeDay,
  type PatientAppointmentView,
  type PatientSummary,
} from '../../utils/patientSummary';

interface PatientDetailModalProps {
  summary: PatientSummary | null;
  todayIso: string;
  branchName: (branchId: string) => string;
  onClose: () => void;
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h4 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-adm-ink-300">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function AppointmentBox({
  title,
  view,
  todayIso,
  empty,
  footnote,
}: {
  title: string;
  view: PatientAppointmentView | null;
  todayIso: string;
  empty: string;
  footnote?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-adm-line-card bg-adm-surface-app p-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-ink-200">{title}</span>
      {view ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[15px] font-semibold text-adm-ink-700 [font-variant-numeric:tabular-nums]">
              {formatRelativeDay(view.appointment.date, todayIso)} · {view.appointment.startTime}
            </span>
            <AppointmentStatus status={view.appointment.status} theme="admin" />
          </div>
          <span className="text-sm text-adm-ink-500">{view.serviceName}</span>
          <span className="text-xs text-adm-ink-300">{view.professionalName}</span>
          {footnote && <span className="text-xs font-medium text-adm-ink-400">{footnote}</span>}
        </>
      ) : (
        <span className="text-sm text-adm-ink-200">{empty}</span>
      )}
    </div>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className={`flex flex-col items-center rounded-xl border px-2 py-3 ${className}`}>
      <span className="text-2xl font-semibold leading-none [font-variant-numeric:tabular-nums]">{value}</span>
      <span className="mt-1 text-xs font-medium">{label}</span>
    </div>
  );
}

// Ficha del paciente para la técnica: todo lo que se sabe por sus citas.
function PatientDetailModal({ summary, todayIso, branchName, onClose }: PatientDetailModalProps) {

  return (
    <Modal
      isOpen={summary !== null}
      onClose={onClose}
      title={summary?.fullName}
      maxWidth="max-w-[720px]"
      badge={
        summary && summary.alerts.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {summary.alerts.map((alert) => (
              <PatientAlertChip key={alert} alert={alert} />
            ))}
          </div>
        ) : undefined
      }
    >
      {summary && (
        <div className="flex flex-col gap-6 py-3">
          {/* Contacto */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-adm-ink-500">
            <span className="inline-flex items-center gap-1.5 [font-variant-numeric:tabular-nums]">
              <IdCard size={15} className="text-adm-ink-200" aria-hidden="true" />
              DNI {summary.patient.dni}
            </span>
            {summary.patient.phone && (
              <a
                href={`tel:${summary.patient.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 hover:text-adm-accent-deep [font-variant-numeric:tabular-nums]"
              >
                <Phone size={15} className="text-adm-ink-200" aria-hidden="true" />
                {summary.patient.phone}
              </a>
            )}
            {summary.patient.email && (
              <a
                href={`mailto:${summary.patient.email}`}
                className="inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere] hover:text-adm-accent-deep"
              >
                <Mail size={15} className="shrink-0 text-adm-ink-200" aria-hidden="true" />
                {summary.patient.email}
              </a>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AppointmentBox
              title={summary.today ? 'Cita de hoy' : 'Próxima cita'}
              view={summary.today ?? summary.next}
              todayIso={todayIso}
              empty="Sin cita programada"
            />
            <AppointmentBox
              title="Última visita"
              view={summary.lastVisit}
              todayIso={todayIso}
              empty="Aún no fue atendido"
              footnote={summary.daysSinceLastVisit !== null ? formatDaysAgo(summary.daysSinceLastVisit) : undefined}
            />
          </div>

          <Section title="Motivo de consulta" icon={<MessageSquareText size={14} aria-hidden="true" />}>
            {summary.reason ? (
              <p className="rounded-xl border-l-[3px] border-adm-accent-line bg-adm-accent-soft/50 px-3.5 py-2.5 text-sm text-adm-ink-700">
                {summary.reason}
              </p>
            ) : (
              <p className="text-sm text-adm-ink-200">El paciente no indicó un motivo.</p>
            )}
          </Section>

          <Section title="Historial resumido" icon={<History size={14} aria-hidden="true" />}>
            <div className="grid grid-cols-3 gap-2.5">
              <Stat
                value={summary.counts.completed}
                label="Atendidas"
                className="border-adm-status-confirmed-border bg-adm-status-confirmed-bg text-adm-status-confirmed-text"
              />
              <Stat
                value={summary.counts.cancelled}
                label="Canceladas"
                className="border-adm-status-cancelled-border bg-adm-status-cancelled-bg text-adm-status-cancelled-text"
              />
              <Stat
                value={summary.counts.upcoming}
                label="Pendientes"
                className="border-adm-status-pending-border bg-adm-status-pending-bg text-adm-status-pending-text"
              />
            </div>
          </Section>

          <Section title="Servicios recibidos" icon={<Stethoscope size={14} aria-hidden="true" />}>
            {summary.servicesReceived.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {summary.servicesReceived.map((service) => (
                  <li
                    key={service.name}
                    className="flex items-center gap-2 rounded-lg border border-adm-line-card bg-white px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium text-adm-ink-700">{service.name}</span>
                    {service.count > 1 && (
                      <span className="rounded-full bg-adm-accent-soft px-1.5 text-xs font-semibold text-adm-accent-ink">
                        ×{service.count}
                      </span>
                    )}
                    <span className="text-xs text-adm-ink-300">
                      {formatRelativeDay(service.lastDate, todayIso)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-adm-ink-200">Todavía no tiene servicios atendidos.</p>
            )}
          </Section>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-adm-line-card p-3.5">
              <Stethoscope size={18} className="text-adm-accent-deep" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-ink-200">
                  Profesional habitual
                </span>
                <span className="text-sm font-medium text-adm-ink-700">{summary.usualProfessionalName ?? '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-adm-line-card p-3.5">
              <MapPin size={18} className="text-adm-accent-deep" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-ink-200">
                  Sede habitual
                </span>
                <span className="text-sm font-medium text-adm-ink-700">
                  {summary.usualBranchId ? branchName(summary.usualBranchId) : '—'}
                </span>
              </div>
            </div>
          </div>

          <Section title={`Todas sus citas (${summary.counts.total})`} icon={<CalendarClock size={14} aria-hidden="true" />}>
            <ol className="relative flex flex-col gap-0 border-l border-adm-line-card pl-4">
              {summary.history.map((view) => (
                <li key={view.appointment.id} className="relative pb-3.5 last:pb-0">
                  <span
                    className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-adm-ink-100"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-adm-ink-700 [font-variant-numeric:tabular-nums]">
                      {formatRelativeDay(view.appointment.date, todayIso)} · {view.appointment.startTime}
                      <span className="ml-2 font-normal text-adm-ink-400">{view.serviceName}</span>
                    </span>
                    <AppointmentStatus status={view.appointment.status} theme="admin" />
                  </div>
                  <span className="text-xs text-adm-ink-300">
                    {view.professionalName} · {branchName(view.appointment.branchId)}
                    {view.appointment.reason.trim() && <> · “{view.appointment.reason.trim()}”</>}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      )}
    </Modal>
  );
}

export default PatientDetailModal;
