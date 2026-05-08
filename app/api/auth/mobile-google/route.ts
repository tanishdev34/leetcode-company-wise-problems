import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { idToken, accessToken } = (await req.json()) as {
    idToken?: string;
    accessToken?: string;
  };

  if (!idToken) {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  // Better Auth verifies the ID token (signature + aud against the configured
  // Google clientId), creates/links the user, and issues a session cookie.
  const response = await auth.api.signInSocial({
    body: {
      provider: "google",
      idToken: { token: idToken, accessToken },
    },
    asResponse: true,
  });

  return response;
}
