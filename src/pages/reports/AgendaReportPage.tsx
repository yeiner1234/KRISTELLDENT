import { useMemo, useState, type ReactNode } from 'react';
import { CalendarX2, Printer } from 'lucide-react';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Spinner from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useAllAppointments } from '../../hooks/useAppointments';
import { useAllPatients } from '../../hooks/usePatients';
import { useProfessionals } from '../../hooks/useProfessionals';
import { useServices } from '../../hooks/useServices';
import { useBranches } from '../../hooks/useBranches';
import { useManageableBranchIds } from '../../hooks/useManageableBranchIds';
import { useBranchWeeklyHours } from '../../hooks/useBranchWeeklyHours';
import { getTodayIsoDate } from '../../utils/date';
import {
  AGENDA_SHIFT_OPTIONS,
  AGENDA_STATUS_LABELS,
  AGENDA_STATUS_OPTIONS,
  DOCTOR_COLORS,
  appointmentsOfDay,
  assignDoctorColors,
  branchHoursLabel,
  buildAgendaRows,
  buildDocumentCode,
  formatAgendaDate,
  formatDoctorName,
  formatGeneratedAt,
  reportRoleLabel,
  summarizeAgenda,
  type AgendaShift,
  type AgendaStatusFilter,
} from '../../utils/reports/agenda';
import type { AppointmentStatus } from '../../types/Appointment';
import icon from '../../../imagenes/kristelldent-icon.png';
import wordmark from '../../../imagenes/kristelldent-wordmark.png';
import '../../styles/agenda-report.css';

