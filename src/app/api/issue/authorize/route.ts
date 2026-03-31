import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createAuthorizationCode } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_data } = body;

    // Validate required user data for PID credential
    if (
      !user_data ||
      !user_data.given_name ||
      !user_data.family_name ||
      !user_data.birth_date
    ) {
      return NextResponse.json(
        {
          error: "missing_user_data",
          error_description:
            "Required user data (given_name, family_name, birth_date) is missing",
        },
        { status: 400 }
      );
    }

    // Generate pre-authorized code
    const code = uuidv4();
    const codeId = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store authorization code
    await createAuthorizationCode(
      codeId,
      code,
      expiresAt,
      undefined, // client_id
      "eu.europa.ec.eudi.pid.1", // scope
      undefined, // code_challenge
      undefined, // code_challenge_method
      undefined // redirect_uri
    );

    // Store user data separately for later use in issuance session
    // In a real implementation, you might want to store this more securely
    // For now, we'll store it in a simple in-memory map (not production-ready)
    if (!(global as any).userDataStore) {
      (global as any).userDataStore = new Map();
    }
    (global as any).userDataStore.set(code, user_data);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Generate a transaction code (PIN) for additional security
    // This is a 4-digit code that the user must provide when exchanging the authorization code for a token
    const txCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    console.log(
      "Generated transaction code:",
      txCode,
      "for authorization code:",
      code
    );

    // Store the transaction code with the authorization code
    if (!(global as any).txCodeStore) {
      (global as any).txCodeStore = new Map();
    }
    (global as any).txCodeStore.set(code, txCode);

    // Create the credential offer
    const credentialOffer = {
      credential_issuer: baseUrl,
      credential_configuration_ids: ["eu.europa.ec.eudi.pid.1"],
      grants: {
        "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
          "pre-authorized_code": code,
          user_pin_required: true,
          tx_code: txCode,
        },
      },
      // Add supported formats
      supported_formats: {
        jwt_vc: {
          alg: ["ES256"],
        },
      },
    };

    // Create the credential offer URI
    const credentialOfferUri = `openid-credential-offer://?credential_offer=${encodeURIComponent(
      JSON.stringify(credentialOffer)
    )}`;

    return NextResponse.json({
      success: true,
      credential_offer: credentialOffer,
      credential_offer_uri: credentialOfferUri,
      pre_authorized_code: code,
      tx_code: txCode, // Include the transaction code in the response
      expires_in: 600, // 10 minutes
      qr_code_data: credentialOfferUri,
    });
  } catch (error) {
    console.error("Authorization error:", error);
    console.error("Error stack:", (error as Error).stack);
    return NextResponse.json(
      {
        error: "server_error",
        error_description: `Internal server error: ${(error as Error).message}`,
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).stack
            : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle GET request for authorization (standard OAuth flow)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id");
  const scope = url.searchParams.get("scope");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");

  // Validate parameters
  if (responseType !== "code") {
    return NextResponse.json(
      {
        error: "unsupported_response_type",
        error_description: "Only 'code' response type is supported",
      },
      { status: 400 }
    );
  }

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "client_id and redirect_uri are required",
      },
      { status: 400 }
    );
  }

  // For this demo, we'll auto-approve the authorization
  // In a real implementation, you would show a consent screen

  // Generate authorization code
  const code = uuidv4();
  const codeId = uuidv4();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await createAuthorizationCode(
    codeId,
    code,
    expiresAt,
    clientId,
    scope || "eu.europa.ec.eudi.pid.1",
    codeChallenge || undefined,
    codeChallengeMethod || undefined,
    redirectUri
  );

  // Redirect back to client with authorization code
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) {
    redirectUrl.searchParams.set("state", state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}
