// 계정에 점수 저장 — 결과 화면과 홈 카드가 함께 쓴다
export type SaveOutcome = 'saved' | 'expired' | 'failed';

interface Options {
  fetchImpl?: typeof fetch;
  retryDelayMs?: number;
}

async function postOnce(body: string, fetchImpl: typeof fetch): Promise<SaveOutcome | 'retry'> {
  try {
    const res = await fetchImpl('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) return 'saved';
    if (res.status === 401) return 'expired';
    // 400 등은 다시 보내도 같으므로 5xx만 재시도한다
    return res.status >= 500 ? 'retry' : 'failed';
  } catch {
    return 'retry';
  }
}

// DB 콜드 스타트·pooler 재연결 같은 순간 실패는 한 번 더 시도하면 대부분 저장된다
export async function saveScoreToAccount(body: string, options: Options = {}): Promise<SaveOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const first = await postOnce(body, fetchImpl);
  if (first !== 'retry') return first;
  await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs ?? 1500));
  const second = await postOnce(body, fetchImpl);
  return second === 'retry' ? 'failed' : second;
}
