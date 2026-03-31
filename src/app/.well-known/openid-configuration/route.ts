// src/app/.well-known/openid-configuration/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const openidConfiguration = {
    // The issuer's unique identifier.
    credential_issuer: baseUrl,
    // The endpoint where the wallet will POST to receive the actual credential.
    credential_endpoint: `${baseUrl}/api/issue/credential`,
    // The endpoint for the authorization flow.
    authorization_endpoint: `${baseUrl}/api/issue/authorize`,
    // The endpoint where the wallet exchanges an authorization code for an access token.
    token_endpoint: `${baseUrl}/api/issue/token`,
    // A list of the credential types this issuer can issue.
    credential_configurations_supported: {
      "eu.europa.ec.eudi.pid.1": {
        format: "jwt_vc",
        scope: "eu.europa.ec.eudi.pid.1",
        cryptographic_binding_methods_supported: ["jwk"],
        credential_signing_alg_values_supported: ["ES256", "ES384", "ES512"],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ["ES256", "ES384", "ES512"],
          },
        },
      },
    },
    // OAuth 2.0 grant types the issuer supports.
    grant_types_supported: [
      "authorization_code",
      "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    ],
    // Indicates support for the pre-authorized code flow.
    pre_authorized_grant_anonymous_access_supported: true,
    // PKCE code challenge methods supported.
    code_challenge_methods_supported: ["S256"],
    // Authentication methods supported by the token endpoint.
    token_endpoint_auth_methods_supported: ["none"],
    // OAuth 2.0 scopes the issuer supports.
    scopes_supported: ["eu.europa.ec.eudi.pid.1"],
  };

  return NextResponse.json(openidConfiguration, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
