import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  getIssuanceSessionByToken,
  updateIssuanceSession,
  createIssuedCredential,
  getActiveIssuerKey,
  createIssuerKey,
} from "@/lib/database";
import {
  createJWTVerifiableCredential,
  generateIssuerKeyPair,
  importIssuerKeyPair,
  generateIssuerDid,
  type MDocClaims,
} from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "invalid_token", error_description: "Bearer token required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const session = await getIssuanceSessionByToken(accessToken);

    if (!session) {
      return NextResponse.json(
        { error: "invalid_token", error_description: "Invalid access token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { format, credential_type, proof } = body;

    // Validate credential request - only JWT format supported
    if (format !== "jwt_vc") {
      return NextResponse.json(
        {
          error: "unsupported_credential_format",
          error_description: "Only jwt_vc format is supported",
        },
        { status: 400 }
      );
    }

    const credentialType = credential_type || "eu.europa.ec.eudi.pid.1";
    if (credentialType !== "eu.europa.ec.eudi.pid.1") {
      return NextResponse.json(
        {
          error: "unsupported_credential_type",
          error_description:
            "Only eu.europa.ec.eudi.pid.1 credential type is supported",
        },
        { status: 400 }
      );
    }

    // Get user data from the issuance session
    const userData = session.user_data;
    if (!userData) {
      return NextResponse.json(
        {
          error: "missing_user_data",
          error_description: "User data not found in issuance session",
        },
        { status: 400 }
      );
    }

    // Parse user data and create claims
    const userClaims =
      typeof userData === "string" ? JSON.parse(userData) : userData;
    const claims: MDocClaims = {
      given_name: userClaims.given_name,
      family_name: userClaims.family_name,
      birth_date: userClaims.birth_date,
      age_over_18: userClaims.age_over_18 || true,
      age_over_21: userClaims.age_over_21 || true,
      document_number: userClaims.document_number || "123456789",
      expiry_date: userClaims.expiry_date || "2030-12-31",
      issue_date: new Date().toISOString().split("T")[0],
      issuing_country: userClaims.issuing_country || "EU",
      issuing_authority:
        userClaims.issuing_authority || "Digital Credentials Issuer",
    };

    // Get or create issuer key
    let issuerKey = await getActiveIssuerKey();
    if (!issuerKey) {
      // Generate new issuer key for demo
      const issuerDid = generateIssuerDid();

      const keyPair = await generateIssuerKeyPair("issuer-key-1", issuerDid);
      const keyId = uuidv4();

      await createIssuerKey(
        keyId,
        keyPair.keyId,
        "EC",
        "ES256",
        JSON.stringify(keyPair.publicKeyJWK),
        JSON.stringify(keyPair.privateKeyJWK)
      );

      issuerKey = await getActiveIssuerKey();
    }

    if (!issuerKey) {
      return NextResponse.json(
        {
          error: "server_error",
          error_description: "Failed to get issuer key",
        },
        { status: 500 }
      );
    }

    // Import the key pair for crypto operations
    const issuerDid = generateIssuerDid();

    const keyPair = await importIssuerKeyPair(
      issuerKey.key_id,
      issuerKey.public_key,
      issuerKey.private_key,
      issuerDid
    );

    // Create JWT-based Verifiable Credential
    const subjectId = `did:example:${uuidv4()}`;
    // Use the base application URL as the audience
    const audienceUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const credentialData = await createJWTVerifiableCredential(
      claims,
      keyPair,
      subjectId,
      audienceUrl,
      credentialType
    );
    const credentialFormat = "jwt_vc";

    // Store the issued credential
    const credentialId = uuidv4();
    const issuedCredId = uuidv4();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    await createIssuedCredential(
      issuedCredId,
      session.id,
      credentialId,
      credentialFormat,
      credentialType,
      credentialData,
      claims,
      keyPair.keyId,
      credentialId, // Using credential ID as subject ID for demo
      expiresAt
    );

    // Update session status
    await updateIssuanceSession(session.id, "credential_issued");

    // Generate new c_nonce for potential additional credential requests
    const newCNonce = uuidv4();
    const newCNonceExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await updateIssuanceSession(
      session.id,
      "credential_issued",
      newCNonce,
      newCNonceExpiresAt
    );

    console.log("credentialData", credentialData);

    // Return the credential response
    return NextResponse.json({
      format: credentialFormat,
      credential: credentialData,
      c_nonce: newCNonce,
      c_nonce_expires_in: 300,
    });
  } catch (error) {
    console.error("Credential endpoint error:", error);
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
