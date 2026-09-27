import {
  calcHomelessYearsFromPolicy,
  calculateSpecialSupply,
  calculateTotalScore,
} from '@/lib/calculator';
import type { EligibilityInput, StoredScoreData } from '@/types';

export const LAST_SCORE_KEY = 'blue_last_score_v1';
// v2: 계산기가 6단계(결혼 질문을 2단계로)로 바뀌어 v1의 단계 번호와 호환되지 않는다
export const CALC_DRAFT_KEY = 'blue_calc_draft_v2';
// sessionStorage: 사용자가 직접 "다른 기기에서도 보기"를 눌렀을 때만 로그인 후 이 기기 기록을 계정에 올린다
const SYNC_AFTER_LOGIN_KEY = 'blue_sync_after_login';
// 로그인을 취소한 뒤 같은 탭에서 다른 사람이 로그인해도 올라가지 않도록 짧게 만료시킨다
const SYNC_AFTER_LOGIN_TTL_MS = 10 * 60 * 1000;

export function markSyncAfterLogin(): void {
  try {
    sessionStorage.setItem(SYNC_AFTER_LOGIN_KEY, String(Date.now()));
  } catch {}
}

export function consumeSyncAfterLogin(): boolean {
  try {
    const markedAt = Number(sessionStorage.getItem(SYNC_AFTER_LOGIN_KEY));
    sessionStorage.removeItem(SYNC_AFTER_LOGIN_KEY);
    return markedAt > 0 && Date.now() - markedAt < SYNC_AFTER_LOGIN_TTL_MS;
  } catch {
    return false;
  }
}

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

// 무주택 기간은 입력 시점 값이 저장돼 있으므로 오늘 기준으로 다시 계산한다 (통장 기간·혼인 기간처럼)
export function refreshInput(input: EligibilityInput): EligibilityInput {
  return {
    ...input,
    homelessYears: calcHomelessYearsFromPolicy(input.birthDate, input.isMarried, input.marriageDate),
  };
}

export function toStoredScoreData(input: EligibilityInput, savedAt: number): StoredScoreData {
  const fresh = refreshInput(input);
  return {
    input: fresh,
    result: calculateTotalScore(fresh),
    specialSupply: calculateSpecialSupply(fresh),
    savedAt,
  };
}

export function scorePostBody(input: EligibilityInput): string {
  const { result, specialSupply, input: fresh } = toStoredScoreData(input, Date.now());
  return JSON.stringify({
    totalScore: result.totalScore,
    housingScore: result.homelessScore,
    dependentScore: result.dependentsScore,
    subscriptionScore: result.subscriptionScore,
    tier: result.tier,
    specialSupply,
    inputSnapshot: fresh,
  });
}

export function resultUrl(input: EligibilityInput, fromSaved = false): string {
  const params = new URLSearchParams({ data: JSON.stringify(input) });
  if (fromSaved) params.set('from', 'saved');
  return `/result?${params.toString()}`;
}
