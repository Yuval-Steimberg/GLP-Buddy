// ===========================================================================
// analyze-food — estimate calories + protein from a meal photo (Claude vision).
//
// The client sends a compressed JPEG data URL; Claude looks at it and returns a
// STRICT JSON estimate: a title, total calories, total protein (grams), and a
// per-item breakdown. The result is shown to the user (who can adjust the
// portion) and optionally saved to their private meal log — this function does
// NOT write to the database; it only computes the estimate.
//
// Privacy: the photo is sent to Anthropic for analysis and is NOT stored by this
// function. Nothing about the user (name, health data, buddies) is included.
//
// Safety: estimates are approximate and explicitly NOT medical or nutritional
// advice — the system prompt enforces honest, reasonable estimates and the
// client labels every result as an estimate.
//
// verify_jwt is ON (default) — signed-in users only. Do NOT deploy with
// --no-verify-jwt. Reuses the same ANTHROPIC_API_KEY secret as ask-coach; no new
// secret and no SQL beyond migration 0015.
// ===========================================================================
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.68.0'

const MODEL = Deno.env.get('FOOD_MODEL') ?? 'claude-opus-4-8'

const SYSTEM = `You are a nutrition-estimation assistant for a GLP-1 peer-support app. You are shown ONE photo of a meal or food and must estimate its nutrition.

Rules:
- Identify the foods and estimate a realistic single-serving portion from the visual (plate/bowl/utensil size for scale). Be honest — do not overstate precision.
- Return TOTAL calories (kcal) and TOTAL protein in grams for everything visible, plus a per-item breakdown.
- These are approximate estimates for general awareness, NOT medical or nutritional advice and NOT a substitute for a dietitian or clinician.
- If the image does NOT clearly show food/drink, set "not_food" to true and use zeros.
- Never include commentary, medication/dosing advice, or judgement about the food.

Respond with ONLY a single JSON object, no markdown, no code fences, in exactly this shape:
{"title":"short name of the meal","calories":0,"protein_g":0,"items":[{"name":"food","calories":0,"protein_g":0}],"confidence":"low|medium|high","not_food":false}`

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

// Accept only the raster JPEG/PNG/WebP data URLs the app itself produces.
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/

type Item = { name: string; calories: number; protein_g: number }

function clampInt(n: unknown, max: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v < 0) return 0
  return v > max ? max : v
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  try {
    const key = Deno.env.get('ANTHROPIC_API_KEY')
    if (!key) return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers: HEADERS })

    const body = await req.json().catch(() => ({}))
    const image = typeof body?.image === 'string' ? body.image : ''
    const note = typeof body?.note === 'string' ? body.note.slice(0, 300).trim() : ''
    const m = DATA_URL.exec(image)
    if (!m) return new Response(JSON.stringify({ error: 'bad image' }), { status: 400, headers: HEADERS })
    const mediaType = `image/${m[1]}`
    const b64 = m[2]

    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            {
              type: 'text',
              text: `Estimate the nutrition of this meal.${note ? ` The person added a note about it: "${note}".` : ''} Respond with ONLY the JSON object.`,
            },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return new Response(JSON.stringify({ error: 'unavailable' }), { status: 200, headers: HEADERS })
    }

    const raw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('')
      .trim()
      // strip accidental code fences
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return new Response(JSON.stringify({ error: 'parse' }), { status: 200, headers: HEADERS })
    }

    if (parsed.not_food === true) {
      return new Response(JSON.stringify({ error: 'no_food' }), { status: 200, headers: HEADERS })
    }

    const items: Item[] = Array.isArray(parsed.items)
      ? (parsed.items as unknown[]).slice(0, 12).map((it) => {
          const o = (it ?? {}) as Record<string, unknown>
          return {
            name: String(o.name ?? 'Item').slice(0, 80),
            calories: clampInt(o.calories, 5000),
            protein_g: clampInt(o.protein_g, 500),
          }
        })
      : []

    const result = {
      title: String(parsed.title ?? 'Meal').slice(0, 80),
      calories: clampInt(parsed.calories, 20000),
      protein_g: clampInt(parsed.protein_g, 2000),
      items,
      confidence: ['low', 'medium', 'high'].includes(String(parsed.confidence)) ? String(parsed.confidence) : 'medium',
    }

    return new Response(JSON.stringify(result), { headers: HEADERS })
  } catch {
    return new Response(JSON.stringify({ error: 'unavailable' }), { status: 500, headers: HEADERS })
  }
})
