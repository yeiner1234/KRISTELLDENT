import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileUser } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Spinner from '../../components/common/Spinner';
import {
  DotLabel,
  EmptyRow,
  PrintButton,
  ReportHeader,
  ReportNotes,
  ReportScreenFooter,
  ReportSheet,
  ReportTable,
  ReportTitle,
  ReportToolbar,
  SectionTitle,
  StatusMark,
  cellClass,
  rowClass,
} from '../../components/reports/ReportParts';
import { useAuth } from '../../hooks/useAuth';
import { useAllPatients } from '../../hooks/usePatients';
import { useBranches } from '../../hooks/useBranches';
import { useLoad } from '../../hooks/useLoad';
import { useMyReportProfile } from '../../hooks/useMyReportProfile';
import { getPatientHistory, type PatientHistoryEntry } from '../../services/reportService';
import { getLimaNowTime, getTodayIsoDate } from '../../utils/date';
import { formatGeneratedAt, formatPatientName, reportRoleLabel } from '../../utils/reports/agenda';
import {
  TREATMENT_ABANDON_DAYS,
  TREATMENT_STATUS_LABELS,
  ageFromBirthDate,
  buildTreatments,
  findNextAppointment,
  formatHistoryNumber,
  historyDocumentCode,
  matchesPatientSearch,
  patientSinceLabel,
  sortHistoryDesc,
  summarizeHistory,
} from '../../utils/reports/patientHistory';
import { formatDayMonthYear, formatDmy } from '../../utils/reports/period';

// Cuántos pacientes muestra el selector a la vez (se afina escribiendo).
const PATIENT_OPTIONS_LIMIT = 60;

function doctorLabel(name: string | null): string {
  return name ? `Dra. ${name}` : '—';
}

