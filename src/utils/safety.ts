// Lightweight, client-side heuristic that flags messages which look like
// dosing or medical advice — the one thing buddies must never give each other.
// It does not block sending; it surfaces a gentle reminder so users self-correct.
// A server-side classifier should back this up before launch (see GO_LIVE.md).

const PATTERNS: RegExp[] = [
  /\b\d+\s?(mg|mcg|ml|units?|iu)\b/i, // explicit doses: "0.5 mg", "10 units"
  /\b(increase|decrease|lower|raise|up|bump|titrate)\s+(your|the|my)?\s*(dose|dosage)/i,
  /\b(skip|stop|quit|pause|come off|get off)\s+(your|the|taking)?\s*(med|meds|medication|injection|shot|dose)/i,
  /\b(double|split|half|halve)\s+(your|the|my)?\s*(dose|dosage|shot)/i,
  /\bwhat (dose|dosage|mg) (should|are you|do you)/i,
  /\b(should i|can i|do i)\s+(take|inject|increase|stop|change)\b/i,
  /\b(prescrib|off-label)/i,
]

export function looksLikeMedicalAdvice(text: string): boolean {
  const t = text.trim()
  if (t.length < 3) return false
  return PATTERNS.some((re) => re.test(t))
}
