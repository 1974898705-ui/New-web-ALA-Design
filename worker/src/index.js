const IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b'
const PRODUCTION_ORIGIN = 'https://1974898705-ui.github.io'
const MAX_BODY_BYTES = 64 * 1024
const OUTPUT_WIDTH = 704
const OUTPUT_HEIGHT = 1024

function isAllowedOrigin(origin) {
  if (origin === PRODUCTION_ORIGIN) return true
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, X-ALA-Client',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}

function json(payload, status = 200, origin = PRODUCTION_ORIGIN) {
  return Response.json(payload, {
    status,
    headers: corsHeaders(origin),
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowedOrigin = isAllowedOrigin(origin) ? origin : PRODUCTION_ORIGIN

    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) {
        return json({ error: '不允许的请求来源。' }, 403, allowedOrigin)
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        provider: 'cloudflare-workers-ai',
        model: IMAGE_MODEL,
      }, 200, allowedOrigin)
    }

    if (url.pathname !== '/api/generate-image') {
      return json({ error: '接口不存在。' }, 404, allowedOrigin)
    }

    if (request.method !== 'POST') {
      return json({ error: '仅支持 POST 请求。' }, 405, allowedOrigin)
    }

    if (!isAllowedOrigin(origin)) {
      return json({ error: '不允许的请求来源。' }, 403, allowedOrigin)
    }

    if (request.headers.get('X-ALA-Client') !== 'ala-design-web') {
      return json({ error: '无效的客户端请求。' }, 403, origin)
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: '请求内容过大。' }, 413, origin)
    }

    try {
      const bodyText = await request.text()
      if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
        return json({ error: '请求内容过大。' }, 413, origin)
      }

      const body = JSON.parse(bodyText || '{}')
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
      if (!prompt) {
        return json({ error: '缺少图片生成提示词。' }, 400, origin)
      }

      const form = new FormData()
      form.append('prompt', prompt.slice(0, 2048))
      form.append('width', String(OUTPUT_WIDTH))
      form.append('height', String(OUTPUT_HEIGHT))
      const formResponse = new Response(form)
      const contentType = formResponse.headers.get('content-type')

      if (!formResponse.body || !contentType) {
        throw new Error('无法创建 Cloudflare 图片生成请求。')
      }

      const result = await env.AI.run(IMAGE_MODEL, {
        multipart: {
          body: formResponse.body,
          contentType,
        },
      })

      if (!result?.image) {
        throw new Error('Cloudflare 响应中没有图片。')
      }

      return json({
        image: `data:image/jpeg;base64,${result.image}`,
        provider: 'cloudflare-workers-ai',
        model: IMAGE_MODEL,
        mode: 'full-artwork',
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
      }, 200, origin)
    } catch (error) {
      console.error('Image generation failed', error)
      return json({
        code: 'IMAGE_PROVIDER_ERROR',
        error: error instanceof Error ? error.message : '图片生成失败。',
      }, 500, origin)
    }
  },
}
