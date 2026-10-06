'use client';

import { useEffect, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 아래 fallback으로 재시도
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label = '복사', className = '' }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const handleClick = async () => {
    const ok = await copyToClipboard(text);
    setState(ok ? 'copied' : 'failed');
  };

  const display = state === 'copied' ? '복사됨 ✓' : state === 'failed' ? '복사 실패' : label;

  return (
    <button type="button" onClick={handleClick} className={className} aria-live="polite">
      {display}
    </button>
  );
}
