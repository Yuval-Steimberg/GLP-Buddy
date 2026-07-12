import type { JourneyBook, YearReview } from '../types'
import { FOOTER, deliver, fmtDate, heartCanvas } from './shareBrand'

// Canvas-rendered portrait PNGs for social sharing. jsPDF-free, so the pages
// that only share images (Year in Review) stay light.

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

// A portrait PNG recap of a whole year — the viral "Your GLP Journey 2026"
// share. `includeQuote` (Premium) adds the favourite-encouragement line — the
// "more detailed" premium card. Privacy-safe: no names, no health specifics
// beyond the milestone labels the user chose.
export async function shareYearReview(review: YearReview, includeQuote: boolean) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f4f1e8'
  ctx.fillRect(0, 0, W, H)

  heartCanvas(ctx, W, 96)

  const cx = W / 2
  ctx.textAlign = 'center'
  ctx.fillStyle = '#c2955f'
  ctx.font = '700 34px Inter, sans-serif'
  ctx.fillText(`MY GLP JOURNEY ${review.year}`, cx, 440)

  ctx.fillStyle = '#1e2a25'
  ctx.font = '700 66px "Space Grotesk", Inter, sans-serif'
  ctx.fillText(review.meName, cx, 520)

  if (review.journeyStart) {
    ctx.font = '500 32px Inter, sans-serif'
    ctx.fillStyle = '#56635c'
    ctx.fillText(`On the journey since ${fmtDate(review.journeyStart)}`, cx, 572)
  }

  const stats: [string, string][] = [
    [String(review.daysOnJourney), 'days in'],
    [String(review.milestones), 'milestones'],
    [String(review.messages), 'messages'],
    [String(review.buddies), review.buddies === 1 ? 'buddy' : 'buddies'],
  ]
  const colW = W / 4
  stats.forEach(([num, lbl], i) => {
    const x = colW * i + colW / 2
    ctx.fillStyle = '#436b57'
    ctx.font = '700 68px "Space Grotesk", Inter, sans-serif'
    ctx.fillText(num, x, 720)
    ctx.fillStyle = '#56635c'
    ctx.font = '600 25px Inter, sans-serif'
    ctx.fillText(lbl, x, 763)
  })

  // Secondary line: kg lost + tough weeks overcome + strongest month.
  const bits: string[] = []
  if (review.kgLost != null) bits.push(`${review.kgLost} kg lost`)
  if (review.toughWeeks > 0) bits.push(`${review.toughWeeks} tough week${review.toughWeeks === 1 ? '' : 's'} overcome`)
  if (review.strongestMonth) bits.push(`Strongest month: ${review.strongestMonth}`)
  if (bits.length) {
    ctx.fillStyle = '#5e8c74'
    ctx.font = '600 28px Inter, sans-serif'
    ctx.fillText(bits.join('   ·   '), cx, 830)
  }

  let y = 900
  if (review.topMilestone) {
    ctx.fillStyle = '#eef2ee'
    const bw = W - 200
    ctx.beginPath()
    ctx.roundRect((W - bw) / 2, y, bw, 140, 24)
    ctx.fill()
    ctx.fillStyle = '#c2955f'
    ctx.font = '700 25px Inter, sans-serif'
    ctx.fillText('BIGGEST MILESTONE', cx, y + 55)
    ctx.fillStyle = '#1e2a25'
    ctx.font = '700 42px "Space Grotesk", Inter, sans-serif'
    ctx.fillText(review.topMilestone, cx, y + 105)
    y += 190
  }

  if (includeQuote && review.favoriteEncouragement) {
    ctx.fillStyle = '#436b57'
    ctx.font = '700 24px Inter, sans-serif'
    ctx.fillText('A MESSAGE THAT STAYED WITH ME', cx, y + 30)
    ctx.fillStyle = '#1e2a25'
    ctx.font = 'italic 500 34px Inter, sans-serif'
    const words = `“${review.favoriteEncouragement}”`.split(' ')
    let line = ''
    let ly = y + 78
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > W - 200 && line) {
        ctx.fillText(line, cx, ly)
        ly += 44
        line = w
      } else line = test
    }
    ctx.fillText(line, cx, ly)
  }

  ctx.fillStyle = '#56635c'
  ctx.font = '600 30px Inter, sans-serif'
  ctx.fillText(FOOTER, cx, H - 66)

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  await deliver(blob, `GLPenPal-${review.year}.png`, `My GLP Journey ${review.year}`)
}
