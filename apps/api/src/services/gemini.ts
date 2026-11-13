// ============================================================
// AI BullyShield API — Gemini AI Service
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  type AnalysisResult,
  type SafeReply,
  type SafeReplyResponse,
  HarmCategory,
  RiskLevel,
  ReplyStyle,
  analysisResultSchema,
  safeReplySchema,
} from '@bullyshield/shared';
import { config } from '../config.js';

/** Lazy-initialized Gemini client */
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured. Cannot use live AI mode.');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

/** Build the analysis prompt for Gemini */
function buildAnalysisPrompt(text: string): string {
  return `You are an AI safety content analyzer for a digital safety tool called AI BullyShield.
Analyze the following text and determine if it contains harmful content.

Classify into one of these categories:
- cyberbullying: Personal attacks, insults, demeaning language targeting an individual
- harassment: Unwanted persistent contact, intimidation, stalking behavior
- threat: Threats of violence or physical harm
- abusive_language: Hostile, vulgar, or intentionally hurtful language
- discrimination: Language targeting someone's identity, race, gender, orientation, etc.
- self_harm: Content indicating self-harm ideation or suicidal thoughts
- safe: Content that does not appear harmful
- uncertain: Cannot determine with sufficient confidence

Respond with ONLY a JSON object (no markdown, no code fences, no extra text):
{
  "category": "one of the categories above",
  "riskLevel": "none" | "low" | "medium" | "high",
  "confidence": 0.0 to 1.0,
  "explanation": "brief explanation",
  "recommendedAction": "what the user should do",
  "shouldSuggestReport": true/false,
  "shouldSuggestSupport": true/false
}

Text to analyze:
"""
${text}
"""`;
}

/** Build the safe replies prompt for Gemini */
function buildSafeRepliesPrompt(text: string): string {
  return `You are an AI assistant for a digital safety tool called AI BullyShield.
A user has received the following hurtful or concerning message. Generate 3 safe, non-retaliatory reply suggestions.

IMPORTANT RULES:
- Never generate threatening, retaliatory, or insulting responses
- Replies should be empowering, respectful, and de-escalating
- Each reply must be a different style

Generate exactly 3 replies in these styles:
1. calm_polite — A calm, polite response that keeps things respectful
2. set_boundaries — A firm response that clearly sets boundaries
3. short_neutral — A brief, neutral response that disengages

Respond with ONLY a JSON object (no markdown, no code fences, no extra text):
{
  "replies": [
    { "style": "calm_polite", "label": "Calm & Polite", "text": "..." },
    { "style": "set_boundaries", "label": "Setting Boundaries", "text": "..." },
    { "style": "short_neutral", "label": "Short & Neutral", "text": "..." }
  ]
}

The hurtful message received:
"""
${text}
"""`;
}

/** Extract JSON from a response that might contain markdown code fences */
function extractJson(raw: string): string {
  // Try to extract from code fences
  const codeFenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeFenceMatch) {
    return codeFenceMatch[1].trim();
  }
  // Try to find a JSON object directly
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  return raw.trim();
}

/**
 * Analyze text for harmful content using Google Gemini.
 * Returns a validated AnalysisResult.
 */
export async function analyzeText(text: string): Promise<AnalysisResult> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: config.geminiModel,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  });

  const prompt = buildAnalysisPrompt(text);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text();

    if (!rawText) {
      throw new Error('Gemini returned an empty response');
    }

    const jsonStr = extractJson(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(
        `Failed to parse Gemini response as JSON: ${rawText.substring(0, 200)}`
      );
    }

    // Validate with Zod schema
    const validated = analysisResultSchema.safeParse(parsed);
    if (!validated.success) {
      console.error(
        '[Gemini] Response failed validation:',
        validated.error.errors
      );
      throw new Error(
        `Gemini response did not match expected schema: ${validated.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    // Add metadata fields not from the AI response
    const analysisResult: AnalysisResult = {
      ...validated.data,
      isDemoMode: false,
      timestamp: new Date().toISOString(),
    };

    return analysisResult;
  } catch (error) {
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
        throw new Error(
          'AI service quota exceeded. Please try again later or switch to demo mode.'
        );
      }
      if (error.message.includes('PERMISSION_DENIED') || error.message.includes('403')) {
        throw new Error(
          'AI service authentication failed. Please check the GEMINI_API_KEY configuration.'
        );
      }
      if (error.message.includes('DEADLINE_EXCEEDED') || error.message.includes('timeout')) {
        throw new Error(
          'AI service timed out. Please try again or switch to demo mode.'
        );
      }
    }
    throw error;
  }
}

/**
 * Generate safe reply suggestions using Google Gemini.
 * Returns a validated SafeReplyResponse.
 */
export async function generateSafeReplies(
  text: string
): Promise<SafeReplyResponse> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: config.geminiModel,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });

  const prompt = buildSafeRepliesPrompt(text);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text();

    if (!rawText) {
      throw new Error('Gemini returned an empty response');
    }

    const jsonStr = extractJson(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(
        `Failed to parse Gemini safe-reply response as JSON: ${rawText.substring(0, 200)}`
      );
    }

    // Validate the parsed object has a replies array
    const obj = parsed as Record<string, unknown>;
    if (!obj || !Array.isArray(obj.replies)) {
      throw new Error('Gemini response missing "replies" array');
    }

    // Validate each reply
    const validatedReplies: SafeReply[] = [];
    for (const reply of obj.replies) {
      const validated = safeReplySchema.safeParse(reply);
      if (validated.success) {
        validatedReplies.push(validated.data);
      }
    }

    // Ensure we have at least one reply
    if (validatedReplies.length === 0) {
      throw new Error('No valid replies in Gemini response');
    }

    // Fill in any missing styles with defaults
    const styles = [ReplyStyle.CALM_POLITE, ReplyStyle.SET_BOUNDARIES, ReplyStyle.SHORT_NEUTRAL];
    const defaultLabels: Record<string, string> = {
      [ReplyStyle.CALM_POLITE]: 'Calm & Polite',
      [ReplyStyle.SET_BOUNDARIES]: 'Setting Boundaries',
      [ReplyStyle.SHORT_NEUTRAL]: 'Short & Neutral',
    };
    const defaultTexts: Record<string, string> = {
      [ReplyStyle.CALM_POLITE]:
        "I'd appreciate it if we could keep this conversation respectful.",
      [ReplyStyle.SET_BOUNDARIES]:
        "I'm not okay with being spoken to this way. Please stop.",
      [ReplyStyle.SHORT_NEUTRAL]:
        "I'm going to step away from this conversation.",
    };

    const finalReplies = styles.map((style) => {
      const found = validatedReplies.find((r) => r.style === style);
      return (
        found || {
          style,
          label: defaultLabels[style],
          text: defaultTexts[style],
        }
      );
    });

    return {
      replies: finalReplies,
      isDemoMode: false,
      disclaimer:
        'These are AI-generated suggestions. Review and adapt them to your situation before using. Never escalate or retaliate.',
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
        throw new Error(
          'AI service quota exceeded. Please try again later or switch to demo mode.'
        );
      }
      if (error.message.includes('DEADLINE_EXCEEDED') || error.message.includes('timeout')) {
        throw new Error(
          'AI service timed out. Please try again or switch to demo mode.'
        );
      }
    }
    throw error;
  }
}
