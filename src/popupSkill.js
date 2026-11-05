import { parse } from 'yaml'

import skillSource from '../skills/financial-marketing-popup-generator/references/skill.yaml?raw'
import layoutSource from '../skills/financial-marketing-popup-generator/references/rules/layout.yaml?raw'
import ctaSource from '../skills/financial-marketing-popup-generator/references/rules/cta.yaml?raw'
import typographySource from '../skills/financial-marketing-popup-generator/references/rules/typography.yaml?raw'
import topVisualSource from '../skills/financial-marketing-popup-generator/references/rules/top-visual.yaml?raw'
import colorsSource from '../skills/financial-marketing-popup-generator/references/rules/colors.yaml?raw'
import edgeSource from '../skills/financial-marketing-popup-generator/references/rules/edge-language.yaml?raw'
import graphicStyleSource from '../skills/financial-marketing-popup-generator/references/rules/graphic-style.yaml?raw'
import validationSource from '../skills/financial-marketing-popup-generator/references/rules/validation.yaml?raw'
import themesSource from '../skills/financial-marketing-popup-generator/references/examples/themes.yaml?raw'

const rawModules = {
  skill: parse(skillSource),
  layout: parse(layoutSource),
  cta: parse(ctaSource),
  typography: parse(typographySource),
  topVisual: parse(topVisualSource),
  colors: parse(colorsSource),
  edge: parse(edgeSource),
  graphicStyle: parse(graphicStyleSource),
  validation: parse(validationSource),
  themes: parse(themesSource),
}

const ruleCodes = new Set(
  Object.values(rawModules.validation.hard_reject)
    .flat()
    .map((rule) => rule.code),
)

const fallbackPalettes = [
  { upper: '#FF5290', lower: '#008CFF' },
  { upper: '#FFA423', lower: '#FF5290' },
  { upper: '#008CFF', lower: '#FFA423' },
]

const themeProfiles = Object.entries(rawModules.themes.themes)

const doubleOfferPalettes = [
  { upper: '#FF5290', lower: '#008CFF' },
  { upper: '#FFA423', lower: '#FF5290' },
  { upper: '#008CFF', lower: '#FFA423' },
]

function sameBox(actual, expected) {
  return ['x', 'y', 'width', 'height'].every((key) => actual[key] === expected[key])
}

function addIssue(issues, code, message) {
  issues.push({
    code: ruleCodes.has(code) ? code : 'SKILL_RUNTIME_MISMATCH',
    message,
  })
}

export const popupSkillRuntime = {
  id: rawModules.skill.package.id,
  name: rawModules.skill.package.name,
  version: rawModules.skill.package.version,
  modules: rawModules,
  canvas: rawModules.layout.canvas,
  centerX: rawModules.layout.center_axis.x,
  card: rawModules.layout.components.card.bounding_box,
  title: rawModules.layout.components.title.bounding_box,
  offer: rawModules.layout.components.offer_text.bounding_box,
  cta: {
    ...rawModules.cta.geometry.composite_bounding_box,
    radius: rawModules.cta.geometry.border_radius,
    fill: rawModules.cta.appearance.fill,
    text: rawModules.cta.appearance.text_color,
  },
  topVisual: {
    width: rawModules.topVisual.geometry.logical_width,
    centerX: rawModules.topVisual.geometry.center_x,
    preferredHeight: rawModules.topVisual.geometry.height.preferred,
    maxHeight: rawModules.topVisual.geometry.height.maximum,
  },
  edgeCounts: {
    left: rawModules.edge.repeat_counts.left,
    right: rawModules.edge.repeat_counts.right,
    bottom: rawModules.edge.repeat_counts.bottom,
  },
  typography: rawModules.typography.role_mapping,
  corePalette: rawModules.colors.core_palette,
  themeProfiles,
}

