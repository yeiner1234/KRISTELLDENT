import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
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
  cellClass,
  rowClass,
} from '../../../components/reports/ReportParts';
import {
  Banner,
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
import { getLimaNowTime } from '../../../utils/date';
import { formatGeneratedAt, reportRoleLabel } from '../../../utils/reports/agenda';
import { filterReportAppointments, formatInteger, formatMoney, formatMoneyShort, matchesScope } from '../../../utils/reports/adminData';
import { revenueBy, revenueReadings, revenueSeries, summarizeRevenue, type RevenueRow } from '../../../utils/reports/adminRevenue';
import { adminDocumentCode, adminReportScope, doctorSpecialty, doctorsInScope } from '../../../utils/reports/adminHeader';
import { formatComparisonRange, formatPeriodRange, monthBuckets, percentChange, periodDays } from '../../../utils/reports/period';
import { trendFromChange } from '../../../utils/reports/reportHeader';

// Reporte de ingresos (catálogo de reportes, solo administración): ingreso
// estimado de las atenciones con el precio guardado en cada cita al reservar.
function RevenueReportPage() {
  const { user } = useAuth();
  const data = useAdminReportData();
  // Atendidas para el ingreso y canceladas para lo no realizado.
  const state = useAdminReportFilters('all');
  const { filters, previous, previousFilters, today } = state;
  const [nowTime] = useState(getLimaNowTime);
  const [generatedAt] = useState(() => formatGeneratedAt(new Date()));
  const professionalById = useMemo(() => new Map(data.professionals.map((item) => [item.id, item])), [data.professionals]);

  if (data.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={28} />
      </div>
    );
  }
  if (data.error) {
    return <EmptyState icon={Wallet} title="No se pudo cargar el reporte" description={data.error} />;
  }

  const scope = adminReportScope({ isGlobal: data.isGlobal, branchId: filters.branchId, allowedBranches: data.allowedBranches });
  const doctors = doctorsInScope(data.professionals, data.allowedBranches.map((branch) => branch.id), filters.branchId);
  const periodRows = filterReportAppointments(data.rows, filters);
  const scopeRows = data.rows.filter((row) => matchesScope(row, filters));
  const summary = summarizeRevenue(periodRows, scopeRows, today, nowTime);
  const previousSummary = summarizeRevenue(filterReportAppointments(data.rows, previousFilters), [], today, nowTime);
  const series = revenueSeries(periodRows, monthBuckets(filters.from, filters.to));
  const compareBranches = data.isGlobal && !filters.branchId;
  const byBranch = revenueBy(periodRows, (row) => row.branchId, (row) => row.branchName);
  const bySpecialty = revenueBy(periodRows, (row) => row.specialtyName, (row) => row.specialtyName);
  const byDoctor = revenueBy(
    periodRows,
    (row) => row.professionalId,
    (row) => `Dra. ${row.doctorName}`,
    (row) => (compareBranches ? row.branchName : doctorSpecialty(professionalById.get(row.professionalId), data.specialties)),
  );
  const byService = revenueBy(periodRows, (row) => row.serviceLabel, (row) => row.serviceLabel, (row) => row.specialtyName);
  const readings = revenueReadings({ byService, summary });
  const doctorLabel = doctors.find((doctor) => doctor.id === filters.professionalId)?.name ?? `Todas (${doctors.length})`;
  const specialtyLabel = data.specialties.find((item) => item.id === filters.specialtyId)?.name ?? 'Todas';
  const distribution = compareBranches ? byBranch : bySpecialty;
  const totalLabel = compareBranches ? 'Total clínica' : `Total ${scope.branchName ? `sede ${scope.branchName}` : ''}`;

  return (
    <div className="report-page flex flex-col gap-5">
      <AdminReportToolbar state={state} data={data} doctors={doctors} fileName={adminDocumentCode('REP-ING', scope.branchName, today)} />

      <ReportSheet report={`admin-ingresos-${scope.levelKey}`}>
        <ReportHeader
          branchLine={scope.branchLine}
          meta={[
            { label: 'Documento', value: <span className="font-mono text-ag-ink">{adminDocumentCode('REP-ING', scope.branchName, today)}</span> },
            { label: 'Generado', value: generatedAt },
            { label: 'Emitido por', value: user?.name ?? '—' },
            { label: 'Rol', value: user ? reportRoleLabel(user.role) : '—' },
          ]}
          scope={scope.scope}
        />

        <ReportTitle
          level={scope.level}
          title="Reporte de ingresos"
          subtitle={`Ingresos estimados de las atenciones realizadas en ${scope.place}.`}
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
            { label: 'Moneda', value: 'Soles (S/)' },
          ]}
        />

        <Banner>
          <strong>Cifras estimadas:</strong> citas atendidas × precio guardado en la cita al reservar. No reemplazan la caja ni los
          comprobantes emitidos.
        </Banner>

        <SectionTitle number="01" title="Resumen del periodo" />
        <SummaryLayout
          hero={
            <HeroStat
              label="Ingreso estimado"
              value={formatMoney(summary.income)}
              trend={trendFromChange(percentChange(summary.income, previousSummary.income), '%', true)}
              trendSuffix={`(${formatMoney(previousSummary.income)} antes)`}
            >
              <HeroFacts items={[{ value: formatInteger(summary.attentions), label: 'atenciones valorizadas' }]} />
            </HeroStat>
          }
        >
          <StatCell
            label="Ticket promedio"
            value={formatMoney(summary.ticket)}
            trend={trendFromChange(percentChange(summary.ticket, previousSummary.ticket), '%', true)}
            hint="por atención"
          />
          <StatCell
            label="No realizado por cancelación"
            value={formatMoney(summary.notRealized)}
            trend={trendFromChange(percentChange(summary.notRealized, previousSummary.notRealized), '%', false)}
            hint={`${formatInteger(summary.cancelledCount)} citas canceladas`}
          />
          <StatCell
            label="Proyectado próximos 30 días"
            value={formatMoney(summary.projected)}
            hint={`${formatInteger(summary.projectedCount)} citas programadas`}
          />
          <StatCell
            label="Mayor aporte"
            value={summary.topSpecialty ? `${summary.topSpecialty.share.toFixed(1)} %` : '—'}
            hint={summary.topSpecialty ? `${summary.topSpecialty.label} · del ingreso` : 'sin atenciones'}
          />
        </SummaryLayout>

        <SectionTitle number="02" title="Evolución y distribución" />
        <div className="report-keep mt-3 grid grid-cols-[1.4fr_1fr] gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ag-ink">Ingreso estimado por mes</p>
            <GroupedBarChart
              ariaLabel="Ingreso estimado por mes"
              series={[{ label: 'Ingreso', color: '#008F9F' }]}
              points={series.map((point) => ({ label: point.label, values: [point.value] }))}
              formatValue={formatMoneyShort}
              showLegend={false}
            />
          </div>
          <HBarList
            title={compareBranches ? 'Por sede' : 'Por especialidad'}
            color={compareBranches ? '#008F9F' : '#C4165D'}
            items={distribution.map((item) => ({
              label: item.label,
              value: item.income,
              display: `S/ ${formatMoneyShort(item.income)}`,
              share: item.share,
            }))}
          />
        </div>

        <SectionTitle number="03" title={compareBranches ? 'Por especialidad' : 'Por doctora'} />
        {compareBranches ? (
          <RevenueTable rows={bySpecialty} firstLabel="Especialidad" totalLabel={totalLabel} summary={summary} />
        ) : (
          <RevenueTable rows={byDoctor} firstLabel="Doctora" detailLabel="Especialidad" totalLabel={totalLabel} summary={summary} />
        )}

        <SectionTitle number="04" title="Por servicio" aside="Ordenado por ingreso estimado" />
        <ReportTable
          head={[
            { label: '#', className: 'w-[5%]' },
            { label: 'Servicio', className: 'w-[24%]' },
            { label: 'Especialidad', className: 'w-[19%]' },
            { label: 'Precio vigente', className: 'text-right' },
            { label: 'Atenciones', className: 'text-right' },
            { label: 'Ingreso', className: 'text-right' },
            { label: '%', className: 'text-right' },
          ]}
        >
          {byService.length === 0 ? (
            <EmptyRow colSpan={7}>No hay atenciones valorizadas en el periodo.</EmptyRow>
          ) : (
            byService.map((item, index) => (
              <tr key={item.key} className={rowClass}>
                <td className={`${cellClass} font-mono text-[9.5px] text-ag-label`}>{String(index + 1).padStart(2, '0')}</td>
                <td className={`${cellClass} font-medium`}>{item.label}</td>
                <td className={cellClass}>{item.detail}</td>
                <td className={numCell}>{item.listPrice === null ? '—' : formatMoney(item.listPrice)}</td>
                <td className={numCell}>{formatInteger(item.attentions)}</td>
                <td className={numCell}>{formatMoney(item.income)}</td>
                <td className={numCell}>{item.share.toFixed(1)} %</td>
              </tr>
            ))
          )}
        </ReportTable>
        {readings.length > 0 && <TableNote>{readings.join(' ')}</TableNote>}

        {compareBranches && (
          <>
            <SectionTitle number="05" title="Por doctora" aside="Ordenado por ingreso estimado" />
            <RevenueTable rows={byDoctor} firstLabel="Doctora" detailLabel="Sede" numbered />
          </>
        )}

        <DefinitionsBlock
          definitions={[
            ['Ingreso estimado', 'Citas atendidas × precio guardado en la cita al reservar (o el vigente si la cita no lo tiene).'],
            ['No realizado', 'Citas canceladas × su precio.'],
            ['Proyectado', 'Citas pendientes o confirmadas de los próximos 30 días × su precio.'],
          ]}
          sources={[
            ...(data.isGlobal ? [] : ['Alcance: solo la sede asignada a la administradora.']),
            'Exclusivo de administradores: no visible para especialistas ni técnicas.',
            'El precio queda guardado en la cita: un cambio de tarifa no altera las cifras pasadas.',
            'Recomendado: registrar los pagos para pasar de estimado a real.',
          ]}
        />

        <ReportScreenFooter title={`KristellDent · Reporte de ingresos · ${scope.level}`} />
      </ReportSheet>
    </div>
  );
}

