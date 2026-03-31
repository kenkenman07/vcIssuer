import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  getAuthorizationCode,
  markAuthorizationCodeAsUsed,
  createIssuanceSession,
} from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const grant_type = formData.get("grant_type") as string;
    const code = formData.get("pre-authorized_code") as string;
    const client_id = formData.get("client_id") as string;
    const redirect_uri = formData.get("redirect_uri") as string;
    const code_verifier = formData.get("code_verifier") as string;
    const user_pin = formData.get("user_pin") as string;

    // Validate grant type
    if (
      grant_type !== "authorization_code" &&
      grant_type !== "urn:ietf:params:oauth:grant-type:pre-authorized_code"
    ) {
      return NextResponse.json(
        {
          error: "unsupported_grant_type",
          error_description: "Unsupported grant type",
        },
        { status: 400 }
      );
    }

    // Get and validate authorization code
    if (!code) {
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Authorization code is required",
        },
        { status: 400 }
      );
    }

    const authCode = await getAuthorizationCode(code);
    if (!authCode) {
      return NextResponse.json(
        {
          error: "invalid_grant",
          error_description: "Invalid or expired authorization code",
        },
        { status: 400 }
      );
    }

    // For pre-authorized code flow, validate transaction code if required
    if (grant_type === "urn:ietf:params:oauth:grant-type:pre-authorized_code") {
      // Validate transaction code (user_pin)
      const expectedTxCode = (global as any).txCodeStore?.get(code);
      if (expectedTxCode && expectedTxCode !== user_pin) {
        return NextResponse.json(
          {
            error: "invalid_grant",
            error_description: "Invalid transaction code (user_pin)",
          },
          { status: 400 }
        );
      }

      // Clean up the transaction code after successful validation
      if ((global as any).txCodeStore) {
        (global as any).txCodeStore.delete(code);
      }
    } else {
      // For standard authorization code flow, validate client and redirect URI
      if (authCode.client_id !== client_id) {
        return NextResponse.json(
          { error: "invalid_client", error_description: "Invalid client ID" },
          { status: 400 }
        );
      }

      if (authCode.redirect_uri !== redirect_uri) {
        return NextResponse.json(
          {
            error: "invalid_request",
            error_description: "Invalid redirect URI",
          },
          { status: 400 }
        );
      }

      // TODO: Validate code_verifier for PKCE if code_challenge was provided
      if (authCode.code_challenge && !code_verifier) {
        return NextResponse.json(
          {
            error: "invalid_request",
            error_description: "Code verifier is required for PKCE",
          },
          { status: 400 }
        );
      }
    }

    // Generate access token and c_nonce
    const accessToken = uuidv4();
    const cNonce = uuidv4();
    const sessionId = uuidv4();
    const cNonceExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Retrieve user data from the temporary store
    const userData = (global as any).userDataStore?.get(code);

    // Create issuance session with user data
    await createIssuanceSession(
      sessionId,
      authCode.id,
      accessToken,
      cNonce,
      cNonceExpiresAt,
      userData
    );

    // Clean up the temporary user data
    if ((global as any).userDataStore) {
      (global as any).userDataStore.delete(code);
    }

    // Mark authorization code as used
    await markAuthorizationCodeAsUsed(code);

    // Return token response
    const tokenResponse: any = {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600, // 1 hour
      c_nonce: cNonce,
      c_nonce_expires_in: 300, // 5 minutes
    };

    // Add refresh_token for standard authorization code flow
    if (grant_type === "authorization_code") {
      tokenResponse.refresh_token = uuidv4();
    }

    return NextResponse.json(tokenResponse);
  } catch (error) {
    console.error("Token endpoint error:", error);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
