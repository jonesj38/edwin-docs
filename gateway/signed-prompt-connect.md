# Gateway Connect Extension: Signed Prompt Envelope

**Goal:** Require blockchain-verified signed prompts for identity-first access.

## Proposed `connect` Schema Extension

```json
{
  "type": "req",
  "id": "...",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": { "id": "cli", "version": "1.2.3", "platform": "macos", "mode": "operator" },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": {
      "token": "...",
      "signedPrompt": {
        /* Signed Prompt Envelope (supports permissionTokens) */
      }
    },
    "locale": "en-US",
    "userAgent": "edwin-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "...",
      "signature": "...",
      "signedAt": 1737264000000,
      "nonce": "..."
    }
  }
}
```

## Verification Flow

1. Verify BRC-103 signature on `signedPrompt` envelope.
2. Validate nonce + timestamp freshness.
3. Verify certificate authenticity (BRC-107/108).
4. Verify permission tokens per **BRC-0110** (commitment + SPV proof package + certificate binding).
5. Resolve scopes from identity-linked permission tokens.
6. If required by scope, verify payment proof.

## Authorization Outcomes

- If checks pass: issue device token scoped to `role + scopes`.
- If checks fail: reject `connect`.

## Notes

- Device tokens remain as session optimizations but should be derived only after signed-prompt verification.
- For high-risk methods, require per-request `signedPrompt` hash or a short-lived signed capability token.
