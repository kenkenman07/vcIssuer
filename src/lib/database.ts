import mysql from "mysql2/promise";

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "3306"),
  user: process.env.DATABASE_USER || "app_user",
  password: process.env.DATABASE_PASSWORD || "app_password",
  database: process.env.DATABASE_NAME || "digital_credentials",
  timezone: "+00:00",
};

let connection: mysql.Connection | null = null;

export async function getConnection(): Promise<mysql.Connection> {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }
  return connection;
}

export interface Challenge {
  id: string;
  challenge: string;
  expires_at: Date;
  created_at: Date;
  used: boolean;
}

export interface VerificationSession {
  id: string;
  challenge_id: string;
  status: "pending" | "verified" | "failed" | "expired";
  presentation_data?: any;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ISSUER INTERFACES

export interface AuthorizationCode {
  id: string;
  code: string;
  client_id?: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  redirect_uri?: string;
  user_pin?: string;
  expires_at: Date;
  created_at: Date;
  used: boolean;
}

export interface IssuanceSession {
  id: string;
  authorization_code_id: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  c_nonce?: string;
  c_nonce_expires_at?: Date;
  status: "pending" | "authorized" | "credential_issued" | "expired" | "failed";
  user_data?: any;
  created_at: Date;
  updated_at: Date;
}

export interface IssuedCredential {
  id: string;
  session_id: string;
  credential_id: string;
  credential_type: string;
  doctype: string;
  credential_data: string; // Base64 encoded mDoc
  credential_claims: any;
  issuer_did: string;
  subject_id: string;
  issued_at: Date;
  expires_at?: Date;
  revoked: boolean;
  revoked_at?: Date;
}

export interface IssuerKey {
  id: string;
  key_id: string;
  key_type: string;
  algorithm: string;
  public_key: string; // JWK format
  private_key: string; // JWK format
  is_active: boolean;
  created_at: Date;
}

// Challenge operations
export async function createChallenge(
  id: string,
  challenge: string,
  expiresAt: Date
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    "INSERT INTO challenges (id, challenge, expires_at) VALUES (?, ?, ?)",
    [id, challenge, expiresAt]
  );
}

export async function getChallenge(
  challenge: string
): Promise<Challenge | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM challenges WHERE challenge = ? AND expires_at > NOW() AND used = FALSE",
    [challenge]
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return {
      id: row.id,
      challenge: row.challenge,
      expires_at: row.expires_at,
      created_at: row.created_at,
      used: row.used,
    };
  }

  return null;
}

export async function markChallengeAsUsed(challenge: string): Promise<void> {
  const conn = await getConnection();
  await conn.execute("UPDATE challenges SET used = TRUE WHERE challenge = ?", [
    challenge,
  ]);
}

export async function cleanupExpiredChallenges(): Promise<void> {
  const conn = await getConnection();
  await conn.execute("DELETE FROM challenges WHERE expires_at < NOW()");
}

// Verification session operations
export async function createVerificationSession(
  id: string,
  challengeId: string,
  status: string = "pending"
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    "INSERT INTO verification_sessions (id, challenge_id, status) VALUES (?, ?, ?)",
    [id, challengeId, status]
  );
}

export async function updateVerificationSession(
  sessionId: string,
  status: string,
  presentationData?: any
): Promise<void> {
  const conn = await getConnection();
  const updates = ["status = ?"];
  const values = [status];

  if (presentationData) {
    updates.push("presentation_data = ?");
    values.push(JSON.stringify(presentationData));
  }

  if (status === "verified") {
    updates.push("verified_at = NOW()");
  }

  values.push(sessionId);

  await conn.execute(
    `UPDATE verification_sessions SET ${updates.join(
      ", "
    )}, updated_at = NOW() WHERE id = ?`,
    values
  );
}

export async function getVerificationSession(
  sessionId: string
): Promise<VerificationSession | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM verification_sessions WHERE id = ?",
    [sessionId]
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return {
      id: row.id,
      challenge_id: row.challenge_id,
      status: row.status,
      presentation_data: row.presentation_data
        ? JSON.parse(row.presentation_data)
        : undefined,
      verified_at: row.verified_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  return null;
}

// ISSUER OPERATIONS

// Authorization Code operations
export async function createAuthorizationCode(
  id: string,
  code: string,
  expiresAt: Date,
  clientId?: string,
  scope?: string,
  codeChallenge?: string,
  codeChallengeMethod?: string,
  redirectUri?: string,
  userPin?: string
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO authorization_codes 
     (id, code, client_id, scope, code_challenge, code_challenge_method, redirect_uri, user_pin, expires_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      clientId || null,
      scope || null,
      codeChallenge || null,
      codeChallengeMethod || null,
      redirectUri || null,
      userPin || null,
      expiresAt,
    ]
  );
}

