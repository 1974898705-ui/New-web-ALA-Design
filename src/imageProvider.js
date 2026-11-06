const configuredEndpoint = import.meta.env.VITE_IMAGE_PROVIDER_ENDPOINT?.trim()
const PROVIDER_ENDPOINT = configuredEndpoint || '/api/generate-image'

const themeDescriptions = {
  halloween: 'a compact friendly Halloween pumpkin, two tiny bats and restrained festive accents',
  ecommerce_sale: 'a compact gift bag, a price tag and one small parcel accent',
  christmas: 'a central Christmas gift box with a bow, a tiny bell and short pine sprigs',
  local_holiday_draft: 'a culturally neutral local-festival gift arrangement with one paper-cut floral accent',
  default: 'a compact festive gift arrangement with a bow and one local-festival accent',
}

export function buildPopupArtworkPrompt(form, spec, variant = 0) {
  const theme = themeDescriptions[spec.theme.id] ?? themeDescriptions.default

  return [
    'Generate a TEXT-FREE portrait visual foundation for a financial marketing popup. The browser will add every title, offer and CTA afterward.',
    'Use a clean 11:16 portrait composition corresponding to a 279×400 logical canvas, on a uniform very light #F7F9FF key background.',
    `Theme: ${theme}. Marketing category: ${form.category}. Variant: ${variant + 1}.`,
    'Create one centered card from x≈11% to 89% and y≈16% to 76% of the canvas. The card has one continuous silhouette, a quiet top edge, exactly 8 broad repeated scallops on each side and 6 along the bottom.',
    `Use two broad solid card regions: upper ${spec.palette.upper}, lower ${spec.palette.lower}, joined by one restrained narrow zigzag separator outside the text.`,
    'Place one compact flat-vector festive ornament behind the top of the card, centered and visibly occluded by it. The complete ornament must be no wider than half the card.',
    'Leave the title safe area and offer safe area as calm, empty, solid-color regions with generous spacing. Keep y≈76% to the bottom completely empty.',
    'ABSOLUTELY NO TEXT: no letters, no words, no numbers, no percentages, no symbols, no captions, no labels, no CTA, no button, no pill, no logo, no watermark and no placeholder glyphs anywhere.',
    'Pure 2D flat vector-style color shapes with clean geometric edges. Use only #FFA423, #FF5290, #008CFF, #1A55FF, #FFFFFF, #F7F9FF and #16325C.',
    'Absolutely no gradients, shadows, glow, gloss, 3D, realistic lighting, texture, glass, metal, hands, arrows, emoji or photographic elements.',
  ].join(' ')
}

export async function generatePopupArtwork(form, spec, variant = 0) {
  const response = await fetch(PROVIDER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ALA-Client': 'ala-design-web',
    },
    body: JSON.stringify({
      mode: 'visual-base',
      prompt: buildPopupArtworkPrompt(form, spec, variant),
      width: 704,
      height: 1024,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.image) {
    const error = new Error(payload.error || '图片生成服务不可用。')
    error.code = payload.code || 'IMAGE_PROVIDER_UNAVAILABLE'
    throw error
  }

  if (payload.mode !== 'visual-base' || payload.width !== 704 || payload.height !== 1024) {
    const error = new Error('图片服务仍在返回旧版素材，已阻止它混入规范排版。')
    error.code = 'LEGACY_PROVIDER_RESPONSE'
    throw error
  }

  return payload
}
