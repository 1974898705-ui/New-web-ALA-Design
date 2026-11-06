import { useEffect, useRef, useState } from 'react'
import { createPopupSpec, popupSkillRuntime, validatePopupSpec } from './popupSkill.js'
import { generatePopupArtwork } from './imageProvider.js'
import { extractDesignBrief } from '../skills/text-recognition-system/scripts/extract-text.mjs'

const ASSET_ROOT = `${import.meta.env.BASE_URL}assets`

const ASSETS = {
  logo: `${ASSET_ROOT}/ala-design.svg`,
  chevron: `${ASSET_ROOT}/chevron-down.svg`,
  previous: `${ASSET_ROOT}/chevron-left.svg`,
  next: `${ASSET_ROOT}/chevron-right.svg`,
  download: `${ASSET_ROOT}/download.svg`,
  completed: `${ASSET_ROOT}/completed.svg`,
  history: `${ASSET_ROOT}/history.svg`,
  homeBackground: `${ASSET_ROOT}/home-background.png`,
  homeInputBar: `${ASSET_ROOT}/home-input-bar.svg`,
  miniLogo: `${ASSET_ROOT}/ala-design-mini.svg`,
  extractArrow: `${ASSET_ROOT}/extract-arrow.svg`,
  uploadImage: `${ASSET_ROOT}/upload-image.svg`,
}

const tabs = [
  { id: 'popup', label: 'Pop-up Design' },
  { id: 'push', label: 'Push Design' },
  { id: 'banner', label: 'Banner Design' },
]

const headerActions = [
  { id: 'completed', label: '已完成', icon: ASSETS.completed },
  { id: 'history', label: '历史记录', icon: ASSETS.history },
]

