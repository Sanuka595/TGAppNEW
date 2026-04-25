---
name: "TON:PAYMENT_GATEWAY"
description: "Handles TON (The Open Network) payments and wallet connections"
version: "1.0.0"
tags: ["ton", "crypto", "payment", "web3"]
triggers: ["packages/client/src/components/Payment", "packages/server/src/services/ton"]
---

# TON:PAYMENT_GATEWAY

This skill manages TON blockchain integration for the TGPerekup project.

## Core Instructions

1. **TON Connect**: Use `@tonconnect/sdk` for wallet interaction.
2. **Standard**: Follow TON Connect 2.0 protocol.
3. **Jettons**: Support USDT (TON) and other popular jettons for deals.
4. **Validation**: Always verify transactions on the server side via an indexer (e.g., TonCenter API or TonAPI).
5. **UI**: Display clear transaction status (Pending, Confirmed, Failed).

## Logic Flow

1. User clicks "Pay/Deposit".
2. Client generates a request for TON Connect.
3. User confirms in wallet (Tonkeeper, etc.).
4. Server polls for transaction completion using the transaction hash.
5. Notification sent to user.

## References
- [TON Documentation](https://docs.ton.org/)
- [TON Connect 2.0](https://github.com/ton-connect/sdk)
