-- Create database if not exists
CREATE DATABASE IF NOT EXISTS digital_credentials;
USE digital_credentials;
 
-- Table for storing challenges
CREATE TABLE IF NOT EXISTS challenges (
    id VARCHAR(36) PRIMARY KEY,
    challenge VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    INDEX idx_challenge (challenge),
    INDEX idx_expires_at (expires_at)
);
 
-- Table for storing verification sessions
CREATE TABLE IF NOT EXISTS verification_sessions (
    id VARCHAR(36) PRIMARY KEY,
    challenge_id VARCHAR(36),
    status ENUM('pending', 'verified', 'failed', 'expired') DEFAULT 'pending',
    presentation_data JSON,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    INDEX idx_challenge_id (challenge_id),
    INDEX idx_status (status)
);
 
-- Table for storing verified credentials data (optional)
CREATE TABLE IF NOT EXISTS verified_credentials (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36),
    credential_type VARCHAR(255),
    issuer VARCHAR(255),
    subject VARCHAR(255),
    claims JSON,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES verification_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_credential_type (credential_type)
);
 
-- ISSUER TABLES
 
-- Table for storing authorization codes in OpenID4VCI flow
CREATE TABLE IF NOT EXISTS authorization_codes (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    client_id VARCHAR(255),
    scope VARCHAR(255),
    code_challenge VARCHAR(255),
    code_challenge_method VARCHAR(50),
    redirect_uri TEXT,
    user_pin VARCHAR(10),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    INDEX idx_code (code),
    INDEX idx_expires_at (expires_at)
);
 
-- Table for storing issuance sessions
CREATE TABLE IF NOT EXISTS issuance_sessions (
    id VARCHAR(36) PRIMARY KEY,
    authorization_code_id VARCHAR(36),
    access_token VARCHAR(255),
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_in INT DEFAULT 3600,
    c_nonce VARCHAR(255),
    c_nonce_expires_at TIMESTAMP,
    status ENUM('pending', 'authorized', 'credential_issued', 'expired', 'failed') DEFAULT 'pending',
    user_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (authorization_code_id) REFERENCES authorization_codes(id) ON DELETE CASCADE,
    INDEX idx_access_token (access_token),
    INDEX idx_c_nonce (c_nonce),
    INDEX idx_status (status)
);
 
-- Table for storing issued credentials
CREATE TABLE IF NOT EXISTS issued_credentials (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36),
    credential_id VARCHAR(255),
    credential_type VARCHAR(255) DEFAULT 'jwt_vc',
    doctype VARCHAR(255) DEFAULT 'eu.europa.ec.eudi.pid.1',
    credential_data LONGTEXT, -- Base64 encoded mDoc
    credential_claims JSON,
    issuer_did VARCHAR(255),
    subject_id VARCHAR(255),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES issuance_sessions(id) ON DELETE CASCADE,
    INDEX idx_credential_id (credential_id),
    INDEX idx_session_id (session_id),
    INDEX idx_doctype (doctype),
    INDEX idx_subject_id (subject_id),
    INDEX idx_issued_at (issued_at)
);
 
-- Table for storing issuer keys (simplified for demo)
CREATE TABLE IF NOT EXISTS issuer_keys (
    id VARCHAR(36) PRIMARY KEY,
    key_id VARCHAR(255) NOT NULL UNIQUE,
    key_type VARCHAR(50) NOT NULL, -- 'EC', 'RSA'
    algorithm VARCHAR(50) NOT NULL, -- 'ES256', 'RS256', etc.
    public_key TEXT NOT NULL, -- JWK format
    private_key TEXT NOT NULL, -- JWK format (encrypted in production)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_key_id (key_id),
    INDEX idx_is_active (is_active)
);