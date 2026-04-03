import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { cwd, env } from 'node:process'

import { onRequestGet as scholarMetricsHandler } from '../functions/api/scholar-metrics.js'

const rootDir = cwd()
const port = Number.parseInt(env.PORT || '8000', 10)
const localCache = new Map()

function loadDotEnv() {
  const envPath = join(rootDir, '.env')
  if (!existsSync(envPath)) return

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (key && !env[key]) {
      env[key] = value
    }
  }
}

function contentTypeFor(filePath) {
  switch (extname(filePath)) {
    case '.css':
      return 'text/css; charset=UTF-8'
    case '.js':
      return 'application/javascript; charset=UTF-8'
    case '.json':
      return 'application/json; charset=UTF-8'
    case '.svg':
      return 'image/svg+xml'
    case '.ico':
      return 'image/x-icon'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.html':
    default:
      return 'text/html; charset=UTF-8'
  }
}

function sendJson(nodeResponse, response) {
  nodeResponse.writeHead(response.status, Object.fromEntries(response.headers.entries()))
  response
    .arrayBuffer()
    .then((buffer) => {
      nodeResponse.end(Buffer.from(buffer))
    })
    .catch(() => {
      nodeResponse.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' })
      nodeResponse.end(JSON.stringify({ error: 'Unable to stream JSON response.' }))
    })
}

async function serveStatic(nodeRequest, nodeResponse, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname
  const filePath = normalize(join(rootDir, safePath))

  if (!filePath.startsWith(rootDir)) {
    nodeResponse.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' })
    nodeResponse.end('Forbidden')
    return
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      throw new Error('Not a file')
    }

    nodeResponse.writeHead(200, {
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': 'no-cache',
    })

    createReadStream(filePath).pipe(nodeResponse)
  } catch {
    nodeResponse.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' })
    nodeResponse.end('Not Found')
  }
}

loadDotEnv()

if (!globalThis.caches) {
  globalThis.caches = {
    default: {
      async match(request) {
        const response = localCache.get(request.url)
        return response ? response.clone() : null
      },
      async put(request, response) {
        localCache.set(request.url, response.clone())
      },
    },
  }
}

const server = createServer(async (nodeRequest, nodeResponse) => {
  const requestUrl = new URL(nodeRequest.url || '/', `http://${nodeRequest.headers.host}`)

  if (requestUrl.pathname === '/api/scholar-metrics') {
    const response = await scholarMetricsHandler({
      env: { SERPAPI_API_KEY: env.SERPAPI_API_KEY },
      request: new Request(requestUrl.toString(), {
        headers: nodeRequest.headers,
        method: 'GET',
      }),
      waitUntil(promise) {
        return promise
      },
    })

    sendJson(nodeResponse, response)
    return
  }

  await serveStatic(nodeRequest, nodeResponse, requestUrl.pathname)
})

server.listen(port, () => {
  console.log(`Dev server running at http://127.0.0.1:${port}`)
})
