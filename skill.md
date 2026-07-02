# Base Shooter NFT Skill

## Overview
This skill enables AI agents to interact with the Base Shooter NFT game ecosystem on Base mainnet.
Query on-chain player data, NFT scores, and game statistics directly from the blockchain.

The game is a shooting game where players earn NFT rewards based on their score:
- Bronze: 100–149 points
- Silver: 150–299 points
- Gold: 300–499 points
- Diamond: 500+ points

Scores and NFT metadata are generated and stored fully on-chain.
An x402-powered AI advice endpoint is also available for $0.001 USDC per request.

## MCP Server

Connect to the MCP server to access all tools:
https://base-shooter-nft.vercel.app/api/mcp/mcp
### Available Tools

#### `get_game_info`
Returns an overview of the Base Shooter NFT game, including rules, NFT mint conditions, and links.

**Parameters:** none

**Example prompt:**
> "Tell me about the Base Shooter NFT game."

---

#### `get_player_info`
Returns the number of NFTs held by a given wallet address and their scores/ranks.

**Parameters:**
- `address` (string): Wallet address to look up (0x format)

**Example prompt:**
> "How many Base Shooter NFTs does 0x4128F1A04767F1856db4f1588F8250F9ED948D12 hold?"

---

#### `get_total_supply`
Returns the total number of Base Shooter NFTs minted on-chain.

**Parameters:** none

**Example prompt:**
> "How many Base Shooter NFTs have been minted in total?"

---

## x402 AI Advice Endpoint

An x402-compatible endpoint is available for AI agents to purchase game advice
for $0.001 USDC per request (paid in USDC on Base mainnet).
GET https://base-shooter-nft.vercel.app/api/advice?score={score}
**Payment:** EIP-3009 TransferWithAuthorization, USDC on Base
**Asset:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC on Base)
**Amount:** 1000 (= $0.001 USDC, 6 decimals)
**Recipient:** `0x4128F1A04767F1856db4f1588F8250F9ED948D12`

Returns a JSON object:
```json
{ "advice": "Score-based gameplay tip here." }
```

---

## Contract Info

| Field | Value |
|---|---|
| Contract Address | `0x015E39BDb413F928aB1B4c0a120E91d83fc48208` |
| Chain | Base Mainnet (Chain ID: 8453) |
| Token Standard | ERC-721 (NFT) |
| Basescan | https://basescan.org/address/0x015E39BDb413F928aB1B4c0a120E91d83fc48208 |

---

## Links

- **Game:** https://base-shooter-nft.vercel.app
- **GitHub:** https://github.com/dainagon89/base-shooter-nft
- **Builder:** `dainagon.eth` (`0x4128F1A04767F1856db4f1588F8250F9ED948D12`)
