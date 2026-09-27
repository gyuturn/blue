import { calculateSpecialSupply, calculateTotalScore } from '@/lib/calculator';
import type { EligibilityInput, StoredScoreData } from '@/types';

export const LAST_SCORE_KEY = 'blue_last_score_v1';
export const CALC_DRAFT_KEY = 'blue_calc_draft_v1';

// 점수는 저장하지 않고 입력값만 저장한다 — 읽을 때 현재 규칙으로 다시 계산해 오래된 점수가 남지 않게 한다
export interface SavedScoreRecord {
  v: 1;
  input: EligibilityInput;
  savedAt: number;
}

export interface CalcDraft {
  v: 1;
  input: EligibilityInput;
  step: number;
  savedAt: number;
}

const BOOLEAN_FIELDS = ['isHomeless', 'isMarried', 'hasRecentChild'] as const;
const STRING_FIELDS = ['birthDate', 'subscriptionStartDate', 'region', 'marriageDate'] as const;
const NUMBER_FIELDS = [
  'homelessYears',
  'dependentsCount',
  'subscriptionPaymentCount',
  'subscriptionBalance',
  'childrenCount',
] as const;

export function isEligibilityInput(value: unknown): value is EligibilityInput {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    BOOLEAN_FIELDS.every((k) => typeof v[k] === 'boolean') &&
    STRING_FIELDS.every((k) => typeof v[k] === 'string') &&
    NUMBER_FIELDS.every((k) => typeof v[k] === 'number' && Number.isFinite(v[k]))
  );
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export function parseSavedScore(raw: string | null): SavedScoreRecord | null {
  const p = parseJson(raw);
  if (!p || p.v !== 1 || typeof p.savedAt !== 'number' || !isEligibilityInput(p.input)) return null;
  return { v: 1, input: p.input, savedAt: p.savedAt };
}

export function parseCalcDraft(raw: string | null): CalcDraft | null {
  const p = parseJson(raw);
  if (
    !p ||
    p.v !== 1 ||
    typeof p.savedAt !== 'number' ||
    typeof p.step !== 'number' ||
    !Number.isInteger(p.step) ||
    !isEligibilityInput(p.input)
  ) {
    return null;
  }
  return { v: 1, input: p.input, step: p.step, savedAt: p.savedAt };
}

export function serializeSavedScore(input: EligibilityInput, savedAt: number): string {
  const record: SavedScoreRecord = { v: 1, input, savedAt };
  return JSON.stringify(record);
}

export function serializeCalcDraft(input: EligibilityInput, step: number): string {
  const draft: CalcDraft = { v: 1, input, step, savedAt: Date.now() };
  return JSON.stringify(draft);
}

export function toStoredScoreData(input: EligibilityInput, savedAt: number): StoredScoreData {
  return {
    input,
    result: calculateTotalScore(input),
    specialSupply: calculateSpecialSupply(input),
    savedAt,
  };
}

export function resultUrl(input: EligibilityInput, fromSaved = false): string {
  const params = new URLSearchParams({ data: JSON.stringify(input) });
  if (fromSaved) params.set('from', 'saved');
  return `/result?${params.toString()}`;
}
