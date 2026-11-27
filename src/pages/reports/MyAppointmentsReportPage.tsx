import { useMemo, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
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
  StatusMark,
  SummaryCard,
  SummaryCards,
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
import { getBranchAttendance } from '../../services/reportService';
import { getLimaNowTime, getTodayIsoDate } from '../../utils/date';
import { formatGeneratedAt, reportRoleLabel } from '../../utils/reports/agenda';
import {
  MY_APPOINTMENTS_STATUS_OPTIONS,
  appointmentServiceName,
  attendanceRate,
  buildAttendanceSeries,
  buildUnclosedRows,
  buildUpcomingRows,
  filterMyAppointments,
  formatPercent,
  matchesBranchAndService,
  myAppointmentsReadings,
  summarizeMyAppointments,
  type MyAppointmentsStatusFilter,
} from '../../utils/reports/myAppointments';
import {
  REPORT_GROUPING_OPTIONS,
  defaultReportPeriod,
  formatComparisonRange,
  formatDmy,
  formatPeriodRange,
  percentChange,
  periodBuckets,
  periodDays,
  previousPeriod,
  type ReportGrouping,
} from '../../utils/reports/period';
import { reportBranchLine, reportDocumentCode, trendFromChange } from '../../utils/reports/reportHeader';

const UPCOMING_LIMIT = 5;

// Reporte "Mis citas" (nivel especialista): la especialista y la odontóloga
// general ven sus citas del periodo, su tasa de atención frente a la sede, las
// citas pasadas sin cerrar y sus próximas citas. La RLS ya limita las citas a
// las suyas.
function MyAppointmentsReportPage() {
  const { user } = useAuth();
  const today = useMemo(() => getTodayIsoDate(), []);
  const [nowTime] = useState(getLimaNowTime);
  const [generatedAt] = useState(() => formatGeneratedAt(new Date()));
  const initialPeriod = useMemo(() => defaultReportPeriod(today), [today]);
  const [from, setFrom] = useState(initialPeriod.from);
  const [to, setTo] = useState(initialPeriod.to);
  const [serviceName, setServiceName] = useState('');
  const [status, setStatus] = useState<MyAppointmentsStatusFilter>('all');
  const [grouping, setGrouping] = useState<ReportGrouping>('monthly');

  const { appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useMyAppointments(user?.id);
  const { patients, isLoading: isLoadingPatients, error: patientsError } = useAllPatients();
  const { branches } = useBranches();
  const panel = usePanelBranch();
  const branchId = panel.selectedBranchId;
  const profile = useMyReportProfile();

  const filters = { from, to, branchId, serviceName, status };
  const previous = previousPeriod(from, to);
  const attendance = useLoad(
    `${from}|${to}|${branchId}`,
    () => getBranchAttendance({ from, to, branchId }),
    { completed: 0, cancelled: 0 },
    'No se pudo cargar el promedio de la sede.',
  );

  const serviceOptions = useMemo(
    () => [...new Set(appointments.map(appointmentServiceName))].sort((a, b) => a.localeCompare(b, 'es')),
    [appointments],
  );
  const current = filterMyAppointments(appointments, filters);
  const summary = summarizeMyAppointments(current, today);
  const previousSummary = summarizeMyAppointments(filterMyAppointments(appointments, { ...filters, ...previous }), today);
  const branchRate = attendance.error ? null : attendanceRate(attendance.data.completed, attendance.data.cancelled);
  const series = buildAttendanceSeries(current, periodBuckets(from, to, grouping));
  const unclosedRows = buildUnclosedRows(current, patients, today);
  const upcoming = buildUpcomingRows(
    appointments.filter((appointment) => matchesBranchAndService(appointment, filters)),
    patients,
    today,
    nowTime,
    UPCOMING_LIMIT,
  );
  const readings = myAppointmentsReadings({ rate: summary.rate, branchRate, series, unclosed: summary.unclosed });

  if (isLoadingAppointments || isLoadingPatients) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }

  const loadError = appointmentsError ?? patientsError;
  if (loadError) {
    return <EmptyState icon={CalendarX2} title="No se pudo cargar el reporte" description={loadError} />;
  }

  const branchLabel = branchId ? panel.branchName(branchId) : 'Todas';
  const statusLabel = MY_APPOINTMENTS_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? '';
  const groupingLabel = REPORT_GROUPING_OPTIONS.find((option) => option.value === grouping)?.label ?? '';
  const rateChange = summary.rate !== null && previousSummary.rate !== null ? summary.rate - previousSummary.rate : null;

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
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as MyAppointmentsStatusFilter)}
          options={MY_APPOINTMENTS_STATUS_OPTIONS}
        />
        <Select
          label="Agrupación"
          value={grouping}
          onChange={(event) => setGrouping(event.target.value as ReportGrouping)}
          options={REPORT_GROUPING_OPTIONS}
        />
        <PrintButton fileName={reportDocumentCode('REP-CIT', user?.name ?? '', today)} />
      </ReportToolbar>

      <ReportSheet report="mis-citas">
        <ReportHeader
          branchLine={reportBranchLine(branchId, panel.branches, branches)}
          meta={[
            { label: 'Documento', value: <span className="font-mono text-ag-ink">{reportDocumentCode('REP-CIT', user?.name ?? '', today)}</span> },
            { label: 'Generado', value: generatedAt },
            { label: 'Emitido por', value: user?.name ?? '—' },
            { label: 'Rol', value: user ? reportRoleLabel(user.role, profile.specialtyName) : '—' },
          ]}
          scope="Solo sus citas y pacientes"
        />

        <ReportTitle
          level="Nivel especialista"
          title="Reporte de mis citas"
          subtitle="Sus citas del periodo: atención, cancelaciones y pendientes."
          asideLabel="Periodo consultado"
          asideValue={formatPeriodRange(from, to)}
          asideHint={`${periodDays(from, to)} días · comparado con ${formatComparisonRange(previous.from, previous.to)}`}
        />

        <AppliedFilters
          items={[
            { label: 'Doctora', value: user?.name ?? '—' },
            { label: 'Sede', value: branchLabel },
            { label: 'Servicio', value: serviceName || 'Todos' },
            { label: 'Estado', value: statusLabel },
            { label: 'Agrupación', value: groupingLabel },
          ]}
        />

        <SectionTitle number="01" title="Resumen del periodo" />
        <SummaryCards>
          <SummaryCard
            label="Citas registradas"
            value={summary.total}
            trend={trendFromChange(percentChange(summary.total, previousSummary.total), '%', true)}
          />
          <SummaryCard
            label="Atendidas"
            value={summary.completed}
            trend={trendFromChange(percentChange(summary.completed, previousSummary.completed), '%', true)}
          />
          <SummaryCard
            label="Tasa de atención"
            value={summary.rate === null ? '—' : formatPercent(summary.rate)}
            trend={trendFromChange(rateChange === null ? null : Math.round(rateChange * 10) / 10, 'pp', true)}
            hint={branchRate === null ? 'sede: sin datos' : `sede: ${formatPercent(branchRate)}`}
          />
          <SummaryCard
            label="Canceladas"
            value={summary.cancelled}
            trend={trendFromChange(percentChange(summary.cancelled, previousSummary.cancelled), '%', false)}
          />
          <SummaryCard label="Sin cerrar" value={summary.unclosed} hint="por actualizar" />
        </SummaryCards>

        <SectionTitle
          number="02"
          title={grouping === 'monthly' ? 'Evolución mensual' : 'Evolución semanal'}
          aside={`Citas por ${grouping === 'monthly' ? 'mes' : 'semana'} según estado final`}
        />
        <div className="report-keep mt-3 grid grid-cols-[1.5fr_1fr] gap-6">
          <GroupedBarChart
            ariaLabel="Citas atendidas y canceladas por periodo"
            series={[
              { label: 'Atendidas', color: '#008F9F' },
              { label: 'Canceladas', color: '#C4165D' },
            ]}
            points={series.map((point) => ({ label: point.label, values: [point.completed, point.cancelled] }))}
          />
          <Readings items={readings} />
        </div>

        <SectionTitle number="03" title="Citas sin cerrar" aside="Requieren marcar «Atendida» o «Cancelada»" />
        <ReportTable
          head={[
            { label: 'Fecha', className: 'w-[16%]' },
            { label: 'Hora', className: 'w-[12%]' },
            { label: 'Paciente' },
            { label: 'Estado', className: 'w-[18%]' },
            { label: 'Atraso', className: 'w-[12%]' },
          ]}
        >
          {unclosedRows.length === 0 ? (
            <EmptyRow colSpan={5}>Todas sus citas pasadas del periodo tienen estado final.</EmptyRow>
          ) : (
            unclosedRows.map((row) => (
              <tr key={row.id} className={rowClass}>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{formatDmy(row.date)}</td>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{row.time}</td>
                <td className={cellClass}>{row.patientName}</td>
                <td className={cellClass}>
                  <StatusMark status={row.status} />
                </td>
                <td className={cellClass}>
                  <span className="rounded-[4px] bg-[#FDEEE3] px-1.5 py-[1px] text-[9px] font-medium text-[#B4561B]">
                    {row.delayDays} {row.delayDays === 1 ? 'día' : 'días'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </ReportTable>

        <SectionTitle
          number="04"
          title="Mis próximas citas"
          aside={`${upcoming.within30Days} programadas en los próximos 30 días · siguientes ${upcoming.rows.length}`}
        />
        <ReportTable
          head={[
            { label: 'Fecha', className: 'w-[13%]' },
            { label: 'Hora', className: 'w-[9%]' },
            { label: 'Paciente', className: 'w-[25%]' },
            { label: 'Servicio', className: 'w-[20%]' },
            { label: 'Motivo de consulta' },
            { label: 'Estado', className: 'w-[14%]' },
          ]}
        >
          {upcoming.rows.length === 0 ? (
            <EmptyRow colSpan={6}>No tiene citas programadas.</EmptyRow>
          ) : (
            upcoming.rows.map((row) => (
              <tr key={row.id} className={rowClass}>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{formatDmy(row.date)}</td>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{row.time}</td>
                <td className={cellClass}>{row.patientName}</td>
                <td className={cellClass}>{row.serviceName}</td>
                <td className={cellClass}>{row.reason}</td>
                <td className={cellClass}>
                  <StatusMark status={row.status} />
                </td>
              </tr>
            ))
          )}
        </ReportTable>

        <ReportNotes
          left={[
            'Tasa de atención = atendidas ÷ (atendidas + canceladas).',
            'Sin cerrar: citas pasadas que siguen pendientes, confirmadas o en sala.',
          ]}
          right={[
            'Alcance: solo citas asignadas a la profesional; el promedio de sede es referencial.',
            'No se muestran montos.',
          ]}
        />

        <ReportScreenFooter title="KristellDent · Reporte de mis citas · Nivel especialista" />
      </ReportSheet>
    </div>
  );
}

export default MyAppointmentsReportPage;
