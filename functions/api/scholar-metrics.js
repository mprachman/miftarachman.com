const SCHOLAR_SOURCE_URL =
  'https://scholar.google.com/citations?user=sGkie4YAAAAJ&hl=en'
const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json'
const CACHE_CONTROL = 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400'

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Cache-Control': CACHE_CONTROL,
      'Content-Type': 'application/json; charset=UTF-8',
    },
  })
}

function normalizeRecentLabel(rawKey) {
  if (!rawKey) return 'Since recent years'

  const label = rawKey
    .replace(/^since_/, 'Since ')
    .replace(/_/g, ' ')
    .trim()

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function getMetricMap(table, keyName) {
  const row = table.find((entry) => entry && typeof entry === 'object' && keyName in entry)
  return row ? row[keyName] : null
}

function readCellValue(metricMap, key) {
  if (!metricMap || typeof metricMap !== 'object' || !key) return null

  const value = Number.parseInt(metricMap[key], 10)
  return Number.isFinite(value) ? value : null
}

function getRecentKey(metricMap) {
  if (!metricMap || typeof metricMap !== 'object') return null

  return Object.keys(metricMap).find((key) => /^since_/i.test(key)) || null
}

function normalizeYearlyGraph(graph) {
  if (!Array.isArray(graph)) return []

  return graph
    .map((entry) => {
      const year = Number.parseInt(entry?.year, 10)
      const count = Number.parseInt(entry?.citations, 10)

      if (!Number.isFinite(year) || !Number.isFinite(count)) {
        return null
      }

      return { year, count }
    })
    .filter(Boolean)
}

function normalizeScholarPayload(data) {
  const table = Array.isArray(data?.cited_by?.table) ? data.cited_by.table : []
  const graph = normalizeYearlyGraph(data?.cited_by?.graph)

  const citationsMetric = getMetricMap(table, 'citations')
  const hIndexMetric = getMetricMap(table, 'h_index')
  const i10IndexMetric = getMetricMap(table, 'i10_index')

  const recentKey =
    getRecentKey(citationsMetric) ||
    getRecentKey(hIndexMetric) ||
    getRecentKey(i10IndexMetric)

  return {
    provider: 'serpapi',
    sourceUrl: SCHOLAR_SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    metrics: {
      citationsAll: readCellValue(citationsMetric, 'all'),
      citationsRecent: readCellValue(citationsMetric, recentKey),
      recentLabel: normalizeRecentLabel(recentKey),
      hIndexAll: readCellValue(hIndexMetric, 'all'),
      hIndexRecent: readCellValue(hIndexMetric, recentKey),
      i10IndexAll: readCellValue(i10IndexMetric, 'all'),
      i10IndexRecent: readCellValue(i10IndexMetric, recentKey),
    },
    yearlyCitations: graph,
  }
}

function hasRequiredMetrics(payload) {
  return Boolean(
    payload?.metrics?.citationsAll !== null &&
      payload?.metrics?.citationsRecent !== null &&
      payload?.metrics?.hIndexAll !== null &&
      payload?.metrics?.i10IndexAll !== null &&
      payload?.yearlyCitations?.length
  )
}

export async function onRequestGet(context) {
  const { env, request } = context
  const apiKey = env.SERPAPI_API_KEY

  if (!apiKey) {
    return jsonResponse(
      { error: 'SERPAPI_API_KEY is not configured for this environment.' },
      503
    )
  }

  const cache = caches.default
  const cacheKey = new Request(request.url, { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) {
    return cached
  }

  const upstreamUrl = new URL(SERPAPI_ENDPOINT)
  upstreamUrl.search = new URLSearchParams({
    api_key: apiKey,
    author_id: 'sGkie4YAAAAJ',
    engine: 'google_scholar_author',
    hl: 'en',
  }).toString()

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!upstreamResponse.ok) {
      return jsonResponse(
        { error: `SerpApi request failed with ${upstreamResponse.status}.` },
        502
      )
    }

    const upstreamData = await upstreamResponse.json()
    const normalized = normalizeScholarPayload(upstreamData)

    if (!hasRequiredMetrics(normalized)) {
      return jsonResponse(
        { error: 'SerpApi response was missing expected Scholar metrics.' },
        502
      )
    }

    const response = jsonResponse(normalized)
    context.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    return jsonResponse(
      { error: 'Unable to fetch Scholar metrics from SerpApi.' },
      502
    )
  }
}
