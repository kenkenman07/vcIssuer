# Specification

本ドキュメントは本プロジェクトに実装された OpenID for Verifiable Credential Issuance (OID4VCI) のフローを説明します。本実装は Pre-Authorized Code Grant を対象とし、JWT 形式の Verifiable Credential（VC）を発行します。

## 対象範囲（Scope）

- プロトコル: OpenID4VCI（Pre-Authorized Code Grant）
- クレデンシャル形式: JWT VC（のみ）
- クレデンシャル種別: eu.europa.ec.eudi.pid.1（最小サブセット）
- ランタイム: Next.js（App Router）, Node.js
- 非対象（現時点）: mDL/mdoc 発行、厳密な PoP 検証、プロダクション相当のセキュリティ

## コンポーネント

- Web UI
  - `src/app/issue/page.tsx`  
    ユーザ属性を入力 → `/api/issue/authorize` にリクエスト → 返却された Offer URI を QR 表示（`qrcode` 使用）
- Issuer API
  - `src/app/api/issue/authorize/route.ts`  
    Pre-Authorized Code と PIN（tx code）を生成し、Credential Offer と QR 用データを返す
  - `src/app/api/issue/token/route.ts`  
    Pre-Authorized Code（+ PIN）と引き換えに `access_token` と `c_nonce` を返す
  - `src/app/api/issue/credential/route.ts`  
    アクセストークンで JWT VC を発行して返す
- メタデータ（well-known）
  - `src/app/.well-known/openid-credential-issuer/route.ts`  
    Issuer Metadata（credential/token/authorization エンドポイント、対応設定など）
  - `src/app/.well-known/openid-configuration/route.ts`  
    互換性のための簡易 OpenID 設定
- スキーマ
  - `src/app/api/schemas/pid/route.ts`  
    PID 風クレデンシャルの JSON Schema 参照
- 暗号/ストレージ
  - `src/lib/crypto.ts`  
    鍵の生成/インポート、`createJWTVerifiableCredential` による JWT VC 作成
  - `src/lib/database.ts`  
    認可コード、発行セッション、鍵、発行済み VC の保存（簡易実装）
- 設定
  - `.env.local`  
    `NEXT_PUBLIC_BASE_URL`: 外部から到達可能なベース URL（全メタデータとエンドポイントで使用）

## エンドポイント一覧

- Issuer メタデータ
  - GET `/.well-known/openid-credential-issuer`
- OpenID 設定（簡易）
  - GET `/.well-known/openid-configuration`
- Authorization/Offer
  - POST `/api/issue/authorize`
- Token
  - POST `/api/issue/token`（`application/x-www-form-urlencoded`）
- Credential
  - POST `/api/issue/credential`（JSON）
- PID スキーマ
  - GET `/api/schemas/pid`

## フロー（シーケンス）

1) ユーザが Offer を要求（UI → サーバ）
- UI がユーザ属性を `/api/issue/authorize` に POST
- サーバは Pre-Authorized Code と 4 桁 PIN（tx code）を生成し、Credential Offer と `openid-credential-offer://?...` を返却
- UI は返却された Offer URI を QR 化して表示

2) ウォレットが QR を読み取り
- Offer から Issuer/Grant 情報を解釈し、トークン要求の準備を行う

3) ウォレットがアクセストークンを取得
- `/api/issue/token` に以下を送信
  - `grant_type=urn:ietf:params:oauth:grant-type:pre-authorized_code`
  - `pre-authorized_code=<code>`
  - `user_pin=<4桁PIN>`
- サーバはコードと PIN を検証し、`access_token`, `c_nonce` を返す

4) ウォレットがクレデンシャル（JWT VC）を取得
- `Authorization: Bearer <access_token>` ヘッダで `/api/issue/credential` に JSON を POST
- サーバはユーザ属性をクレームにマッピングして署名し、VC（JWT）と新しい `c_nonce` を返す

## データ仕様（主要 I/O）

