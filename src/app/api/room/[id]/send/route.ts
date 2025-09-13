import { NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function POST(
  request: Request, 
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const message = {
      text,
      userId,
      timestamp: Date.now(),
    };

    await supabaseAdmin()
      .channel(`room:${params.id}`)
      .send({
        type: "broadcast",
        event: "message",
        payload: message,
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}