import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  // O Clerk gerencia o sign-out automaticamente via middleware
  // Este endpoint pode ser usado para compatibilidade, mas o sign-out
  // deve ser feito no cliente usando useClerk().signOut()
  
  return NextResponse.json({ success: true });
}

