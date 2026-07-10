// Only render images the app itself produced: raster data-URLs. This blocks a
// row whose image_url/avatar_url was set directly (bypassing the client) to an
// external tracking URL — which would leak the viewer's IP/UA/read-time the
// moment a message opens — or to a data:image/svg+xml payload (SVG can carry
// script). The upload helpers below always emit `data:image/jpeg`.
const SAFE_IMAGE = /^data:image\/(jpeg|png|webp|gif);base64,/i
export function safeImageSrc(src: string | undefined | null): string | undefined {
  return src && SAFE_IMAGE.test(src) ? src : undefined
}

// Read an image File, downscale it to a small square thumbnail, and return a
// compressed JPEG data URL. Keeps profile rows tiny (no Storage bucket needed).
export async function fileToAvatarDataUrl(file: File, size = 256, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Could not read that image'))
    i.src = dataUrl
  })

  // Center-crop to a square, then draw into a size×size canvas.
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', quality)
}

// Compress a chat photo: preserve aspect ratio, cap the long edge, and return a
// JPEG data URL small enough to store inline on the message row.
export async function fileToChatImage(file: File, maxEdge = 1100, quality = 0.62): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Could not read that image'))
    i.src = dataUrl
  })
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}
