'use client';

import { useState } from 'react';

interface AccordionItem {
  term: string;
  definition: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item, i) => (
        <div key={item.term}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between py-3 text-left"
            aria-expanded={openIndex === i}
          >
            <span className="font-medium text-gray-800 text-sm">{item.term}</span>
            <svg
              className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === i && (
            <p className="pb-3 text-sm text-gray-600 leading-relaxed">{item.definition}</p>
          )}
        </div>
      ))}
    </div>
  );
}
