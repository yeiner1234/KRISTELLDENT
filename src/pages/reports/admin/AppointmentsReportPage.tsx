import { useMemo, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import EmptyState from '../../../components/common/EmptyState';
import Spinner from '../../../components/common/Spinner';
import AdminReportToolbar from '../../../components/reports/AdminReportToolbar';
import {
  AppliedFilters,
  EmptyRow,
  GroupedBarChart,
  ReportHeader,
  ReportScreenFooter,
  ReportSheet,
  ReportTable,
  ReportTitle,
  SectionTitle,
  StatusMark,
  cellClass,
  rowClass,
} from '../../../components/reports/ReportParts';
import {
  DefinitionsBlock,
  HBarList,
  HeroStat,
  InlineBar,
  StackedBar,
  StatCell,
  SummaryLayout,
  TableNote,
  numCell,
  totalRowClass,
} from '../../../components/reports/ReportBlocks';
import { useAuth } from '../../../hooks/useAuth';
import { useAdminReportData } from '../../../hooks/useAdminReportData';
import { useAdminReportFilters } from '../../../hooks/useAdminReportFilters';
import { useLoad } from '../../../hooks/useLoad';
import { getClinicBenchmarks, type ClinicBenchmarks } from '../../../services/reportService';
import { getLimaNowTime } from '../../../utils/date';
import { formatGeneratedAt, reportRoleLabel } from '../../../utils/reports/agenda';
import { filterReportAppointments, formatInteger, formatRate, matchesScope, rate, REPORT_STATUS_OPTIONS } from '../../../utils/reports/adminData';
import {
  attendedByWeekday,
  buildToConfirmRows,
  buildUnclosedReportRows,
  highestCancellationNote,
  specialtyStats,
  statsBy,
  summarizeAppointments,
  totalStats,
  unclosedConcentrationNote,
} from '../../../utils/reports/adminAppointments';
import { adminDocumentCode, adminReportScope, doctorSpecialty, doctorsInScope } from '../../../utils/reports/adminHeader';
import { buildAttendanceSeries } from '../../../utils/reports/myAppointments';
import {
  REPORT_GROUPING_OPTIONS,
  formatComparisonRange,
  formatDmy,
  formatPeriodRange,
  percentChange,
  periodBuckets,
  periodDays,
} from '../../../utils/reports/period';
import { trendFromChange } from '../../../utils/reports/reportHeader';

const UNCLOSED_LIMIT = 15;
const TO_CONFIRM_DAYS = 5;

// Reporte de citas (catálogo de reportes): la admin global ve todas las sedes
// y las compara; la admin de sede, solo la suya, por doctora y con el promedio
// de la clínica como referencia.
function AppointmentsReportPage() {
  const { user } = useAuth();
  const data = useAdminReportData();
  const state = useAdminReportFilters();
  const { filters, previous, previousFilters, today } = state;
  const [nowTime] = useState(getLimaNowTime);
  const [generatedAt] = useState(() => formatGeneratedAt(new Date()));
  const benchmarks = useLoad<ClinicBenchmarks | null>(
    data.isGlobal || !user ? null : `${filters.from}|${filters.to}`,
    () => getClinicBenchmarks({ from: filters.from, to: filters.to }),
    null,
    'No se pudo cargar el promedio de la clínica.',
  );

  const professionalById = useMemo(() => new Map(data.professionals.map((item) => [item.id, item])), [data.professionals]);

  if (data.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }
  if (data.error) {
    return <EmptyState icon={CalendarX2} title="No se pudo cargar el reporte" description={data.error} />;
  }

  const scope = adminReportScope({ isGlobal: data.isGlobal, branchId: filters.branchId, allowedBranches: data.allowedBranches });
  const doctors = doctorsInScope(data.professionals, data.allowedBranches.map((branch) => branch.id), filters.branchId);
  const periodRows = filterReportAppointments(data.rows, filters);
  const summary = summarizeAppointments(periodRows, today);
  const previousSummary = summarizeAppointments(filterReportAppointments(data.rows, previousFilters), today);
  const series = buildAttendanceSeries(periodRows, periodBuckets(filters.from, filters.to, state.grouping));
  const weekdays = attendedByWeekday(periodRows);
  const compareBranches = data.isGlobal && !filters.branchId;
  const groupStats = compareBranches
    ? statsBy(periodRows, (row) => row.branchId, (row) => row.branchName, today)
    : statsBy(periodRows, (row) => row.professionalId, (row) => `Dra. ${row.doctorName}`, today);
  const total = totalStats(compareBranches ? 'Total clínica' : `Total ${scope.branchName ? `sede ${scope.branchName}` : ''}`, periodRows, today);
  const specialties = specialtyStats(periodRows);
  const unclosedRows = buildUnclosedReportRows(periodRows, data.patients, today);
  const toConfirm = buildToConfirmRows(
    data.rows.filter((row) => matchesScope(row, filters)),
    data.patients,
    today,
    nowTime,
    TO_CONFIRM_DAYS,
  );

  const clinic = benchmarks.data;
  const clinicRate = clinic ? rate(clinic.completed, clinic.completed + clinic.cancelled) : null;
  const rateChange = (current: number | null, before: number | null) =>
    current === null || before === null ? null : Math.round((current - before) * 10) / 10;
  const maxRegistered = Math.max(0, ...groupStats.map((item) => item.registered));
  const maxSpecialty = Math.max(0, ...specialties.map((item) => item.completed));
  const statusLabel = REPORT_STATUS_OPTIONS.find((option) => option.value === filters.status)?.label ?? '';
  const groupingLabel = REPORT_GROUPING_OPTIONS.find((option) => option.value === state.grouping)?.label ?? '';
  const doctorLabel = doctors.find((doctor) => doctor.id === filters.professionalId)?.name ?? `Todas (${doctors.length})`;
  const specialtyLabel = data.specialties.find((item) => item.id === filters.specialtyId)?.name ?? 'Todas';
  const unclosedNote = compareBranches
    ? unclosedConcentrationNote(groupStats, summary.unclosed)
    : highestCancellationNote(groupStats);

  return (
    <div className="report-page flex flex-col gap-5">
      <AdminReportToolbar
        state={state}
        data={data}
        doctors={doctors}
        fileName={adminDocumentCode('REP-CIT', scope.branchName, today)}
        showStatus
        showGrouping
      />

      <ReportSheet report={`admin-citas-${scope.levelKey}`}>
        <ReportHeader
          branchLine={scope.branchLine}
          meta={[
            { label: 'Documento', value: <span className="font-mono text-ag-ink">{adminDocumentCode('REP-CIT', scope.branchName, today)}</span> },
            { label: 'Generado', value: generatedAt },
            { label: 'Emitido por', value: user?.name ?? '—' },
            { label: 'Rol', value: user ? reportRoleLabel(user.role) : '—' },
          ]}
          scope={scope.scope}
        />

        <ReportTitle
          level={scope.level}
          title="Reporte de citas"
          subtitle={`Actividad y estados de las citas registradas en ${scope.place} durante el periodo.`}
          asideLabel="Periodo consultado"
          asideValue={formatPeriodRange(filters.from, filters.to)}
          asideHint={`${periodDays(filters.from, filters.to)} días · comparado con ${formatComparisonRange(previous.from, previous.to)}`}
        />

        <AppliedFilters
          items={[
            { label: 'Sede', value: scope.branchFilter },
            { label: 'Doctora', value: doctorLabel },
            { label: 'Especialidad', value: specialtyLabel },
            { label: 'Estado', value: statusLabel },
            { label: 'Agrupación', value: groupingLabel },
          ]}
        />

        <SectionTitle number="01" title="Resumen del periodo" />
        <SummaryLayout
          hero={
            <HeroStat
              label="Citas registradas"
              value={formatInteger(summary.total)}
              trend={trendFromChange(percentChange(summary.total, previousSummary.total), '%', true)}
              trendSuffix={`(${formatInteger(previousSummary.total)} antes)`}
            >
              <StackedBar
                segments={[
                  { label: 'Atendidas', value: summary.completed, color: '#008F9F' },
                  { label: 'Canceladas', value: summary.cancelled, color: '#C4165D' },
                  { label: 'Sin cerrar', value: summary.unclosed, color: '#B8C2C8' },
                ]}
              />
            </HeroStat>
          }
        >
          <StatCell
            label="Tasa de atención"
            value={formatRate(summary.attendanceRate)}
            trend={trendFromChange(rateChange(summary.attendanceRate, previousSummary.attendanceRate), 'pp', true)}
            hint={data.isGlobal ? 'atendidas ÷ (atendidas + canceladas)' : `promedio clínica: ${formatRate(clinicRate)}`}
          />
          <StatCell
            label="Tasa de cancelación"
            value={formatRate(summary.cancellationRate)}
            trend={trendFromChange(rateChange(summary.cancellationRate, previousSummary.cancellationRate), 'pp', false)}
            hint={`${formatInteger(summary.cancelled)} citas canceladas`}
          />
          <StatCell
            label="Citas sin cerrar"
            value={formatInteger(summary.unclosed)}
            trend={trendFromChange(percentChange(summary.unclosed, previousSummary.unclosed), '%', false)}
            hint={data.isGlobal || !clinic ? 'fecha pasada sin estado final' : `de ${formatInteger(clinic.unclosed)} en la clínica`}
          />
          <StatCell
            label="Anticipación de reserva"
            value={summary.leadDays === null ? '—' : `${summary.leadDays.toFixed(1)} días`}
            hint="promedio entre la reserva y la cita"
          />
        </SummaryLayout>

        <SectionTitle
          number="02"
          title={state.grouping === 'monthly' ? 'Evolución mensual' : 'Evolución semanal'}
          aside="Citas por periodo según estado final"
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
          <HBarList
            title="Atendidas por día"
            items={weekdays.map((day) => ({ label: day.label, value: day.value, display: formatInteger(day.value) }))}
          />
        </div>

        <SectionTitle number="03" title={compareBranches ? 'Comparativo por sede' : 'Por doctora'} />
        <ReportTable
          head={[
            { label: compareBranches ? 'Sede' : 'Doctora', className: 'w-[22%]' },
            ...(compareBranches ? [] : [{ label: 'Especialidad', className: 'w-[17%]' }]),
            { label: 'Registradas', className: 'text-right' },
            { label: 'Atendidas', className: 'text-right' },
            { label: 'Canceladas', className: 'text-right' },
            { label: 'Sin cerrar', className: 'text-right' },
            { label: 'Atención', className: 'text-right' },
            ...(compareBranches ? [{ label: 'Cancelación', className: 'text-right' }] : []),
          ]}
        >
          {groupStats.length === 0 ? (
            <EmptyRow colSpan={7}>No hay citas en el periodo con estos filtros.</EmptyRow>
          ) : (
            <>
              {groupStats.map((item) => (
                <tr key={item.key} className={rowClass}>
                  <td className={`${cellClass} font-medium`}>{item.label}</td>
                  {!compareBranches && (
                    <td className={cellClass}>{doctorSpecialty(professionalById.get(item.key), data.specialties)}</td>
                  )}
                  <td className={numCell}>
                    {compareBranches ? <InlineBar value={item.registered} max={maxRegistered} display={formatInteger(item.registered)} /> : formatInteger(item.registered)}
                  </td>
                  <td className={numCell}>{formatInteger(item.completed)}</td>
                  <td className={numCell}>{formatInteger(item.cancelled)}</td>
                  <td className={numCell}>{formatInteger(item.unclosed)}</td>
                  <td className={numCell}>{formatRate(item.attendanceRate)}</td>
                  {compareBranches && <td className={numCell}>{formatRate(item.cancellationRate)}</td>}
                </tr>
              ))}
              <tr className={totalRowClass}>
                <td className={cellClass}>{total.label}</td>
                {!compareBranches && <td className={cellClass} />}
                <td className={numCell}>{formatInteger(total.registered)}</td>
                <td className={numCell}>{formatInteger(total.completed)}</td>
                <td className={numCell}>{formatInteger(total.cancelled)}</td>
                <td className={numCell}>{formatInteger(total.unclosed)}</td>
                <td className={numCell}>{formatRate(total.attendanceRate)}</td>
                {compareBranches && <td className={numCell}>{formatRate(total.cancellationRate)}</td>}
              </tr>
            </>
          )}
        </ReportTable>
        <TableNote>
          Registradas = atendidas + canceladas + sin cerrar (y las programadas que aún no llegan).
          {unclosedNote ? ` ${unclosedNote}` : ''}
        </TableNote>

        {data.isGlobal && (
          <>
            <SectionTitle number="04" title="Por especialidad" aside="Según la especialidad del servicio atendido" />
            <ReportTable
              head={[
                { label: 'Especialidad', className: 'w-[26%]' },
                { label: 'Atendidas', className: 'text-right' },
                { label: '% del total', className: 'text-right' },
                { label: 'Canceladas', className: 'text-right' },
                { label: 'Atención', className: 'text-right' },
                { label: 'Duración', className: 'text-right' },
              ]}
            >
              {specialties.length === 0 ? (
                <EmptyRow colSpan={6}>Sin atenciones en el periodo.</EmptyRow>
              ) : (
                specialties.map((item) => (
                  <tr key={item.key} className={rowClass}>
                    <td className={`${cellClass} font-medium`}>{item.label}</td>
                    <td className={numCell}>
                      <InlineBar value={item.completed} max={maxSpecialty} display={formatInteger(item.completed)} />
                    </td>
                    <td className={numCell}>{item.share.toFixed(1)} %</td>
                    <td className={numCell}>{formatInteger(item.cancelled)}</td>
                    <td className={numCell}>{formatRate(item.attendanceRate)}</td>
                    <td className={numCell}>{Math.round(item.avgDuration)} min</td>
                  </tr>
                ))
              )}
            </ReportTable>
          </>
        )}

        <SectionTitle
          number={data.isGlobal ? '05' : '04'}
          title="Citas sin cerrar · requieren actualización de estado"
          aside={`Al ${formatDmy(today)} · ${Math.min(unclosedRows.length, UNCLOSED_LIMIT)} de ${unclosedRows.length} · más antiguas primero`}
        />
        <ReportTable
          head={[
            { label: 'Fecha', className: 'w-[12%]' },
            { label: 'Hora', className: 'w-[8%]' },
            ...(compareBranches ? [{ label: 'Sede', className: 'w-[12%]' }] : []),
            { label: 'Paciente' },
            { label: 'Doctora', className: 'w-[24%]' },
            { label: 'Estado', className: 'w-[13%]' },
            { label: 'Atraso', className: 'w-[9%]' },
          ]}
        >
          {unclosedRows.length === 0 ? (
            <EmptyRow colSpan={7}>Todas las citas pasadas del periodo tienen estado final.</EmptyRow>
          ) : (
            unclosedRows.slice(0, UNCLOSED_LIMIT).map((row) => (
              <tr key={row.id} className={rowClass}>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{formatDmy(row.date)}</td>
                <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{row.time}</td>
                {compareBranches && <td className={cellClass}>{row.branchName}</td>}
                <td className={`${cellClass} font-medium`}>{row.patientName}</td>
                <td className={cellClass}>Dra. {row.doctorName}</td>
                <td className={cellClass}>
                  <StatusMark status={row.status} />
                </td>
                <td className={cellClass}>
                  <span
                    className={`rounded-[4px] px-1.5 py-[1px] text-[9px] font-medium ${
                      row.delayDays >= 45 ? 'bg-[#FBE1EB] text-[#A3124D]' : row.delayDays >= 20 ? 'bg-[#FDEEE3] text-[#B4561B]' : 'bg-[#EDF0F2] text-[#3E4C55]'
                    }`}
                  >
                    {row.delayDays} {row.delayDays === 1 ? 'día' : 'días'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </ReportTable>
        <TableNote>Una cita sin cerrar distorsiona las tasas del periodo: debe marcarse como «Atendida» o «Cancelada» desde la agenda.</TableNote>

        {!compareBranches && (
          <>
            <SectionTitle
              number={data.isGlobal ? '06' : '05'}
              title="Próximas citas por confirmar"
              aside={`Siguientes ${TO_CONFIRM_DAYS} días hábiles · estado «Pendiente»`}
            />
            <ReportTable
              head={[
                { label: 'Fecha', className: 'w-[12%]' },
                { label: 'Hora', className: 'w-[8%]' },
                { label: 'Paciente' },
                { label: 'Doctora', className: 'w-[24%]' },
                { label: 'Servicio', className: 'w-[20%]' },
                { label: 'Estado', className: 'w-[12%]' },
              ]}
            >
              {toConfirm.length === 0 ? (
                <EmptyRow colSpan={6}>No hay citas pendientes de confirmar en los próximos días.</EmptyRow>
              ) : (
                toConfirm.map((row) => (
                  <tr key={row.id} className={rowClass}>
                    <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{formatDmy(row.date)}</td>
                    <td className={`${cellClass} [font-variant-numeric:tabular-nums]`}>{row.time}</td>
                    <td className={`${cellClass} font-medium`}>{row.patientName}</td>
                    <td className={cellClass}>Dra. {row.doctorName}</td>
                    <td className={cellClass}>{row.serviceName}</td>
                    <td className={cellClass}>
                      <StatusMark status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </ReportTable>
            <TableNote>Confirmar por teléfono con 24 horas de anticipación reduce las cancelaciones de último momento.</TableNote>
          </>
        )}

        <DefinitionsBlock
          definitions={[
            ['Registradas', 'Citas con fecha dentro del periodo, en cualquier estado.'],
            ['Tasa de atención', 'Atendidas ÷ (atendidas + canceladas).'],
            ['Sin cerrar', 'Citas con fecha pasada que siguen «Pendiente», «Confirmada» o «En sala».'],
            ['Anticipación', 'Días entre el registro de la cita y su fecha.'],
          ]}
          sources={[
            data.isGlobal ? 'Fuente: tabla de citas del sistema KristellDent.' : 'Alcance: solo citas de la sede asignada a la administradora.',
            'El sistema no distingue cancelación de inasistencia: ambas se registran como «Cancelada».',
            ...(data.isGlobal ? [] : ['Promedio de la clínica solo como referencia, sin detalle de otras sedes.']),
            'Variaciones frente al periodo anterior de igual duración.',
          ]}
        />

        <ReportScreenFooter title={`KristellDent · Reporte de citas · ${scope.level}`} />
      </ReportSheet>
    </div>
  );
}

export default AppointmentsReportPage;
