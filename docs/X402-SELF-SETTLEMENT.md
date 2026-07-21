# x402マイクロペイメントの自前実装ガイド
### 〜CDP facilitatorに依存せず、Base mainnetでx402決済を動かす〜

このドキュメントは、Next.js 14 + wagmi + viem構成のアプリに x402(HTTP 402ベースのマイクロペイメント)を実装した際に得た、実践的な知見のまとめです。特に **CDP(Coinbase Developer Platform)のホスト型facilitatorが原因不明のエラーで動かない場合**に、自前でverify/settleを行う代替実装を解説します。

対象読者: Next.js App Router + wagmi/viem で、Base mainnet上にx402決済(USDC建て)を実装しようとしている個人開発者。

---

## 1. 直面した問題

CDP公式のfacilitator(`api.cdp.coinbase.com/platform/v2/x402`)を使って `/verify` → `/settle` を呼ぶ標準的なx402実装を行ったところ、以下のエラーが再現性100%で発生しました:

```json
{
  "invalidReason": "invalid_payload",
  "invalidMessage": "contract call failed: unable to call contract: execution reverted"
}
```

- ペイロードの構造(CAIP-2ネットワーク表記・署名・タイムスタンプ・nonce)はすべて仕様通り
- USDC残高・ガス代も十分
- Builder Code拡張の有無も無関係
- 同時刻に他のユーザーの`transferWithAuthorization`トランザクションはBaseScan上で普通に成功している

つまり **こちら側のコードの問題ではなく、facilitator側の何らかの制約(推測: Payments機能に必要なビジネス確認/KYCが、個人開発者・特定地域のアカウントでは完了できないこと)** が疑われる状況でした。

このような場合、コードをいくら直しても解決しません。回避策として、**CDP facilitatorを一切経由せず、自分のサーバーが直接オンチェーンで決済を検証・実行する**方式に切り替えました。

---

## 2. 自前実装の設計

### 全体フロー

1. クライアント: EIP-3009 `TransferWithAuthorization` の型付きデータに署名(ガス不要、オフチェーン)
2. サーバー: 受け取った署名を `viem` の `verifyTypedData` で暗号学的に検証(オンチェーンに触れない、無料)
3. サーバー: 検証OKなら、**自前の中継用ウォレット**がガス代を払って `transferWithAuthorization` をUSDCコントラクトに直接送信
4. レシートを待って結果を返す

CDPのfacilitatorが担っていた「verify」「settle」を、自分のサーバーで完全に代替する形です。

### 中継用ウォレットについて

- 既存のウォレット(他の用途で使っているもの)とは**別の専用ウォレット**を新規作成することを推奨
- 保有するのはガス代分の少額ETHのみ(Baseはガス代が非常に安いため、$1〜2程度で数百〜数千回分)
- このウォレットは「ユーザーが既に署名した送金内容をそのまま代行送信するだけ」なので、秘密鍵が万一漏れても実害は限定的(任意の送金を捏造することはできない)

---

## 3. ハマったポイントと解決策

### 3-1. EIP-712 `domain.name` は `"USD Coin"`(`"USDC"` ではない)

BaseScan上の表示名は `USDC` ですが、これは表示用ラベルであり、コントラクトの `name()` が実際に返す値ではありません。BaseScan自身にも以下の注記があります:

> "Note: This token's displayed name does not match its contract's Name function."

署名時のEIP-712ドメインには、実際の `name()` の値である **`"USD Coin"`** を使う必要があります。ここを `"USDC"` にすると、一見署名自体は「有効」と判定されるケースがあっても(検証ロジック次第)、実際のコントラクトでは `ecrecover` の結果が一致せずrevertします。

```js
const domain = {
  name: 'USD Coin', // ← 'USDC' ではない
  version: '2',
  chainId: 8453,
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
};
```

### 3-2. x402 v2のペイロードには `accepted` フィールドが必須

v1形式(`{x402Version:1, scheme, network, payload}` をトップレベルに置く形)ではなく、v2形式(`accepted` オブジェクトの中に `scheme/network/asset/amount/payTo/maxTimeoutSeconds/extra` をまとめる形)を使う必要があります。

```json
{
  "x402Version": 2,
  "accepted": {
    "scheme": "exact",
    "network": "eip155:8453",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "amount": "1000",
    "payTo": "0x...",
    "maxTimeoutSeconds": 600,
    "extra": { "name": "USD Coin", "version": "2" }
  },
  "payload": {
    "signature": "0x...",
    "authorization": { "from": "0x...", "to": "0x...", "value": "1000", "validAfter": "...", "validBefore": "...", "nonce": "0x..." }
  }
}
```

