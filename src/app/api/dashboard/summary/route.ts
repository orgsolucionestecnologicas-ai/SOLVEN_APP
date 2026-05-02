import { NextResponse } from "next/server";

import { getDashboardSummary } from "../../../../modules/dashboard";

export async function GET() {
  try {
    const summary = await getDashboardSummary();

    return NextResponse.json({ data: summary });
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "Could not load dashboard summary."
        }
      },
      { status: 500 }
    );
  }
}
