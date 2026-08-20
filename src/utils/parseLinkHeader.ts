/**
 * Parses an RFC 5988 `Link` header into a `{ rel: url }` map.
 *
 * @example
 * parseLinkHeader('<https://api/x?page=2>; rel="next", <https://api/x?page=9>; rel="last"');
 * // { next: 'https://api/x?page=2', last: 'https://api/x?page=9' }
 */
export function parseLinkHeader(header: string | null | undefined): Record<string, string> {
  const links: Record<string, string> = {};

  if (!header) {
    return links;
  }

  for (const section of header.split(/,\s*(?=<)/)) {
    const match = /^\s*<([^>]*)>\s*;\s*(.+)$/.exec(section);

    if (!match) {
      continue;
    }

    const [, url, attributes] = match;
    const rel = /(?:^|;)\s*rel\s*=\s*"?([^";]+)"?/i.exec(attributes)?.[1]?.trim();

    if (!rel) {
      continue;
    }

    for (const name of rel.split(/\s+/)) {
      links[name] = url;
    }
  }

  return links;
}
