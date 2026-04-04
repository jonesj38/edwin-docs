# Permission Token Proof Verifier (BRC-0110 optional)

Edwin performs local, deterministic permission-token verification per **BRC-0110** when
`security.requirePermissionTokenProofs` is enabled. This optional HTTP verifier
is only used when `security.permissionTokenProofUrl` is configured, allowing
additional remote validation without relying on overlays by default.

## Endpoint

`POST {permissionTokenProofUrl}`

## Request

```json
{
  "tokens": [
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
  ]
}
```

## Response

### Success

```json
{ "ok": true }
```

### Failure

```json
{ "ok": false, "reason": "invalid proof" }
```

## Notes

- The gateway **always** performs local checks (txid/tx-hex match + merkle proof presence) before calling a remote verifier.
- The remote verifier is optional and **not required** for BRC-0110 compliance.
- Recommended: respond quickly (default timeout 5000ms) if configured.
