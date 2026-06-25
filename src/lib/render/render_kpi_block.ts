import type { ParsedDataset } from "@/lib/data/parse_csv";
import type { DashboardBlock } from "@/schema/dashboard_spec";
import type { VisualElement } from "@/schema/visual_element";

function parseNumericValue(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  const numeric = Number(normalized);

  return Number.isFinite(numeric) ? numeric : null;
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function resolveKpiValue(block: DashboardBlock, dataset: ParsedDataset): number | null {
  const valueField = block.dataBinding?.valueField;

  if (!valueField) {
    return null;
  }

  const numericValues = dataset.rows
    .map((row) => parseNumericValue(row[valueField]))
    .filter((value): value is number => value !== null);

  if (numericValues.length === 0) {
    return null;
  }

  const latestRule = block.highlightRules?.some((rule) => rule.target === "latest");

  if (latestRule) {
    return numericValues[numericValues.length - 1] ?? null;
  }

  const maxRule = block.highlightRules?.some((rule) => rule.target === "max");

  if (maxRule) {
    return Math.max(...numericValues);
  }

  const minRule = block.highlightRules?.some((rule) => rule.target === "min");

  if (minRule) {
    return Math.min(...numericValues);
  }

  return numericValues.reduce((sum, value) => sum + value, 0);
}

export function renderKpiBlock(block: DashboardBlock, dataset: ParsedDataset): VisualElement[] {
  const value = resolveKpiValue(block, dataset);
  const cardId = `${block.id}-card`;
  const titleId = `${block.id}-title`;
  const valueId = `${block.id}-value`;
  const noteId = `${block.id}-note`;

  const elements: VisualElement[] = [
    {
      id: cardId,
      type: "rect",
      x: block.layout.x,
      y: block.layout.y,
      width: block.layout.width,
      height: block.layout.height,
      fill: "--accent-soft",
      stroke: "--border-strong",
      strokeWidth: 1,
      cornerRadius: 24,
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    },
    {
      id: titleId,
      type: "text",
      x: block.layout.x + 20,
      y: block.layout.y + 18,
      width: Math.max(80, block.layout.width - 40),
      text: block.title ?? "KPI",
      fontSize: 18,
      fontFamily: "--font-geist-sans",
      fontStyle: "bold",
      fill: "--text-primary",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    },
  ];

  if (value !== null) {
    elements.push({
      id: valueId,
      type: "text",
      x: block.layout.x + 20,
      y: block.layout.y + Math.max(54, block.layout.height * 0.34),
      width: Math.max(80, block.layout.width - 40),
      text: formatValue(value),
      fontSize: Math.max(28, Math.min(44, block.layout.height * 0.24)),
      fontFamily: "--font-geist-sans",
      fontStyle: "bold",
      fill: "--accent-strong",
      chartId: block.id,
      groupId: block.id,
      dataRef: block.dataBinding?.valueField
        ? {
            field: block.dataBinding.valueField,
            value,
          }
        : undefined,
      editable: true,
      locked: false,
    });
  } else {
    elements.push({
      id: noteId,
      type: "text",
      x: block.layout.x + 20,
      y: block.layout.y + Math.max(58, block.layout.height * 0.38),
      width: Math.max(80, block.layout.width - 40),
      text: block.message ?? "Numeric value unavailable",
      fontSize: 14,
      fontFamily: "--font-geist-sans",
      fontStyle: "normal",
      fill: "--text-secondary",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    });

    return elements;
  }

  if (block.message) {
    elements.push({
      id: noteId,
      type: "text",
      x: block.layout.x + 20,
      y: block.layout.y + block.layout.height - 52,
      width: Math.max(80, block.layout.width - 40),
      text: block.message,
      fontSize: 14,
      fontFamily: "--font-geist-sans",
      fontStyle: "normal",
      fill: "--text-secondary",
      chartId: block.id,
      groupId: block.id,
      editable: true,
      locked: false,
    });
  }

  return elements;
}
