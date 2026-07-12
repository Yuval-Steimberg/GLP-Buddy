// Shared brand constants + delivery helpers for the export/share features.
// NO heavy dependencies here (no jsPDF) so the canvas-only share cards stay
// light — only the PDF keepsake pulls jsPDF, and only on the Journey Book page.

// Brand palette (Sage). RGB tuples reused by jsPDF (spread) and canvas.
export const CREAM: [number, number, number] = [246, 244, 238]
export const SAGE: [number, number, number] = [94, 140, 116]
export const SAGE_DEEP: [number, number, number] = [67, 107, 87]
export const INK: [number, number, number] = [30, 42, 37]
export const BLUE: [number, number, number] = [95, 132, 151]
export const SAND: [number, number, number] = [194, 149, 95]
export const MUTED: [number, number, number] = [86, 99, 92]

export const FOOTER = 'GLPenPal · a glp buddy who gets it'

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Try the Web Share sheet (best on mobile PWAs); fall back to a download.
export async function deliver(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: blob.type })
  // deno-lint-ignore no-explicit-any
  const nav = navigator as any
  try {
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title })
      return
    }
  } catch {
    /* user cancelled the share sheet — fall through to download */
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// The brand heart mark, drawn to a canvas at (centred) top offset.
export function heartCanvas(ctx: CanvasRenderingContext2D, W: number, top: number) {
  const OUTER = 'M50,83 C50,83 15,57 15,39 C15,29 24,24 31,24 C39,24 46,30 50,38 C54,30 61,24 69,24 C76,24 85,29 85,39 C85,57 50,83 50,83 Z'
  const INNER = 'M50,71 C50,71 28,53 28,42 C28,35 33,32 38,32 C43,32 47,36 50,41 C53,36 57,32 62,32 C67,32 72,35 72,42 C72,53 50,71 50,71 Z'
  ctx.save()
  ctx.translate(W / 2 - 120, top)
  ctx.scale(2.4, 2.4)
  const band = new Path2D(`${OUTER} ${INNER}`)
  ctx.save(); ctx.beginPath(); ctx.rect(-2, -2, 52, 104); ctx.clip(); ctx.fillStyle = '#5e8c74'; ctx.fill(band, 'evenodd'); ctx.restore()
  ctx.save(); ctx.beginPath(); ctx.rect(50, -2, 52, 104); ctx.clip(); ctx.fillStyle = '#5f8497'; ctx.fill(band, 'evenodd'); ctx.restore()
  ctx.fillStyle = '#5e8c74'; ctx.beginPath(); ctx.arc(31.5, 19, 9, 0, 7); ctx.fill()
  ctx.fillStyle = '#5f8497'; ctx.beginPath(); ctx.arc(68.5, 19, 9, 0, 7); ctx.fill()
  ctx.restore()
}