export function createPopupSpec(form, variant = 0) {
  const skill = popupSkillRuntime
  const isSkillScoped = form.offerType === '单offer' && form.category === '本土节日弹窗'

  if (!isSkillScoped) {
    const palette = doubleOfferPalettes[variant % doubleOfferPalettes.length]
    const categoryLabel = {
      首页日常弹窗: '日常',
      本土节日弹窗: '节日',
      营销氛围弹窗: '营销氛围',
    }[form.category] ?? '通用'
    const draftName = `${form.offerType === '单offer' ? '单' : '双'} Offer ${categoryLabel}测试模板`

    return {
      governedBySkill: false,
      skill: null,
      theme: {
        id: form.category === '本土节日弹窗' ? 'local_holiday_draft' : 'ecommerce_sale',
        name: draftName,
        symbol: 'gift arrangement',
        edgeProfile: 'rounded_scallop',
      },
      canvas: { x: 0, y: 0, width: 279, height: 400, background: 'transparent' },
      centerX: 139.5,
      card: { x: 30, y: 65, width: 219, height: 240 },
      titleBox: { x: 45, y: 87, width: 189, height: 45 },
      offerBox: { x: 45, y: 163, width: 189, height: 105 },
      cta: { x: 21, y: 326, width: 237, height: 44, radius: 22, fill: '#1A55FF', text: '#FFFFFF' },
      topVisual: { width: 109.5, centerX: 139.5, preferredHeight: 34, maxHeight: 44 },
      edges: { left: 8, right: 8, bottom: 6 },
      palette: {
        upper: palette.upper,
        lower: palette.lower,
        cta: '#1A55FF',
        neutral: '#FFFFFF',
        dark: '#16325C',
      },
      typography: {
        title: { weight: 700 },
        benefit_description: { weight: 400 },
        offer_primary_value: { weight: 900 },
        offer_percentage: { weight: 900 },
        offer_suffix: { weight: 500 },
        offer_supporting_text: { weight: 500 },
        cta: { weight: 900 },
      },
      copy: { ...form },
    }
  }

  const themeIndex = form.category === '本土节日弹窗'
    ? variant % 2
    : (variant + 2) % themeProfiles.length
  const themeEntry = themeProfiles[themeIndex]
  const theme = themeEntry?.[1]
  const fallback = fallbackPalettes[variant % fallbackPalettes.length]
  const themePalette = theme?.color_partition

  return {
    governedBySkill: true,
    skill: {
      id: skill.id,
      version: skill.version,
    },
    theme: {
      id: themeEntry?.[0] ?? 'default',
      name: theme?.display_name ?? '默认主题',
      symbol: theme?.top_visual?.primary_symbol ?? 'gift arrangement',
      edgeProfile: theme?.edge_profile?.outer_card ?? 'rounded_scallop',
    },
    canvas: { ...skill.canvas },
    centerX: skill.centerX,
    card: { ...skill.card },
    titleBox: { ...skill.title },
    offerBox: { ...skill.offer },
    cta: { ...skill.cta },
    topVisual: { ...skill.topVisual },
    edges: {
      left: theme?.edge_profile?.repeat_counts?.left ?? 8,
      right: theme?.edge_profile?.repeat_counts?.right ?? 8,
      bottom: theme?.edge_profile?.repeat_counts?.bottom ?? 6,
    },
    palette: {
      upper: themePalette?.upper ?? fallback.upper,
      lower: themePalette?.lower ?? fallback.lower,
      cta: skill.cta.fill,
      neutral: '#FFFFFF',
      dark: '#16325C',
    },
    typography: skill.typography,
    copy: { ...form },
  }
}