### 3-3. `@coinbase/cdp-sdk` は使わなくても依存関係に残さないとビルドが壊れる

`wagmi` の `coinbaseWallet` コネクタ(`@wagmi/connectors`)は、内部で `@base-org/account` → `@coinbase/cdp-sdk` を間接的に読み込みます。この `cdp-sdk` が `@x402/core` / `@x402/evm` / `@x402/svm` を(オプショナルではあるものの)コード内で無条件に `import` しているため、**これらのパッケージが物理的に `node_modules` に存在しないと、Next.jsのwebpackビルドが `Module not found` で失敗します。**

自分のコードで一切使っていなくても、`package.json` に以下を残しておく必要があります:

```json
{
  "dependencies": {
    "@x402/core": "^2.16.0",
    "@x402/evm": "^2.16.0",
    "@x402/svm": "^2.16.0"
  }
}
```

(`@x402/next` はNext.js 16以上を要求するため、Next.js 14環境では入れないこと。)

### 3-4. `tsconfig.json` の `target` はES2020以上に

`BigInt`リテラル(`1000n`)を使うと、`target: "ES5"`(Next.jsのデフォルト付近)では型エラーになります:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

### 3-5. Builder Code(ERC-8021)は自分でcalldataに付与できる

facilitatorの `extensions` 機能を使わなくても、自前で送信するトランザクションの `data` に直接suffixを結合するだけで、Builder Codeの帰属は機能します(他のBase上のアプリで既に実績のある方式と同じ):

```js
import { concat } from 'viem';

const callData = encodeFunctionData({ abi: USDC_ABI, functionName: 'transferWithAuthorization', args: [...] });
const dataWithBuilderCode = concat([callData, BUILDER_CODE_DATA_SUFFIX]);

await walletClient.sendTransaction({ to: USDC_ADDRESS, data: dataWithBuilderCode });
```

---

## 4. 最終的なサーバー実装(要約)

```ts
import { createPublicClient, createWalletClient, http, verifyTypedData, encodeFunctionData, concat } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// 1. 署名の検証(オフチェーン、無料)
const isValid = await verifyTypedData({
  address: from,
  domain: { name: 'USD Coin', version: '2', chainId: 8453, verifyingContract: USDC_ADDRESS },
  types: { TransferWithAuthorization: [/* ... */] },
  primaryType: 'TransferWithAuthorization',
  message: { from, to, value, validAfter, validBefore, nonce },
  signature,
});

// 2. 自前ウォレットで実際にオンチェーン送信
const account = privateKeyToAccount(RELAYER_PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: base, transport: http() });

const { v, r, s } = splitSignature(signature); // r/s/vに分解
const callData = encodeFunctionData({
  abi: USDC_ABI,
  functionName: 'transferWithAuthorization',
  args: [from, to, value, validAfter, validBefore, nonce, v, r, s],
});

const hash = await walletClient.sendTransaction({
  to: USDC_ADDRESS,
  data: concat([callData, BUILDER_CODE_DATA_SUFFIX]),
});
```

---

## 5. まとめ

| 症状 | 原因 | 対処 |
|---|---|---|
| `invalid_payload` / execution reverted(facilitator経由) | facilitator側の未確認の制約(推測: KYC等) | facilitatorを経由せず自前でverify/settle |
| `invalid_exact_evm_payload_signature` | EIP-712 `domain.name` の値違い | `"USD Coin"` を使う(`"USDC"`ではない) |
| `x402V2PaymentPayload requires 'accepted'` | v1/v2形式の混在 | v2形式(`accepted`フィールド)に統一 |
| `Module not found: '@x402/evm'` 等 | wagmi経由の間接依存 | 使わなくても`@x402/core`/`evm`/`svm`をpackage.jsonに残す |
| `BigInt literals are not available...` | tsconfigのtarget不足 | `target: "ES2020"`以上に |

自前実装は一見遠回りに見えますが、外部サービスの不透明な制約に左右されず、決済フロー全体を自分でコントロールできるという利点があります。

---

*このドキュメントは実際のトラブルシューティングの過程で得られた知見をまとめたものです。x402やEIP-8130はまだ活発に開発中の仕様のため、情報が古くなっている可能性があります。最新情報は [x402公式ドキュメント](https://docs.cdp.coinbase.com/x402) を参照してください。*
