import { NextResponse } from 'next/server';
import type { AnnouncementDetail } from '@/types';

function extractThTd(html: string, thText: string): string {
  const re = new RegExp(`<th[^>]*>\\s*${thText}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const m = html.match(re);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// 분양가 단위는 만원. 5천만원(5,000) ~ 500억(5,000,000) 범위만 유효한 분양가로 본다.
// 공고번호(예: 2026000453) 같은 긴 숫자가 분양가 칸으로 잘못 잡혀 "202600억"으로 표시되던 문제 방지.
const MIN_PRICE = 5_000;
const MAX_PRICE = 5_000_000;

function parsePlausiblePrice(raw: string): number | null {
  const match = raw.match(/^[\d,]+/);
  if (!match) return null;
  const num = parseInt(match[0].replace(/,/g, ''), 10);
  if (isNaN(num) || num < MIN_PRICE || num > MAX_PRICE) return null;
  return num;
}

function cleanPrice(raw: string): string {
  const num = parsePlausiblePrice(raw);
  return num === null ? '' : num.toLocaleString('ko-KR');
}

const PRICE_HEADER_RE = /분양최고가|공급금액|분양가/;

function extractRowsFromTable(table: string): string[][] {
  const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  return rows.map((row) => {
    const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    const cells: string[] = [];
    let cm;
    while ((cm = cellRe.exec(row)) !== null) {
      cells.push(cm[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
    }
    return cells;
  }).filter((r) => r.length > 0);
}

// "분양최고가/공급금액" 표에서 주택형별 분양가를 추출한다. (주택형 → 분양가 만원 단위 문자열)
function extractPriceByType(html: string): Map<string, string> {
  const result = new Map<string, string>();
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  for (const table of tables) {
    if (!PRICE_HEADER_RE.test(table) || !table.includes('주택형')) continue;
    const rows = extractRowsFromTable(table);
    const header = rows.find((r) => r.some((c) => PRICE_HEADER_RE.test(c)));
    const priceIdx = header ? header.findIndex((c) => PRICE_HEADER_RE.test(c)) : -1;
    for (const row of rows) {
      if (!row[0] || !/^\d/.test(row[0])) continue;
      let price: number | null = null;
      if (header && row.length === header.length && priceIdx >= 0) {
        price = parsePlausiblePrice(row[priceIdx]);
      }
      if (price === null) {
        // 열 수가 헤더와 다르면(rowspan 등) 유효 범위 숫자 중 최댓값 사용 (분양가 > 계약금·중도금)
        const nums = row.slice(1).map(parsePlausiblePrice).filter((n): n is number => n !== null);
        if (nums.length > 0) price = Math.max(...nums);
      }
      if (price !== null && !result.has(row[0])) result.set(row[0], price.toLocaleString('ko-KR'));
    }
  }
  return result;
}

function extractTableRows(html: string, headerKeyword: string): string[][] {
  // Find table that contains a th with headerKeyword
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRe) ?? [];

  for (const table of tables) {
    if (!table.includes(headerKeyword)) continue;
    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    const rows = table.match(rowRe) ?? [];
    return rows.map((row) => {
      const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      const cells: string[] = [];
      let cm;
      while ((cm = cellRe.exec(row)) !== null) {
        cells.push(cm[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
      }
      return cells;
    }).filter((r) => r.length > 0);
  }
  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseManageNo = searchParams.get('houseManageNo');
  const pblancNo = searchParams.get('pblancNo') ?? houseManageNo;

  if (!houseManageNo) {
    return NextResponse.json({ error: 'houseManageNo required' }, { status: 400 });
  }

  try {
    const url = `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${houseManageNo}&pblancNo=${pblancNo}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://www.applyhome.co.kr/',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `applyhome fetch failed: ${res.status}` }, { status: 502 });
    }

    const html = await res.text();

    // 기본 정보
    const location = extractThTd(html, '공급위치');
    const totalSupply = extractThTd(html, '공급규모');
    const operator = extractThTd(html, '시행사');
    const constructor = extractThTd(html, '시공사');
    const moveInDate = extractThTd(html, '입주예정월');
    const announcementDate = extractThTd(html, '모집공고일');
    const winnerDate = extractThTd(html, '당첨자발표');
    const contractPeriod = extractThTd(html, '계약일');

    // 청약 일정 테이블 (특별공급/1순위/2순위)
    const scheduleRows = extractTableRows(html, '특별공급');
    const schedule = scheduleRows
      .filter((row) => ['특별공급', '1순위', '2순위'].some((t) => row[0]?.includes(t)))
      .map((row) => ({
        type: row[0] ?? '',
        localDate: row[1] ?? '',
        otherDate: row[2] ?? '',
        place: row[3] ?? '',
      }));

    // 주택형별 공급 테이블
    const unitRows = extractTableRows(html, '주택형');
    // 헤더 행 제거 후 데이터 행만 추출 (주택형 셀이 숫자로 시작하는 행)
    const priceByType = extractPriceByType(html);
    const units = unitRows
      .filter((row) => row[0] && /^\d/.test(row[0]))
      .map((row) => ({
        type: (row[0] ?? '').trim(),
        supplyArea: row[1] ?? '',
        totalCount: row[4] ?? row[3] ?? '',
        price: priceByType.get(row[0]) ?? cleanPrice(row[5] ?? row[6] ?? ''),
      }));

    const detail: AnnouncementDetail = {
      location,
      totalSupply,
      operator,
      constructor,
      moveInDate,
      announcementDate,
      winnerDate,
      contractPeriod,
      schedule,
      units,
    };

    return NextResponse.json({ data: detail });
  } catch (err) {
    console.error('[Detail API] error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