// Reporte "Historia de paciente": datos del paciente y todas sus citas, de la
// más reciente a la más antigua, con sus tratamientos de varias sesiones. La
// profesional ve la historia completa de sus pacientes; la técnica, las citas
// de sus sedes (lo decide la RPC patient_history).
function PatientHistoryReportPage() {
  const { user } = useAuth();
  const isTechnician = user?.role === 'tecnica';
  const today = useMemo(() => getTodayIsoDate(), []);
  const [nowTime] = useState(getLimaNowTime);
  const [generatedAt] = useState(() => formatGeneratedAt(new Date()));
  const [searchParams, setSearchParams] = useSearchParams();
  const patientId = searchParams.get('paciente') ?? '';
  const [query, setQuery] = useState('');

  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { branches } = useBranches();
  const profile = useMyReportProfile();
  const history = useLoad(
    patientId || null,
    () => getPatientHistory(patientId),
    [] as PatientHistoryEntry[],
    'No se pudo cargar la historia del paciente.',
  );

  const matches = useMemo(
    () =>
      patients
        .filter((patient) => matchesPatientSearch(patient, query))
        .sort((a, b) => formatPatientName(a.firstName, a.lastName).localeCompare(formatPatientName(b.firstName, b.lastName), 'es')),
    [patients, query],
  );
  const patient = patients.find((item) => item.id === patientId);
  // El paciente elegido siempre aparece en el selector, aunque no coincida con la búsqueda.
  const options = [
    ...(patient && !matches.slice(0, PATIENT_OPTIONS_LIMIT).includes(patient) ? [patient] : []),
    ...matches.slice(0, PATIENT_OPTIONS_LIMIT),
  ];

  const selectPatient = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('paciente', id);
    else next.delete('paciente');
    setSearchParams(next, { replace: true });
  };

  if (isLoadingPatients) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }

  if (patientsError) {
    return <EmptyState icon={FileUser} title="No se pudo cargar la historia" description={patientsError} />;
  }

  const toolbar = (
    <ReportToolbar>
      <div className="col-span-2 sm:min-w-[260px]">
        <Input
          label="Buscar paciente"
          variant="admin"
          placeholder="DNI, nombre o N.º de historia"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="col-span-2 sm:min-w-[280px]">
        <Select
          label={`Paciente (${matches.length})`}
          value={patientId}
          onChange={(event) => selectPatient(event.target.value)}
          options={[
            { value: '', label: matches.length === 0 ? 'Sin coincidencias' : 'Elige un paciente' },
            ...options.map((item) => ({
              value: item.id,
              label: `${formatPatientName(item.firstName, item.lastName)} · ${item.dni}`,
            })),
          ]}
        />
      </div>
      {patient && <PrintButton fileName={historyDocumentCode(patient.historyNumber, today)} />}
    </ReportToolbar>
  );

  if (!patient) {
    return (
      <div className="report-page flex flex-col gap-5">
        {toolbar}
        <EmptyState
          icon={FileUser}
          title={patientId ? 'Paciente no disponible' : 'Elige un paciente'}
          description={
            patientId
              ? 'No tienes citas con este paciente o ya no está disponible.'
              : 'Busca por DNI, nombre o N.º de historia para ver y descargar su historia.'
          }
        />
      </div>
    );
  }

  if (history.isLoading) {
    return (
      <div className="report-page flex flex-col gap-5">
        {toolbar}
        <div className="flex justify-center py-10">
          <Spinner size={28} />
        </div>
      </div>
    );
  }

  if (history.error) {
    return (
      <div className="report-page flex flex-col gap-5">
        {toolbar}
        <EmptyState icon={FileUser} title="No se pudo cargar la historia" description={history.error} />
      </div>
    );
  }

  const entries = sortHistoryDesc(history.data);
  const summary = summarizeHistory(entries);
  const next = findNextAppointment(entries, today, nowTime);
  const treatments = buildTreatments(entries, today, nowTime);
  const age = ageFromBirthDate(patient.birthDate, today);
  const latestBranch = branches.find((branch) => branch.name === summary.branchName);
  const branchLine = summary.branchName
    ? latestBranch?.address
      ? `Sede ${summary.branchName} · ${latestBranch.address}`
      : `Sede ${summary.branchName}`
    : 'Clínica KristellDent';

  return (
    <div className="report-page flex flex-col gap-5">
      {toolbar}

      <ReportSheet report="historia-paciente">
        <ReportHeader
          branchLine={branchLine}
          meta={[
            { label: 'Documento', value: <span className="font-mono text-ag-ink">{historyDocumentCode(patient.historyNumber, today)}</span> },
            { label: 'Generado', value: generatedAt },
            { label: 'Emitido por', value: user?.name ?? '—' },
            { label: 'Rol', value: user ? reportRoleLabel(user.role, profile.specialtyName) : '—' },
          ]}
          scope={isTechnician ? 'Citas del paciente en sus sedes' : 'Solo sus pacientes · todas sus citas en la clínica'}
        />

        <ReportTitle
          level={isTechnician ? 'Nivel operativo' : 'Nivel especialista'}
          title="Historia de paciente"
          subtitle={
            isTechnician
              ? 'Citas del paciente en su sede, de la más reciente a la más antigua.'
              : 'Todas las citas del paciente en la clínica, de la más reciente a la más antigua.'
          }
          asideLabel="Periodo del historial"
          asideValue={summary.firstDate ? `${formatDayMonthYear(summary.firstDate)} – hoy` : 'Sin citas'}
          asideHint={summary.firstDate ? patientSinceLabel(summary.firstDate, today) : undefined}
        />

        <div className="report-keep mt-4 grid grid-cols-[1.25fr_1fr_1fr] rounded-[8px] border border-ag-line">
          <div className="rounded-l-[8px] bg-ag-bg px-4 py-3">
            <BlockLabel>Paciente</BlockLabel>
            <p className="mt-0.5 text-[19px] font-bold leading-tight text-ag-ink">
              {formatPatientName(patient.firstName, patient.lastName)}
            </p>
            <dl className="mt-2 grid grid-cols-[78px_1fr] gap-y-1 text-[10.5px]">
              <Field label="N.º historia" mono>
                {formatHistoryNumber(patient.historyNumber)}
              </Field>
              <Field label="DNI" mono>
                {patient.dni}
              </Field>
              <Field label="Celular" mono>
                {patient.phone || '—'}
              </Field>
              <Field label="Edad" mono>
                {age === null ? '—' : `${age} años`}
              </Field>
              <Field label="Domicilio" mono>
                {patient.address || '—'}
              </Field>
              <Field label="Correo">{patient.email || '—'}</Field>
            </dl>
          </div>

          <div className="border-l border-ag-line px-4 py-3">
            <BlockLabel>Resumen</BlockLabel>
            <dl className="mt-2 grid grid-cols-[72px_1fr] gap-y-1.5 text-[10.5px]">
              <Field label="Atenciones">
                {summary.completed} {summary.completed === 1 ? 'atendida' : 'atendidas'} · {summary.cancelled}{' '}
                {summary.cancelled === 1 ? 'cancelada' : 'canceladas'}
              </Field>
              <Field label="Primera">{summary.firstDate ? formatDmy(summary.firstDate) : '—'}</Field>
              <Field label="Última">{summary.lastAttention ? formatDmy(summary.lastAttention) : '—'}</Field>
              <Field label="Sede">{summary.branchName ?? '—'}</Field>
            </dl>
          </div>

          <div className="border-l border-ag-line px-4 py-3">
            <BlockLabel>Próxima cita</BlockLabel>
            {next ? (
              <>
                <p className="mt-0.5 text-[17px] font-bold text-ag-ink [font-variant-numeric:tabular-nums]">
                  {formatDmy(next.date)} · {next.startTime}
                </p>
                <dl className="mt-2 grid grid-cols-[62px_1fr] gap-y-1.5 text-[10.5px]">
                  <Field label="Doctora">{doctorLabel(next.professionalName)}</Field>
                  <Field label="Servicio">{next.serviceName ?? '—'}</Field>
                  <Field label="Estado">
                    <StatusMark status={next.status} />
                  </Field>
                </dl>
              </>
            ) : (
              <p className="mt-2 text-[11px] text-ag-magenta">Sin próxima cita programada.</p>
            )}
          </div>
        </div>

        <SectionTitle number="01" title="Tratamientos" aside={`${treatments.length} ${treatments.length === 1 ? 'registrado' : 'registrados'}`} />
        <ReportTable
          head={[
            { label: 'Inicio', className: 'w-[12%]' },
            { label: 'Sesión', className: 'w-[9%]' },
            { label: 'Doctora', className: 'w-[25%]' },
            { label: 'Tratamiento' },
            { label: 'Próxima sesión', className: 'w-[15%]' },
            { label: 'Estado', className: 'w-[15%]' },
          ]}
        >
          {treatments.length === 0 ? (
            <EmptyRow colSpan={6}>Sin tratamientos de varias sesiones en curso.</EmptyRow>
          ) : (
            treatments.map((treatment) => (
              <tr key={treatment.key} className={rowClass}>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{formatDmy(treatment.startDate)}</td>
                <td className={`${cellClass} whitespace-nowrap`}>
                  {treatment.completedSessions} de {treatment.totalSessions}
                </td>
                <td className={cellClass}>{doctorLabel(treatment.doctorName)}</td>
                <td className={cellClass}>{treatment.serviceName}</td>
                <td className={`${cellClass} text-ag-label [font-variant-numeric:tabular-nums]`}>
                  {treatment.nextSession ? formatDmy(treatment.nextSession) : '—'}
                </td>
                <td className={cellClass}>
                  <DotLabel color={treatment.status === 'in_treatment' ? '#008F9F' : '#C4165D'}>
                    {TREATMENT_STATUS_LABELS[treatment.status]}
                  </DotLabel>
                </td>
              </tr>
            ))
          )}
        </ReportTable>

        <SectionTitle number="02" title="Historial de citas" aside={`${entries.length} ${entries.length === 1 ? 'cita' : 'citas'}`} />
        <ReportTable
          head={[
            { label: 'Fecha', className: 'w-[12%]' },
            { label: 'Hora', className: 'w-[8%]' },
            { label: 'Doctora', className: 'w-[24%]' },
            { label: 'Servicio', className: 'w-[19%]' },
            { label: 'Motivo de consulta' },
            { label: 'Estado', className: 'w-[14%]' },
          ]}
        >
          {entries.length === 0 ? (
            <EmptyRow colSpan={6}>El paciente no tiene citas registradas.</EmptyRow>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className={rowClass}>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{formatDmy(entry.date)}</td>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{entry.startTime}</td>
                <td className={cellClass}>{doctorLabel(entry.professionalName)}</td>
                <td className={cellClass}>{entry.serviceName ?? '—'}</td>
                <td className={`${cellClass} text-ag-label`}>{entry.reason || '—'}</td>
                <td className={cellClass}>
                  <StatusMark status={entry.status} />
                </td>
              </tr>
            ))
          )}
        </ReportTable>

        <ReportNotes
          left={[
            'Tratamientos: servicios de más de una sesión. «En tratamiento»: con próxima sesión o atendido hace poco.',
            `«Cancelado»: sin próxima sesión y con la última cita cancelada o más de ${TREATMENT_ABANDON_DAYS} días sin volver.`,
          ]}
          right={[
            isTechnician
              ? 'Alcance: citas del paciente en las sedes asignadas.'
              : 'Alcance: pacientes con citas asignadas a la profesional; incluye sus citas con otras doctoras.',
            'Datos personales tratados según la Ley N.° 29733.',
          ]}
        />

        <ReportScreenFooter title={`KristellDent · Historia de paciente · ${isTechnician ? 'Nivel operativo' : 'Nivel especialista'}`} />
      </ReportSheet>
    </div>
  );
}

function BlockLabel({ children }: { children: ReactNode }) {
  return <p className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ag-label">{children}</p>;
}

function Field({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <>
      <dt className="text-[8.5px] uppercase tracking-[0.1em] text-ag-label">{label}</dt>
      <dd className={`text-ag-ink ${mono ? 'font-mono text-[10px]' : ''}`}>{children}</dd>
    </>
  );
}

export default PatientHistoryReportPage;
