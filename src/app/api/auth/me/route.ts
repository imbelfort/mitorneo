import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
