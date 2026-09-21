import { posix } from 'node:path';

const privatePaths = [
  /^DOCS\/archive\//,
  /^DOCS\/mockups\//,
  /^DOCS\/operations\/(?:UAT_RELEASE_|PRODUCTION_RELEASE_|RELEASE_)/,
  /^DOCS\/development\/(?:FINAL_MIGRATION_|APP_STYLE_AUDIT_|PUBLICATION_READINESS\.md$)/,
  /^DOCS\/document-moves\.json$/,
  /^(?:AGENTS\.md|PLAN\.md|test-results\/)/,
];

export function excludedFromPublic(path) {
  return privatePaths.some(pattern => pattern.test(path));
}

export function unsafePath(path) {
  if (/[\x00-\x1f]/.test(path) || path.startsWith('/') || path.includes('\\') || path.split('/').some(part => ['', '.', '..', '.git'].includes(part))) return true;
  return /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\..*)?|backup\.sql)$|\.(?:db(?:-wal|-shm)?|sqlite(?:3)?(?:-wal|-shm)?|pem|key|p12|pfx|bundle|dump|bak|zip|tar|gz|pdf|csv|xlsx?)$/i.test(path);
}

export function publicLink(from, href, omitted) {
  if (/^(?:[a-z]+:|#)/i.test(href)) return href;
  const target = posix.normalize(posix.join(posix.dirname(from), decodeURIComponent(href.split('#')[0])));
  if (!omitted.has(target)) return href;
  return posix.relative(posix.dirname(from), 'DOCS/development/PUBLIC_SOURCE.md');
}
