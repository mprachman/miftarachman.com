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

function getMetricRow(table, matcher) {
  return table.find((row) => {
    const label = String(row?.name || row?.label || row?.metric || '').toLowerCase()
    return matcher(label)
  })
}

function readCellValue(row, keyMatcher) {
  if (!row || typeof row !== 'object') return null

  const entries = Object.entries(row)
  const match = entries.find(([key]) => keyMatcher(key))
  if (!match) return null

  const value = Number.parseInt(match[1], 10)
  return Number.isFinite(value) ? value : null
}

function getRecentKey(row) {
  if (!row || typeof row !== 'object') return null

  return Object.keys(row).find((key) => /^since_/i.test(key)) || null
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

  const citationsRow = getMetricRow(table, (label) => label.includes('citation'))
  const hIndexRow = getMetricRow(table, (label) => label.includes('h-index'))
  const i10IndexRow = getMetricRow(table, (label) => label.includes('i10'))

  const recentKey =
    getRecentKey(citationsRow) || getRecentKey(hIndexRow) || getRecentKey(i10IndexRow)

  return {
    provider: 'serpapi',
    sourceUrl: SCHOLAR_SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    metrics: {
      citationsAll: readCellValue(citationsRow, (key) => key === 'all'),
      citationsRecent: readCellValue(citationsRow, (key) => key === recentKey),
      recentLabel: normalizeRecentLabel(recentKey),
      hIndexAll: readCellValue(hIndexRow, (key) => key === 'all'),
      hIndexRecent: readCellValue(hIndexRow, (key) => key === recentKey),
      i10IndexAll: readCellValue(i10IndexRow, (key) => key === 'all'),
      i10IndexRecent: readCellValue(i10IndexRow, (key) => key === recentKey),
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
