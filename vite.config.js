import { defineConfig, loadEnv } from 'vite'

const CLOUDFLARE_IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell'

function jsonResponse(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0

  for await (const chunk of request) {
    size += chunk.length
    if (size > 64 * 1024) throw new Error('请求内容过大。')
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function cloudflareImageProxy({ accountId, apiToken }) {
  return {
    name: 'cloudflare-image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/image-provider/status', (request, response) => {
        jsonResponse(response, 200, {
          provider: 'cloudflare-workers-ai',
          model: CLOUDFLARE_IMAGE_MODEL,
          configured: Boolean(accountId && apiToken),
        })
      })

      server.middlewares.use('/api/generate-image', async (request, response) => {
        if (request.method !== 'POST') {
          jsonResponse(response, 405, { error: '仅支持 POST 请求。' })
          return
        }

        if (!accountId || !apiToken) {
          jsonResponse(response, 503, {
            code: 'PROVIDER_NOT_CONFIGURED',
            error: 'Cloudflare Workers AI 尚未配置。',
          })
          return
        }

        try {
          const body = await readJsonBody(request)
          const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
          if (!prompt) {
            jsonResponse(response, 400, { error: '缺少图片生成提示词。' })
            return
          }

          const cloudflareResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: prompt.slice(0, 2048),
                steps: Math.min(8, Math.max(1, Number(body.steps) || 4)),
                seed: Number.isInteger(body.seed) ? body.seed : Math.floor(Math.random() * 2_147_483_647),
              }),
            },
          )

          const contentType = cloudflareResponse.headers.get('content-type') ?? ''
          if (!cloudflareResponse.ok) {
            const details = contentType.includes('application/json')
              ? await cloudflareResponse.json()
              : await cloudflareResponse.text()
            jsonResponse(response, cloudflareResponse.status, {
              code: 'PROVIDER_REQUEST_FAILED',
              error: 'Cloudflare 图片生成失败。',
              details,
            })
            return
          }

          let dataUri
          if (contentType.startsWith('image/')) {
            const bytes = Buffer.from(await cloudflareResponse.arrayBuffer())
            dataUri = `data:${contentType.split(';')[0]};base64,${bytes.toString('base64')}`
          } else {
            const payload = await cloudflareResponse.json()
            const image = payload?.result?.image ?? payload?.image
            if (!image) throw new Error('Cloudflare 响应中没有图片。')
            dataUri = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
          }

          jsonResponse(response, 200, {
            image: dataUri,
            provider: 'cloudflare-workers-ai',
            model: CLOUDFLARE_IMAGE_MODEL,
          })
        } catch (error) {
          jsonResponse(response, 500, {
            code: 'IMAGE_PROXY_ERROR',
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: mode === 'production' ? '/New-web-ALA-Design/' : '/',
    plugins: [cloudflareImageProxy({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
    })],
  }
})