function RevenueTable({
  rows,
  firstLabel,
  detailLabel,
  totalLabel,
  summary,
  numbered = false,
}: {
  rows: RevenueRow[];
  firstLabel: string;
  detailLabel?: string;
  totalLabel?: string;
  summary?: { attentions: number; income: number; ticket: number };
  numbered?: boolean;
}) {
  const maxIncome = Math.max(0, ...rows.map((item) => item.income));
  const columns = (numbered ? 1 : 0) + (detailLabel ? 1 : 0) + 5;
  return (
    <ReportTable
      head={[
        ...(numbered ? [{ label: '#', className: 'w-[5%]' }] : []),
        { label: firstLabel, className: 'w-[25%]' },
        ...(detailLabel ? [{ label: detailLabel, className: 'w-[17%]' }] : []),
        { label: 'Atenciones', className: 'text-right' },
        { label: 'Ingreso estimado', className: 'text-right' },
        { label: 'Ticket', className: 'text-right' },
        { label: '%', className: 'text-right' },
      ]}
    >
      {rows.length === 0 ? (
        <EmptyRow colSpan={columns}>No hay atenciones valorizadas en el periodo.</EmptyRow>
      ) : (
        <>
          {rows.map((item, index) => (
            <tr key={item.key} className={rowClass}>
              {numbered && (
                <td className={`${cellClass} font-mono text-[9.5px] text-ag-label`}>{String(index + 1).padStart(2, '0')}</td>
              )}
              <td className={`${cellClass} font-medium`}>{item.label}</td>
              {detailLabel && <td className={cellClass}>{item.detail}</td>}
              <td className={numCell}>{formatInteger(item.attentions)}</td>
              <td className={numCell}>
                {numbered ? formatMoney(item.income) : <InlineBar value={item.income} max={maxIncome} display={formatMoney(item.income)} />}
              </td>
              <td className={numCell}>{formatMoney(item.ticket)}</td>
              <td className={numCell}>{item.share.toFixed(1)} %</td>
            </tr>
          ))}
          {summary && totalLabel && (
            <tr className={totalRowClass}>
              <td className={cellClass}>{totalLabel}</td>
              {detailLabel && <td className={cellClass} />}
              <td className={numCell}>{formatInteger(summary.attentions)}</td>
              <td className={numCell}>{formatMoney(summary.income)}</td>
              <td className={numCell}>{formatMoney(summary.ticket)}</td>
              <td className={numCell}>100.0 %</td>
            </tr>
          )}
        </>
      )}
    </ReportTable>
  );
}

export default RevenueReportPage;
