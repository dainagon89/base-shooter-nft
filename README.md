# Base Shooter NFT

画面をドラッグして敵を撃つシューティングゲーム。弾は自動発射されます。
スコア100点以上でゲームオーバー後に「NFTをミントする」ボタンが現れ、
スコアに応じたランク(Bronze/Silver/Gold/Diamond)のNFTを
**Base**チェーン上にミントできます。画像とメタデータはすべてオンチェーンで
生成されるため、IPFSなど外部の保存サービスは不要です。

- フロントエンド: Next.js 14 (App Router) + wagmi v2 + viem + Tailwind CSS
- コントラクト: Solidity（`contracts/ShooterReward.sol`、OpenZeppelinのERC721Enumerableを使用）
- 対応ウォレット: ブラウザ拡張ウォレット（MetaMaskなど）, Coinbase Wallet

---

## 1. 事前準備

- Node.js 18以上
- ブラウザ拡張ウォレット（[MetaMask](https://metamask.io/)など）
- [GitHub Desktop](https://desktop.github.com)（コードをGitHubにアップロードするのに使います）
- Baseメインネット用の少額のETH（コントラクトデプロイとNFTミントのガス代として必要です）

---

## 2. コントラクトをデプロイする

[Remix IDE](https://remix.ethereum.org) を使います。

1. Remixを開き、新規ファイル `ShooterReward.sol` を作成し、
   `contracts/ShooterReward.sol` の内容をコピーして貼り付けます。
2. 左メニューの **Solidity Compiler** タブで、コンパイラバージョンを
   `0.8.24` 以上に設定し、**Compile** します。
   (`@openzeppelin/contracts` のインポートは、Remixがインターネット経由で
   自動的に取得してくれます。少し時間がかかることがあります)
3. 左メニューの **Deploy & Run Transactions** タブを開きます。
4. **Environment** を `Injected Provider - MetaMask` に設定します
   （MetaMask側でネットワークを **Base** に切り替えておいてください。
   今回は最初からBaseメインネットへのデプロイです）。
5. **Deploy** をクリックし、MetaMaskでトランザクションを承認します
   （前回のコントラクトより少し複雑なので、ガス代は前回より高くなります）。
6. デプロイ完了後に表示される**コントラクトアドレス**をコピーしておきます。

---

## 3. フロントエンドをローカルで動かす（任意）

```bash
cd base-shooter-nft
npm install
cp .env.example .env.local
```

`.env.local` を編集し、デプロイしたコントラクトアドレスを設定します:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xあなたのコントラクトアドレス
NEXT_PUBLIC_CHAIN_ID=8453
```

```bash
npm run dev
```

`http://localhost:3000` を開いて確認してください。

---

## 4. GitHubにアップロードする

前回ブラウザのドラッグ&ドロップでフォルダ構造が崩れてしまったので、
最初から **GitHub Desktop** を使います。

1. GitHub Desktopを起動し、ログインする
2. **File → Add local repository** → このフォルダ(`base-shooter-nft`)を選ぶ
3. 「create a repository」をクリック
4. 左下にコミットメッセージを入力 → **Commit to main**
5. 右上の **Publish repository** をクリック → 名前を確認して **Publish Repository**

---

## 5. Vercelにデプロイする

1. [vercel.com](https://vercel.com) → **Add New...** → **Project**
2. GitHubの`base-shooter-nft`リポジトリを選んで **Import**
3. **Environment Variables** に以下を追加:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID`(`8453`)
4. **Deploy** をクリック

---

## 6. （任意）Base公式サイトに登録してBuilder Codeを追加する

前回の「Base Tap Rush」と同じ流れで、base.devにこのアプリを新しく登録し、
発行されたBuilder Codeを `lib/builderCode.ts` のような形でコードに追加できます。
登録が終わってBuilder Codeが発行されたら、いつでも声をかけてください。
`components/Game.tsx` の中のミント送信処理に組み込みます。

---

## ディレクトリ構成

```
base-shooter-nft/
├── contracts/
│   └── ShooterReward.sol     # NFTリワードコントラクト
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   └── globals.css
├── components/
│   ├── Game.tsx                # ゲーム本体・ミント処理
│   ├── NftGallery.tsx           # 所持NFTのギャラリー表示
│   └── WalletBar.tsx            # ウォレット接続UI
├── lib/
│   ├── wagmiConfig.ts            # チェーン・コネクタ設定
│   └── contract.ts                # コントラクトアドレス・ABI
└── .env.example
```

## カスタマイズのヒント

- ミントに必要な最低スコア: `contracts/ShooterReward.sol` の
  `MINT_THRESHOLD`（再デプロイが必要です）。
- 難易度（敵の出現間隔・速度）: `components/Game.tsx` の
  `spawnIntervalRef` の初期値や `enemySpeed` の計算式を調整してください。
- NFTのランク区切りや色: `contracts/ShooterReward.sol` の
  `_rank` / `_color` 関数。