### Credential Offer（/api/issue/authorize の応答）
現在の実装（簡略化）:
- `credential_offer`: オブジェクト
  - `credential_issuer`: `<baseUrl>`
  - `credential_configuration_ids`: `[
    "eu.europa.ec.eudi.pid.1"
  ]`
  - `grants`:
    - `urn:ietf:params:oauth:grant-type:pre-authorized_code`:
      - `pre-authorized_code`: 文字列（UUID）
      - `user_pin_required`: true
      - `tx_code`: 文字列（4 桁 PIN）［互換メモ参照］
- `credential_offer_uri`: `openid-credential-offer://?credential_offer=<urlencoded JSON>`
- `pre_authorized_code`: 文字列
- `tx_code`: 文字列（4 桁）
- `expires_in`: 600
- `qr_code_data`: `credential_offer_uri` と同じ

互換性メモ:
- 多くのウォレットは Offer 内の `tx_code` に PIN の実値ではなく、入力ポリシーを示すオブジェクトを期待します。推奨例:
```json
"tx_code": { "length": 4, "input_mode": "numeric" }
```
- 実際の PIN 値はウォレット UI でユーザが入力し、トークンエンドポイントに `user_pin` として送ります。

### Token 応答（/api/issue/token）
- `access_token`: 文字列
- `token_type`: "Bearer"
- `expires_in`: 数値（秒）
- `c_nonce`: 文字列
- `c_nonce_expires_in`: 数値（秒）

### Credential リクエスト（/api/issue/credential）
- `format`: "jwt_vc"
- `credential_type`: "eu.europa.ec.eudi.pid.1"
- `proof`: オブジェクト（本実装では PoP 検証は簡略化）

### Credential 応答（/api/issue/credential）
- `format`: "jwt_vc"
- `credential`: 文字列（JWT）
- `c_nonce`: 文字列
- `c_nonce_expires_in`: 数値

## メタデータ

Issuer Metadata（well-known）:
- `credential_issuer`: `<baseUrl>`
- `authorization_endpoint`, `token_endpoint`, `credential_endpoint`
- `credential_configurations_supported`:
  - `"eu.europa.ec.eudi.pid.1"`:
    - `format: "jwt_vc"`
    - `doctype: "eu.europa.ec.eudi.pid.1"`
    - `scope: "eu.europa.ec.eudi.pid.1"`
    - `cryptographic_binding_methods_supported: ["jwk"]`
    - `credential_signing_alg_values_supported: ["ES256", "ES384", "ES512"]`
    - `proof_types_supported.jwt.proof_signing_alg_values_supported: ["ES256", "ES384", "ES512"]`
    - `display`（ブランディング）
    - `claims`（最小セット: given_name, family_name, birth_date）

OpenID 設定（簡易）:
- 主要エンドポイントとサポート設定を最小構成で提供（互換性のために併置）

## 設定（Configuration）

- 環境変数
  - `NEXT_PUBLIC_BASE_URL` は外部から到達可能な URL（ngrok 等）を使用
- デフォルト
  - 未設定時は `http://localhost:3000`（外部ウォレットからは不可）

## セキュリティ考慮事項

- メモリストア: ユーザデータや tx code の一時保存は簡易で、プロダクションには不十分
- PIN 取扱い: 互換性と UX の観点から、Offer の `tx_code` はポリシーオブジェクト推奨。PIN 実値はウォレットで入力し `/token` に送付
- PoP 検証: 本実装では簡略化。実運用では Proof of Possession の検証強化が必要
- 鍵管理: 簡易管理。運用では KMS/HSM 等の安全な鍵管理が望ましい

## 互換性に関する注意

- クレデンシャル形式は `jwt_vc` のみ
- 対応クレデンシャル種別は `eu.europa.ec.eudi.pid.1` のみ
- QR は `credential_offer` をインラインで埋め込む方式。より広い互換性を狙う場合は `credential_offer_uri=https://.../offer/{id}` でサーバホストする方式が一般的

## 動作確認（ハッピーパス）

1. `NEXT_PUBLIC_BASE_URL` を外部到達可能な URL に設定してアプリ起動
2. UI でユーザ属性を入力し「Request Credential」を押下
3. 表示された QR を OID4VCI 対応ウォレット（例: Sphereon）で読み取り
4. ウォレットの PIN 入力画面で表示 PIN（4 桁）を入力
5. トークン取得 → クレデンシャル取得が完了し、ウォレットに VC が保存される

