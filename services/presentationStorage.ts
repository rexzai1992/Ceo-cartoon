const PRESENTATION_BEFORE_MAP_KEY = 'presentation_before_map_v1';
const MAX_BEFORE_IMAGES = 40;

interface BeforeImageEntry {
  imageUrl: string;
  updatedAt: number;
}

type BeforeImageMap = Record<string, BeforeImageEntry>;

const canUseStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isQuotaExceededError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
};

const readBeforeImageMap = (): BeforeImageMap => {
  if (!canUseStorage()) return {};

  try {
    const raw = localStorage.getItem(PRESENTATION_BEFORE_MAP_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as BeforeImageMap;
  } catch {
    return {};
  }
};

const pruneBeforeImageMap = (map: BeforeImageMap, maxItems: number): BeforeImageMap => {
  const sorted = Object.entries(map).sort(
    (a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0)
  );
  return Object.fromEntries(sorted.slice(0, maxItems));
};

const writeBeforeImageMap = (map: BeforeImageMap) => {
  if (!canUseStorage()) return;
  localStorage.setItem(PRESENTATION_BEFORE_MAP_KEY, JSON.stringify(map));
};

export const saveBeforeImageForGeneration = (generationId: string, beforeImageUrl: string) => {
  if (!generationId || !beforeImageUrl || !canUseStorage()) return;

  let map = readBeforeImageMap();
  map[generationId] = {
    imageUrl: beforeImageUrl,
    updatedAt: Date.now(),
  };

  map = pruneBeforeImageMap(map, MAX_BEFORE_IMAGES);

  try {
    writeBeforeImageMap(map);
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      console.warn('Failed to save presentation before-image map:', error);
      return;
    }

    // Retry with a much smaller set if storage quota is tight.
    try {
      const pruned = pruneBeforeImageMap(map, 10);
      writeBeforeImageMap(pruned);
    } catch (retryError) {
      console.warn('Skipping before-image cache due to storage limits:', retryError);
    }
  }
};

export const getBeforeImageForGeneration = (generationId: string): string | null => {
  if (!generationId || !canUseStorage()) return null;
  const map = readBeforeImageMap();
  return map[generationId]?.imageUrl || null;
};
