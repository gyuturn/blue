import { NextResponse } from 'next/server';
import type { AnnouncementDetail } from '@/types';

function extractBetween(html: string, start: string, end: string): string {
  const startIdx = html.indexOf(start);
  if (startIdx === -1) return '';
  const from = startIdx + start.length;
  const endIdx = html.indexOf(end, from);
  if (endIdx === -1) return html.slice(from).replace(/<[^>]+>/g, '').trim();
  return html.slice(from, endIdx).replace(/<[^>]+>/g, '').trim();
}

function extractThTd(html: string, thText: string): string {
  const re = new RegExp(`<th[^>]*>\\s*${thText}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const m = html.match(re);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
    const units = unitRows
      .filter((row) => row[0] && /^\d/.test(row[0]))
      .map((row) => ({
        type: row[0] ?? '',
        supplyArea: row[1] ?? '',
        totalCount: row[4] ?? row[3] ?? '',
        price: row[5] ?? row[6] ?? '',
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
