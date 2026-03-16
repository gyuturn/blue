'use client';

import { useState, useRef, useEffect, useId, type ReactNode } from 'react';
import { TERM_MAP } from '@/lib/terms';

export interface TooltipProps {
  term: string;
  children?: ReactNode;
  definition?: string;
}

export default function Tooltip({ term, children, definition }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  // Resolve definition from TERM_MAP if not provided
  const resolvedDef =
    definition ??
    Object.values(TERM_MAP).find((t) => t.term === term)?.shortDef ??
    '';

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };

    const handleOutsideClick = (e: Event) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setVisible(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [visible]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPosition(spaceAbove > spaceBelow && spaceAbove > 120 ? 'top' : 'bottom');
  };

  const show = () => {
    updatePosition();
    setVisible(true);
  };

  const hide = () => setVisible(false);

  const toggle = () => {
    if (visible) {
      hide();
    } else {
      show();
    }
  };

  const hoverHandlers = !isMobile
    ? { onMouseEnter: show, onMouseLeave: hide }
    : {};

  const clickHandler = isMobile ? { onClick: toggle } : {};

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        className="underline decoration-dotted decoration-blue-400 cursor-help text-blue-700"
        aria-describedby={visible ? tooltipId : undefined}
        tabIndex={0}
        onFocus={show}
        onBlur={hide}
        {...hoverHandlers}
        {...clickHandler}
      >
        {children ?? term}
      </span>
      {visible && resolvedDef && (
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 w-56 rounded-xl bg-gray-800 text-white text-xs p-3 shadow-lg transition-opacity duration-150 left-1/2 -translate-x-1/2 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <span className="font-semibold block mb-1">{term}</span>
          {resolvedDef}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45 ${
              position === 'top' ? '-bottom-1' : '-top-1'
            }`}
          />
        </span>
      )}
    </span>
  );
}
