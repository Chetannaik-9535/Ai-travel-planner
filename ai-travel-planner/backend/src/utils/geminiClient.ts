
import { GeminiTripResponse } from '../types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Exponential Backoff Fetch ────────────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  body: object,
  retries = 5,
  delayMs = 1000
): Promise<unknown> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.log(`⏳ Gemini rate limited. Retrying in ${delayMs}ms... (${retries} left)`);
        await new Promise((r) => setTimeout(r, delayMs));
        return fetchWithRetry(url, body, retries - 1, delayMs * 2);
      }
      const errBody = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errBody}`);
    }

    return response.json();
  } catch (error) {
    if (retries > 0) {
      console.log(`⏳ Retrying Gemini request in ${delayMs}ms... (${retries} left)`);
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(url, body, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

// ─── Core Gemini Call ─────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await fetchWithRetry(url, payload)) as any;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('No content returned from Gemini API');
  return text;
}

// ─── Parse & validate JSON from AI response ───────────────────────────────────
function parseGeminiJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error('AI returned malformed JSON. Please try again.');
  }
}

// ─── Generate Full Trip Itinerary ─────────────────────────────────────────────
export async function generateTripItinerary(params: {
  destination: string;
  durationDays: number;
  budgetTier: string;
  interests: string[];
  travelMonth: string;
}): Promise<GeminiTripResponse> {
  const { destination, durationDays, budgetTier, interests, travelMonth } = params;

  const budgetGuidance = {
    Low: 'budget traveler (hostels, street food, public transport, free attractions)',
    Medium: 'mid-range traveler (3-star hotels, local restaurants, mix of transport)',
    High: 'luxury traveler (5-star hotels, fine dining, private transport, premium experiences)',
  }[budgetTier];

  const prompt = `
You are an expert travel planner AI. Create a detailed, realistic travel plan.

TRIP DETAILS:
- Destination: ${destination}
- Duration: ${durationDays} days
- Budget Tier: ${budgetTier} (${budgetGuidance})
- Interests: ${interests.join(', ')}
- Travel Month: ${travelMonth}

REQUIREMENTS:
1. Generate a day-by-day itinerary with 3-4 activities per day (Morning, Afternoon, Evening)
2. Include 3 hotel recommendations (Budget, Mid-Range, Luxury tier — even for Low budget trips)
3. Provide realistic budget breakdown in USD based on the budget tier and destination cost of living
4. Generate a smart packing list tailored to the destination climate in ${travelMonth} and planned activities

CRITICAL: You MUST respond with ONLY a valid JSON object — no explanation, no markdown, no comments.
The JSON must exactly match this structure:

{
  "itinerary": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "title": "Activity name",
          "description": "2-3 sentence description with local tips",
          "estimatedCostUSD": 25,
          "timeOfDay": "Morning"
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "Hotel Name",
      "tier": "Budget",
      "estimatedCostNightUSD": 40,
      "rating": "4.2/5",
      "amenities": ["WiFi", "Breakfast included", "AC"]
    }
  ],
  "estimatedBudget": {
    "transport": 200,
    "accommodation": 350,
    "food": 180,
    "activities": 120,
    "total": 850
  },
  "packingList": [
    {
      "item": "Passport",
      "category": "Documents",
      "isPacked": false,
      "essential": true
    }
  ]
}

Ensure cost estimates are realistic for ${destination} in ${travelMonth} for a ${budgetTier} budget.
Include exactly ${durationDays} days in the itinerary.
Include exactly 3 hotels (one Budget, one Mid-Range, one Luxury).
Include 15-20 diverse packing items covering Documents, Clothing, Gear, Electronics, Health categories.
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJson<GeminiTripResponse>(raw);
}

// ─── Regenerate a Single Day ──────────────────────────────────────────────────
export async function regenerateSingleDay(params: {
  destination: string;
  dayNumber: number;
  totalDays: number;
  budgetTier: string;
  interests: string[];
  customInstruction: string;
}): Promise<{ dayNumber: number; activities: GeminiTripResponse['itinerary'][0]['activities'] }> {
  const { destination, dayNumber, totalDays, budgetTier, interests, customInstruction } = params;

  const prompt = `
You are a travel planner AI. Regenerate ONLY Day ${dayNumber} of a ${totalDays}-day trip to ${destination}.

CONTEXT:
- Budget: ${budgetTier}
- Interests: ${interests.join(', ')}
- Special instruction: "${customInstruction}"

CRITICAL: Respond with ONLY a valid JSON object — no markdown, no explanation:

{
  "dayNumber": ${dayNumber},
  "activities": [
    {
      "title": "Activity name",
      "description": "2-3 sentence description with local tips",
      "estimatedCostUSD": 20,
      "timeOfDay": "Morning"
    }
  ]
}

Generate 3-4 activities (Morning, Afternoon, Evening). Follow the special instruction closely.
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJson(raw);
}

// ─── Generate Packing List (Creative Feature) ─────────────────────────────────
export async function generatePackingList(params: {
  destination: string;
  travelMonth: string;
  durationDays: number;
  interests: string[];
  itinerarySummary: string;
}): Promise<GeminiTripResponse['packingList']> {
  const { destination, travelMonth, durationDays, interests, itinerarySummary } = params;

  const prompt = `
You are an expert travel packing specialist AI.

Generate a smart, personalized packing list for this trip:
- Destination: ${destination}
- Month of travel: ${travelMonth}
- Duration: ${durationDays} days
- Interests/Activities: ${interests.join(', ')}
- Planned activities summary: ${itinerarySummary}

Consider:
1. The typical climate of ${destination} in ${travelMonth}
2. The specific activities planned (e.g., hiking = boots, beach = sunscreen)
3. Local customs (e.g., religious sites = modest clothing)
4. Trip duration (${durationDays} days of clothing)

CRITICAL: Respond ONLY with a valid JSON array — no markdown, no explanation:

[
  {
    "item": "Item name",
    "category": "Documents",
    "isPacked": false,
    "essential": true
  }
]

Categories must be one of: Documents, Clothing, Gear, Electronics, Health, Other
Generate 20-25 items. Mark critical items (passport, medications) as essential: true.
`.trim();

  const raw = await callGemini(prompt);
  return parseGeminiJson(raw);
}