import { createWorker } from 'tesseract.js'

const MAX_IMAGES = 4
const OCR_LOAD_TIMEOUT_MS = 60_000

function normalizeOcrText(value) {
  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/gu, '')
    .replace(/[ \t]+/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

function getImageSource(image) {
  if (image?.file) return image.file
  if (typeof image === 'string') return image
  if (typeof Blob !== 'undefined' && image instanceof Blob) return image
  return null
}

export async function recognizeImages(images, { onProgress } = {}) {
  const sources = Array.from(images ?? [])
    .map(getImageSource)
    .filter(Boolean)
    .slice(0, MAX_IMAGES)
  const result = { text: '', items: [], warnings: [] }

  if (sources.length === 0) {
    result.warnings.push('没有可识别的图片。')
    return result
  }

  let activeIndex = 0
  onProgress?.({ stage: 'loading', progress: 0, total: sources.length })

  let loadTimer
  const worker = await Promise.race([
    createWorker('chi_sim+eng', 1, {
      logger(message) {
        onProgress?.({
          stage: message.status ?? 'recognizing',
          progress: Number.isFinite(message.progress) ? message.progress : 0,
          index: activeIndex,
          total: sources.length,
        })
      },
      errorHandler(error) {
        onProgress?.({ stage: 'error', error: String(error), index: activeIndex, total: sources.length })
      },
    }),
    new Promise((_, reject) => {
      loadTimer = setTimeout(() => reject(new Error('OCR 语言模型加载超时。')), OCR_LOAD_TIMEOUT_MS)
    }),
  ]).finally(() => clearTimeout(loadTimer))

  try {
    for (let index = 0; index < sources.length; index += 1) {
      activeIndex = index
      onProgress?.({ stage: 'recognizing', progress: 0, index, total: sources.length })

      try {
        const response = await worker.recognize(sources[index], { rotateAuto: true })
        const text = normalizeOcrText(response.data.text ?? '')
        result.items.push({
          index,
          text,
          confidence: Number.isFinite(response.data.confidence) ? response.data.confidence : null,
        })
      } catch (error) {
        result.items.push({
          index,
          text: '',
          confidence: null,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } finally {
    await worker.terminate()
  }

  result.text = result.items.map((item) => item.text).filter(Boolean).join('\n')

  const failedCount = result.items.filter((item) => item.error).length
  if (failedCount > 0) result.warnings.push(`${failedCount} 张图片识别失败。`)
  if (!result.text) result.warnings.push('图片中没有识别到可用文字。')

  onProgress?.({ stage: 'complete', progress: 1, total: sources.length })
  return result
}
