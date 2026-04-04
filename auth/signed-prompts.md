# Signed Prompt Envelope (Identity-First)

**Purpose:** Bind a user prompt to a verifiable identity + scoped permissions + optional payment proof.

## Canonical Envelope

```json
{
  "version": "edwin/1",
  "issuedAt": 1737264000000,
  "nonce": "b64url(16-32 bytes)",
  "promptHash": "sha256(prompt_bytes)",
  "scopeClaims": ["operator.read", "operator.write", "exec.approval.resolve"],
  "cert": {
    "type": "base64(type)",
    "serialNumber": "string",
    "subject": "hex(identityKey)",
    "certifier": "hex(pubkey)",
    "revocationOutpoint": "txid:vout",
    "fields": { "role": "admin", "org": "Acme" },
    "signature": "hex(sig)",
    "keyringForSubject": { "k1": "encKey" }
  },
  "certHash": "sha256(canonical_cert_bytes)",
  "paymentRef": {
    "txid": "hex",
    "proof": "optional merkle/SPV"
  },
  "permissionTokens": [
    {
      "scope": "operator.read",
      "certHash": "sha256(canonical_cert_bytes)",
      "txid": "hex",
      "proof": "merkle/SPV proof payload",
      "assetId": "txid:vout",
      "amount": "1",
      "prevTxid": "hex",
      "commitment": "sha256(assetId|amount|certHash|prevTxid)"
    }
  ],
  "device": {
    "id": "device_fingerprint",
    "publicKey": "hex",
    "signature": "hex",
    "signedAt": 1737264000000,
    "nonce": "b64url"
  }
}
```

### Signature

- **BRC-103** signature over `hash(canonical(envelope))`.
- Replay protection: `nonce` + `issuedAt` freshness window.
- Permission token proofs are verified locally per **BRC-0110** when `security.requirePermissionTokenProofs` is enabled. A remote verifier is optional via `security.permissionTokenProofUrl`.

## Certificate Model

Derived from the certificate structure in the vault (`bsv-blockchain/simple`):

- `type`, `serialNumber`, `subject`, `certifier`, `revocationOutpoint`, `fields`, `signature`, `keyringForSubject`

This aligns with BRC-108’s requirement to link identity certificates to token transfers.

## Scope Claims

`scopeClaims` is the requested scope list. Authorization is granted if the user holds identity-linked permission tokens that map to these scopes.

## Subscription Enforcement (permission token)

When `security.subscription.required` is enabled, the gateway requires a **subscription token** in the signed prompt:

- The token must appear in `permissionTokens`.
- The token must include the `scope` configured by `security.subscription.requiredScope`
  (default: `subscription.active`).
- Token ownership + proofs are still enforced by the existing permission-token checks.

This lets identity certificates stay stable while subscription status refreshes via tokens.

---

# Gateway Verification (pseudocode)

```ts
function verifySignedPrompt(req) {
  const env = canonicalize(req.auth.signedPrompt)

  // 1) BRC-103 signature verification
  assert(verifyBrc103(env.signature, hash(env), env.device.publicKey))

  // 2) Replay protection
  assert(isFresh(env.issuedAt, MAX_AGE_MS))
  assert(nonceStore.consume(env.nonce))

  // 3) Certificate authenticity
  assert(verifyCertificateSignature(env.cert))
  assert(!isRevoked(env.cert.revocationOutpoint))
  assert(env.certHash == sha256(canonicalize(env.cert)))

  // 4) Identity linkage
  assert(env.cert.subject === identityKeyFromWallet(env))

  // 5) Permission token verification (BRC-0110)
  assert(verifyBrc0110PermissionTokens(env.permissionTokens))

  // 6) Scope authorization
  const allowedScopes = resolveScopesFromTokens(env.certHash)
  assert(allRequestedScopes ⊆ allowedScopes)

  // 7) Micropayment (if required)
  if (scopeRequiresPayment(allRequestedScopes)) {
    assert(verifyPayment(env.paymentRef))
  }

  return ok
}
```
