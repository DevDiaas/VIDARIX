export interface StreamingProvider {
  id: number;
  slug: string;
  name: string;
  tmdbName: string;
  logoPath: string | null;
  logoUrl: string | null;
  initials: string;
}

export function normalizeProviderName(value: string): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export interface ProviderAliasConfig {
  slug: string;
  name: string;
  aliases: string[];
  initials: string;
  defaultTmdbId: number;
  defaultLogoPath: string | null;
}

export const TARGET_PROVIDERS: ProviderAliasConfig[] = [
  {
    slug: 'netflix',
    name: 'Netflix',
    aliases: ['Netflix'],
    initials: 'N',
    defaultTmdbId: 8,
    defaultLogoPath: '/providers/netflix.png'
  },
  {
    slug: 'prime',
    name: 'Prime Video',
    aliases: ['Amazon Prime Video', 'Prime Video', 'Amazon Prime Video with Ads'],
    initials: 'PV',
    defaultTmdbId: 119,
    defaultLogoPath: '/providers/prime-video.png'
  },
  {
    slug: 'disney',
    name: 'Disney+',
    aliases: ['Disney Plus', 'Disney+'],
    initials: 'D+',
    defaultTmdbId: 337,
    defaultLogoPath: '/providers/disney-plus.png'
  },
  {
    slug: 'max',
    name: 'Max',
    aliases: ['Max', 'HBO Max'],
    initials: 'M',
    defaultTmdbId: 1899,
    defaultLogoPath: '/providers/max.png'
  },
  {
    slug: 'paramount',
    name: 'Paramount+',
    aliases: ['Paramount Plus', 'Paramount+'],
    initials: 'P+',
    defaultTmdbId: 531,
    defaultLogoPath: '/providers/paramount-plus.png'
  },
  {
    slug: 'apple',
    name: 'Apple TV+',
    aliases: ['Apple TV Plus', 'Apple TV+', 'Apple TV'],
    initials: 'A+',
    defaultTmdbId: 350,
    defaultLogoPath: '/providers/apple-tv-plus.png'
  },
  {
    slug: 'globoplay',
    name: 'Globoplay',
    aliases: ['Globoplay'],
    initials: 'G',
    defaultTmdbId: 307,
    defaultLogoPath: '/providers/globoplay.png'
  },
  {
    slug: 'telecine',
    name: 'Telecine',
    aliases: ['Telecine', 'Telecine Amazon Channel'],
    initials: 'T',
    defaultTmdbId: 227,
    defaultLogoPath: '/providers/telecine.png'
  },
  {
    slug: 'mubi',
    name: 'MUBI',
    aliases: ['MUBI', 'MUBI Amazon Channel'],
    initials: 'M',
    defaultTmdbId: 11,
    defaultLogoPath: '/providers/mubi.png'
  },
  {
    slug: 'crunchyroll',
    name: 'Crunchyroll',
    aliases: ['Crunchyroll', 'Crunchyroll Amazon Channel'],
    initials: 'C',
    defaultTmdbId: 283,
    defaultLogoPath: '/providers/crunchyroll.png'
  }
];

/**
 * Apenas estes diretórios representam arquivos locais do projeto.
 * Um logo_path do TMDB também começa com `/`, mas precisa ser convertido
 * para https://image.tmdb.org — não pode ser tratado como arquivo local.
 */
export function isLocalProviderAsset(path: string): boolean {
  return path.startsWith('/providers/') || path.startsWith('/brand/');
}

export function getTMDBLogoUrl(
  logoPath: string | null | undefined,
  size: 'w45' | 'w92' | 'w154' | 'w300' | 'original' = 'w154'
): string | null {
  const value = logoPath?.trim();
  if (!value) return null;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (isLocalProviderAsset(value)) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `https://image.tmdb.org/t/p/${size}${normalizedPath}`;
}