export async function getAuthorizationCode(
  code: string
): Promise<AuthorizationCode | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM authorization_codes WHERE code = ? AND expires_at > NOW() AND used = FALSE",
    [code]
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return {
      id: row.id,
      code: row.code,
      client_id: row.client_id,
      scope: row.scope,
      code_challenge: row.code_challenge,
      code_challenge_method: row.code_challenge_method,
      redirect_uri: row.redirect_uri,
      user_pin: row.user_pin,
      expires_at: row.expires_at,
      created_at: row.created_at,
      used: row.used,
    };
  }
  return null;
}

export async function markAuthorizationCodeAsUsed(code: string): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    "UPDATE authorization_codes SET used = TRUE WHERE code = ?",
    [code]
  );
}

// Issuance Session operations
export async function createIssuanceSession(
  id: string,
  authorizationCodeId: string,
  accessToken: string,
  cNonce?: string,
  cNonceExpiresAt?: Date,
  userData?: any
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO issuance_sessions 
     (id, authorization_code_id, access_token, c_nonce, c_nonce_expires_at, user_data, status) 
     VALUES (?, ?, ?, ?, ?, ?, 'authorized')`,
    [
      id,
      authorizationCodeId,
      accessToken,
      cNonce || null,
      cNonceExpiresAt || null,
      userData ? JSON.stringify(userData) : null,
    ]
  );
}

export async function getIssuanceSessionByToken(
  accessToken: string
): Promise<IssuanceSession | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM issuance_sessions WHERE access_token = ? AND status IN ('authorized', 'credential_issued')",
    [accessToken]
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return {
      id: row.id,
      authorization_code_id: row.authorization_code_id,
      access_token: row.access_token,
      token_type: row.token_type,
      expires_in: row.expires_in,
      c_nonce: row.c_nonce,
      c_nonce_expires_at: row.c_nonce_expires_at,
      status: row.status,
      user_data: row.user_data ? row.user_data : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
  return null;
}

export async function updateIssuanceSession(
  sessionId: string,
  status: string,
  cNonce?: string,
  cNonceExpiresAt?: Date
): Promise<void> {
  const conn = await getConnection();
  const updates = ["status = ?"];
  const values: (string | Date)[] = [status];

  if (cNonce) {
    updates.push("c_nonce = ?");
    values.push(cNonce);
  }

  if (cNonceExpiresAt) {
    updates.push("c_nonce_expires_at = ?");
    values.push(cNonceExpiresAt);
  }

  values.push(sessionId);

  await conn.execute(
    `UPDATE issuance_sessions SET ${updates.join(
      ", "
    )}, updated_at = NOW() WHERE id = ?`,
    values
  );
}

// Issued Credential operations
export async function createIssuedCredential(
  id: string,
  sessionId: string,
  credentialId: string,
  credentialType: string,
  doctype: string,
  credentialData: string,
  credentialClaims: any,
  issuerDid: string,
  subjectId: string,
  expiresAt?: Date
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO issued_credentials 
     (id, session_id, credential_id, credential_type, doctype, credential_data, credential_claims, issuer_did, subject_id, expires_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      sessionId,
      credentialId,
      credentialType,
      doctype,
      credentialData,
      JSON.stringify(credentialClaims),
      issuerDid,
      subjectId,
      expiresAt ?? null,
    ]
  );
}

export async function getIssuedCredential(
  credentialId: string
): Promise<IssuedCredential | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM issued_credentials WHERE credential_id = ? AND revoked = FALSE",
    [credentialId]
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return {
      id: row.id,
      session_id: row.session_id,
      credential_id: row.credential_id,
      credential_type: row.credential_type,
      doctype: row.doctype,
      credential_data: row.credential_data,
      credential_claims: JSON.parse(row.credential_claims),
      issuer_did: row.issuer_did,
      subject_id: row.subject_id,
      issued_at: row.issued_at,
      expires_at: row.expires_at,
      revoked: row.revoked,
      revoked_at: row.revoked_at,
    };
  }
  return null;
}

// Issuer Key operations
export async function createIssuerKey(
  id: string,
  keyId: string,
  keyType: string,
  algorithm: string,
  publicKey: string,
  privateKey: string
): Promise<void> {
  const conn = await getConnection();
  await conn.execute(
    `INSERT INTO issuer_keys (id, key_id, key_type, algorithm, public_key, private_key) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, keyId, keyType, algorithm, publicKey, privateKey]
  );
}

export async function getActiveIssuerKey(): Promise<IssuerKey | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM issuer_keys WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1"
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return {
      id: row.id,
      key_id: row.key_id,
      key_type: row.key_type,
      algorithm: row.algorithm,
      public_key: row.public_key,
      private_key: row.private_key,
      is_active: row.is_active,
      created_at: row.created_at,
    };
  }
  return null;
}

export async function getIssuerKeyById(
  keyId: string
): Promise<IssuerKey | null> {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    "SELECT * FROM issuer_keys WHERE key_id = ? AND is_active = TRUE",
    [keyId]
  );

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as any;
    return {
      id: row.id,
      key_id: row.key_id,
      key_type: row.key_type,
      algorithm: row.algorithm,
      public_key: row.public_key,
      private_key: row.private_key,
      is_active: row.is_active,
      created_at: row.created_at,
    };
  }
  return null;
}