function AppHeader({
  variant = 'workspace',
  activeTab,
  activeModuleAction,
  onHome,
  onSelectModule,
  onSelectAction,
}) {
  return (
    <header className={`topbar ${variant === 'home' ? 'home-topbar' : ''}`}>
      <button className="brand" type="button" aria-label="ALA Design 首页" onClick={onHome}>
        <img src={ASSETS.logo} alt="ALA Design" />
      </button>
      <nav className="navigation" aria-label="设计类型">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            type="button"
            onClick={() => onSelectModule(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="header-actions" aria-label="素材记录">
        {headerActions.map((action) => {
          const isSelected = activeModuleAction?.moduleId === activeTab && activeModuleAction?.actionId === action.id

          return (
            <div className="header-action" key={action.id} data-module={activeTab}>
              <button
                className={`header-action-button ${isSelected ? 'selected' : ''}`}
                type="button"
                aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label} · ${action.label}`}
                aria-describedby={`${variant}-${action.id}-tooltip`}
                aria-pressed={isSelected}
                onClick={() => onSelectAction(action.id)}
              >
                <img src={action.icon} alt="" />
              </button>
              <span className="header-action-tooltip" id={`${variant}-${action.id}-tooltip`} role="tooltip">
                {action.label}
              </span>
            </div>
          )
        })}
      </div>
    </header>
  )
}

function LandingPage({
  activeTab,
  activeModuleAction,
  onHome,
  onSelectModule,
  onSelectAction,
  onExtract,
}) {
  const [brief, setBrief] = useState('')
  const [uploadedImages, setUploadedImages] = useState([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState('')
  const uploadInput = useRef(null)

  useEffect(() => () => {
    uploadedImages.forEach((image) => {
      if (image.preview) URL.revokeObjectURL(image.preview)
    })
  }, [uploadedImages])

  function handleUpload(event) {
    setExtractionError('')
    uploadedImages.forEach((image) => {
      if (image.preview) URL.revokeObjectURL(image.preview)
    })

    const nextImages = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 4)
      .map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        name: `图片${index + 1}`,
        file,
        preview: URL.createObjectURL(file),
      }))

    setUploadedImages(nextImages)
  }

  async function submitBrief(event) {
    event.preventDefault()
    if (isExtracting) return

    if (!brief.trim() && uploadedImages.length === 0) {
      setExtractionError('请先输入')
      return
    }

    setExtractionError('')
    setIsExtracting(true)

    try {
      await onExtract(brief, uploadedImages)
    } catch (error) {
      console.error(error)
      setExtractionError('请重试')
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="home-screen">
      <img className="home-background" src={ASSETS.homeBackground} alt="" />
      <AppHeader
        variant="home"
        activeTab={activeTab}
        activeModuleAction={activeModuleAction}
        onHome={onHome}
        onSelectModule={onSelectModule}
        onSelectAction={onSelectAction}
      />

      <main className="home-content">
        <div className="home-stage">
          <div className="home-heading">
            <h1>输入你的需求</h1>
            <p>你可以复制需求文案内容或者上传需求内容截图</p>
          </div>

          <form className="brief-panel" onSubmit={submitBrief} aria-busy={isExtracting}>
            <div className="brief-toolbar">
              <img className="brief-toolbar-background" src={ASSETS.homeInputBar} alt="" />
              <img className="brief-mini-logo" src={ASSETS.miniLogo} alt="ALA Design" />
              <div className="extract-control">
                <span className="extract-label" aria-live="polite">
                  {isExtracting ? '识别中…' : extractionError || '提取需求'}
                </span>
                <button className="extract-button-icon" type="submit" aria-label="提取需求" disabled={isExtracting}>
                  <img src={ASSETS.extractArrow} alt="" />
                </button>
              </div>
            </div>

            <div className="brief-body">
              <label className="sr-only" htmlFor="requirement-brief">需求文案内容</label>
              <textarea
                id="requirement-brief"
                value={brief}
                onChange={(event) => {
                  setBrief(event.target.value)
                  setExtractionError('')
                }}
                placeholder="输入你的需求文案内容，我来自动提取"
              />

              <div className="upload-list" aria-label="需求截图">
                {uploadedImages.map((image) => (
                  <div
                    className={`upload-preview ${image.preview ? 'has-image' : ''}`}
                    key={image.id}
                    style={image.preview ? { backgroundImage: `url(${image.preview})` } : undefined}
                  >
                    <span>{image.name}</span>
                  </div>
                ))}
                <button
                  className="upload-button"
                  type="button"
                  aria-label="上传需求内容截图"
                  onClick={() => uploadInput.current?.click()}
                >
                  <img src={ASSETS.uploadImage} alt="" />
                </button>
                <input
                  ref={uploadInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleUpload}
                />
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

function cleanDraftCopy(value, fallback) {
  const cleaned = value.trim().replace(/\|+$/, '')
  return cleaned || fallback
}

function splitTitle(value) {
  const title = cleanDraftCopy(value, '¡Algo especial para ti!')

  if (title.length <= 22) return [title]

  const midpoint = Math.min(22, Math.ceil(title.length / 2))
  const nearbySpace = title.lastIndexOf(' ', midpoint)
  const splitAt = nearbySpace > 8 ? nearbySpace : midpoint

  return [title.slice(0, splitAt).trim(), title.slice(splitAt).trim().slice(0, 24)]
}

function parseOffer(value) {
  const offer = cleanDraftCopy(value, '30%OFF')
  const match = offer.match(/^([^\d]*)([\d.,]+)\s*(%?)\s*(.*)$/)

  if (!match) return { prefix: '', value: offer.slice(0, 10), symbol: '', suffix: '' }

  return {
    prefix: match[1].trim(),
    value: match[2],
    symbol: match[3],
    suffix: match[4].trim(),
  }
}

function distribute(start, end, count) {
  if (count <= 1) return [start]
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1))
}

function ThemeVisual({ spec, generatedImage, clipId }) {
  const { topVisual, card, theme, palette } = spec
  const x = topVisual.centerX - topVisual.width / 2
  const y = card.y - 37

  if (generatedImage) {
    return (
      <g data-layer="top-visual" aria-label="AI 生成顶部主题插画" transform={`translate(${x} ${y})`}>
        <defs>
          <clipPath id={clipId}>
            <rect width={topVisual.width} height={topVisual.maxHeight} rx="3" />
          </clipPath>
        </defs>
        <rect width={topVisual.width} height={topVisual.maxHeight} rx="3" fill={palette.upper} />
        <image
          href={generatedImage}
          width={topVisual.width}
          height={topVisual.maxHeight}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      </g>
    )
  }

  if (theme.id === 'halloween') {
    return (
      <g data-layer="top-visual" aria-label="万圣节顶部主题插画" transform={`translate(${x} ${y})`}>
        <rect width={topVisual.width} height={topVisual.maxHeight} fill="transparent" />
        <path d="M35 36C35 20 44 10 55 10C66 10 75 20 75 36V44H35Z" fill={palette.upper} />
        <path d="M55 9V3M48 7C52 2 58 2 62 7" fill="none" stroke={palette.lower} strokeWidth="4" strokeLinecap="round" />
        <path d="M45 25L50 21L54 25M60 25L64 21L68 25M49 34C54 38 60 38 65 34" fill="none" stroke="#16325C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M10 19L18 14L25 19L20 19L18 24L16 19Z" fill={palette.lower} />
        <path d="M87 8C95 8 101 13 102 20C98 17 92 17 88 20C90 14 89 11 87 8Z" fill={palette.lower} />
      </g>
    )
  }

  if (theme.id === 'ecommerce_sale') {
    return (
      <g data-layer="top-visual" aria-label="电商大促顶部主题插画" transform={`translate(${x} ${y})`}>
        <rect width={topVisual.width} height={topVisual.maxHeight} fill="transparent" />
        <path d="M36 14H74L78 44H32Z" fill={palette.upper} />
        <path d="M45 15C45 4 65 4 65 15" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <path d="M44 28H66" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <path d="M11 19H34V35H11L6 27Z" fill={palette.lower} />
        <circle cx="17" cy="27" r="2.5" fill="#FFFFFF" />
        <rect x="79" y="23" width="24" height="18" rx="3" fill="#FFA423" />
        <path d="M84 28H98M84 34H94" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </g>
    )
  }

  return (
    <g data-layer="top-visual" aria-label="圣诞顶部主题插画" transform={`translate(${x} ${y})`}>
      <rect width={topVisual.width} height={topVisual.maxHeight} fill="transparent" />
      <path d="M5 32H104V47H5Z" fill={palette.lower} />
      <rect x="15" y="17" width="32" height="27" rx="3" fill="#FFA423" />
      <rect x="54" y="12" width="39" height="32" rx="3" fill="#FF5290" />
      <path d="M29 17V44M15 27H47M73 12V44M54 23H93" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M54 16C37 10 34 -3 45 -1C51 0 54 9 54 16Z" fill="#1A55FF" />
      <path d="M54 16C71 10 74 -3 63 -1C57 0 54 9 54 16Z" fill="#1A55FF" />
      <circle cx="54" cy="15" r="6" fill="#008CFF" />
      <path d="M7 34L1 26M102 34L108 26" stroke="#FFA423" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

function PopupArtwork({ result }) {
  const { spec } = result
  const { canvas, card, titleBox, offerBox, cta, palette, edges, centerX, typography } = spec
  const titleLines = splitTitle(result.form.title)
  const offer = parseOffer(result.form.benefitOne)
  const secondaryOffer = cleanDraftCopy(result.form.benefitTwo, '')
  const hasSecondOffer = result.form.offerType === '双offer' && secondaryOffer
  const edgeRadius = 6
  const leftEdgeX = card.x + edgeRadius
  const rightEdgeX = card.x + card.width - edgeRadius
  const bottomEdgeY = card.y + card.height - edgeRadius
  const sideMotifs = distribute(card.y + 25, card.y + card.height - 33, edges.left)
  const bottomMotifs = distribute(card.x + 24, card.x + card.width - 25, edges.bottom)
  const splitY = Math.round(((titleBox.y + titleBox.height) + offerBox.y) / 2)
  const separatorPoints = distribute(card.x, card.x + card.width, 29)
    .map((x, index) => `${x},${splitY + (index % 2 === 0 ? 4 : -4)}`)
    .join(' ')
  const titleY = titleLines.length === 1 ? titleBox.y + 16 : titleBox.y + 13
  const upperText = palette.upper === '#FFA423' ? palette.dark : palette.neutral
  const lowerText = palette.lower === '#FFA423' ? palette.dark : palette.neutral
  const mainOfferY = offerBox.y + (hasSecondOffer ? 53 : 72)
  const titleWeight = typography.title.weight
  const benefitWeight = typography.benefit_description.weight
  const primaryWeight = typography.offer_primary_value.weight
  const suffixWeight = typography.offer_suffix.weight
  const cardClipId = `card-silhouette-${result.id}`
  const baseFilterId = `remove-key-background-${result.id}`

  const copyLayers = (
    <>
      <g data-layer="card-content" aria-label="规范排版文案">
        {!result.generatedArtwork && (
          <polyline points={separatorPoints} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" opacity="0.9" />
        )}
        <text x={centerX} y={titleY} fill={upperText} fontFamily="Roboto" fontSize="18" fontWeight={titleWeight} textAnchor="middle">
          {titleLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={centerX} dy={index === 0 ? 0 : 20}>
              {line}
            </tspan>
          ))}
        </text>
        {titleLines.length === 1 && cleanDraftCopy(result.form.subtitle, '') && (
          <text x={centerX} y={titleBox.y + 36} fill={upperText} fontFamily="Roboto" fontSize="9" fontWeight={suffixWeight} textAnchor="middle">
            {cleanDraftCopy(result.form.subtitle, '').slice(0, 38)}
          </text>
        )}
        <g fill={lowerText} fontFamily="Roboto" textAnchor="middle">
          <text x={centerX} y={offerBox.y + 13} fontSize="10" fontWeight={benefitWeight}>
            {cleanDraftCopy(result.form.copyOne, 'Max. descuento en intereses').slice(0, 34)}
          </text>
          <text x={centerX} y={mainOfferY} fontWeight={primaryWeight}>
            {offer.prefix && <tspan fontSize="22">{offer.prefix}</tspan>}
            <tspan fontSize={offer.value.length > 5 ? '40' : hasSecondOffer ? '48' : '60'}>{offer.value}</tspan>
            {offer.symbol && <tspan fontSize={hasSecondOffer ? '28' : '34'}>{offer.symbol}</tspan>}
          </text>
          {offer.suffix && (
            <text x={centerX + 50} y={mainOfferY + 16} fontSize="17" fontWeight={suffixWeight}>
              {offer.suffix.slice(0, 8)}
            </text>
          )}
          {hasSecondOffer && (
            <>
              <text x={centerX} y={offerBox.y + 82} fontSize="9" fontWeight={benefitWeight}>
                {cleanDraftCopy(result.form.copyTwo, '').slice(0, 34)}
              </text>
              <text x={centerX} y={offerBox.y + 102} fontSize="17" fontWeight={primaryWeight}>
                {secondaryOffer.slice(0, 16)}
              </text>
            </>
          )}
        </g>
      </g>

      <g data-layer="cta" aria-label="规范 CTA">
        <rect x={cta.x} y={cta.y} width={cta.width} height={cta.height} rx={cta.radius} fill={cta.fill} />
        <text
          x={centerX}
          y={cta.y + cta.height / 2 + 6}
          fill={cta.text}
          fontFamily="Roboto"
          fontSize="16"
          fontWeight={typography.cta.weight}
          textAnchor="middle"
        >
          {cleanDraftCopy(result.form.buttonCopy, '¡Tómalo ya!').slice(0, 24)}
        </text>
      </g>
    </>
  )

  if (result.generatedArtwork) {
    return (
      <svg
        className="popup-artwork"
        viewBox={`${canvas.x} ${canvas.y} ${canvas.width} ${canvas.height}`}
        role="img"
        aria-label={`Cloudflare 视觉底图与规范排版素材 ${result.variant + 1}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={baseFilterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"
            />
          </filter>
          <clipPath id={`${cardClipId}-generated`}>
            <rect x="18" y="8" width="243" height="298" rx="14" />
          </clipPath>
        </defs>
        <image
          href={result.generatedArtwork}
          x={canvas.x}
          y={canvas.y}
          width={canvas.width}
          height={canvas.height}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${cardClipId}-generated)`}
          filter={`url(#${baseFilterId})`}
        />
        {copyLayers}
      </svg>
    )
  }

  return (
    <svg
      className="popup-artwork"
      viewBox={`${canvas.x} ${canvas.y} ${canvas.width} ${canvas.height}`}
      role="img"
      aria-label={`测试生成素材 ${result.variant + 1}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={cardClipId}>
          <rect x={leftEdgeX} y={card.y} width={card.width - edgeRadius * 2} height={card.height - edgeRadius} rx="8" />
          <rect x={card.x} y={card.y} width={card.width} height="20" rx="10" />
          {spec.theme.edgeProfile === 'stepped_diamond' ? (
            <>
              {sideMotifs.map((y) => (
                <polygon key={`left-clip-${y}`} points={`${leftEdgeX - 6},${y} ${leftEdgeX},${y - 7} ${leftEdgeX + 6},${y} ${leftEdgeX},${y + 7}`} />
              ))}
              {sideMotifs.map((y) => (
                <polygon key={`right-clip-${y}`} points={`${rightEdgeX - 6},${y} ${rightEdgeX},${y - 7} ${rightEdgeX + 6},${y} ${rightEdgeX},${y + 7}`} />
              ))}
              {bottomMotifs.map((x) => (
                <polygon key={`bottom-clip-${x}`} points={`${x - 7},${bottomEdgeY} ${x},${bottomEdgeY - 6} ${x + 7},${bottomEdgeY} ${x},${bottomEdgeY + 6}`} />
              ))}
            </>
          ) : (
            <>
              {sideMotifs.map((y) => <circle key={`left-clip-${y}`} cx={leftEdgeX} cy={y} r={edgeRadius} />)}
              {sideMotifs.map((y) => <circle key={`right-clip-${y}`} cx={rightEdgeX} cy={y} r={edgeRadius} />)}
              {bottomMotifs.map((x) => <circle key={`bottom-clip-${x}`} cx={x} cy={bottomEdgeY} r={edgeRadius} />)}
            </>
          )}
        </clipPath>
      </defs>

      <ThemeVisual spec={spec} generatedImage={null} clipId={`local-top-${result.id}`} />

      <g data-layer="card" clipPath={`url(#${cardClipId})`} aria-label="营销卡片">
        <rect x={card.x} y={card.y} width={card.width} height={splitY - card.y} fill={palette.upper} />
        <rect x={card.x} y={splitY} width={card.width} height={(card.y + card.height) - splitY} fill={palette.lower} />
      </g>

      {copyLayers}
    </svg>
  )
}

function TextField({ label, value, onChange, name }) {
  return (
    <label className="form-row">
      <span className="field-label">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
    </label>
  )
}

function Dropdown({ id, label, value, options, onChange, isOpen, onToggle, compact = false }) {
  return (
    <div className={`dropdown-field${compact ? ' compact-dropdown' : ''}`} data-dropdown={id}>
      {label && <span className="dropdown-label">{label}</span>}
      <div className="dropdown-control">
        <button
          className={`dropdown-trigger${isOpen ? ' open' : ''}`}
          type="button"
          aria-label={`${label || id}：${value}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={onToggle}
        >
          <span>{value}</span>
          <img src={ASSETS.chevron} alt="" />
        </button>
        {isOpen && (
          <div className="dropdown-menu" role="listbox" aria-label={label || id}>
            {options.map((option) => (
              <button
                key={option}
                className={option === value ? 'selected' : ''}
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => {
                  onChange(option)
                  onToggle(false)
                }}
              >
                <span>{option}</span>
                <span className="selected-mark" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const PNG_EXPORT_SCALE = 3

async function savePng(svg, filename, width, height, scale = PNG_EXPORT_SCALE) {
  const exportWidth = width * scale
  const exportHeight = height * scale
  const exportSvg = svg.cloneNode(true)
  exportSvg.setAttribute('width', exportWidth)
  exportSvg.setAttribute('height', exportHeight)

  const source = new XMLSerializer().serializeToString(exportSvg)
  const svgBlob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const svgUrl = URL.createObjectURL(svgBlob)
  const image = new Image()

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('PNG export image could not be rendered'))
      image.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = exportWidth
    canvas.height = exportHeight
    const context = canvas.getContext('2d', { alpha: true })

    if (!context) throw new Error('PNG export canvas is unavailable')

    context.clearRect(0, 0, exportWidth, exportHeight)
    context.drawImage(image, 0, 0, exportWidth, exportHeight)

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')),
        'image/png',
      )
    })
    const pngUrl = URL.createObjectURL(pngBlob)
    const anchor = document.createElement('a')
    anchor.href = pngUrl
    anchor.download = filename
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function App() {
  const [view, setView] = useState('home')
  const [activeTab, setActiveTab] = useState('popup')
  const [activeModuleAction, setActiveModuleAction] = useState(null)
  const [title, setTitle] = useState('¡Algo especial para ti!')
  const [subtitle, setSubtitle] = useState('Oferta exclusiva por tiempo limitado')
  const [category, setCategory] = useState('本土节日弹窗')
  const [offerType, setOfferType] = useState('单offer')
  const [copyOne, setCopyOne] = useState('Max. descuento en intereses')
  const [benefitOne, setBenefitOne] = useState('30%OFF')
  const [copyTwo, setCopyTwo] = useState('Max. descuento en intereses')
  const [benefitTwo, setBenefitTwo] = useState('¥600')
  const [buttonCopy, setButtonCopy] = useState('¡Tómalo ya!')
  const [quantity, setQuantity] = useState('1')
  const [quality, setQuality] = useState('High')
  const [page, setPage] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationNote, setGenerationNote] = useState('')
  const [results, setResults] = useState([])
  const [openDropdown, setOpenDropdown] = useState(null)

  const formState = {
    title,
    subtitle,
    category,
    offerType,
    copyOne,
    benefitOne,
    copyTwo,
    benefitTwo,
    buttonCopy,
    quantity,
    quality,
  }

  const currentResult = results[page - 1] ?? null
  const totalPages = Math.max(results.length, 1)

  useEffect(() => {
    function closeDropdown(event) {
      if (event.key === 'Escape') setOpenDropdown(null)
      if (event.type === 'pointerdown' && !event.target.closest('[data-dropdown]')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('pointerdown', closeDropdown)
    document.addEventListener('keydown', closeDropdown)

    return () => {
      document.removeEventListener('pointerdown', closeDropdown)
      document.removeEventListener('keydown', closeDropdown)
    }
  }, [])

  function toggleDropdown(id, forceState) {
    setOpenDropdown((current) => {
      if (forceState === false) return null
      return current === id ? null : id
    })
  }

  function selectDesignModule(tabId) {
    setActiveTab(tabId)
    setActiveModuleAction(null)
  }

  function selectModuleAction(actionId) {
    setActiveModuleAction({ actionId, moduleId: activeTab })
  }

  function openModuleAction(actionId) {
    selectModuleAction(actionId)
    setView('workspace')
  }

  async function extractBriefToWorkspace(brief, uploadedImages) {
    let imageText = ''

    if (uploadedImages.length > 0) {
      try {
        const { recognizeImages } = await import('../skills/text-recognition-system/scripts/recognize-images.mjs')
        const ocrResult = await recognizeImages(uploadedImages)
        imageText = ocrResult.text
      } catch (error) {
        if (!brief.trim()) throw error
        console.warn('图片文字识别失败，继续使用手动输入内容。', error)
      }
    }

    const combinedText = [brief.trim(), imageText].filter(Boolean).join('\n')
    if (!combinedText) throw new Error('没有识别到可用的需求文字。')

    const { values } = extractDesignBrief(combinedText)

    if (values.title) setTitle(values.title)
    if (values.subtitle) setSubtitle(values.subtitle)
    if (values.category) setCategory(values.category)
    if (values.offerType) setOfferType(values.offerType)
    if (values.copyOne) setCopyOne(values.copyOne)
    if (values.benefitOne) setBenefitOne(values.benefitOne)
    if (values.copyTwo) setCopyTwo(values.copyTwo)
    if (values.benefitTwo) setBenefitTwo(values.benefitTwo)
    if (values.buttonCopy) setButtonCopy(values.buttonCopy)
    if (values.quantity) setQuantity(values.quantity)
    if (values.quality) setQuality(values.quality)

    setActiveModuleAction(null)
    setResults([])
    setPage(1)
    setView('workspace')
  }

  async function generateMockups(event) {
    event.preventDefault()
    setIsGenerating(true)
    setGenerationNote('正在调用 Cloudflare 生成无文字视觉底图…')
    setResults([])
    setPage(1)

    const snapshot = { ...formState }
    const count = Number(quantity)

    try {
      await document.fonts?.ready
      await Promise.all(
        ['400', '500', '700', '900'].map((weight) => document.fonts?.load(`${weight} 16px Roboto`)),
      )
      const fontReady = ['400', '500', '700', '900'].every(
        (weight) => document.fonts?.check(`${weight} 16px Roboto`) ?? false,
      )

      const nextResults = []
      let providerAvailable = true

      for (let index = 0; index < count; index += 1) {
        const spec = createPopupSpec(snapshot, index)
        let generatedArtwork = null
        let providerModel = null
        let provider = 'local-fallback'
        let providerError = null

        if (providerAvailable) {
          try {
            const generated = await generatePopupArtwork(snapshot, spec, index)
            generatedArtwork = generated.image
            providerModel = generated.model
            provider = 'cloudflare'
          } catch (error) {
            providerAvailable = false
            providerError = error instanceof Error ? error.message : String(error)
          }
        }

        nextResults.push({
          id: `${Date.now()}-${index}`,
          variant: index,
          form: snapshot,
          spec,
          generatedArtwork,
          providerModel,
          provider,
          providerError,
          validation: validatePopupSpec(spec, {
            fontReady,
            generatedVisual: Boolean(generatedArtwork),
          }),
        })
      }

      const generatedCount = nextResults.filter((result) => result.provider === 'cloudflare').length
      setGenerationNote(
        generatedCount > 0
          ? `Cloudflare FLUX.2 已生成 ${generatedCount} 张视觉底图，文案已按规范排版`
          : 'Cloudflare 尚未配置，已使用本地测试素材',
      )
      setResults(nextResults)
    } catch (error) {
      console.error(error)
      setGenerationNote('生成失败，请检查图片服务配置')
    } finally {
      setIsGenerating(false)
    }
  }

  async function downloadCurrentArtwork() {
    if (!currentResult) return

    const artwork = document.querySelector('.popup-artwork')
    if (!artwork) return

    const { width, height } = currentResult.spec.canvas
    await savePng(artwork, `popup-${page}-transparent@3x.png`, width, height)
  }

  if (view === 'home') {
    return (
      <LandingPage
        activeTab={activeTab}
        activeModuleAction={activeModuleAction}
        onHome={() => {}}
        onSelectModule={selectDesignModule}
        onSelectAction={openModuleAction}
        onExtract={extractBriefToWorkspace}
      />
    )
  }

  return (
    <div className="app-shell">
      <AppHeader
        activeTab={activeTab}
        activeModuleAction={activeModuleAction}
        onHome={() => setView('home')}
        onSelectModule={selectDesignModule}
        onSelectAction={selectModuleAction}
      />

      <main className="workspace">
        <aside className="settings-panel">
          <form className="settings-form" onSubmit={generateMockups}>
            <section className="form-section copy-section">
              <h2>文案内容</h2>
              <div className="section-content stacked-fields">
                <TextField label="主标题" name="title" value={title} onChange={setTitle} />
                <TextField label="副标题" name="subtitle" value={subtitle} onChange={setSubtitle} />
              </div>
            </section>

            <section className="form-section category-section">
              <h2>营销类别</h2>
              <Dropdown
                id="category"
                value={category}
                options={['本土节日弹窗', '首页日常弹窗', '营销氛围弹窗']}
                onChange={setCategory}
                isOpen={openDropdown === 'category'}
                onToggle={(forceState) => toggleDropdown('category', forceState)}
              />
            </section>

            <section className="form-section offer-section">
              <h2>权益offer</h2>
              <Dropdown
                id="offer-type"
                value={offerType}
                options={['单offer', '双offer']}
                onChange={setOfferType}
                isOpen={openDropdown === 'offer-type'}
                onToggle={(forceState) => toggleDropdown('offer-type', forceState)}
              />
              <div className="stacked-fields offer-fields">
                <TextField label="文案01" name="copyOne" value={copyOne} onChange={setCopyOne} />
                <TextField label="权益01" name="benefitOne" value={benefitOne} onChange={setBenefitOne} />
                {offerType === '双offer' && (
                  <>
                    <TextField label="文案02" name="copyTwo" value={copyTwo} onChange={setCopyTwo} />
                    <TextField label="权益02" name="benefitTwo" value={benefitTwo} onChange={setBenefitTwo} />
                  </>
                )}
              </div>
            </section>

            <section className="form-section button-section">
              <h2>按钮区域</h2>
              <TextField label="文案" name="buttonCopy" value={buttonCopy} onChange={setButtonCopy} />
            </section>

            <section className="form-section attributes-section">
              <h2>生成属性</h2>
              <div className="attribute-controls">
                <Dropdown
                  id="quantity"
                  label="生成数量"
                  value={quantity}
                  options={['1', '2', '3', '4']}
                  onChange={setQuantity}
                  isOpen={openDropdown === 'quantity'}
                  onToggle={(forceState) => toggleDropdown('quantity', forceState)}
                  compact
                />
                <Dropdown
                  id="quality"
                  label="生成质量"
                  value={quality}
                  options={['High', 'Medium', 'Low']}
                  onChange={setQuality}
                  isOpen={openDropdown === 'quality'}
                  onToggle={(forceState) => toggleDropdown('quality', forceState)}
                  compact
                />
              </div>
            </section>

            <button className="generate-button" type="submit" disabled={isGenerating}>
              {isGenerating ? '生成中…' : '素材生成'}
            </button>
          </form>
        </aside>

        <section className="preview-area" aria-label="设计预览">
          <div className="preview-card">
            <div className="preview-badges" aria-label="生成与规范状态">
              <span className="demo-badge">
                {currentResult?.provider === 'cloudflare' ? 'CLOUDFLARE VISUAL' : 'TEST MODE'}
              </span>
              <span
                className={`skill-badge ${currentResult?.validation.status ?? 'ready'}`}
                title={currentResult?.validation.issues.map((issue) => `${issue.code}: ${issue.message}`).join('\n') || '技能包已加载'}
              >
                SKILL v{popupSkillRuntime.version} · {
                  currentResult
                    ? currentResult.validation.status === 'unscoped'
                      ? 'N/A'
                      : currentResult.validation.passed ? 'PASS' : 'DRAFT'
                    : 'READY'
                }
              </span>
            </div>
            <button
              className="download-button"
              type="button"
              onClick={downloadCurrentArtwork}
              aria-label="下载当前透明 PNG 效果图"
              disabled={!currentResult || isGenerating}
            >
              <img src={ASSETS.download} alt="" />
            </button>
            <div className="preview-content" aria-live="polite">
              {isGenerating ? (
                <div className="generation-state">
                  <span className="loading-spinner" />
                  <strong>正在生成视觉底图</strong>
                  <span>{generationNote}</span>
                </div>
              ) : currentResult ? (
                <div className="artwork-stage">
                  <PopupArtwork result={currentResult} />
                  <div className="preview-meta">
                    <span>
                      {currentResult.spec.theme.name} · {quality} quality · {
                        currentResult.provider === 'cloudflare'
                          ? `Cloudflare ${currentResult.providerModel ?? 'FLUX.2'} · 视觉底图 + 规范排版`
                          : '本地测试'
                      }
                    </span>
                    <span>
                      {currentResult.spec.governedBySkill
                        ? `已按技能包检查 ${currentResult.validation.checkedRuleCount} 项规则`
                        : '技能包仅用于单 Offer · 本土节日弹窗'}
                    </span>
                    {generationNote && <span>{generationNote}</span>}
                  </div>
                </div>
              ) : (
                <div className="empty-preview">
                  <span className="empty-preview-icon">＋</span>
                  <strong>等待生成素材</strong>
                  <span>填写左侧参数并点击“素材生成”</span>
                </div>
              )}
            </div>
          </div>
          <div className="pagination" aria-label="预览分页">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="上一页"
              disabled={!currentResult || page === 1}
            >
              <span className="pagination-arrow previous">
                <img src={ASSETS.previous} alt="" />
              </span>
            </button>
            <span>{currentResult ? page : 0}/{results.length || 0}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              aria-label="下一页"
              disabled={!currentResult || page === results.length}
            >
              <span className="pagination-arrow next">
                <img src={ASSETS.next} alt="" />
              </span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
