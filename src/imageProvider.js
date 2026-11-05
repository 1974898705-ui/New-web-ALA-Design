const configuredEndpoint = import.meta.env.VITE_IMAGE_PROVIDER_ENDPOINT?.trim()
const PROVIDER_ENDPOINT = configuredEndpoint || '/api/generate-image'

const themeDescriptions = {
  halloween: 'a compact friendly Halloween pumpkin, two tiny bats and restrained festive accents',
  ecommerce_sale: 'a compact gift bag, a price tag and one small parcel accent',
  christmas: 'a central Christmas gift box with a bow, a tiny bell and short pine sprigs',
  local_holiday_draft: 'a culturally neutral local-festival gift arrangement with one paper-cut floral accent',
  default: 'a compact festive gift arrangement with a bow and one local-festival accent',
}

function cleanCopy(value, fallback = '') {
  const copy = typeof value === 'string' ? value.trim().replace(/\|+$/u, '') : ''
  return copy || fallback
}

function optionalCopy(value) {
  const copy = cleanCopy(value)
  return /^(无|なし|none|n\/?a|-|—)$/iu.test(copy) ? '' : copy
}

export function buildPopupArtworkPrompt(form, spec, variant = 0) {
  const theme = themeDescriptions[spec.theme.id] ?? themeDescriptions.default
  const title = cleanCopy(form.title, '¡Algo especial para ti!')
  const subtitle = optionalCopy(form.subtitle)
  const primaryDescription = cleanCopy(form.copyOne, 'Max. descuento en intereses')
  const primaryOffer = cleanCopy(form.benefitOne, '30% off')
  const secondaryDescription = form.offerType === '双offer' ? optionalCopy(form.copyTwo) : ''
  const secondaryOffer = form.offerType === '双offer' ? optionalCopy(form.benefitTwo) : ''
  const cta = cleanCopy(form.buttonCopy, '¡Tómalo ya!')
  const offerInstructions = [
    `Primary benefit description: "${primaryDescription}".`,
    `Primary offer: "${primaryOffer}".`,
    secondaryDescription ? `Secondary benefit description: "${secondaryDescription}".` : '',
    secondaryOffer ? `Secondary offer: "${secondaryOffer}".` : '',
  ].filter(Boolean).join(' ')

  return [
    'Generate the FINAL COMPLETE portrait financial marketing popup artwork. This is not a header asset, not a component and not a mockup: every visible pixel of the complete popup must be designed in this one image.',
    'Use a clean 11:16 portrait composition corresponding to a 279×400 logical canvas, on a solid very light #F7F9FF background.',
    `Theme: ${theme}. Marketing category: ${form.category}. Variant: ${variant + 1}.`,
    'Create one centered card from x≈11% to 89% and y≈16% to 76% of the canvas. The card has one continuous silhouette, a quiet top edge, exactly 8 broad repeated scallops on each side and 6 along the bottom.',
    `Use two broad solid card regions: upper ${spec.palette.upper}, lower ${spec.palette.lower}, joined by one restrained narrow zigzag separator outside the text.`,
    'Place one compact flat-vector festive ornament behind the top of the card, centered and visibly occluded by it. The complete ornament must be no wider than half the card.',
    'Place the CTA as a separate pill at x≈8%, y≈81.5%, width≈85%, height≈11%, radius 50%, solid #1A55FF with white text. Keep the full gap between card and CTA empty.',
    'Roboto typography only. Offer is the strongest and largest information, then title, then CTA. Center all text and preserve generous spacing.',
    `Visible title, verbatim: "${title}".`,
    subtitle ? `Visible subtitle, verbatim: "${subtitle}".` : 'Do not render any subtitle.',
    offerInstructions,
    `CTA text, verbatim: "${cta}".`,
    'Render only the supplied visible text. Do not add labels, captions, logos, watermarks, badges or placeholder words.',
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
      mode: 'full-artwork',
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

  if (payload.mode !== 'full-artwork' || payload.width !== 704 || payload.height !== 1024) {
    const error = new Error('图片服务仍在返回旧版局部素材，已阻止它混入整图预览。')
    error.code = 'LEGACY_PROVIDER_RESPONSE'
    throw error
  }

  return payload
}