// Reporte operativo "Agenda de citas de la sede": una hoja A4 que se imprime
// (o se guarda como PDF) con la impresión del navegador. La RLS ya limita las
// citas de la técnica y de la admin de sede a sus sedes.
function AgendaReportPage() {
  const { user } = useAuth();
  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useAllAppointments();
  const { patients, isLoading: isLoadingPatients } = useAllPatients();
  // get_public_professionals: la técnica no puede leer profiles.
  const { professionals } = useProfessionals();
  const { services } = useServices();
  const { branches, isLoading: isLoadingBranches, error: branchesError } = useBranches();
  const { branchIds: manageableIds, isLoading: isLoadingAccess, error: accessError } = useManageableBranchIds();

  const [date, setDate] = useState(getTodayIsoDate);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [status, setStatus] = useState<AgendaStatusFilter>('pending_confirmed');
  const [shift, setShift] = useState<AgendaShift>('all');
  const [generatedAt] = useState(() => formatGeneratedAt(new Date()));

  // admin_global (null) elige entre todas; las demás, solo entre las suyas.
  const allowedBranches = useMemo(
    () => (manageableIds === null ? branches : branches.filter((branch) => manageableIds.includes(branch.id))),
    [branches, manageableIds],
  );
  const branch = allowedBranches.find((item) => item.id === selectedBranchId) ?? allowedBranches[0];
  const branchId = branch?.id ?? '';
  const { hours, error: hoursError } = useBranchWeeklyHours(branchId);

  const branchProfessionals = useMemo(
    () => professionals.filter((professional) => professional.branchIds.includes(branchId)),
    [professionals, branchId],
  );
  const doctorColors = useMemo(() => assignDoctorColors(branchProfessionals), [branchProfessionals]);
  const doctorsWithAppointments = useMemo(
    () => new Set(appointmentsOfDay(appointments, branchId, date).map((appointment) => appointment.professionalId)).size,
    [appointments, branchId, date],
  );

  const rows = useMemo(
    () =>
      buildAgendaRows(appointments, { patients, professionals, services }, { branchId, date, professionalId, status, shift }),
    [appointments, patients, professionals, services, branchId, date, professionalId, status, shift],
  );
  const summary = summarizeAgenda(rows);

  const isLoading = isLoadingAppointments || isLoadingPatients || isLoadingBranches || isLoadingAccess;
  const loadError = appointmentsError ?? branchesError ?? accessError;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }

  if (loadError) {
    return <EmptyState icon={CalendarX2} title="No se pudo cargar la agenda" description={loadError} />;
  }

  if (!branch) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="Sin sedes asignadas"
        description="Tu usuario no tiene sedes asignadas. Pide a la administradora general que te asigne una."
      />
    );
  }

  const selectedDoctor = branchProfessionals.find((professional) => professional.id === professionalId);
  const doctorFilterLabel = selectedDoctor ? formatDoctorName(selectedDoctor.fullName) : `Todas (${doctorsWithAppointments})`;
  const statusFilterLabel = AGENDA_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? '';
  const shiftFilterLabel = AGENDA_SHIFT_OPTIONS.find((option) => option.value === shift)?.label ?? '';

  return (
    <div className="agenda-report flex flex-col gap-5">
      <div className="agenda-toolbar flex flex-wrap items-end gap-3 rounded-[14px] border border-adm-line-card bg-white p-4">
        <Input
          label="Fecha"
          type="date"
          variant="admin"
          value={date}
          // Un campo vacío dejaría la hoja sin fecha: se conserva la última válida.
          onChange={(event) => event.target.value && setDate(event.target.value)}
        />
        <Select
          label="Sede"
          value={branchId}
          onChange={(event) => {
            setSelectedBranchId(event.target.value);
            setProfessionalId('');
          }}
          options={allowedBranches.map((item) => ({ value: item.id, label: item.name }))}
        />
        <Select
          label="Doctora"
          value={professionalId}
          onChange={(event) => setProfessionalId(event.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...branchProfessionals.map((professional) => ({
              value: professional.id,
              label: formatDoctorName(professional.fullName),
            })),
          ]}
        />
        <Select
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as AgendaStatusFilter)}
          options={AGENDA_STATUS_OPTIONS}
        />
        <Select
          label="Turno"
          value={shift}
          onChange={(event) => setShift(event.target.value as AgendaShift)}
          options={AGENDA_SHIFT_OPTIONS}
        />
        <Button
          type="button"
          variant="admin-solid"
          size="md"
          className="ml-auto"
          icon={<Printer size={16} />}
          onClick={() => window.print()}
        >
          Imprimir / Descargar PDF
        </Button>
      </div>

      <article className="agenda-sheet">
        {/* 1. Encabezado */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-3">
            <img src={icon} alt="" className="h-[52px] w-[52px] rounded-[12px]" />
            <div className="flex flex-col gap-0.5 pt-0.5">
              <img src={wordmark} alt="KristellDent" className="h-[24px] w-auto self-start" />
              <span className="text-[12px] text-ag-ink">Clínica odontológica</span>
              <span className="text-[10.5px] text-ag-label">
                Sede {branch.name} · {branch.address}
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-8 gap-y-1 text-[11px]">
            <Meta label="Documento">
              <span className="font-mono text-ag-ink">{buildDocumentCode(branch.name, date)}</span>
            </Meta>
            <Meta label="Generado">{generatedAt}</Meta>
            <Meta label="Emitido por">{user?.name ?? '—'}</Meta>
            <Meta label="Rol">{user ? reportRoleLabel(user.role) : '—'}</Meta>
            <div className="col-span-2">
              <Meta label="Alcance de los datos">
                <span className="text-ag-teal">Agenda operativa de la sede {branch.name}</span>
              </Meta>
            </div>
          </dl>
        </div>
        <div className="mt-2.5 flex h-[2px] w-full bg-ag-line">
          <span className="w-[56px] bg-ag-teal" />
          <span className="w-[22px] bg-ag-magenta" />
        </div>

        {/* 2. Módulo */}
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.42em] text-ag-teal">
          Módulo de reportes <span className="text-ag-magenta">•</span> Nivel operativo
        </p>

        {/* 3. Título y fecha */}
        <div className="mt-1.5 flex items-start justify-between gap-6">
          <h1 className="agenda-title max-w-[124mm] text-[40px] font-bold leading-[1.02] tracking-[-0.015em] text-ag-ink">
            Agenda de citas de la sede
          </h1>
          <div className="shrink-0 border-l-2 border-ag-teal pl-4">
            <p className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-ag-label">Fecha de la agenda</p>
            <p className="mt-0.5 text-[20px] font-bold text-ag-ink">{formatAgendaDate(date)}</p>
            <p className="text-[10.5px] text-ag-label">{hoursError ? `Sede ${branch.name} · horario no disponible` : branchHoursLabel(branch.name, hours, date)}</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-ag-label">
          Citas programadas del día para organizar la atención y la recepción.
        </p>

        {/* 4. Filtros aplicados */}
        <div className="mt-3 grid grid-cols-4 rounded-[8px] border border-ag-line bg-ag-bg">
          <AppliedFilter label="Sede" value={branch.name} />
          <AppliedFilter label="Doctora" value={doctorFilterLabel} />
          <AppliedFilter label="Estado" value={statusFilterLabel} />
          <AppliedFilter label="Turno" value={shiftFilterLabel} />
        </div>

        {/* 5. Tarjetas */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          <SummaryCard label="Citas del día" value={summary.total} />
          <SummaryCard label="Confirmadas" value={summary.confirmed} hint="paciente confirmó asistencia" />
          <SummaryCard label="Por confirmar" value={summary.pending} hint="llamar antes de las 10:00" />
          <SummaryCard label="Doctoras en turno" value={summary.doctorCount} hint={summary.doctorSurnames} />
        </div>

        {/* 6. Agenda del día */}
        <div className="mt-5 flex items-end justify-between border-b border-ag-line pb-1.5">
          <h2 className="flex items-baseline gap-2 text-[14px] font-bold text-ag-ink">
            <span className="font-mono text-[11px] font-semibold text-ag-teal">01</span>
            Agenda del día
          </h2>
          <span className="text-[10.5px] text-ag-label">Orden cronológico</span>
        </div>

        <table className="agenda-table mt-2 w-full border-collapse text-[10.5px] leading-[16px] text-ag-ink">
          <thead>
            <tr className="bg-ag-bg text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-ag-label">
              <th className="w-[8%] px-2 py-[7px] font-semibold">Hora</th>
              <th className="w-[19.5%] px-2 py-[7px] font-semibold">Paciente</th>
              <th className="w-[17.5%] px-2 py-[7px] font-semibold">Servicio</th>
              <th className="w-[22.5%] px-2 py-[7px] font-semibold">Doctora</th>
              <th className="w-[14.5%] px-2 py-[7px] font-semibold">Estado</th>
              <th className="w-[7.5%] px-2 py-[7px] font-semibold">Asistió</th>
              <th className="px-2 py-[7px] font-semibold">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-ag-label">
                  No hay citas programadas para este día.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const color = DOCTOR_COLORS[doctorColors.get(row.professionalId) ?? 2];
                return (
                  <tr key={row.id} className="border-b border-ag-line">
                    <td className="px-2 py-[4px] text-[11.5px] font-medium [font-variant-numeric:tabular-nums]">{row.time}</td>
                    <td className="px-2 py-[4px]">{row.patientName}</td>
                    <td className="px-2 py-[4px]">{row.serviceName}</td>
                    <td className="px-2 py-[4px]">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full text-[7px] font-bold"
                          style={{ backgroundColor: color.bg, color: color.text }}
                        >
                          {row.doctorInitials}
                        </span>
                        {row.doctorName}
                      </span>
                    </td>
                    <td className="px-2 py-[4px]">
                      <StatusMark status={row.status} />
                    </td>
                    <td className="px-2 py-[4px]">
                      <span aria-label="Casilla para marcar asistencia" className="block h-[13px] w-[13px] rounded-[3px] border border-[#9AA6AD]" />
                    </td>
                    <td className="px-2 py-[4px]" />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <p className="mt-2 text-[9.5px] text-ag-label">
          Marcar «Asistió» en papel durante la jornada y registrar el estado final en el sistema antes del cierre del día.
        </p>

        {/* 7. Notas */}
        <div className="agenda-notes mt-5 border-t-2 border-ag-ink pt-3">
          <div className="grid grid-cols-[70px_1fr_1fr] gap-x-6 text-[10.5px] text-ag-ink">
            <p className="font-bold uppercase tracking-[0.06em]">Notas</p>
            <ul className="flex flex-col gap-1.5">
              <Note>Confirmada: el paciente confirmó que asistirá. Pendiente: aún sin confirmar.</Note>
              <Note>«Asistió» es un control manual para la recepción durante el turno.</Note>
            </ul>
            <ul className="flex flex-col gap-1.5">
              <Note>Alcance: agenda de la sede asignada; sin datos económicos ni estadísticos.</Note>
              <Note>Uso diario; se imprime por turno.</Note>
            </ul>
          </div>
        </div>

        {/* 8. Pie (en papel lo pone @page en cada hoja, con el número de página) */}
        <div className="agenda-screen-footer mt-8 flex items-center justify-between border-t border-ag-line pt-2 text-[9.5px] text-ag-label">
          <span>KristellDent · Agenda de citas de la sede · Nivel operativo</span>
          <span>Confidencial — uso interno</span>
          <span>
            Página <strong className="text-ag-ink">1</strong> de <strong className="text-ag-ink">1</strong>
          </span>
        </div>
      </article>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{label}</dt>
      <dd className="text-[11px] text-ag-ink">{children}</dd>
    </div>
  );
}

