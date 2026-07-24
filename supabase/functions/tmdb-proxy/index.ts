import { corsHeaders } from 'npm:@supabase/supabase-js@^2/cors';

interface ProxyRequestBody {
  endpoint?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const ALLOWED_ENDPOINTS: RegExp[] = [
  /^\/trending\/(all|movie|tv)\/(day|week)$/,
  /^\/(movie|tv)\/(popular|top_rated|now_playing|upcoming|airing_today|on_the_air)$/,
  /^\/discover\/(movie|tv)$/,
  /^\/search\/multi$/,
  /^\/watch\/providers\/(movie|tv)$/,
  /^\/(movie|tv)\/\d+$/,
];

const ALLOWED_QUERY_PARAMS = new Set([
  'page',
  'language',
  'region',
  'watch_region',
  'query',
  'sort_by',
  'with_genres',
  'without_genres',
  'with_watch_providers',
  'with_watch_monetization_types',
  'with_original_language',
  'vote_count.gte',
  'vote_average.gte',
  'vote_average.lte',
  'with_runtime.gte',
  'with_runtime.lte',
  'primary_release_year',
  'first_air_date_year',
  'release_date.gte',
  'release_date.lte',
  'first_air_date.gte',
  'first_air_date.lte',
  'append_to_response',
  'include_adult',
  'include_video',
]);

function jsonResponse(payload: unknown, status = 200, cacheControl?: string): Response {
  return Response.json(payload, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
    },
  });
}

function isEndpointAllowed(endpoint: string): boolean {
  if (!endpoint.startsWith('/') || endpoint.includes('..') || endpoint.includes('?') || endpoint.includes('#')) {
    return false;
  }

  return ALLOWED_ENDPOINTS.some((pattern) => pattern.test(endpoint));
}

function sanitizeParams(
  rawParams: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(rawParams)) {
    if (!ALLOWED_QUERY_PARAMS.has(key) || rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }

    const value = String(rawValue).trim();
    if (!value || value.length > 500) continue;

    sanitized[key] = value;
  }

  return sanitized;
}

async function readRequest(req: Request): Promise<ProxyRequestBody> {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') ?? undefined;
    const params: Record<string, string> = {};

    url.searchParams.forEach((value, key) => {
      if (key !== 'endpoint') params[key] = value;
    });

    return { endpoint, params };
  }

  if (req.method === 'POST') {
    return (await req.json()) as ProxyRequestBody;
  }

  return {};
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  try {
    const body = await readRequest(req);
    const endpoint = body.endpoint?.trim() ?? '';

    if (!endpoint) {
      return jsonResponse({ error: 'O endpoint do TMDB não foi informado.' }, 400);
    }

    if (!isEndpointAllowed(endpoint)) {
      return jsonResponse({ error: 'Endpoint do TMDB não permitido.' }, 403);
    }

    const apiKey = Deno.env.get('TMDB_API_KEY')?.trim();
    const accessToken = Deno.env.get('TMDB_ACCESS_TOKEN')?.trim();

    if (!apiKey && !accessToken) {
      console.error('TMDB_API_KEY ou TMDB_ACCESS_TOKEN não configurado.');
      return jsonResponse({ error: 'Credencial do catálogo não configurada no backend.' }, 500);
    }

    const params = sanitizeParams(body.params ?? {});
    const tmdbUrl = new URL(`${TMDB_BASE_URL}${endpoint}`);

    tmdbUrl.searchParams.set('language', params.language || 'pt-BR');
    tmdbUrl.searchParams.set('region', params.region || 'BR');

    for (const [key, value] of Object.entries(params)) {
      tmdbUrl.searchParams.set(key, value);
    }

    const headers: HeadersInit = {
      Accept: 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else if (apiKey) {
      tmdbUrl.searchParams.set('api_key', apiKey);
    }

    const tmdbResponse = await fetch(tmdbUrl, { headers });
    const responseText = await tmdbResponse.text();

    let data: unknown;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { error: 'O TMDB retornou uma resposta inválida.' };
    }

    if (!tmdbResponse.ok) {
      console.error('Erro do TMDB:', tmdbResponse.status, endpoint);
      return jsonResponse(
        {
          error: 'Não foi possível consultar o catálogo.',
          status: tmdbResponse.status,
          details: data,
        },
        tmdbResponse.status,
      );
    }

    const cacheControl = endpoint.startsWith('/search/')
      ? 'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
      : endpoint.startsWith('/watch/providers/')
        ? 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
        : 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600';

    return jsonResponse(data, 200, cacheControl);
  } catch (error) {
    console.error('Erro inesperado no tmdb-proxy:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Erro inesperado no backend do catálogo.',
      },
      500,
    );
  }
});
