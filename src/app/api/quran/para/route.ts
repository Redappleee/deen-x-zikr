import { NextResponse } from "next/server";
import { PARA_META } from "@/lib/quran/para";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ para: PARA_META });
}
