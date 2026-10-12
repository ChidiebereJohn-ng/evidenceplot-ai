import type { InterpretationContract } from './contracts';
import { InterpretationSchema } from './contracts';

export interface ClaimVerificationResult {
  valid: boolean;
  reason?: string;
}

const PROHIBITED_CAUSAL_PATTERNS = [
  /\bproves\s+that\b/i,
  /\bproves\s+causation\b/i,
  /\bdefinitive\s+proof\b/i,
  /\bdirectly\s+caused\b/i,
  /\bestablishes\s+causation\b/i,
];

function isNegatedMention(text: string, matchIndex: number): boolean {
  const prefix = text.slice(Math.max(0, matchIndex - 28), matchIndex);
  return /\b(not|no|never|cannot|can't|does\s+not|do\s+not)\b/i.test(prefix);
}

export function numbersMatchWithinTolerance(
  claimed: number,
  actual: number
): boolean {
  if (!Number.isFinite(claimed) || !Number.isFinite(actual)) return false;
  const absDiff = Math.abs(claimed - actual);
  if (absDiff <= 1e-3) return true; // Allows 3-decimal rounding in prose/claims
  const scale = Math.max(Math.abs(actual), 1e-12);
  return absDiff / scale <= 5e-3;
}

export function verifyInterpretationClaims(
  candidate: unknown,
  verifiedNumbers: Record<string, number>,
  nTotal?: number
): ClaimVerificationResult {
  const normalizedCandidate =
    candidate && typeof candidate === 'object'
      ? (() => {
          const copy = { ...(candidate as Record<string, unknown>) };
          delete copy.source;
          delete copy.model_id;
          delete copy.prompt_version;
          delete copy.generated_at;
          delete copy.fallback_reason;
          return copy;
        })()
      : candidate;

  const schemaCheck = InterpretationSchema.safeParse(normalizedCandidate);
  if (!schemaCheck.success) {
    return {
      valid: false,
      reason: `Interpretation failed strict JSON schema validation: ${schemaCheck.error.issues[0]?.message ?? 'invalid format'}`,
    };
  }

  const data: InterpretationContract = schemaCheck.data;
  const lookup: Record<string, number> = { ...verifiedNumbers };
  if (nTotal !== undefined && lookup.n_total === undefined) {
    lookup.n_total = nTotal;
  }

  if (
    Object.keys(lookup).length > 0 &&
    (!data.verified_claims || data.verified_claims.length === 0)
  ) {
    return {
      valid: false,
      reason:
        'Interpretation contained zero verified_claims entries despite non-empty engine numbers.',
    };
  }

  for (const claim of data.verified_claims) {
    const actual = lookup[claim.key];
    if (actual === undefined) {
      return {
        valid: false,
        reason: `Unverified claim key "${claim.key}" does not exist in Python engine output.`,
      };
    }
    if (!numbersMatchWithinTolerance(claim.value, actual)) {
      return {
        valid: false,
        reason: `Numeric mismatch for "${claim.key}": AI claimed ${claim.value}, but Python engine computed ${actual}.`,
      };
    }
  }

  // Check for prohibited un-negated causal overclaiming
  const combinedProse = `${data.headline} ${data.summary} ${data.figure_caption}`;
  for (const pattern of PROHIBITED_CAUSAL_PATTERNS) {
    const match = pattern.exec(combinedProse);
    if (match && !isNegatedMention(combinedProse, match.index)) {
      return {
        valid: false,
        reason: `Rejected ungrounded causal overclaim ("${match[0]}") in interpretation text.`,
      };
    }
  }

  return { valid: true };
}