function AppliedFilter({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-l border-ag-line px-3.5 py-2.5 first:border-l-0">
      <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{label}</span>
      <span className="text-[12px] text-ag-ink">{value}</span>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex flex-col rounded-[8px] border border-ag-line px-3.5 py-2.5">
      <span className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{label}</span>
      <span className="mt-0.5 text-[26px] font-semibold leading-none text-ag-ink">{value}</span>
      {hint && <span className="mt-1.5 text-[9px] text-ag-label">{hint}</span>}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="font-bold text-ag-teal">–</span>
      <span>{children}</span>
    </li>
  );
}

// Confirmada: círculo verde azulado con punto; Pendiente: aro naranja; el
// resto, con el color de su StatusBadge.
const STATUS_MARK_COLORS: Record<AppointmentStatus, { ring: string; dot: string | null }> = {
  confirmed: { ring: '#008F9F', dot: '#008F9F' },
  pending: { ring: '#E07B39', dot: null },
  in_room: { ring: 'var(--color-adm-status-in-room-solid)', dot: 'var(--color-adm-status-in-room-solid)' },
  completed: { ring: 'var(--color-adm-status-completed-solid)', dot: 'var(--color-adm-status-completed-solid)' },
  cancelled: { ring: 'var(--color-adm-status-cancelled-solid)', dot: 'var(--color-adm-status-cancelled-solid)' },
};

function StatusMark({ status }: { status: AppointmentStatus }) {
  const { ring, dot } = STATUS_MARK_COLORS[status];
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full border-[1.5px]"
        style={{ borderColor: ring }}
      >
        {dot && <span className="h-[4px] w-[4px] rounded-full" style={{ backgroundColor: dot }} />}
      </span>
      {AGENDA_STATUS_LABELS[status]}
    </span>
  );
}

export default AgendaReportPage;
