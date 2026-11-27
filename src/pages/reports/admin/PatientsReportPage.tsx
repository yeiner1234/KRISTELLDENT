import { useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import EmptyState from '../../../components/common/EmptyState';
import Spinner from '../../../components/common/Spinner';
import AdminReportToolbar from '../../../components/reports/AdminReportToolbar';
import {
  AppliedFilters,
  EmptyRow,
  GroupedBarChart,
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
  DotScale,
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
import { getClinicBenchmarks, getPatientsFirstVisit, type ClinicBenchmarks } from '../../../services/reportService';
import { formatGeneratedAt, reportRoleLabel } from '../../../utils/reports/agenda';
import { formatInteger, formatRate, matchesScope, rate } from '../../../utils/reports/adminData';
import {
  FREQUENT_VISITS,
  frequentPatients,
  patientsBy,
  patientsReadings,
  patientsSeries,
  summarizePatients,
} from '../../../utils/reports/adminPatients';
import { adminDocumentCode, adminReportScope, doctorSpecialty, doctorsInScope } from '../../../utils/reports/adminHeader';
import {
  formatComparisonRange,
  formatDmy,
  formatPeriodRange,
  monthBuckets,
  percentChange,
  periodDays,
} from '../../../utils/reports/period';
import { trendFromChange } from '../../../utils/reports/reportHeader';

const DOCTORS_LIMIT = 10;
const FREQUENT_LIMIT = 10;

// Reporte de pacientes (catálogo de reportes, sin la lista de inactivos):
// atendidos, nuevos, recurrentes y frecuentes; la admin global compara sedes,
// la admin de sede ve su sede por doctora.
function PatientsReportPage() {
  const { user } = useAuth();
  const data = useAdminReportData();
  const state = useAdminReportFilters('completed');
  const { filters, previous, today } = state;
  const [generatedAt] = useState(() => formatGeneratedAt(new Date()));
  const firstVisits = useLoad(user?.id ?? null, getPatientsFirstVisit, new Map<string, string>(), 'No se pudo cargar el historial de los pacientes.');
  const benchmarks = useLoad<ClinicBenchmarks | null>(
    data.isGlobal || !user ? null : `${filters.from}|${filters.to}`,
    () => getClinicBenchmarks({ from: filters.from, to: filters.to }),
    null,
    'No se pudo cargar el promedio de la clínica.',
  );
  const professionalById = useMemo(() => new Map(data.professionals.map((item) => [item.id, item])), [data.professionals]);

  if (data.isLoading || firstVisits.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }
  const loadError = data.error ?? firstVisits.error;
  if (loadError) {
    return <EmptyState icon={UsersRound} title="No se pudo cargar el reporte" description={loadError} />;
  }

  const scope = adminReportScope({ isGlobal: data.isGlobal, branchId: filters.branchId, allowedBranches: data.allowedBranches });
  const doctors = doctorsInScope(data.professionals, data.allowedBranches.map((branch) => branch.id), filters.branchId);
  // Sin periodo: el pasado decide quién es recurrente o frecuente.
  const scopeRows = data.rows.filter((row) => matchesScope(row, filters));
  const period = { from: filters.from, to: filters.to };
  const summary = summarizePatients(scopeRows, period, firstVisits.data);
  const previousSummary = summarizePatients(scopeRows, previous, firstVisits.data);
  const series = patientsSeries(
    scopeRows.filter((row) => row.date >= filters.from && row.date <= filters.to),
    monthBuckets(filters.from, filters.to),
    firstVisits.data,
  );
  const compareBranches = data.isGlobal && !filters.branchId;
  const branchGroups = compareBranches
    ? patientsBy(scopeRows, period, (row) => row.branchId, (row) => row.branchName, { firstVisits: firstVisits.data, newInGroup: true })
    : [];
  const doctorGroups = patientsBy(scopeRows, period, (row) => row.professionalId, (row) => `Dra. ${row.doctorName}`, {
    firstVisits: firstVisits.data,
    newInGroup: false,
    detailOf: (row) => doctorSpecialty(professionalById.get(row.professionalId), data.specialties),
  });
  const frequent = frequentPatients(scopeRows, data.patients, filters.to);
  const clinic = benchmarks.data;
  const clinicRecurrence = clinic ? rate(clinic.patientsRecurrent, clinic.patientsAttended) : null;
  const readings = patientsReadings({
    summary,
    series,
    clinicRecurrence,
    groups: compareBranches ? branchGroups : doctorGroups,
    isBranchLevel: !data.isGlobal,
  });
  const percentOf = (count: number) => (summary.attended === 0 ? 0 : Math.round((count / summary.attended) * 100));
  const doctorLabel = doctors.find((doctor) => doctor.id === filters.professionalId)?.name ?? `Todas (${doctors.length})`;
  const specialtyLabel = data.specialties.find((item) => item.id === filters.specialtyId)?.name ?? 'Todas';
  const groupSum = (compareBranches ? branchGroups : doctorGroups).reduce((sum, group) => sum + group.attended, 0);
  const maxAttended = Math.max(0, ...branchGroups.map((group) => group.attended));
  const doctorsSection = compareBranches ? '04' : '03';
  const frequentSection = compareBranches ? '05' : '04';

  return (
    <div className="report-page flex flex-col gap-5">
      <AdminReportToolbar state={state} data={data} doctors={doctors} fileName={adminDocumentCode('REP-PAC', scope.branchName, today)} />

      <ReportSheet report={`admin-pacientes-${scope.levelKey}`}>
        <ReportHeader
          branchLine={scope.branchLine}
          meta={[
            { label: 'Documento', value: <span className="font-mono text-ag-ink">{adminDocumentCode('REP-PAC', scope.branchName, today)}</span> },
            { label: 'Generado', value: generatedAt },
            { label: 'Emitido por', value: user?.name ?? '—' },
            { label: 'Rol', value: user ? reportRoleLabel(user.role) : '—' },
          ]}
          scope={scope.scope}
        />

        <ReportTitle
          level={scope.level}
          title="Reporte de pacientes"
          subtitle={`Registro, recurrencia y frecuencia de los pacientes atendidos en ${scope.place}.`}
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
            { label: 'Agrupación', value: 'Mensual' },
          ]}
        />

        <SectionTitle number="01" title="Resumen del periodo" />
        <SummaryLayout
          hero={
            <HeroStat
              label="Pacientes atendidos"
              value={formatInteger(summary.attended)}
              trend={trendFromChange(percentChange(summary.attended, previousSummary.attended), '%', true)}
              trendSuffix={`(${formatInteger(previousSummary.attended)} antes)`}
            >
              <StackedBar
                segments={[
                  { label: 'Nuevos', value: summary.newCount, color: '#C4165D' },
                  { label: 'Recurrentes', value: summary.recurrentCount, color: '#008F9F' },
                ]}
              />
            </HeroStat>
          }
        >
          <StatCell
            label="Nuevos"
            value={formatInteger(summary.newCount)}
            trend={trendFromChange(percentChange(summary.newCount, previousSummary.newCount), '%', true)}
            hint={`primera atención · ${percentOf(summary.newCount)} %`}
          />
          <StatCell
            label="Recurrentes"
            value={formatInteger(summary.recurrentCount)}
            trend={trendFromChange(percentChange(summary.recurrentCount, previousSummary.recurrentCount), '%', true)}
            hint="con atenciones previas"
          />
          <StatCell
            label="Frecuentes"
            value={formatInteger(summary.frequentCount)}
            trend={trendFromChange(percentChange(summary.frequentCount, previousSummary.frequentCount), '%', true)}
            hint={`${FREQUENT_VISITS} o más atenciones en 12 meses`}
          />
          <StatCell
            label="Citas por paciente"
            value={summary.appointmentsPerPatient.toFixed(2)}
            hint={data.isGlobal || !clinic || clinic.patientsAttended === 0 ? 'promedio del periodo' : `clínica: ${(clinic.completed / clinic.patientsAttended).toFixed(2)}`}
          />
        </SummaryLayout>

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

        {compareBranches && (
          <>
            <SectionTitle number="03" title="Comparativo por sede" />
            <ReportTable
              head={[
                { label: 'Sede', className: 'w-[20%]' },
                { label: 'Atendidos', className: 'text-right' },
                { label: 'Nuevos', className: 'text-right' },
                { label: 'Recurrentes', className: 'text-right' },
                { label: 'Recurrencia', className: 'text-right' },
                { label: 'Frecuentes', className: 'text-right' },
              ]}
            >
              {branchGroups.length === 0 ? (
                <EmptyRow colSpan={6}>No hay pacientes atendidos en el periodo.</EmptyRow>
              ) : (
                <>
                  {branchGroups.map((group) => (
                    <tr key={group.key} className={rowClass}>
                      <td className={`${cellClass} font-medium`}>{group.label}</td>
                      <td className={numCell}>
                        <InlineBar value={group.attended} max={maxAttended} display={formatInteger(group.attended)} />
                      </td>
                      <td className={numCell}>{formatInteger(group.newCount)}</td>
                      <td className={numCell}>{formatInteger(group.recurrentCount)}</td>
                      <td className={numCell}>{formatRate(group.recurrence)}</td>
                      <td className={numCell}>{formatInteger(group.frequentCount)}</td>
                    </tr>
                  ))}
                  <tr className={totalRowClass}>
                    <td className={cellClass}>
                      Total clínica <span className="font-normal text-ag-label">(pacientes únicos)</span>
                    </td>
                    <td className={numCell}>{formatInteger(summary.attended)}</td>
                    <td className={numCell}>{formatInteger(summary.newCount)}</td>
                    <td className={numCell}>{formatInteger(summary.recurrentCount)}</td>
                    <td className={numCell}>{formatRate(rate(summary.recurrentCount, summary.attended))}</td>
                    <td className={numCell}>{formatInteger(summary.frequentCount)}</td>
                  </tr>
                </>
              )}
            </ReportTable>
            {groupSum > summary.attended && (
              <TableNote>
                Un paciente atendido en más de una sede se cuenta en cada una; por eso la suma por sede ({formatInteger(groupSum)}) supera el
                total de pacientes únicos ({formatInteger(summary.attended)}). En cada sede, «nuevo» es su primera atención en esa sede.
              </TableNote>
            )}
          </>
        )}

        <SectionTitle
          number={doctorsSection}
          title="Desglose por doctora"
          aside={`Ordenado por pacientes atendidos · ${Math.min(doctorGroups.length, DOCTORS_LIMIT)} de ${doctorGroups.length}`}
        />
        <ReportTable
          head={[
            { label: '#', className: 'w-[5%]' },
            { label: 'Doctora', className: 'w-[25%]' },
            { label: 'Especialidad', className: 'w-[18%]' },
            { label: 'Sede', className: 'w-[13%]' },
            { label: 'Atendidos', className: 'text-right' },
            { label: 'Nuevos', className: 'text-right' },
            { label: 'Recurrentes', className: 'text-right' },
            { label: 'Frecuentes', className: 'text-right' },
          ]}
        >
          {doctorGroups.length === 0 ? (
            <EmptyRow colSpan={8}>No hay pacientes atendidos en el periodo.</EmptyRow>
          ) : (
            doctorGroups.slice(0, DOCTORS_LIMIT).map((group, index) => (
              <tr key={group.key} className={rowClass}>
                <td className={`${cellClass} font-mono text-[9.5px] text-ag-label`}>{String(index + 1).padStart(2, '0')}</td>
                <td className={`${cellClass} font-medium`}>{group.label}</td>
                <td className={`${cellClass} truncate`}>{group.detail}</td>
                <td className={cellClass}>{group.branchName}</td>
                <td className={numCell}>{formatInteger(group.attended)}</td>
                <td className={numCell}>{formatInteger(group.newCount)}</td>
                <td className={numCell}>{formatInteger(group.recurrentCount)}</td>
                <td className={numCell}>{formatInteger(group.frequentCount)}</td>
              </tr>
            ))
          )}
        </ReportTable>
        {doctorGroups.length > 1 && (
          <TableNote>Un paciente atendido por dos doctoras se cuenta en cada una.</TableNote>
        )}

        <SectionTitle
          number={frequentSection}
          title="Pacientes frecuentes"
          aside={`${FREQUENT_VISITS} o más atenciones en los últimos 12 meses · ${Math.min(frequent.length, FREQUENT_LIMIT)} de ${frequent.length}`}
        />
        <ReportTable
          head={[
            { label: '#', className: 'w-[5%]' },
            { label: 'Paciente', className: 'w-[25%]' },
            { label: 'DNI', className: 'w-[11%]' },
            ...(compareBranches ? [{ label: 'Sede', className: 'w-[12%]' }] : []),
            { label: 'Doctora tratante' },
            { label: 'Atenciones 12 m', className: 'w-[17%] text-right' },
            { label: 'Última atención', className: 'w-[13%] text-right' },
          ]}
        >
          {frequent.length === 0 ? (
            <EmptyRow colSpan={7}>No hay pacientes frecuentes con estos filtros.</EmptyRow>
          ) : (
            frequent.slice(0, FREQUENT_LIMIT).map((patient, index) => (
              <tr key={patient.patientId} className={rowClass}>
                <td className={`${cellClass} font-mono text-[9.5px] text-ag-label`}>{String(index + 1).padStart(2, '0')}</td>
                <td className={`${cellClass} font-medium`}>{patient.patientName}</td>
                <td className={`${cellClass} font-mono text-[10px]`}>{patient.maskedDni}</td>
                {compareBranches && <td className={cellClass}>{patient.branchName}</td>}
                <td className={cellClass}>Dra. {patient.doctorName}</td>
                <td className={numCell}>
                  <DotScale value={patient.visits} />
                </td>
                <td className={numCell}>{formatDmy(patient.lastAttention)}</td>
              </tr>
            ))
          )}
        </ReportTable>
        <TableNote>El DNI se muestra enmascarado en la versión impresa.</TableNote>

        <DefinitionsBlock
          definitions={[
            ['Paciente nuevo', 'Su primera cita atendida en la clínica (o en la sede, en el comparativo por sede) ocurre dentro del periodo.'],
            ['Paciente recurrente', 'Atendido en el periodo y con al menos una cita atendida anterior.'],
            ['Paciente frecuente', `${FREQUENT_VISITS} o más citas atendidas en los 12 meses previos al cierre del periodo.`],
          ]}
          sources={[
            data.isGlobal ? 'Fuente: citas con estado «Atendida» del sistema KristellDent.' : 'Alcance: solo pacientes atendidos en la sede asignada.',
            'Variaciones frente al periodo anterior de igual duración.',
            'Datos personales tratados según la Ley N.° 29733.',
          ]}
        />

        <ReportScreenFooter title={`KristellDent · Reporte de pacientes · ${scope.level}`} />
      </ReportSheet>
    </div>
  );
}

export default PatientsReportPage;
