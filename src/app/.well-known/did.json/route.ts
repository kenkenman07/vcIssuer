// src/app/.well-known/did.json/route.ts
import { NextResponse } from "next/server";
import { getActiveIssuerKey } from "../../../lib/database";
import { generateIssuerDid } from "../../../lib/crypto";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const issuerKey = await getActiveIssuerKey();

  if (!issuerKey) {
    return NextResponse.json(
      { error: "No active issuer key found" },
      { status: 404 }
    );
  }

  const publicKeyJWK = JSON.parse(issuerKey.public_key);
  const didId = generateIssuerDid();
  const didDocument = {
    // The context defines the vocabulary used in the document.
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    // The DID URI, which is the unique identifier for the issuer.
    id: didId,
    // The DID controller, which is the entity that controls the DID. Here, it's the issuer itself.
    controller: didId,
    // A list of public keys that can be used to verify signatures from the issuer.
    verificationMethod: [
      {
        // A unique identifier for the key, scoped to the DID.
        id: `${didId}#${issuerKey.key_id}`,
        // The type of the key.
        type: "JsonWebKey2020",
        // The DID of the key's controller.
        controller: didId,
        // The public key in JWK format.
        publicKeyJwk: publicKeyJWK,
      },
    ],
    // Specifies which keys can be used for authentication (proving control of the DID).
    authentication: [`${didId}#${issuerKey.key_id}`],
    // Specifies which keys can be used for creating verifiable credentials.
    assertionMethod: [`${didId}#${issuerKey.key_id}`],
    // A list of services provided by the DID subject, such as the issuer endpoint.
    service: [
      {
        id: `${didId}#openid-credential-issuer`,
        type: "OpenIDCredentialIssuer",
        serviceEndpoint: `${baseUrl}/.well-known/openid-credential-issuer`,
      },
    ],
  };

  return NextResponse.json(didDocument, {
    headers: {
      "Content-Type": "application/did+json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
