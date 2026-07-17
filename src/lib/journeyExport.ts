import { jsPDF } from 'jspdf'
import type { JourneyBook } from '../types'
import { BLUE, CREAM, FOOTER, INK, MUTED, SAGE, SAGE_DEEP, SAND, deliver, fmtDate } from './shareBrand'

// The premium PDF keepsake. jsPDF is heavy (pulls html2canvas), so this module
// is imported ONLY from the Journey Book page — the canvas share cards live in
// shareCards.ts and stay jsPDF-free. The shared brand helpers are in shareBrand.

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

