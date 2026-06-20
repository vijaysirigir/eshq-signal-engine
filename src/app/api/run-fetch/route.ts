import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '../../../lib/pipeline';

export async function POST(req: NextRequest) {
  try {
    const logs: string[] = [];
    const onProgress = (logLine: string) => {
      console.log(logLine);
      logs.push(logLine);
    };

    const result = await pipeline.runFetch(onProgress);

    return NextResponse.json({
      success: result.success,
      logs: logs,
      updatedCount: result.updatedCount,
      cost: result.cost
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
