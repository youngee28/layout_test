import {
  buildCandidateBarData,
  buildCandidateGroupedBarData,
  buildCandidateKpiValue,
  buildCandidateLineData,
  buildCandidatePieData,
  buildCandidateScatterData,
  formatValue,
  resolveCandidateTable,
} from "@/components/canvas/candidate-select/candidate_chart_data";
import type { DashboardCandidateBlock } from "@/schema/dashboard_candidate";
import type { ResolvedTable } from "@/schema/resolved_table";

type CandidateBlockRendererProps = {
  block: DashboardCandidateBlock;
  resolvedTables: ResolvedTable[];
};

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
];

export function CandidateBlockRenderer({
  block,
  resolvedTables,
}: CandidateBlockRendererProps) {
  const table = resolveCandidateTable(block, resolvedTables);

  if (!table) {
    return <UnboundBlock block={block} />;
  }

  if (block.type === "metric" || block.chartType === "kpi") {
    return <KpiBlock block={block} table={table} />;
  }

  switch (block.chartType) {
    case "line":
      return <LineBlock block={block} table={table} />;
    case "scatter":
      return <ScatterBlock block={block} table={table} />;
    case "bar":
    case "verticalBar":
    case "rankingBar":
      return <VerticalBarBlock block={block} table={table} />;
    case "horizontalBar":
      return <HorizontalBarBlock block={block} table={table} />;
    case "groupedBar":
      return <GroupedBarBlock block={block} table={table} />;
    case "pie":
      return <PieBlock block={block} table={table} />;
    case "donut":
      return <DonutBlock block={block} table={table} />;
    default:
      return <UnsupportedBlock block={block} />;
  }
}

function UnboundBlock({ block }: { block: DashboardCandidateBlock }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
      <p className="text-[10px] font-semibold text-[var(--text-primary)]">{block.title}</p>
      <p className="text-[9px] text-[var(--text-secondary)]">연결된 테이블 없음</p>
    </div>
  );
}

function UnsupportedBlock({ block }: { block: DashboardCandidateBlock }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
      <p className="text-[10px] font-semibold text-[var(--text-primary)]">{block.title}</p>
      <p className="text-[9px] text-[var(--text-secondary)]">{block.chartType ?? block.type} 미리보기 준비중</p>
    </div>
  );
}

function KpiBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const result = buildCandidateKpiValue(block, table);

  if (!result) {
    return <UnsupportedBlock block={block} />;
  }

  return (
    <div className="flex h-full flex-col justify-center gap-1 px-3">
      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
        {block.title}
      </p>
      <p className="truncate text-2xl font-bold text-[var(--text-primary)]">
        {formatValue(result.value)}
      </p>
      <p className="truncate text-[9px] text-[var(--text-secondary)]">{result.label}</p>
    </div>
  );
}

function VerticalBarBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const isRanking = block.chartType === "rankingBar";
  const data = buildCandidateBarData(block, table, {
    sortBy: isRanking ? "value" : "none",
    maxItems: 6,
  });

  if (data.length === 0) {
    return <UnsupportedBlock block={block} />;
  }

  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const chartHeight = 80;
  const chartWidth = 160;
  const barGap = 4;
  const barWidth = Math.max(12, (chartWidth - barGap * (data.length - 1)) / data.length);
  const viewBoxHeight = 100;

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 truncate px-2 pt-1 text-[9px] font-semibold text-[var(--text-primary)]">
        {block.title}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${viewBoxHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
            const x = index * (barWidth + barGap);
            const y = chartHeight - barHeight + 16;

            return (
              <g key={item.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  fill="var(--accent)"
                  opacity={0.85}
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="7"
                  fill="var(--text-secondary)"
                >
                  {formatValue(item.value)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 26}
                  textAnchor="middle"
                  fontSize="6"
                  fill="var(--text-secondary)"
                >
                  {item.label.length > 6 ? `${item.label.slice(0, 5)}…` : item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function LineBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const data = buildCandidateLineData(block, table);

  if (data.length < 2) {
    return <UnsupportedBlock block={block} />;
  }

  const chartWidth = 160;
  const chartHeight = 80;
  const paddingBottom = 20;
  const viewBoxHeight = chartHeight + paddingBottom;
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const minValue = Math.min(...data.map((item) => item.value), 0);
  const domainSpan = Math.max(maxValue - minValue, 1);

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((item.value - minValue) / domainSpan) * chartHeight;
    return { x, y, item };
  });

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 truncate px-2 pt-1 text-[9px] font-semibold text-[var(--text-primary)]">
        {block.title}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${viewBoxHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <g key={point.item.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r={2.5}
                fill="var(--accent)"
                stroke="var(--surface-panel)"
                strokeWidth={1}
              />
              {index % Math.max(1, Math.floor(data.length / 3)) === 0 ? (
                <text
                  x={point.x}
                  y={chartHeight + 12}
                  textAnchor="middle"
                  fontSize="6"
                  fill="var(--text-secondary)"
                >
                  {point.item.label.length > 6
                    ? `${point.item.label.slice(0, 5)}…`
                    : point.item.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M",
    centerX,
    centerY,
    "L",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    "Z",
  ].join(" ");
}

function describeDonutArc(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z",
  ].join(" ");
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function buildPieSlices(data: Array<{ label: string; value: number }>): Array<{
  label: string;
  value: number;
  ratio: number;
  startAngle: number;
  endAngle: number;
  color: string;
}> {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return data.map((item, index) => {
    const ratio = total > 0 ? item.value / total : 0;
    const angle = ratio * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...item,
      ratio,
      startAngle,
      endAngle,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });
}

function ScatterBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const data = buildCandidateScatterData(block, table);

  if (data.length < 2) {
    return <UnsupportedBlock block={block} />;
  }

  const chartWidth = 160;
  const chartHeight = 80;
  const padding = 8;
  const viewBoxHeight = chartHeight + padding * 2;
  const viewBoxWidth = chartWidth + padding * 2;

  const xValues = data.map((item) => item.x);
  const yValues = data.map((item) => item.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xSpan = Math.max(maxX - minX, 1);
  const ySpan = Math.max(maxY - minY, 1);

  const groups = Array.from(new Set(data.map((item) => item.group).filter(Boolean)));
  const getColor = (group: string | undefined) => {
    if (!group || groups.length === 0) {
      return CHART_COLORS[0];
    }
    return CHART_COLORS[groups.indexOf(group) % CHART_COLORS.length];
  };

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 truncate px-2 pt-1 text-[9px] font-semibold text-[var(--text-primary)]">
        {block.title}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {groups.length > 0 ? (
            <g>
              {groups.map((group, index) => (
                <text
                  key={group}
                  x={padding + index * 40}
                  y={padding - 2}
                  fontSize="5"
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                >
                  ● {group}
                </text>
              ))}
            </g>
          ) : null}

          {data.map((item, index) => {
            const x = padding + ((item.x - minX) / xSpan) * chartWidth;
            const y = padding + chartHeight - ((item.y - minY) / ySpan) * chartHeight;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={2.5}
                fill={getColor(item.group)}
                opacity={0.85}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function PieBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const data = buildCandidatePieData(block, table, { maxItems: 5 });

  if (data.length === 0) {
    return <UnsupportedBlock block={block} />;
  }

  const chartWidth = 160;
  const chartHeight = 80;
  const radius = 30;
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;

  const slices = buildPieSlices(data);

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 truncate px-2 pt-1 text-[9px] font-semibold text-[var(--text-primary)]">
        {block.title}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {slices.map((slice) => (
            <path
              key={slice.label}
              d={describeArc(centerX, centerY, radius, slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke="var(--surface-panel)"
              strokeWidth={1}
            />
          ))}

          {slices.map((slice, index) => {
            const midAngle = slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
            const labelRadius = radius + 14;
            const labelPos = polarToCartesian(centerX, centerY, labelRadius, midAngle);

            return (
              <text
                key={`label-${slice.label}`}
                x={labelPos.x}
                y={labelPos.y + index * 6}
                textAnchor={labelPos.x > centerX ? "start" : "end"}
                fontSize="5"
                fill="var(--text-secondary)"
              >
                {slice.label.length > 6 ? `${slice.label.slice(0, 5)}…` : slice.label} {Math.round(slice.ratio * 100)}%
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DonutBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const data = buildCandidatePieData(block, table, { maxItems: 5 });

  if (data.length === 0) {
    return <UnsupportedBlock block={block} />;
  }

  const chartWidth = 160;
  const chartHeight = 80;
  const outerRadius = 30;
  const innerRadius = 18;
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;

  const slices = buildPieSlices(data);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 truncate px-2 pt-1 text-[9px] font-semibold text-[var(--text-primary)]">
        {block.title}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {slices.map((slice) => (
            <path
              key={slice.label}
              d={describeDonutArc(
                centerX,
                centerY,
                outerRadius,
                innerRadius,
                slice.startAngle,
                slice.endAngle,
              )}
              fill={slice.color}
              stroke="var(--surface-panel)"
              strokeWidth={1}
            />
          ))}

          <text
            x={centerX}
            y={centerY - 2}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="var(--text-primary)"
          >
            {formatValue(total)}
          </text>
          <text
            x={centerX}
            y={centerY + 8}
            textAnchor="middle"
            fontSize="5"
            fill="var(--text-secondary)"
          >
            Total
          </text>

          {slices.slice(0, 3).map((slice, index) => (
            <text
              key={`legend-${slice.label}`}
              x={chartWidth - 4}
              y={14 + index * 8}
              textAnchor="end"
              fontSize="5"
              fill="var(--text-secondary)"
            >
              ● {slice.label.length > 4 ? `${slice.label.slice(0, 3)}…` : slice.label} {Math.round(slice.ratio * 100)}%
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function HorizontalBarBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const data = buildCandidateBarData(block, table, { sortBy: "value", maxItems: 6 });

  if (data.length === 0) {
    return <UnsupportedBlock block={block} />;
  }

  const chartWidth = 160;
  const chartHeight = 100;
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const labelWidth = 50;
  const barAreaWidth = chartWidth - labelWidth - 8;
  const barHeight = Math.min(12, (chartHeight - 20) / data.length - 4);
  const rowHeight = (chartHeight - 20) / data.length;

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 truncate px-2 pt-1 text-[9px] font-semibold text-[var(--text-primary)]">
        {block.title}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {data.map((item, index) => {
            const barWidth = maxValue > 0 ? (item.value / maxValue) * barAreaWidth : 0;
            const y = 10 + index * rowHeight + (rowHeight - barHeight) / 2;

            return (
              <g key={item.label}>
                <text
                  x={labelWidth - 4}
                  y={y + barHeight / 2 + 3}
                  textAnchor="end"
                  fontSize="6"
                  fill="var(--text-secondary)"
                >
                  {item.label.length > 8 ? `${item.label.slice(0, 7)}…` : item.label}
                </text>
                <rect
                  x={labelWidth}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  fill="var(--accent)"
                  opacity={0.85}
                />
                <text
                  x={labelWidth + barWidth + 4}
                  y={y + barHeight / 2 + 3}
                  textAnchor="start"
                  fontSize="6"
                  fill="var(--text-secondary)"
                >
                  {formatValue(item.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function GroupedBarBlock({
  block,
  table,
}: {
  block: DashboardCandidateBlock;
  table: ResolvedTable;
}) {
  const { categories, series } = buildCandidateGroupedBarData(block, table);

  if (categories.length === 0 || series.length === 0) {
    return <UnsupportedBlock block={block} />;
  }

  const chartWidth = 160;
  const chartHeight = 100;
  const labelWidth = 44;
  const barAreaWidth = chartWidth - labelWidth - 24;
  const maxValue = Math.max(
    ...series.flatMap((s) => s.items.map((item) => item.value)),
    0,
  );
  const rowHeight = Math.min(18, (chartHeight - 24) / categories.length);
  const groupBarHeight = (rowHeight - 6) / series.length;

  return (
    <div className="flex h-full flex-col">
      <p className="shrink-0 truncate px-2 pt-1 text-[9px] font-semibold text-[var(--text-primary)]">
        {block.title}
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {series.map((s, seriesIndex) => (
            <text
              key={s.name}
              x={labelWidth + seriesIndex * 50}
              y={8}
              fontSize="5"
              fill={CHART_COLORS[seriesIndex % CHART_COLORS.length]}
            >
              ■ {s.name.length > 8 ? `${s.name.slice(0, 7)}…` : s.name}
            </text>
          ))}

          {categories.map((category, categoryIndex) => {
            const y = 16 + categoryIndex * rowHeight;

            return (
              <g key={category}>
                <text
                  x={labelWidth - 4}
                  y={y + rowHeight / 2 + 2}
                  textAnchor="end"
                  fontSize="5"
                  fill="var(--text-secondary)"
                >
                  {category.length > 8 ? `${category.slice(0, 7)}…` : category}
                </text>

                {series.map((s, seriesIndex) => {
                  const item = s.items[categoryIndex];
                  const barWidth = maxValue > 0 ? (item.value / maxValue) * barAreaWidth : 0;
                  const barY = y + seriesIndex * groupBarHeight + 2;

                  return (
                    <rect
                      key={`${category}-${s.name}`}
                      x={labelWidth}
                      y={barY}
                      width={barWidth}
                      height={groupBarHeight - 1}
                      rx={1.5}
                      fill={CHART_COLORS[seriesIndex % CHART_COLORS.length]}
                      opacity={0.9}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
