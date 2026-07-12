import { jsPDF } from 'jspdf'
import type { JourneyBook } from '../types'

// Brand palette (Sage). RGB tuples for jsPDF / canvas.
const CREAM: [number, number, number] = [246, 244, 238]
const SAGE: [number, number, number] = [94, 140, 116]
const SAGE_DEEP: [number, number, number] = [67, 107, 87]
const INK: [number, number, number] = [30, 42, 37]
const BLUE: [number, number, number] = [95, 132, 151]
const SAND: [number, number, number] = [194, 149, 95]
const MUTED: [number, number, number] = [86, 99, 92]

const FOOTER = 'GLPenPal · a glp buddy who gets it'

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Try the Web Share sheet (best on mobile PWAs); fall back to a download.
async function deliver(blob: Blob, filename: string, title: string) {
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

// ---- PDF keepsake ---------------------------------------------------------

// A simple two-lobe + triangle heart, drawn in the brand sage.
function pdfHeart(doc: jsPDF, cx: number, top: number, r: number) {
  doc.setFillColor(...SAGE)
  doc.circle(cx - r * 0.55, top, r * 0.62, 'F')
  doc.setFillColor(...BLUE)
  doc.circle(cx + r * 0.55, top, r * 0.62, 'F')
  // The two lobes over a downward triangle read as a heart.
  doc.setFillColor(...SAGE)
  doc.triangle(cx - r * 1.12, top + r * 0.05, cx + r * 1.12, top + r * 0.05, cx, top + r * 1.35, 'F')
}

function pdfFooter(doc: jsPDF, W: number, H: number, page: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(FOOTER, W / 2, H - 28, { align: 'center' })
  if (page > 0) doc.text(String(page), W - 40, H - 28, { align: 'right' })
}

// Build the Journey Book as a designed, multi-page PDF and share/download it.
export async function exportJourneyPdf(book: JourneyBook) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 56 // page margin

  // --- Cover ---------------------------------------------------------------
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, W, H, 'F')

  pdfHeart(doc, W / 2, 150, 34)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...SAND)
  doc.text('THE JOURNEY BOOK', W / 2, 240, { align: 'center' })

  doc.setFontSize(30)
  doc.setTextColor(...INK)
  doc.text(`${book.meName} & ${book.buddyName}`, W / 2, 282, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(...MUTED)
  doc.text(
    `Started ${fmtDate(book.startDate)}  ·  ${book.totalDays} days together`,
    W / 2,
    308,
    { align: 'center' },
  )

  // Stat row
  const stats: [number, string][] = [
    [book.totalMonths, book.totalMonths === 1 ? 'month' : 'months'],
    [book.totalMilestones, 'milestones'],
    [book.totalMessages, 'messages'],
    [book.totalPhotos, 'photos'],
  ]
  const colW = (W - M * 2) / stats.length
  const statY = 400
  stats.forEach(([num, label], i) => {
    const x = M + colW * i + colW / 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(34)
    doc.setTextColor(...SAGE_DEEP)
    doc.text(String(num), x, statY, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    doc.text(label, x, statY + 20, { align: 'center' })
  })

  if (book.topMilestone) {
    doc.setFillColor(238, 242, 238)
    doc.roundedRect(M, 452, W - M * 2, 56, 12, 12, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...SAND)
    doc.text('YOUR BIGGEST MILESTONE', W / 2, 476, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...INK)
    doc.text(book.topMilestone, W / 2, 496, { align: 'center' })
  }

  pdfFooter(doc, W, H, 0)

  // --- Chapters (flowing across pages) ------------------------------------
  doc.addPage()
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, W, H, 'F')
  let page = 1
  let y = M + 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text('Your story, month by month', M, y)
  y += 34

  const newPage = () => {
    pdfFooter(doc, W, H, page)
    doc.addPage()
    doc.setFillColor(...CREAM)
    doc.rect(0, 0, W, H, 'F')
    page += 1
    y = M + 8
  }

  for (const ch of book.chapters) {
    const lines = ch.story.flatMap((s) => doc.splitTextToSize(s, W - M * 2 - 16) as string[])
    const blockH = 30 + lines.length * 16 + 22
    if (y + blockH > H - 60) newPage()

    // Month label with a sage accent bar.
    doc.setFillColor(...SAGE)
    doc.roundedRect(M, y - 11, 4, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...SAGE_DEEP)
    doc.text(ch.label, M + 14, y + 2)
    y += 24

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11.5)
    doc.setTextColor(...INK)
    for (const line of lines) {
      doc.text(line, M + 14, y)
      y += 16
    }
    y += 22
  }

  pdfFooter(doc, W, H, page)

  const blob = doc.output('blob') as Blob
  await deliver(blob, 'GLPenPal-Journey-Book.pdf', `${book.meName} & ${book.buddyName} — Journey Book`)
}

// ---- Shareable image card (year-in-review style) --------------------------

function heartCanvas(ctx: CanvasRenderingContext2D, W: number, top: number) {
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

// A single portrait PNG summarising the whole journey — made for Instagram /
// Facebook. Shows only what's already on the (self-owned) card: no health data.
export async function shareJourneyCard(book: JourneyBook) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f4f1e8'
  ctx.fillRect(0, 0, W, H)

  heartCanvas(ctx, W, 110)

  const cx = W / 2
  ctx.textAlign = 'center'
  ctx.fillStyle = '#c2955f'
  ctx.font = '700 34px Inter, sans-serif'
  ctx.fillText('MY GLP JOURNEY', cx, 470)

  ctx.fillStyle = '#1e2a25'
  ctx.font = '700 60px "Space Grotesk", Inter, sans-serif'
  ctx.fillText(`${book.meName} & ${book.buddyName}`, cx, 545)

  ctx.font = '500 34px Inter, sans-serif'
  ctx.fillStyle = '#56635c'
  ctx.fillText(`${book.totalDays} days together · since ${fmtDate(book.startDate)}`, cx, 600)

  const stats: [string, string][] = [
    [String(book.totalMonths), book.totalMonths === 1 ? 'month' : 'months'],
    [String(book.totalMilestones), 'milestones'],
    [String(book.totalMessages), 'messages'],
    [String(book.totalPhotos), 'photos'],
  ]
  const colW = W / 4
  stats.forEach(([num, lbl], i) => {
    const x = colW * i + colW / 2
    ctx.fillStyle = '#436b57'
    ctx.font = '700 72px "Space Grotesk", Inter, sans-serif'
    ctx.fillText(num, x, 780)
    ctx.fillStyle = '#56635c'
    ctx.font = '600 26px Inter, sans-serif'
    ctx.fillText(lbl, x, 825)
  })

  if (book.topMilestone) {
    ctx.fillStyle = '#eef2ee'
    const bw = W - 200
    const bx = (W - bw) / 2
    ctx.beginPath()
    ctx.roundRect(bx, 910, bw, 150, 24)
    ctx.fill()
    ctx.fillStyle = '#c2955f'
    ctx.font = '700 26px Inter, sans-serif'
    ctx.fillText('BIGGEST MILESTONE', cx, 975)
    ctx.fillStyle = '#1e2a25'
    ctx.font = '700 44px "Space Grotesk", Inter, sans-serif'
    ctx.fillText(book.topMilestone, cx, 1025)
  }

  ctx.fillStyle = '#56635c'
  ctx.font = '600 30px Inter, sans-serif'
  ctx.fillText(FOOTER, cx, H - 70)

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  await deliver(blob, 'GLPenPal-Journey.png', `My GLPenPal Journey — ${book.meName} & ${book.buddyName}`)
}
