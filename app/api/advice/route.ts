import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  verifyTypedData,
  encodeFunctionData,
  concat,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { BUILDER_CODE_DATA_SUFFIX } from '@/lib/builderCode';

const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_ADVICE_RECIPIENT as `0x${string}`;
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const REQUIRED_AMOUNT = 1000n; // $0.001 USDC (6 decimals)
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const USDC_ABI = [
  {
    type: 'function',
    name: 'transferWithAuthorization',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'authorizationState',
    stateMutability: 'view',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

function generateAdvice(score: number): string {
  if (score >= 500) return `素晴らしい！スコア${score}点はDiamondランク級の実力です。敵の出現パターンを完全に把握できています。次は1000点を目指してみましょう。`;
  if (score >= 300) return `スコア${score}点、Goldランク相当の実力です！画面の端から端へ大きく動くことで、より多くの敵を一度に倒せます。`;
  if (score >= 150) return `スコア${score}点でSilverランク圏内です。弾は自動発射されているので、自機を絶えず動かすことに集中しましょう。`;
  if (score >= 100) return `スコア${score}点、NFTミントラインを突破しました！序盤のうちにできるだけ敵を倒してスコアを稼ぐ戦略が有効です。`;
  return `スコア${score}点です。自機を動かして敵の前に立つことだけに集中しましょう。NFTミントには100点が必要です！`;
}

function splitSignature(signature: `0x${string}`) {
  const hex = signature.slice(2);
  const r = `0x${hex.slice(0, 64)}` as `0x${string}`;
  const s = `0x${hex.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(hex.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { r, s, v };
}

export async function GET(req: NextRequest) {
  try {
    const score = parseInt(req.nextUrl.searchParams.get('score') || '0', 10);

    const accepted = {
      scheme: 'exact',
      network: 'eip155:8453',
      asset: USDC_BASE,
      amount: REQUIRED_AMOUNT.toString(),
      payTo: PAYMENT_ADDRESS,
      maxTimeoutSeconds: 600,
      extra: { name: 'USD Coin', version: '2' },
    };

    const paymentHeader = req.headers.get('X-PAYMENT');

    if (!paymentHeader) {
      return NextResponse.json(
        {
          error: 'Payment required',
          x402Version: 2,
          accepts: [accepted],
          resource: `https://${req.headers.get('host')}/api/advice`,
          description: 'Base Shooter NFT - AIアドバイス ($0.001 USDC)',
          mimeType: 'application/json',
        },
        { status: 402 }
      );
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.json({ error: 'Invalid X-PAYMENT header' }, { status: 400 });
    }

    const { signature, authorization } = payload.payload;
    const from = authorization.from as `0x${string}`;
    const to = authorization.to as `0x${string}`;
    const value = BigInt(authorization.value);
    const validAfter = BigInt(authorization.validAfter);
    const validBefore = BigInt(authorization.validBefore);
    const nonce = authorization.nonce as `0x${string}`;

    // --- 基本チェック ---
    if (to.toLowerCase() !== PAYMENT_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid payment', reason: 'wrong_recipient' }, { status: 402 });
    }
    if (value < REQUIRED_AMOUNT) {
      return NextResponse.json({ error: 'Invalid payment', reason: 'insufficient_amount' }, { status: 402 });
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid payment', reason: 'self_send_not_allowed' }, { status: 402 });
    }
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    if (nowSec < validAfter || nowSec > validBefore) {
      return NextResponse.json({ error: 'Invalid payment', reason: 'authorization_expired' }, { status: 402 });
    }

    // --- 署名の暗号学的検証(オンチェーンに触れず、その場で検証) ---
    const isValidSignature = await verifyTypedData({
      address: from,
      domain: {
        name: 'USD Coin',
        version: '2',
        chainId: 8453,
        verifyingContract: USDC_BASE,
      },
      types: {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      },
      primaryType: 'TransferWithAuthorization',
      message: { from, to, value, validAfter, validBefore, nonce },
      signature: signature as `0x${string}`,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid payment', reason: 'invalid_signature' },
        { status: 402 }
      );
    }

    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;
    if (!relayerPrivateKey) {
      throw new Error('RELAYER_PRIVATE_KEY が設定されていません');
    }
    const account = privateKeyToAccount(relayerPrivateKey);

    const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) });

    // nonceが既に使われていないか事前チェック(無駄なガス消費を防ぐ)
    const alreadyUsed = await publicClient.readContract({
      address: USDC_BASE,
      abi: USDC_ABI,
      functionName: 'authorizationState',
      args: [from, nonce],
    });
    if (alreadyUsed) {
      return NextResponse.json(
        { error: 'Invalid payment', reason: 'nonce_already_used' },
        { status: 402 }
      );
    }

    const { r, s, v } = splitSignature(signature as `0x${string}`);

    const callData = encodeFunctionData({
      abi: USDC_ABI,
      functionName: 'transferWithAuthorization',
      args: [from, to, value, validAfter, validBefore, nonce, v, r, s],
    });

    // ERC-8021 Builder Codeサフィックスを付与(他アプリと同じ方式)
    const dataWithBuilderCode = concat([callData, BUILDER_CODE_DATA_SUFFIX]);

    const txHash = await walletClient.sendTransaction({
      to: USDC_BASE,
      data: dataWithBuilderCode,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 });

    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Settlement failed', reason: 'transaction_reverted', txHash },
        { status: 402 }
      );
    }

    const advice = generateAdvice(score);
    const response = NextResponse.json({ advice, txHash });
    response.headers.set(
      'X-PAYMENT-RESPONSE',
      Buffer.from(JSON.stringify({ success: true, txHash })).toString('base64')
    );
    return response;
  } catch (error) {
    console.error('Advice route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
