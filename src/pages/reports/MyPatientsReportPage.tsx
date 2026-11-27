import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Spinner from '../../components/common/Spinner';
import {
  AppliedFilters,
  EmptyRow,
  GroupedBarChart,
  PrintButton,
  Readings,
  ReportHeader,
  ReportNotes,
  ReportScreenFooter,
  ReportSheet,
  ReportTable,
  ReportTitle,
  ReportToolbar,
  SectionTitle,
  SummaryCard,
  SummaryCards,
  Tag,
  cellClass,
  rowClass,
} from '../../components/reports/ReportParts';
import { useAuth } from '../../hooks/useAuth';
import { useMyAppointments } from '../../hooks/useAppointments';
import { useAllPatients } from '../../hooks/usePatients';
import { useBranches } from '../../hooks/useBranches';
import { useLoad } from '../../hooks/useLoad';
import { usePanelBranch } from '../../hooks/usePanelBranch';
import { useMyReportProfile } from '../../hooks/useMyReportProfile';
import { getMyPatientsFirstVisit } from '../../services/reportService';
import { getLimaNowTime, getTodayIsoDate } from '../../utils/date';
import { formatGeneratedAt, reportRoleLabel } from '../../utils/reports/agenda';
import { appointmentServiceName } from '../../utils/reports/myAppointments';
import {
  FREQUENT_MIN_VISITS,
  PATIENT_TYPE_OPTIONS,
  buildMyPatientRows,
  buildPatientSeries,
  myPatientsReadings,
  summarizeMyPatients,
  type PatientTypeFilter,
} from '../../utils/reports/myPatients';
import {
  defaultReportPeriod,
  formatComparisonRange,
  formatDmy,
  formatPeriodRange,
  monthBuckets,
  percentChange,
  periodDays,
  previousPeriod,
} from '../../utils/reports/period';
import { reportBranchLine, reportDocumentCode, trendFromChange } from '../../utils/reports/reportHeader';