export const streamingProviders: StreamingProvider[] = TARGET_PROVIDERS.map((config) => ({
  id: config.defaultTmdbId,
  slug: config.slug,
  name: config.name,
  tmdbName: config.aliases[0],
  logoPath: config.defaultLogoPath,
  logoUrl: getTMDBLogoUrl(config.defaultLogoPath),
  initials: config.initials
}));

export function getProviderByTmdbId(tmdbId: number): StreamingProvider | undefined {
  return streamingProviders.find((provider) => provider.id === tmdbId);
}

export function getProviderById(id: string | number): StreamingProvider | undefined {
  if (typeof id === 'number') {
    return streamingProviders.find((provider) => provider.id === id);
  }

  return streamingProviders.find(
    (provider) => provider.slug === id || String(provider.id) === id
  );
}

export function getProviderInitials(name: string): string {
  if (!name) return 'TV';

  const normalizedName = normalizeProviderName(name);

  if (normalizedName.includes('netflix')) return 'N';
  if (normalizedName.includes('prime') || normalizedName.includes('amazon')) return 'PV';
  if (normalizedName.includes('disney')) return 'D+';
  if (normalizedName.includes('max') || normalizedName.includes('hbo')) return 'M';
  if (normalizedName.includes('paramount')) return 'P+';
  if (normalizedName.includes('apple')) return 'A+';
  if (normalizedName.includes('globoplay')) return 'G';
  if (normalizedName.includes('telecine')) return 'T';
  if (normalizedName.includes('mubi')) return 'M';
  if (normalizedName.includes('crunchyroll')) return 'C';
  if (normalizedName.includes('claro')) return 'CL';
  if (normalizedName.includes('mgm')) return 'MG';

  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export function getLocalProviderLogoOverride(name?: string | null): string | null {
  const normalizedName = normalizeProviderName(name || '');
  if (!normalizedName) return null;

  if (normalizedName.includes('netflix')) return '/providers/netflix.png';
  if (normalizedName.includes('prime') && normalizedName.includes('ads')) {
    return '/providers/prime-video-ads.png';
  }
  if (normalizedName.includes('prime') || normalizedName.includes('amazon prime video')) {
    return '/providers/prime-video.png';
  }
  if (normalizedName.includes('disney')) return '/providers/disney-plus.png';
  if (normalizedName.includes('max') || normalizedName.includes('hbo')) return '/providers/max.png';
  if (normalizedName.includes('paramount')) return '/providers/paramount-plus.png';
  if (normalizedName.includes('apple')) return '/providers/apple-tv-plus.png';
  if (normalizedName.includes('globoplay')) return '/providers/globoplay.png';
  if (normalizedName.includes('telecine')) return '/providers/telecine.png';
  if (normalizedName.includes('mubi')) return '/providers/mubi.png';
  if (normalizedName.includes('crunchyroll')) return '/providers/crunchyroll.png';
  if (normalizedName.includes('claro')) return '/providers/claro-tv-plus.png';
  if (normalizedName.includes('mgm')) return '/providers/mgm-plus.png';

  return null;
}

/**
 * Retorna uma lista ordenada de tentativas para um logo:
 * 1. logo quadrado oficial retornado pelo TMDB;
 * 2. logo já resolvido pelo catálogo local;
 * 3. fallback local da VIDARIX.
 *
 * Isso impede que um erro em uma imagem faça o logo desaparecer por completo.
 */
export function getProviderLogoCandidates(options: {
  name?: string | null;
  rawLogoPath?: string | null;
  knownLogoPath?: string | null;
  knownLogoUrl?: string | null;
  size?: 'w45' | 'w92' | 'w154' | 'w300' | 'original';
}): string[] {
  const {
    name,
    rawLogoPath,
    knownLogoPath,
    knownLogoUrl,
    size = 'w154'
  } = options;

  const candidates = [
    // O logo local vem primeiro para o onboarding e demais áreas nunca ficarem vazias.
    getLocalProviderLogoOverride(name),
    getTMDBLogoUrl(knownLogoUrl, size),
    getTMDBLogoUrl(knownLogoPath, size),
    getTMDBLogoUrl(rawLogoPath, size)
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}