export function validatePopupSpec(spec, { fontReady = false, generatedVisual = false } = {}) {
  const skill = popupSkillRuntime

  if (!spec.governedBySkill) {
    const scopeIssues = []

    if (spec.copy.offerType !== '单offer') {
      scopeIssues.push('仅支持单 offer')
    }
    if (spec.copy.category !== '本土节日弹窗') {
      scopeIssues.push('仅用于本土节日弹窗')
    }

    return {
      passed: false,
      status: 'unscoped',
      issues: [{
        code: 'SKILL_SCOPE_MISMATCH',
        message: `当前技能包${scopeIssues.join('，')}；本次结果为未套用规范的测试稿`,
      }],
      checkedRuleCount: 0,
      skillVersion: skill.version,
    }
  }

  const issues = []

  if (spec.canvas.width !== 279 || spec.canvas.height !== 400 || spec.canvas.background !== 'transparent') {
    addIssue(issues, 'LAYOUT_CANVAS_MISMATCH', '画布必须为 279×400 透明背景')
  }
  if (!sameBox(spec.card, skill.card)) {
    addIssue(issues, 'LAYOUT_CARD_CHANGED', '卡片坐标或尺寸偏离技能规范')
  }
  if (!sameBox(spec.titleBox, skill.title)) {
    addIssue(issues, 'LAYOUT_TITLE_CHANGED', '标题安全区偏离技能规范')
  }
  if (!sameBox(spec.offerBox, skill.offer)) {
    addIssue(issues, 'LAYOUT_OFFER_TEXT_CHANGED', 'Offer 安全区偏离技能规范')
  }
  if (!sameBox(spec.cta, skill.cta)) {
    addIssue(issues, 'LAYOUT_CTA_CHANGED', 'CTA 坐标或尺寸偏离技能规范')
  }
  if (spec.cta.fill !== '#1A55FF') {
    addIssue(issues, 'CTA_COLOR_CHANGED', 'CTA 必须使用 #1A55FF')
  }
  if (spec.cta.radius !== 22) {
    addIssue(issues, 'CTA_NOT_PILL', 'CTA 必须为 237×44、半径 22 的胶囊')
  }
  if (spec.topVisual.width !== 109.5) {
    addIssue(issues, 'TOP_WIDTH_NOT_50_PERCENT', '顶部视觉必须严格为卡片宽度的 50%')
  }
  if (spec.topVisual.centerX !== 139.5) {
    addIssue(issues, 'TOP_NOT_CENTERED', '顶部视觉必须水平居中')
  }
  if (
    spec.edges.left < skill.edgeCounts.left.min ||
    spec.edges.left > skill.edgeCounts.left.max ||
    spec.edges.right < skill.edgeCounts.right.min ||
    spec.edges.right > skill.edgeCounts.right.max ||
    spec.edges.bottom < skill.edgeCounts.bottom.min ||
    spec.edges.bottom > skill.edgeCounts.bottom.max
  ) {
    addIssue(issues, 'EDGE_REPEAT_COUNT_INVALID', '左右花边需 7–9 个，底部需 5–7 个')
  }
  if (!fontReady) {
    addIssue(issues, 'FONT_SUBSTITUTED', 'Roboto 尚未加载，当前结果只能作为草案')
  }
  const visibleCopy = [
    spec.copy.title,
    spec.copy.subtitle,
    spec.copy.copyOne,
    spec.copy.benefitOne,
    spec.copy.offerType === '双offer' ? spec.copy.copyTwo : '',
    spec.copy.offerType === '双offer' ? spec.copy.benefitTwo : '',
    spec.copy.buttonCopy,
  ].join('')
  if (/[\u2e80-\u9fff]/u.test(visibleCopy)) {
    addIssue(issues, 'FONT_SUBSTITUTED', 'Roboto 不包含当前中文文案字形，请改用拉丁字符或明确调整字体规范')
  }
  if (generatedVisual) {
    issues.push({
      code: 'TOP_VISUAL_UNVERIFIED',
      message: 'AI 生成的顶部视觉需人工确认纯色、扁平、无文字且没有渐变或写实光影',
    })
  }

  return {
    passed: issues.length === 0,
    status: issues.length === 0 ? 'pass' : 'draft',
    issues,
    checkedRuleCount: 11,
    skillVersion: skill.version,
  }
}
