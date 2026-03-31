// src/app/.well-known/openid-credential-issuer/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const issuerMetadata = {
    // The issuer's unique identifier.
    issuer: baseUrl,
    // The URL of the authorization server. For simplicity, our issuer is its own authorization server.
    authorization_servers: [baseUrl],
    // The URL of the credential issuer.
    credential_issuer: baseUrl,
    // The endpoint where the wallet will POST to receive the actual credential.
    credential_endpoint: `${baseUrl}/api/issue/credential`,
    // The endpoint where the wallet exchanges an authorization code for an access token.
    token_endpoint: `${baseUrl}/api/issue/token`,
    // The endpoint for the authorization flow (not used in our pre-authorized flow, but good practice to include).
    authorization_endpoint: `${baseUrl}/api/issue/authorize`,
    // Indicates support for the pre-authorized code flow without requiring client authentication.
    pre_authorized_grant_anonymous_access_supported: true,
    // Human-readable information about the issuer.
    display: [
      {
        name: "Corbado Credentials Issuer",
        locale: "en-US",
      },
    ],
    // A list of the credential types this issuer can issue.
    credential_configurations_supported: {
      "eu.europa.ec.eudi.pid.1": {
        // The format of the credential (e.g., jwt_vc, mso_mdoc).
        format: "jwt_vc",
        // The specific document type, conforming to ISO mDoc standards.
        doctype: "eu.europa.ec.eudi.pid.1",
        // The OAuth 2.0 scope associated with this credential type.
        scope: "eu.europa.ec.eudi.pid.1",
        // Methods the wallet can use to prove possession of its key.
        cryptographic_binding_methods_supported: ["jwk"],
        // Signing algorithms the issuer supports for this credential.
        credential_signing_alg_values_supported: ["ES256"],
        // Proof-of-possession types the wallet can use.
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ["ES256", "ES384", "ES512"],
          },
        },
        // Display properties for the credential.
        display: [
          {
            name: "Corbado Credential Issuer",
            locale: "en-US",
            logo: {
              uri: `${baseUrl}/logo.png`,
              alt_text: "EU Digital Identity",
            },
            background_color: "#003399",
            text_color: "#FFFFFF",
          },
        ],
        // A list of the claims (attributes) in the credential.
        claims: {
          "eu.europa.ec.eudi.pid.1": {
            given_name: {
              mandatory: true,
              display: [{ name: "Given Name", locale: "en-US" }],
            },
            family_name: {
              mandatory: true,
              display: [{ name: "Family Name", locale: "en-US" }],
            },
            birth_date: {
              mandatory: true,
              display: [{ name: "Date of Birth", locale: "en-US" }],
            },
          },
        },
      },
    },
    // Authentication methods supported by the token endpoint. 'none' means public client.
    token_endpoint_auth_methods_supported: ["none"],
    // PKCE code challenge methods supported.
    code_challenge_methods_supported: ["S256"],
    // OAuth 2.0 grant types the issuer supports.
    grant_types_supported: [
      "authorization_code",
      "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    ],
  };

  return NextResponse.json(issuerMetadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
