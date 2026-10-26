import { NextResponse } from 'next/server';
import { ApplyhomeFetchError, fetchApplyhomeDetail } from '@/lib/applyhomeDetail';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const houseManageNo = searchParams.get('houseManageNo');
  const pblancNo = searchParams.get('pblancNo') ?? houseManageNo;

  if (!houseManageNo) {
    return NextResponse.json({ error: 'houseManageNo required' }, { status: 400 });
  }

  try {
    const detail = await fetchApplyhomeDetail(houseManageNo, pblancNo!);
    return NextResponse.json({ data: detail });
  } catch (err) {
    if (err instanceof ApplyhomeFetchError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error('[Detail API] error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
