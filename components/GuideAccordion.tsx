'use client';

import { useState } from 'react';

export interface FAQItem {
  q: string;
  a: string;
}

export default function GuideAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={openIndex === i}
          >
            <span className="font-semibold text-gray-800 text-sm pr-4">
              <span className="text-blue-600 mr-2">Q.</span>
              {item.q}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                openIndex === i ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {openIndex === i && (
            <div className="px-5 pb-4 pt-1">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {item.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
