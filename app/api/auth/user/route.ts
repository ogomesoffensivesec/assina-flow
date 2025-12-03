import { validateRequest } from "@/lib/auth/utils";
import { NextResponse } from "next/server";

export async function GET() {
  const { user } = await validateRequest();
  
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}

