const FORBIDDEN_ELEMENT_PATTERN = /<\/?\s*(script|foreignObject|iframe|image|use|animate|set|style)\b[^>]*>/gi;
const FORBIDDEN_BLOCK_PATTERN = /<(script|foreignObject|iframe|image|use|animate|set|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const EVENT_HANDLER_PATTERN = /\s+on[a-zA-Z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const STYLE_ATTR_PATTERN = /\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const CLASS_ATTR_PATTERN = /\s+class\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const HREF_ATTR_PATTERN = /\s+(?:href|xlink:href)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const URL_FUNC_PATTERN = /url\(([^)]*)\)/gi;
const XML_PATTERN = /<\?xml[\s\S]*?\?>/gi;
const DOCTYPE_PATTERN = /<!DOCTYPE[\s\S]*?>/gi;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

function isAllowedInternalUrl(value: string) {
  return /^['"]?#[-_a-zA-Z][-_a-zA-Z0-9:.]*['"]?$/.test(value.trim());
}

function sanitizeUrlFunctions(markup: string) {
  return markup.replace(URL_FUNC_PATTERN, (match, value: string) => {
    return isAllowedInternalUrl(value) ? `url(${value.trim()})` : "none";
  });
}

function sanitizeHrefAttributes(markup: string) {
  return markup.replace(HREF_ATTR_PATTERN, (match, _full, doubleQuoted, singleQuoted, bare) => {
    const value = (doubleQuoted ?? singleQuoted ?? bare ?? "").trim();
    return isAllowedInternalUrl(value) ? match : "";
  });
}

export function sanitizeSvg(markup: string): string | null {
  const trimmed = markup.trim();

  if (!trimmed) {
    return null;
  }

  const svgMatch = trimmed.match(/<svg\b[\s\S]*<\/svg>/i);

  if (!svgMatch) {
    return null;
  }

  let sanitized = svgMatch[0]
    .replace(XML_PATTERN, "")
    .replace(DOCTYPE_PATTERN, "")
    .replace(COMMENT_PATTERN, "")
    .replace(FORBIDDEN_BLOCK_PATTERN, "")
    .replace(FORBIDDEN_ELEMENT_PATTERN, "")
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(STYLE_ATTR_PATTERN, "")
    .replace(CLASS_ATTR_PATTERN, "");

  sanitized = sanitizeHrefAttributes(sanitized);
  sanitized = sanitizeUrlFunctions(sanitized);

  if (/javascript\s*:/i.test(sanitized) || /https?:/i.test(sanitized)) {
    sanitized = sanitized
      .replace(/javascript\s*:/gi, "")
      .replace(/https?:\/\/[^\s"')>]+/gi, "");
  }

  const normalized = sanitized.trim();

  if (!/^<svg\b/i.test(normalized) || !/<\/svg>$/i.test(normalized)) {
    return null;
  }

  return normalized;
}
