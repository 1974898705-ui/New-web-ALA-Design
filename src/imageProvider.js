const configuredEndpoint = import.meta.env.VITE_IMAGE_PROVIDER_ENDPOINT?.trim()
const PROVIDER_ENDPOINT = configuredEndpoint || '/api/generate-image'

const themeDescriptions = {
  halloween: 'one friendly Halloween pumpkin with two tiny bat accents',
  ecommerce_sale: 'one gift bag with a small price tag and one compact parcel accent',
  christmas: 'one central Christmas gift box with a bow, a tiny bell and two short pine sprigs',
  local_holiday_draft: 'one compact local holiday gift arrangement with one culturally neutral festive accent',
  default: 'one compact festive gift arrangement with a bow',
}

export function buildPopupVisualPrompt(form, spec, variant = 0) {
  const theme = themeDescriptions[spec.theme.id] ?? themeDescriptions.default
  const colors = [spec.palette.upper, spec.palette.lower, '#FFA423', '#FF5290', '#008CFF']
    .filter((color, index, list) => list.indexOf(color) === index)
    .slice(0, 4)
    .join(', ')

  return [
    'Create a compact horizontal header ornament for a financial marketing popup.',
    `Theme: ${theme}.`,
    `Use only these flat solid colors: ${colors}.`,
    'Pure flat vector-style color shapes, clean geometric edges, one clear hero object, sparse negative space.',
    'Centered 2.5:1 horizontal composition inside the middle of the canvas, designed to be cropped as a small header.',
    'No text, no letters, no numbers, no logo, no watermark, no CTA, no border.',
    'No gradients, no realistic light, no shadows, no gloss, no 3D, no material texture, no full scene.',
    `Variation seed concept: ${variant + 1}. Marketing context: ${form.category}.`,
  ].join(' ')
}

export async function generatePopupVisual(form, spec, variant = 0) {
  const response = await fetch(PROVIDER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ALA-Client': 'ala-design-web',
    },
    body: JSON.stringify({
      prompt: buildPopupVisualPrompt(form, spec, variant),
      steps: 4,
      seed: Math.floor(Math.random() * 2_147_483_647),
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.image) {
    const error = new Error(payload.error || '图片生成服务不可用。')
    error.code = payload.code || 'IMAGE_PROVIDER_UNAVAILABLE'
    throw error
  }

  return payload
}
