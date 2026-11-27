import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import EmptyState from '../../../components/common/EmptyState';
import Spinner from '../../../components/common/Spinner';
import AdminReportToolbar from '../../../components/reports/AdminReportToolbar';
import {
  AppliedFilters,
  EmptyRow,
  Readings,
  ReportHeader,
  ReportScreenFooter,
  ReportSheet,
  ReportTable,
  ReportTitle,
  SectionTitle,
  cellClass,
  rowClass,
} from '../../../components/reports/ReportParts';
import {
  DefinitionsBlock,
  HBarList,
  HeroFacts,
  HeroStat,
  InlineBar,
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
import { formatGeneratedAt, reportRoleLabel } from '../../../utils/reports/agenda';
import { filterReportAppointments, formatDecimal, formatInteger, formatRate } from '../../../utils/reports/adminData';
import {
  demandBySpecialty,
  performanceBy,
  performanceReadings,
  performanceTotal,
  servicesRanking,
  summarizePerformance,
} from '../../../utils/reports/adminPerformance';
import { adminDocumentCode, adminReportScope, doctorSpecialty, doctorsInScope } from '../../../utils/reports/adminHeader';
import { formatComparisonRange, formatPeriodRange, percentChange, periodDays } from '../../../utils/reports/period';
import { trendFromChange } from '../../../utils/reports/reportHeader';

// Reporte de desempeño (catálogo de reportes): volumen de trabajo por doctora,
// especialidad y servicio. Las horas salen de la duración de cada servicio.
function PerformanceReportPage() {
  const { user } = useAuth();
  const data = useAdminReportData();
  // Cuenta atendidas y canceladas (para la cancelación): el estado no se filtra.
  const state = useAdminReportFilters('all');
  const { filters, previous, previousFilters, today } = state;
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
    return <EmptyState icon={Activity} title="No se pudo cargar el reporte" description={data.error} />;
  }

  const scope = adminReportScope({ isGlobal: data.isGlobal, branchId: filters.branchId, allowedBranches: data.allowedBranches });
  const doctors = doctorsInScope(data.professionals, data.allowedBranches.map((branch) => branch.id), filters.branchId);
  const periodRows = filterReportAppointments(data.rows, filters);
  const summary = summarizePerformance(periodRows);
  const previousSummary = summarizePerformance(filterReportAppointments(data.rows, previousFilters));
  const demand = demandBySpecialty(periodRows);
  const compareBranches = data.isGlobal && !filters.branchId;
  const specialtyOf = (professionalId: string) => doctorSpecialty(professionalById.get(professionalId), data.specialties);
  const doctorRows = performanceBy(
    periodRows,
    (row) => row.professionalId,
    (row) => `Dra. ${row.doctorName}`,
    (row) => (compareBranches ? row.branchName : specialtyOf(row.professionalId)),
  );
  const branchRows = performanceBy(periodRows, (row) => row.branchId, (row) => row.branchName);
  const total = performanceTotal(compareBranches ? 'Total clínica' : `Total ${scope.branchName ? `sede ${scope.branchName}` : ''}`, periodRows);
  const services = servicesRanking(periodRows);
  const readings = performanceReadings({ doctors: doctorRows, groups: compareBranches ? branchRows : doctorRows, services });
  const clinic = benchmarks.data;
  const clinicPerDoctor = clinic && clinic.doctors > 0 ? clinic.completed / clinic.doctors : null;
  const clinicHoursPerDoctor = clinic && clinic.doctors > 0 ? clinic.completedMinutes / 60 / clinic.doctors : null;
  const clinicMinutes = clinic && clinic.completed > 0 ? clinic.completedMinutes / clinic.completed : null;
  const maxService = Math.max(0, ...services.map((item) => item.attentions));
  const doctorLabel = doctors.find((doctor) => doctor.id === filters.professionalId)?.name ?? `Todas (${doctors.length})`;
  const specialtyLabel = data.specialties.find((item) => item.id === filters.specialtyId)?.name ?? 'Todas';
  const longest = [...services].sort((a, b) => b.minutes - a.minutes)[0];

  return (
    <div className="report-page flex flex-col gap-5">
      <AdminReportToolbar state={state} data={data} doctors={doctors} fileName={adminDocumentCode('REP-DES', scope.branchName, today)} />

      <ReportSheet report={`admin-desempeno-${scope.levelKey}`}>
        <ReportHeader
          branchLine={scope.branchLine}
          meta={[
            { label: 'Documento', value: <span className="font-mono text-ag-ink">{adminDocumentCode('REP-DES', scope.branchName, today)}</span> },
            { label: 'Generado', value: generatedAt },
            { label: 'Emitido por', value: user?.name ?? '—' },
            { label: 'Rol', value: user ? reportRoleLabel(user.role) : '—' },
          ]}
          scope={scope.scope}
        />

        <ReportTitle
          level={scope.level}
          title="Reporte de desempeño"
          subtitle={`Volumen de trabajo por doctora, especialidad y servicio en ${scope.place}.`}
          asideLabel="Periodo consultado"
          asideValue={formatPeriodRange(filters.from, filters.to)}
          asideHint={`${periodDays(filters.from, filters.to)} días · comparado con ${formatComparisonRange(previous.from, previous.to)}`}
        />

        <AppliedFilters
          items={[
            { label: 'Sede', value: scope.branchFilter },
            { label: 'Doctora', value: doctorLabel },
            { label: 'Especialidad', value: specialtyLabel },
            { label: 'Estado de cita', value: 'Atendida' },
          ]}
        />

        <SectionTitle number="01" title="Resumen del periodo" />
        <SummaryLayout
          hero={
            <HeroStat
              label="Horas clínicas atendidas"
              value={`${formatInteger(summary.hours)} h`}
              trend={trendFromChange(percentChange(summary.hours, previousSummary.hours), '%', true)}
              trendSuffix={`(${formatInteger(previousSummary.hours)} h antes)`}
            >
              <HeroFacts
                items={[
                  { value: formatInteger(summary.attentions), label: 'atenciones' },
                  { value: formatInteger(summary.doctors), label: summary.doctors === 1 ? 'doctora' : 'doctoras' },
                  ...(compareBranches ? [{ value: formatInteger(summary.branches), label: 'sedes' }] : []),
                ]}
              />
            </HeroStat>
          }
        >
          <StatCell
            label="Atenciones por doctora"
            value={formatDecimal(summary.attentionsPerDoctor)}
            trend={data.isGlobal ? trendFromChange(percentChange(summary.attentionsPerDoctor, previousSummary.attentionsPerDoctor), '%', true) : null}
            hint={data.isGlobal || clinicPerDoctor === null ? 'promedio del periodo' : `promedio clínica: ${formatDecimal(clinicPerDoctor)}`}
          />
          <StatCell
            label="Horas por doctora"
            value={`${formatDecimal(summary.hoursPerDoctor)} h`}
            hint={data.isGlobal || clinicHoursPerDoctor === null ? 'promedio del periodo' : `promedio clínica: ${formatDecimal(clinicHoursPerDoctor)} h`}
          />
          <StatCell
            label="Duración por atención"
            value={`${formatDecimal(summary.minutesPerAttention)} min`}
            hint={data.isGlobal || clinicMinutes === null ? 'según duración del servicio' : `clínica: ${formatDecimal(clinicMinutes)} min`}
          />
          <StatCell
            label="Mayor demanda"
            value={summary.topSpecialty ? `${summary.topSpecialty.share.toFixed(1)} %` : '—'}
            hint={summary.topSpecialty ? `${summary.topSpecialty.label} · de las atenciones` : 'sin atenciones'}
          />
        </SummaryLayout>

        <SectionTitle number="02" title="Demanda y lectura del periodo" aside="Citas atendidas en el periodo" />
        <div className="report-keep mt-3 grid grid-cols-[1.3fr_1fr] gap-6">
          <HBarList
            title="Demanda por especialidad"
            color="#C4165D"
            items={demand.map((item) => ({ label: item.label, value: item.value, display: formatInteger(item.value), share: item.share }))}
          />
          <Readings items={readings} />
        </div>

        <SectionTitle number="03" title={compareBranches ? 'Comparativo por sede' : 'Desempeño por doctora'} />
        {compareBranches ? (
          <ReportTable
            head={[
              { label: 'Sede', className: 'w-[18%]' },
              { label: 'Doctoras', className: 'text-right' },
              { label: 'Atenciones', className: 'text-right' },
              { label: 'Horas', className: 'text-right' },
              { label: 'Atenc. por doctora', className: 'text-right' },
              { label: 'Horas por doctora', className: 'text-right' },
              { label: 'Cancelación', className: 'text-right' },
            ]}
          >
            {branchRows.length === 0 ? (
              <EmptyRow colSpan={7}>No hay atenciones en el periodo.</EmptyRow>
            ) : (
              <>
                {branchRows.map((item) => (
                  <tr key={item.key} className={rowClass}>
                    <td className={`${cellClass} font-medium`}>{item.label}</td>
                    <td className={numCell}>{item.doctors}</td>
                    <td className={numCell}>{formatInteger(item.attentions)}</td>
                    <td className={numCell}>{formatDecimal(item.hours)}</td>
                    <td className={numCell}>{formatDecimal(item.attentionsPerDoctor)}</td>
                    <td className={numCell}>{formatDecimal(item.hoursPerDoctor)}</td>
                    <td className={numCell}>{formatRate(item.cancellation)}</td>
                  </tr>
                ))}
                <tr className={totalRowClass}>
                  <td className={cellClass}>{total.label}</td>
                  <td className={numCell}>{total.doctors}</td>
                  <td className={numCell}>{formatInteger(total.attentions)}</td>
                  <td className={numCell}>{formatDecimal(total.hours)}</td>
                  <td className={numCell}>{formatDecimal(total.attentionsPerDoctor)}</td>
                  <td className={numCell}>{formatDecimal(total.hoursPerDoctor)}</td>
                  <td className={numCell}>{formatRate(total.cancellation)}</td>
                </tr>
              </>
            )}
          </ReportTable>
        ) : (
          <>
            <DoctorPerformanceTable rows={doctorRows} total={total} detailLabel="Especialidad" />
            {longest && longest.minutes >= 60 && (
              <TableNote>
                {longest.label} eleva la duración promedio por atención: cada atención ocupa {longest.minutes} minutos de agenda.
              </TableNote>
            )}
          </>
        )}

        <SectionTitle
          number="04"
          title={compareBranches ? 'Ranking de servicios' : 'Ranking de servicios de la sede'}
          aside={`${services.length} servicios con atenciones`}
        />
        <ReportTable
          head={[
            { label: '#', className: 'w-[5%]' },
            { label: 'Servicio', className: 'w-[24%]' },
            { label: 'Especialidad', className: 'w-[19%]' },
            { label: 'Atenciones', className: 'text-right' },
            { label: '% del total', className: 'text-right' },
            { label: 'Duración', className: 'text-right' },
            { label: 'Horas', className: 'text-right' },
          ]}
        >
          {services.length === 0 ? (
            <EmptyRow colSpan={7}>No hay atenciones en el periodo.</EmptyRow>
          ) : (
            services.map((item, index) => (
              <tr key={item.label} className={rowClass}>
                <td className={`${cellClass} font-mono text-[9.5px] text-ag-label`}>{String(index + 1).padStart(2, '0')}</td>
                <td className={`${cellClass} font-medium`}>{item.label}</td>
                <td className={cellClass}>{item.specialty}</td>
                <td className={numCell}>
                  <InlineBar value={item.attentions} max={maxService} display={formatInteger(item.attentions)} />
                </td>
                <td className={numCell}>{item.share.toFixed(1)} %</td>
                <td className={numCell}>{item.minutes} min</td>
                <td className={numCell}>{formatDecimal(item.hours)}</td>
              </tr>
            ))
          )}
        </ReportTable>

        {compareBranches && (
          <>
            <SectionTitle number="05" title="Desempeño por doctora" aside="Ordenado por atenciones" />
            <DoctorPerformanceTable rows={doctorRows} detailLabel="Sede" />
          </>
        )}

        <DefinitionsBlock
          definitions={[
            ['Horas clínicas', 'Suma de la duración de cada servicio atendido (la guardada en la cita al reservar).'],
            ['Cancelación', 'Canceladas ÷ (atendidas + canceladas).'],
            ['Mayor demanda', 'Especialidad del servicio, no de la doctora.'],
            ...(data.isGlobal ? [] : ([['Promedio clínica', 'Referencia agregada, sin detalle de otras sedes.']] as [string, string][])),
          ]}
          sources={[
            data.isGlobal
              ? 'Fuente: citas «Atendidas» y duración de servicios del sistema KristellDent.'
              : 'Alcance: doctoras y citas de la sede asignada.',
            'Las horas son estimadas: el sistema no registra la hora real de inicio y fin.',
            'No incluye información económica (ver Reporte de ingresos).',
          ]}
        />

        <ReportScreenFooter title={`KristellDent · Reporte de desempeño · ${scope.level}`} />
      </ReportSheet>
    </div>
  );
}

