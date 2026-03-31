// @ts-expect-error - CBOR types not fully supported
import * as cbor from "cbor-web";
import { generateKeyPair, exportJWK, importJWK, SignJWT, type JWK } from "jose";

/**
 * Generate the issuer DID based on the base URL
 */
export function generateIssuerDid(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `did:web:${new URL(baseUrl).hostname}`;
}

export async function decodeDigitalCredential(encodedCredential: string) {
  // 1. Convert Base64URL to standard Base64
  const base64UrlToBase64 = (input: string) => {
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    return base64;
  };

  const base64 = base64UrlToBase64(encodedCredential);

  // 2. Decode Base64 to binary
  const binaryString = atob(base64);
  const byteArray = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

  // 3. Decode CBOR
  const decoded = await cbor.decodeFirst(byteArray);
  return decoded;
}

export function decodeAllNamespaces(jsonObj: unknown) {
  const decoded: Record<string, unknown> = {};

  try {
    (jsonObj as { documents: unknown[] }).documents.forEach((doc, idx) => {
      // 1) issuerSigned.nameSpaces:
      const issuerNS =
        (doc as { issuerSigned?: { nameSpaces?: Record<string, unknown[]> } })
          .issuerSigned?.nameSpaces || {};
      Object.entries(issuerNS).forEach(([nsName, entries]) => {
        decoded[nsName] = (entries as unknown[]).map((entry: unknown) => {
          const value = (entry as { value: unknown }).value;
          const bytes = Uint8Array.from(value as number[]);
          return cbor.decodeFirstSync(bytes);
        });
      });

      // 2) deviceSigned.nameSpaces (if present):
      const deviceNS = (
        doc as { deviceSigned?: { value?: { data?: unknown } } }
      ).deviceSigned?.value;
      if (deviceNS?.data) {
        const bytes = Uint8Array.from((deviceNS as { value: number[] }).value);
        decoded[`deviceSigned_ns_${idx}`] = cbor.decodeFirstSync(bytes);
      }
    });
  } catch (e) {
    console.error(e);
  }

  return decoded;
}

// ISSUER UTILITIES

export interface MDocClaims {
  family_name: string;
  given_name: string;
  birth_date: string;
  age_over_18?: boolean;
  age_over_21?: boolean;
  document_number?: string;
  expiry_date?: string;
  issue_date?: string;
  issuing_country?: string;
  issuing_authority?: string;
}

export interface IssuerKeyPair {
  keyId: string;
  algorithm: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJWK: JWK;
  privateKeyJWK: JWK;
  issuerDid: string;
  sign: (data: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Generate a new issuer key pair for signing mDoc credentials
 */
export async function generateIssuerKeyPair(
  keyId: string,
  issuerDid: string
): Promise<IssuerKeyPair> {
  const { publicKey, privateKey } = await generateKeyPair("ES256", {
    crv: "P-256",
    extractable: true,
  });

  const publicKeyJWK = await exportJWK(publicKey);
  const privateKeyJWK = await exportJWK(privateKey);

  // Add key ID to the JWKs
  publicKeyJWK.kid = keyId;
  privateKeyJWK.kid = keyId;
  publicKeyJWK.use = "sig";
  privateKeyJWK.use = "sig";

  return {
    keyId,
    algorithm: "ES256",
    publicKey,
    privateKey,
    publicKeyJWK,
    privateKeyJWK,
    issuerDid,
    sign: async (data: Uint8Array<ArrayBufferLike>) => {
      const safeData: Uint8Array<ArrayBuffer> = new Uint8Array(data);

      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateKey,
        safeData
      );
      return new Uint8Array(signature);
    },
  };
}

/**
 * Import an issuer key pair from JWK strings
 */
export async function importIssuerKeyPair(
  keyId: string,
  publicKeyJWK: string,
  privateKeyJWK: string,
  issuerDid: string
): Promise<IssuerKeyPair> {
  const pubJWK = JSON.parse(publicKeyJWK);
  const privJWK = JSON.parse(privateKeyJWK);

  const publicKey = (await importJWK(pubJWK, "ES256")) as CryptoKey;
  const privateKey = (await importJWK(privJWK, "ES256")) as CryptoKey;

  return {
    keyId,
    algorithm: "ES256",
    publicKey,
    privateKey,
    publicKeyJWK: pubJWK,
    privateKeyJWK: privJWK,
    issuerDid,
    sign: async (data: Uint8Array<ArrayBufferLike>) => {
      const safeData: Uint8Array<ArrayBuffer> = new Uint8Array(data);

      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateKey,
        safeData
      );
      return new Uint8Array(signature);
    },
  };
}

/**
 * Create a JWT-based Verifiable Credential
 */
export async function createJWTVerifiableCredential(
  claims: MDocClaims,
  issuerKeyPair: IssuerKeyPair,
  subjectId: string,
  audience: string,
  credentialType = "eu.europa.ec.eudi.pid.1"
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const oneYear = 365 * 24 * 60 * 60;

  const vcPayload = {
    iss: issuerKeyPair.issuerDid, // e.g. "did:example:123" or "https://my.domain/issuer"
    sub: subjectId, // holder's DID
    iat: now,
    exp: now + oneYear,
    jti: `urn:uuid:${crypto.randomUUID()}`,
    vc: {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://europa.eu/eudi/pid/v1",
      ],
      type: ["VerifiableCredential", credentialType],
      issuer: issuerKeyPair.issuerDid,
      issuanceDate: new Date(now * 1000).toISOString(),
      expirationDate: new Date((now + oneYear) * 1000).toISOString(),
      credentialSubject: {
        id: subjectId,
        givenName: claims.given_name,
        familyName: claims.family_name,
        birthDate: claims.birth_date,
        ageOver18: claims.age_over_18?.toString() || "false",
        ageOver21: claims.age_over_21?.toString() || "false",
        documentNumber: claims.document_number,
        expiryDate: claims.expiry_date,
        issueDate: claims.issue_date,
        issuingCountry: claims.issuing_country,
        issuingAuthority: claims.issuing_authority,
      },
      credentialSchema: {
        id: `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/schemas/pid`,
        type: "JsonSchemaValidator2018",
      },
    },
  };

  return await new SignJWT(vcPayload)
    .setProtectedHeader({
      alg: issuerKeyPair.algorithm,
      kid: issuerKeyPair.keyId,
      typ: "JWT",
    })
    .sign(issuerKeyPair.privateKey);
}
