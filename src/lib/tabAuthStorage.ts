const TAB_PREFIX = "sistercare-tab-";

type NamedWindow = { name: string };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getOrCreateTabId(
  target: NamedWindow,
  createId: () => string,
): string {
  if (target.name.startsWith(TAB_PREFIX)) {
    return target.name.slice(TAB_PREFIX.length);
  }
  const id = createId();
  target.name = `${TAB_PREFIX}${id}`;
  return id;
}

export function getTabAuthStorageKey(tabId: string): string {
  return `sistercare-auth-${tabId}`;
}

export function getLegacySupabaseStorageKey(projectUrl: string): string | null {
  try {
    const projectRef = new URL(projectUrl).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

/** Preserve one existing login during the switch away from shared localStorage. */
export function migrateLegacyAuthSession(
  local: StorageLike,
  tab: StorageLike,
  legacyKey: string | null,
  tabKey: string,
): boolean {
  if (!legacyKey || tab.getItem(tabKey)) return false;
  const legacySession = local.getItem(legacyKey);
  if (!legacySession) return false;
  tab.setItem(tabKey, legacySession);
  local.removeItem(legacyKey);
  return true;
}