function DoctorPerformanceTable({
  rows,
  total,
  detailLabel,
}: {
  rows: ReturnType<typeof performanceBy>;
  total?: ReturnType<typeof performanceTotal>;
  detailLabel: string;
}) {
  return (
    <ReportTable
      head={[
        { label: '#', className: 'w-[5%]' },
        { label: 'Doctora', className: 'w-[24%]' },
        { label: detailLabel, className: 'w-[17%]' },
        { label: 'Atenciones', className: 'text-right' },
        { label: 'Pacientes', className: 'text-right' },
        { label: 'Horas', className: 'text-right' },
        { label: 'Min/atenc.', className: 'text-right' },
        { label: 'Cancelación', className: 'text-right' },
      ]}
    >
      {rows.length === 0 ? (
        <EmptyRow colSpan={8}>No hay atenciones en el periodo.</EmptyRow>
      ) : (
        <>
          {rows.map((item, index) => (
            <tr key={item.key} className={rowClass}>
              <td className={`${cellClass} font-mono text-[9.5px] text-ag-label`}>{String(index + 1).padStart(2, '0')}</td>
              <td className={`${cellClass} font-medium`}>{item.label}</td>
              <td className={cellClass}>{item.detail}</td>
              <td className={numCell}>{formatInteger(item.attentions)}</td>
              <td className={numCell}>{formatInteger(item.patients)}</td>
              <td className={numCell}>{formatDecimal(item.hours)}</td>
              <td className={numCell}>{Math.round(item.minutesPerAttention)}</td>
              <td className={numCell}>{formatRate(item.cancellation)}</td>
            </tr>
          ))}
          {total && (
            <tr className={totalRowClass}>
              <td className={cellClass} />
              <td className={cellClass}>{total.label}</td>
              <td className={cellClass} />
              <td className={numCell}>{formatInteger(total.attentions)}</td>
              <td className={numCell}>{formatInteger(total.patients)}</td>
              <td className={numCell}>{formatDecimal(total.hours)}</td>
              <td className={numCell}>{Math.round(total.minutesPerAttention)}</td>
              <td className={numCell}>{formatRate(total.cancellation)}</td>
            </tr>
          )}
        </>
      )}
    </ReportTable>
  );
}

export default PerformanceReportPage;
