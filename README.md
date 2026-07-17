# Base Shooter NFT

スコアに応じてNFTがミントされるシューティングゲーム。スコア・NFTメタデータはすべてオンチェーンで生成・保存され、ミント時にはEASアテステーションが自動発行されます。

**🎮 Play:** https://base-shooter-nft.vercel.app
**📦 GitHub:** https://github.com/dainagon89/base-shooter-nft

---

## 概要

Base Shooter NFT は、Baseメインネット上で動くシューティングゲームです。プレイヤーはスコアに応じて以下のランクのNFTを獲得できます。

| ランク | スコア範囲 |
| --- | --- |
| Bronze | 100–149 |
| Silver | 150–299 |
| Gold | 300–499 |
| Diamond | 500+ |

スコアとNFTメタデータは完全にオンチェーンで生成・保存されます。またAIエージェント向けにx402決済対応のアドバイスAPI、およびMCPサーバーを提供しています。

## 機能

- スコアベースのNFTミント(ERC-721、Base mainnet)
- スコア・メタデータの完全オンチェーン保存
- NFTミント時のEASアテステーション自動発行
- x402マイクロペイメント対応のAIアドバイスエンドポイント($0.001 USDC/リクエスト)
- MCPサーバーによるAIエージェント連携

## 技術スタック

- **フレームワーク:** Next.js 14–16 (App Router)
- **Web3ライブラリ:** wagmi, viem
- **スタイリング:** Tailwind CSS
- **スマートコントラクト:** Solidity, ERC-721 (Remix IDEで開発)
- **アテステーション:** EAS SDK (`@ethereum-attestation-service/eas-sdk`)
- **決済:** x402 (EIP-3009 TransferWithAuthorization, USDC on Base)
- **デプロイ:** Vercel
- **チェーン:** Base Mainnet (Chain ID: 8453)

## デプロイ済みURL

| 項目 | URL |
| --- | --- |
| アプリ | https://base-shooter-nft.vercel.app |
| MCPサーバー | https://base-shooter-nft.vercel.app/api/mcp/mcp |
| GitHub | https://github.com/dainagon89/base-shooter-nft |

## 環境変数の設定方法

Vercelの `Settings → Environment Variables` から以下を設定してください(実際に必要な変数は `.env.example` を参照し、プロジェクト構成に合わせて調整してください):

```bash
# .env.local (例)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x015E39BDb413F928aB1B4c0a120E91d83fc48208
NEXT_PUBLIC_CHAIN_ID=8453
AGENT_PRIVATE_KEY=your_agent_wallet_private_key   # EASアテステーション発行用
EAS_SCHEMA_UID=0x95deb7cd64fd605ea07e159868d2e406bcc25c79eebdebe3309c0dd6a1408f32
X402_RECIPIENT_ADDRESS=0x4128F1A04767F1856db4f1588F8250F9ED948D12
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

設定後は Vercel の Deployments タブから **Redeploy** して反映してください。

## コントラクト情報

| 項目 | 値 |
| --- | --- |
| コントラクトアドレス | `0x015E39BDb413F928aB1B4c0a120E91d83fc48208` |
| チェーン | Base Mainnet (Chain ID: 8453) |
| トークン規格 | ERC-721 (NFT) |
| Basescan | https://basescan.org/address/0x015E39BDb413F928aB1B4c0a120E91d83fc48208 |

## MCPサーバー

AIエージェントは以下のツールを利用できます。

| ツール | 説明 | パラメータ |
| --- | --- | --- |
| `get_game_info` | ゲーム概要・NFTミント条件・リンクを取得 | なし |
| `get_player_info` | 指定ウォレットの保有NFT数・スコア・ランクを取得 | `address` (string) |
| `get_total_supply` | ミント済みNFTの総数を取得 | なし |

## x402 AIアドバイスエンドポイント

```
GET https://base-shooter-nft.vercel.app/api/advice?score={score}
```

| 項目 | 値 |
| --- | --- |
| 決済方式 | EIP-3009 TransferWithAuthorization (USDC on Base) |
| Asset | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC on Base) |
| 金額 | 1000 (= $0.001 USDC, 6 decimals) |
| 受取先 | `0x4128F1A04767F1856db4f1588F8250F9ED948D12` |

レスポンス例:
```json
{ "advice": "Score-based gameplay tip here." }
```

## EASアテステーション

NFTミント時に、Baseメインネット上でEASアテステーションが自動発行され、プレイヤーのスコア・ランクの検証可能な証明を提供します。

| 項目 | 値 |
| --- | --- |
| EAS Schema UID | `0x95deb7cd64fd605ea07e159868d2e406bcc25c79eebdebe3309c0dd6a1408f32` |
| スキーマフィールド | `playerAddress` (address), `score` (uint256), `rank` (string), `timestamp` (uint256) |
| Attestations一覧 | https://base.easscan.org/attestations/forSchema/0x95deb7cd64fd605ea07e159868d2e406bcc25c79eebdebe3309c0dd6a1408f32 |

## Builder Code (ERC-8021)

| 項目 | 値 |
| --- | --- |
| Builder Code | `bc_kyew96tf` |

## その他

| 項目 | 値 |
| --- | --- |
| Builder (ENS) | `dainagon.eth` |
| Builder (Address) | `0x4128F1A04767F1856db4f1588F8250F9ED948D12` |
| base.dev App ID | `6a435e12f20fd3db982cf7d5` |

---

Built with ❤️ on [Base](https://base.org)
