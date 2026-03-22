'use client';

import { useState, useRef, useEffect, useId } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const lastPointerType = useRef<string>('');

  // visible일 때만 리스너 등록해 불필요한 전역 이벤트 방지
  useEffect(() => {
    if (!visible) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center"
      tabIndex={0}
      onPointerEnter={(e) => { lastPointerType.current = e.pointerType; if (e.pointerType === 'mouse') setVisible(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setVisible(false); }}
      onClick={() => { if (lastPointerType.current !== 'mouse') setVisible((v) => !v); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVisible((v) => !v); } }}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 z-50 w-max max-w-[250px] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg"
        >
          {content}
          {/* 화살표: block으로 transform 적용 보장 */}
          <span className="absolute left-3 top-full block h-2 w-2 -translate-y-1/2 rotate-45 bg-gray-800" />
        </span>
      )}
    </span>
  );
}
