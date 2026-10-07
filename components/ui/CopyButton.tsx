'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { copyText } from '@/lib/clipboard';

interface CopyButtonProps {
  text: string;
  label: string;
  className?: string;
  icon?: ReactNode;
}

// 클릭 시 text를 복사하고 2초간 결과를 표시한다. 카드 안에서도 쓰이므로 클릭 이벤트 전파를 막는다.
export function CopyButton({ text, label, className = '', icon }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setState((await copyText(text)) ? 'copied' : 'failed');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState('idle'), 2000);
  };

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {icon}
      <span aria-live="polite">
        {state === 'copied' ? '복사됐어요 ✓' : state === 'failed' ? '복사에 실패했어요' : label}
      </span>
    </button>
  );
}