// Reporte "Mis pacientes" (nivel especialista): pacientes que la profesional
// atendió en el periodo, si son nuevos, recurrentes o frecuentes, y quiénes no
// tienen una próxima cita (para programar su seguimiento).
function MyPatientsReportPage() {
  const { user } = useAuth();
  const today = useMemo(() => getTodayIsoDate(), []);
  const [nowTime] = useState(getLimaNowTime);
  const [generatedAt] = useState(() => formatGeneratedAt(new Date()));
  const initialPeriod = useMemo(() => defaultReportPeriod(today), [today]);
  const [from, setFrom] = useState(initialPeriod.from);
  const [to, setTo] = useState(initialPeriod.to);
  const [serviceName, setServiceName] = useState('');
  const [type, setType] = useState<PatientTypeFilter>('all');

  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useMyAppointments(user?.id);
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { branches } = useBranches();
  const panel = usePanelBranch();
  const branchId = panel.selectedBranchId;
  const profile = useMyReportProfile();
  const firstVisits = useLoad(
    user?.id ?? null,
    getMyPatientsFirstVisit,
    new Map<string, string>(),
    'No se pudo cargar el historial de tus pacientes.',
  );

  const serviceOptions = useMemo(
    () => [...new Set(appointments.map(appointmentServiceName))].sort((a, b) => a.localeCompare(b, 'es')),
    [appointments],
  );

  const filters = { from, to, branchId, serviceName, type };
  const previous = previousPeriod(from, to);
  const allRows = buildMyPatientRows(appointments, patients, firstVisits.data, { ...filters, type: 'all' }, today, nowTime);
  const rows = type === 'all' ? allRows : buildMyPatientRows(appointments, patients, firstVisits.data, filters, today, nowTime);
  const summary = summarizeMyPatients(allRows);
  const previousAttended = buildMyPatientRows(
    appointments,
    patients,
    firstVisits.data,
    { ...filters, ...previous, type: 'all' },
    today,
    nowTime,
  ).length;
  const series = buildPatientSeries(appointments, firstVisits.data, filters, monthBuckets(from, to));
  const readings = myPatientsReadings({ summary, series });

  if (isLoadingAppointments || isLoadingPatients || firstVisits.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }

  const loadError = appointmentsError ?? patientsError ?? firstVisits.error;
  if (loadError) {
    return <EmptyState icon={UsersRound} title="No se pudo cargar el reporte" description={loadError} />;
  }

  const percentOf = (count: number) => (summary.attended === 0 ? 0 : Math.round((count / summary.attended) * 100));
  const typeLabel = PATIENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? '';

  return (
    <div className="report-page flex flex-col gap-5">
      <ReportToolbar>
        <Input
          label="Desde"
          type="date"
          variant="admin"
          value={from}
          max={to}
          onChange={(event) => event.target.value && event.target.value <= to && setFrom(event.target.value)}
        />
        <Input
          label="Hasta"
          type="date"
          variant="admin"
          value={to}
          min={from}
          onChange={(event) => event.target.value && event.target.value >= from && setTo(event.target.value)}
        />
        <Select
          label="Sede"
          value={branchId}
          onChange={(event) => panel.setSelectedBranchId(event.target.value)}
          options={[{ value: '', label: 'Todas mis sedes' }, ...panel.branches.map((item) => ({ value: item.id, label: item.name }))]}
        />
        <Select
          label="Servicio"
          value={serviceName}
          onChange={(event) => setServiceName(event.target.value)}
          options={[{ value: '', label: 'Todos' }, ...serviceOptions.map((name) => ({ value: name, label: name }))]}
        />
        <Select
          label="Tipo de paciente"
          value={type}
          onChange={(event) => setType(event.target.value as PatientTypeFilter)}
          options={PATIENT_TYPE_OPTIONS}
        />
        <PrintButton fileName={reportDocumentCode('REP-PAC', user?.name ?? '', today)} />
      </ReportToolbar>

      <ReportSheet report="mis-pacientes">
        <ReportHeader
          branchLine={reportBranchLine(branchId, panel.branches, branches)}
          meta={[
            { label: 'Documento', value: <span className="font-mono text-ag-ink">{reportDocumentCode('REP-PAC', user?.name ?? '', today)}</span> },
            { label: 'Generado', value: generatedAt },
            { label: 'Emitido por', value: user?.name ?? '—' },
            { label: 'Rol', value: user ? reportRoleLabel(user.role, profile.specialtyName) : '—' },
          ]}
          scope="Solo sus citas y pacientes"
        />

        <ReportTitle
          level="Nivel especialista"
          title="Reporte de mis pacientes"
          subtitle="Pacientes que atendió en el periodo, su recurrencia y sus próximas citas."
          asideLabel="Periodo consultado"
          asideValue={formatPeriodRange(from, to)}
          asideHint={`${periodDays(from, to)} días · comparado con ${formatComparisonRange(previous.from, previous.to)}`}
        />

        <AppliedFilters
          items={[
            { label: 'Doctora', value: user?.name ?? '—' },
            { label: 'Sede', value: branchId ? panel.branchName(branchId) : 'Todas' },
            { label: 'Servicio', value: serviceName || 'Todos' },
            { label: 'Tipo de paciente', value: typeLabel },
          ]}
        />

        <SectionTitle number="01" title="Resumen del periodo" />
        <SummaryCards>
          <SummaryCard
            label="Atendidos"
            value={summary.attended}
            trend={trendFromChange(percentChange(summary.attended, previousAttended), '%', true)}
          />
          <SummaryCard label="Nuevos" value={summary.newCount} hint={`${percentOf(summary.newCount)} % de sus pacientes`} />
          <SummaryCard label="Recurrentes" value={summary.recurrentCount} hint={`${percentOf(summary.recurrentCount)} % de sus pacientes`} />
          <SummaryCard label="Frecuentes" value={summary.frequentCount} hint={`${FREQUENT_MIN_VISITS} o más atenciones en 12 meses`} />
          <SummaryCard label="Citas por paciente" value={summary.appointmentsPerPatient.toFixed(2)} hint="promedio del periodo" />
        </SummaryCards>

        <SectionTitle number="02" title="Evolución mensual" aside="Pacientes atendidos por mes según tipo" />
        <div className="report-keep mt-3 grid grid-cols-[1.5fr_1fr] gap-6">
          <GroupedBarChart
            ariaLabel="Pacientes nuevos y recurrentes por mes"
            series={[
              { label: 'Nuevos', color: '#C4165D' },
              { label: 'Recurrentes', color: '#008F9F' },
            ]}
            points={series.map((point) => ({ label: point.label, values: [point.newCount, point.recurrentCount] }))}
          />
          <Readings items={readings} />
        </div>

        <SectionTitle
          number="03"
          title="Mis pacientes atendidos"
          aside={`Ordenado por citas atendidas · ${rows.length} de ${summary.attended} · sin próxima cita: ${summary.withoutNext}`}
        />
        <ReportTable
          head={[
            { label: 'Paciente', className: 'w-[24%]' },
            { label: 'DNI', className: 'w-[11%]' },
            { label: 'Tipo', className: 'w-[15%]' },
            { label: 'Citas', className: 'w-[7%] text-right' },
            { label: 'Última atención', className: 'w-[13%] text-right' },
            { label: 'Último servicio' },
            { label: 'Próxima cita', className: 'w-[12%] text-right' },
          ]}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={7}>No hay pacientes atendidos en el periodo con estos filtros.</EmptyRow>
          ) : (
            rows.map((row) => (
              <tr key={row.patientId} className={rowClass}>
                <td className={cellClass}>
                  {/* En pantalla abre su historia; en papel es solo el nombre. */}
                  <Link to={`/profesional/reportes/historia?paciente=${row.patientId}`} className="hover:text-ag-teal hover:underline">
                    {row.patientName}
                  </Link>
                </td>
                <td className={`${cellClass} font-mono text-[10px]`}>{row.dni}</td>
                <td className={cellClass}>
                  <span className="flex flex-wrap gap-1">
                    {row.type === 'new' ? <Tag tone="magenta">Nuevo</Tag> : <Tag tone="gray">Recurrente</Tag>}
                    {row.frequent && <Tag tone="teal">Frecuente</Tag>}
                  </span>
                </td>
                <td className={`${cellClass} text-right [font-variant-numeric:tabular-nums]`}>{row.completedCount}</td>
                <td className={`${cellClass} text-right [font-variant-numeric:tabular-nums]`}>{formatDmy(row.lastAttention)}</td>
                <td className={cellClass}>{row.lastService}</td>
                <td className={`${cellClass} text-right [font-variant-numeric:tabular-nums]`}>
                  {row.nextAppointment ? formatDmy(row.nextAppointment) : <span className="text-ag-magenta">—</span>}
                </td>
              </tr>
            ))
          )}
        </ReportTable>

        <ReportNotes
          left={[
            'Nuevo: su primera cita atendida en la clínica cae dentro del periodo. Recurrente: con citas atendidas anteriores.',
            `Frecuente: ${FREQUENT_MIN_VISITS} o más citas atendidas con usted en los últimos 12 meses.`,
          ]}
          right={[
            'Alcance: solo pacientes con citas asignadas a la profesional.',
            'Próxima cita «—»: sin cita programada; conviene llamar para su seguimiento. Datos personales tratados según la Ley N.° 29733.',
          ]}
        />

        <ReportScreenFooter title="KristellDent · Reporte de mis pacientes · Nivel especialista" />
      </ReportSheet>
    </div>
  );
}

export default MyPatientsReportPage;
