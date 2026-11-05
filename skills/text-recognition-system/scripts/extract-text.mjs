const FIELD_ALIASES = {
  title: ['主标题', '标题', 'headline', 'title'],
  subtitle: ['副标题', '辅助标题', 'subheadline', 'subtitle'],
  category: ['营销类别', '营销类型', '弹窗类型', 'category'],
  offerType: ['权益offer', 'offer类型', '权益类型', 'offer数量', 'offertype'],
  copyOne: ['文案01', '文案1', '权益文案01', '权益文案1', '第一权益文案', 'offer1文案', 'copy1'],
  benefitOne: ['权益01', '权益1', '第一权益', 'offer1', 'benefit1'],
  copyTwo: ['文案02', '文案2', '权益文案02', '权益文案2', '第二权益文案', 'offer2文案', 'copy2'],
  benefitTwo: ['权益02', '权益2', '第二权益', 'offer2', 'benefit2'],
  buttonCopy: ['按钮文案', '行动按钮', '按钮', 'cta', 'button'],
  quantity: ['生成数量', '出图数量', '数量', 'quantity'],
  quality: ['生成质量', '图片质量', '质量', 'quality'],
}

const CATEGORY_KEYWORDS = [
  {
    value: '本土节日弹窗',
    pattern: /春节|元旦|圣诞|万圣|开斋|斋月|排灯|泼水节|情人节|母亲节|父亲节|中秋|国庆|节日|festival|holiday|christmas|halloween|ramadan|diwali|eid/iu,
  },
  {
    value: '营销氛围弹窗',
    pattern: /大促|促销|秒杀|限时|狂欢|周年庆|会员日|新品|黑五|双\s*1{2}|双\s*十二|618|sale|promotion|campaign|flash\s*sale/iu,
  },
  {
    value: '首页日常弹窗',
    pattern: /首页|日常|常规|通用|daily|evergreen|homepage/iu,
  },
]

const CTA_PATTERN = /立即|马上|现在|立刻|去领取|去购买|去使用|去查看|点击|领取|购买|查看详情|参与活动|apply\s*now|shop\s*now|get\s*it|learn\s*more|join\s*now/iu
const OFFER_PATTERN = /满\s*[¥￥$€£]?\s*\d[\d,.]*\s*减\s*[¥￥$€£]?\s*\d[\d,.]*|买\s*一\s*送\s*一|\d+(?:\.\d+)?\s*期\s*免息|(?:立减|直降|减免)\s*[¥￥$€£]?\s*\d[\d,.]*|[¥￥$€£]\s*\d[\d,.]*(?:\s*(?:元|mxn|usd|eur))?|\d+(?:\.\d+)?\s*%\s*(?:off)?|\d+(?:\.\d+)?\s*折|\d[\d,.]*\s*(?:元|mxn|usd|eur|金币|积分)/iu

const aliasToField = new Map(
  Object.entries(FIELD_ALIASES).flatMap(([field, aliases]) => (
    aliases.map((alias) => [normalizeKey(alias), field])
  )),
)

function normalizeKey(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[\s_\-—]+/gu, '')
}

