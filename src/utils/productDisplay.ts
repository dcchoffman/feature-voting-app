const FALLBACK_PRODUCTS = [
  'OpsVision Portal',
  'MillTrack Insight',
  'Quality Compass',
  'Supply Sync',
  'Roadmap Nexus',
  'Fabricator Hub',
  'Blueprint Studio',
  'Velocity Forge',
  'Navigator Suite',
  'Catalyst Cloud'
];

const normalizeName = (name?: string | null) => {
  if (!name) return null;
  const trimmed = name.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const generateFallbackName = (seed: string) => {
  if (!seed) {
    return FALLBACK_PRODUCTS[0];
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PRODUCTS[hash % FALLBACK_PRODUCTS.length];
};

interface SessionLike {
  id?: string;
  title?: string;
  product_id?: string | null;
  productId?: string | null;
  product_name?: string | null;
  productName?: string | null;
}

export function getDisplayProductName(
  session: SessionLike,
  productLookup?: Record<string, string>
): string {
  const explicitName = normalizeName(session.product_name ?? session.productName);
  if (explicitName) {
    return explicitName;
  }

  const productId = session.product_id ?? session.productId ?? null;
  const lookupName = productId ? normalizeName(productLookup?.[productId]) : null;
  if (lookupName) {
    return lookupName;
  }

  const seed = productId || session.id || session.title || 'default-product';
  return generateFallbackName(seed);
}

