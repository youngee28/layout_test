import { sanitizeSvg } from "@/lib/svg/sanitize_svg";

const DEFAULT_WIDTH = 1122;
const DEFAULT_HEIGHT = 1402;
const DEFAULT_VIEW_BOX = "0 0 1122 1402";

type SvgPreview = {
  markup: string;
  width: number;
  height: number;
  viewBox: string;
};

function extractNumericAttribute(tag: string, attributeName: string) {
  const match = tag.match(new RegExp(`${attributeName}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^\\s>]+))`, "i"));
  const value = match?.[1] ?? match?.[2] ?? match?.[3];

  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value.replace(/px$/i, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function extractViewBox(tag: string) {
  const match = tag.match(/viewBox\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];

  if (!value) {
    return undefined;
  }

  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  return parts.join(" ");
}

export function normalizeSvgPreview(markup: string): SvgPreview | null {
  const sanitized = sanitizeSvg(markup);

  if (!sanitized) {
    return null;
  }

  const rootTag = sanitized.match(/<svg\b[^>]*>/i)?.[0];

  if (!rootTag) {
    return null;
  }

  const width = extractNumericAttribute(rootTag, "width") ?? DEFAULT_WIDTH;
  const height = extractNumericAttribute(rootTag, "height") ?? DEFAULT_HEIGHT;
  const viewBox = extractViewBox(rootTag) ?? DEFAULT_VIEW_BOX;

  return {
    markup: sanitized,
    width,
    height,
    viewBox,
  };
}