function cleanValue(value) {
  return value
    .trim()
    .replace(/^["'“‘`]+|["'”’`]+$/gu, '')
    .replace(/[|｜]+$/gu, '')
    .trim()
}

function splitContent(text) {
  return text
    .normalize('NFKC')
    .replace(/\r\n?/gu, '\n')
    .split(/\n|[；;]+/u)
    .flatMap((line) => {
      const cleaned = line.replace(/^\s*(?:[-*•·]|\d+[.)、])\s*/u, '').trim()
      if (!cleaned) return []
      if (cleaned.length < 32) return [cleaned]
      return cleaned.split(/(?<=[。！？!?])\s*/u).map((part) => part.trim()).filter(Boolean)
    })
}

function parseLabeledSegment(segment) {
  const match = segment.match(/^([^:：]{1,24})\s*[:：]\s*(.+)$/u)
  if (!match) return null

  const field = aliasToField.get(normalizeKey(match[1]))
  if (!field) return null

  return { field, value: cleanValue(match[2]), evidence: segment }
}

function normalizeCategory(value) {
  const exact = CATEGORY_KEYWORDS.find((entry) => entry.pattern.test(value))
  if (exact) return exact.value
  if (/本土/iu.test(value)) return '本土节日弹窗'
  if (/营销|氛围/iu.test(value)) return '营销氛围弹窗'
  if (/首页|日常/iu.test(value)) return '首页日常弹窗'
  return null
}

function normalizeOfferType(value) {
  if (/双|2|two|double/iu.test(value)) return '双offer'
  if (/单|1|one|single/iu.test(value)) return '单offer'
  return null
}

function normalizeQuantity(value) {
  const match = value.match(/[1-4]/u)
  return match?.[0] ?? null
}

function normalizeQuality(value) {
  if (/high|高清|高质量|精细/iu.test(value)) return 'High'
  if (/medium|中等|标准/iu.test(value)) return 'Medium'
  if (/low|低清|低质量|草图/iu.test(value)) return 'Low'
  return null
}

function normalizeLabeledValue(field, value) {
  if (field === 'category') return normalizeCategory(value)
  if (field === 'offerType') return normalizeOfferType(value)
  if (field === 'quantity') return normalizeQuantity(value)
  if (field === 'quality') return normalizeQuality(value)
  return cleanValue(value)
}

function findOffers(segments) {
  const results = []
  const seen = new Set()

  segments.forEach((segment) => {
    const matches = segment.match(new RegExp(OFFER_PATTERN.source, 'giu')) ?? []
    matches.forEach((raw) => {
      const value = cleanValue(raw).replace(/\s+/gu, '')
      const key = value.toLowerCase()
      if (!value || seen.has(key)) return
      seen.add(key)
      results.push({ value, evidence: segment })
    })
  })

  return results.slice(0, 2)
}

function removeOffer(text) {
  return cleanValue(
    text
      .replace(new RegExp(OFFER_PATTERN.source, 'giu'), ' ')
      .replace(/\s{2,}/gu, ' ')
      .replace(/^[,，:：+＋/\-—\s]+|[,，:：+＋/\-—\s]+$/gu, ''),
  )
}

function setResult(result, field, value, confidence, evidence) {
  if (!value || result.values[field]) return
  result.values[field] = value
  result.confidence[field] = confidence
  result.evidence[field] = evidence
}

function isOfferHeavy(segment) {
  const withoutOffer = removeOffer(segment)
  return OFFER_PATTERN.test(segment) && withoutOffer.length <= 6
}

export function extractDesignBrief(input) {
  const text = typeof input === 'string' ? input.trim() : ''
  const result = { values: {}, confidence: {}, evidence: {}, warnings: [] }

  if (!text) {
    result.warnings.push('没有可识别的文本内容。')
    return result
  }

  const segments = splitContent(text)
  const unlabeled = []

  segments.forEach((segment) => {
    const labeled = parseLabeledSegment(segment)
    if (!labeled) {
      unlabeled.push(segment)
      return
    }

    const normalized = normalizeLabeledValue(labeled.field, labeled.value)
    if (normalized) setResult(result, labeled.field, normalized, 'high', labeled.evidence)
  })

  if (!result.values.category) {
    const inferredCategory = CATEGORY_KEYWORDS.find((entry) => entry.pattern.test(text))
    if (inferredCategory) {
      setResult(result, 'category', inferredCategory.value, 'medium', text.match(inferredCategory.pattern)?.[0] ?? text)
    }
  }

  const explicitOfferType = normalizeOfferType(text.match(/(?:单|双|single|double|one|two)\s*offer/iu)?.[0] ?? '')
  if (!result.values.offerType && explicitOfferType) {
    setResult(result, 'offerType', explicitOfferType, 'high', text.match(/(?:单|双|single|double|one|two)\s*offer/iu)?.[0])
  }

  const offers = findOffers(segments)
  if (!result.values.benefitOne && offers[0]) {
    setResult(result, 'benefitOne', offers[0].value, 'medium', offers[0].evidence)
  }
  if (!result.values.benefitTwo && offers[1]) {
    setResult(result, 'benefitTwo', offers[1].value, 'medium', offers[1].evidence)
  }

  if (!result.values.offerType && (result.values.benefitOne || result.values.benefitTwo)) {
    const offerCount = result.values.benefitTwo ? 2 : 1
    setResult(result, 'offerType', offerCount === 2 ? '双offer' : '单offer', 'medium', `${offerCount} 项有效权益`)
  }

  const offerEvidence = [
    result.evidence.benefitOne,
    result.evidence.benefitTwo,
  ].filter(Boolean)

  if (!result.values.copyOne && offerEvidence[0]) {
    const copy = removeOffer(offerEvidence[0])
    if (copy && !parseLabeledSegment(offerEvidence[0])) setResult(result, 'copyOne', copy, 'medium', offerEvidence[0])
  }
  if (!result.values.copyTwo && offerEvidence[1]) {
    const copy = removeOffer(offerEvidence[1])
    if (copy && !parseLabeledSegment(offerEvidence[1])) setResult(result, 'copyTwo', copy, 'medium', offerEvidence[1])
  }

  if (!result.values.buttonCopy) {
    const cta = unlabeled.find((segment) => CTA_PATTERN.test(segment) && segment.length <= 30)
    if (cta) setResult(result, 'buttonCopy', cleanValue(cta), 'medium', cta)
  }

  const narrative = unlabeled.filter((segment) => (
    !CTA_PATTERN.test(segment)
    && !isOfferHeavy(segment)
    && segment.length <= 80
  ))

  if (!result.values.title && narrative[0]) {
    setResult(result, 'title', cleanValue(narrative[0]), 'medium', narrative[0])
  }
  if (!result.values.subtitle && narrative[1] && narrative[1] !== result.evidence.copyOne) {
    setResult(result, 'subtitle', cleanValue(narrative[1]), 'low', narrative[1])
  }

  if (result.values.offerType === '单offer') {
    delete result.values.copyTwo
    delete result.values.benefitTwo
    delete result.confidence.copyTwo
    delete result.confidence.benefitTwo
    delete result.evidence.copyTwo
    delete result.evidence.benefitTwo
  }

  if (Object.keys(result.values).length === 0) {
    result.warnings.push('未找到可安全映射到二级页面的字段。')
  }

  return result
}

export const textRecognitionSchema = {
  categories: CATEGORY_KEYWORDS.map((entry) => entry.value),
  offerTypes: ['单offer', '双offer'],
  quantities: ['1', '2', '3', '4'],
  qualities: ['High', 'Medium', 'Low'],
}
