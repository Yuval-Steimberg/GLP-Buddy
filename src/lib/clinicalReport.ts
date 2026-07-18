import { jsPDF } from 'jspdf'
import type { Checkin, InjectionLog, Meal, Profile, SymptomLog, WeightLog } from '../types'
import { deliver } from './shareBrand'

interface ClinicalReportData {
  profile: Profile
  injections: InjectionLog[]
  symptoms: SymptomLog[]
  weights: WeightLog[]
  checkins: Checkin[]
  meals: Meal[]
}

const DAY = 24 * 60 * 60 * 1000
const date = (value: number) => new Date(value).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export async function exportClinicalReport(data: ClinicalReportData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 52
  const maxWidth = width - margin * 2
  let y = 58

  const ensure = (space: number) => {
    if (y + space <= height - 54) return
    footer()
    doc.addPage()
    y = 58
  }

  const text = (value: string, size = 10.5, color: [number, number, number] = [61, 58, 76]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(value, maxWidth) as string[]
    ensure(lines.length * 15 + 6)
    doc.text(lines, margin, y)
    y += lines.length * 15 + 6
  }

  const heading = (value: string) => {
    ensure(38)
    y += 12
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(25, 24, 43)
    doc.text(value, margin, y)
    y += 20
  }

  const footer = () => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(120, 116, 136)
    doc.text(
      'Personal tracking summary. Not medical advice and not a substitute for clinical records.',
      width / 2,
      height - 28,
      { align: 'center' },
    )
  }

  doc.setFillColor(255, 250, 245)
  doc.rect(0, 0, width, height, 'F')
  doc.setFillColor(101, 88, 217)
  doc.roundedRect(margin, y, 44, 8, 4, 4, 'F')
  y += 30
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(25)
  doc.setTextColor(25, 24, 43)
  doc.text('GLPenPal journey summary', margin, y)
  y += 23
  text(`Prepared for ${data.profile.nickname} on ${date(Date.now())}.`, 11)
  text(
    `Medication listed in profile: ${data.profile.medication}. Treatment stage: ${data.profile.treatmentStage}.`,
    10.5,
  )

  const cutoff = Date.now() - 90 * DAY
  const injections = data.injections.filter((x) => x.injectedAt >= cutoff)
  const symptoms = data.symptoms.filter((x) => x.loggedAt >= cutoff)
  const weights = data.weights
    .filter((x) => x.loggedAt >= cutoff)
    .sort((a, b) => a.loggedAt - b.loggedAt)
  const meals = data.meals.filter((x) => x.createdAt >= Date.now() - 14 * DAY)
  const checkins = data.checkins.filter((x) => x.createdAt >= cutoff)

  heading('90-day overview')
  text(`${injections.length} injections logged · ${symptoms.length} symptom entries · ${checkins.length} wellbeing check-ins`)
  if (weights.length >= 2) {
    const change = Math.round((weights[weights.length - 1].kg - weights[0].kg) * 10) / 10
    text(`Recorded weight: ${weights[0].kg} kg to ${weights[weights.length - 1].kg} kg (${change > 0 ? '+' : ''}${change} kg).`)
  } else if (weights.length === 1) {
    text(`Latest recorded weight: ${weights[0].kg} kg.`)
  } else {
    text('No weight entries were recorded in this period.')
  }
  if (meals.length > 0) {
    const protein = Math.round(meals.reduce((sum, meal) => sum + meal.proteinG, 0) / meals.length)
    text(`Average protein across ${meals.length} meals logged in the last 14 days: ${protein} g per logged meal.`)
  }

  heading('Injection history')
  if (injections.length === 0) {
    text('No injection entries were recorded in this period.')
  } else {
    injections.slice(0, 24).forEach((entry) => {
      const details = [
        date(entry.injectedAt),
        entry.medication,
        entry.dose,
        entry.injectionSite,
      ].filter(Boolean).join(' · ')
      text(`${details}${entry.note ? `\nNote: ${entry.note}` : ''}`)
    })
  }

  heading('Symptoms recorded')
  if (symptoms.length === 0) {
    text('No symptom entries were recorded in this period.')
  } else {
    const grouped = new Map<string, { count: number; severity: number }>()
    symptoms.forEach((entry) => {
      const prev = grouped.get(entry.symptom) ?? { count: 0, severity: 0 }
      grouped.set(entry.symptom, {
        count: prev.count + 1,
        severity: prev.severity + entry.severity,
      })
    })
    ;[...grouped.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([name, summary]) => {
        const average = Math.round((summary.severity / summary.count) * 10) / 10
        text(`${name}: ${summary.count} entries · average reported severity ${average}/5`)
      })
  }

  heading('Notes for the appointment')
  const notes = [...injections.map((x) => x.note), ...symptoms.map((x) => x.note)]
    .filter((value): value is string => !!value?.trim())
    .slice(0, 12)
  if (notes.length === 0) text('No notes were added.')
  else notes.forEach((note) => text(`• ${note}`))

  heading('Important')
  text(
    'This document contains information entered by the member and may be incomplete or inaccurate. It does not interpret symptoms, recommend treatment, or advise medication changes. Discuss medical decisions with a qualified clinician or pharmacist.',
    9.5,
    [95, 91, 112],
  )
  footer()

  const blob = doc.output('blob') as Blob
  await deliver(blob, 'GLPenPal-Clinician-Summary.pdf', 'GLPenPal journey summary')
}
