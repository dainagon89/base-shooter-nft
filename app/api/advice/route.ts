import { NextRequest, NextResponse } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { declareBuilderCodeExtension } from '@x402/extensions';

const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_ADVICE_RECIPIENT as string;

const FACILITATOR_HOST = 'api.cdp.coinbase.com';
const FACILITATOR_BASE = `https://${FACILITATOR_HOST}/platform/v2/x402`;

// base.dev / Base Dashboard で発行された、このアプリのBuilder Code
const BUILDER_CODE = 'bc_kyew96tf';

function generateAdvice(score: number): string {
  if (score >= 500) return `素晴らしい！スコア${score}点はDiamondランク級の実力です。敵の出現パターンを完全に把握できています。次は1000点を目指してみましょう。`;
  if (score >= 300) return `スコア${score}点、Goldランク相当の実力です！画面の端から端へ大きく動くことで、より多くの敵を一度に倒せます。`;
  if (score >= 150) return `スコア${score}点でSilverランク圏内です。弾は自動発射されているので、自機を絶えず動かすことに集中しましょう。`;
  if (score >= 100) return `スコア${score}点、NFTミントラインを突破しました！序盤のうちにできるだけ敵を倒してスコアを稼ぐ戦略が有効です。`;
  return `スコア${score}点です。自機を動かして敵の前に立つことだけに集中しましょう。NFTミントには100点が必要です！`;
}

// CDP facilitatorの /verify または /settle を叩く
async function callFacilitator(path: '/verify' | '/settle', body: unknown) {
  const apiKeyId = process.env.CDP_API_KEY_ID as string;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET as string;

  if (!apiKeyId || !apiKeySecret) {
    throw new Error('CDP_API_KEY_ID / CDP_API_KEY_SECRET が設定されていません');
  }

  const jwt = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: 'POST',
    requestHost: FACILITATOR_HOST,
    requestPath: `/platform/v2/x402${path}`,
  });

  const res = await fetch(`${FACILITATOR_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const score = parseInt(req.nextUrl.searchParams.get('score') || '0', 10);

    const paymentRequirements = {
      scheme: 'exact',
      network: 'eip155:8453', // Base mainnet (CAIP-2)
      maxAmountRequired: '1000', // $0.001 USDC (6 decimals)
      resource: `https://${req.headers.get('host')}/api/advice`,
      description: 'Base Shooter NFT - AIアドバイス ($0.001 USDC)',
      mimeType: 'application/json',
      payTo: PAYMENT_ADDRESS,
      maxTimeoutSeconds: 60,
      asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      extra: { name: 'USDC', version: '2' },
      extensions: {
        ...declareBuilderCodeExtension(BUILDER_CODE),
      },
    };

    const paymentHeader = req.headers.get('X-PAYMENT');

    if (!paymentHeader) {
      return NextResponse.json(
        { error: 'Payment required', paymentRequirements },
        { status: 402 }
      );
    }

    // X-PAYMENTヘッダー(base64エンコードされたJSON)をデコード
    let paymentPayload;
    try {
      paymentPayload = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );
    } catch {
      return NextResponse.json({ error: 'Invalid X-PAYMENT header' }, { status: 400 });
    }

    // 1. 署名を検証(verify) — お金はまだ動かない
    const verifyResult = await callFacilitator('/verify', {
      x402Version: 1,
      paymentPayload,
      paymentRequirements,
    });

    if (!verifyResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid payment', reason: verifyResult.invalidReason },
        { status: 402 }
      );
    }

    // 2. オンチェーンで決済を実行(settle) — ここで実際にUSDCが送金される
    const settleResult = await callFacilitator('/settle', {
      x402Version: 1,
      paymentPayload,
      paymentRequirements,
    });

    if (!settleResult.success) {
      return NextResponse.json(
        { error: 'Settlement failed', reason: settleResult.errorReason },
        { status: 402 }
      );
    }

    const advice = generateAdvice(score);

    const response = NextResponse.json({ advice });
    response.headers.set(
      'X-PAYMENT-RESPONSE',
      Buffer.from(JSON.stringify(settleResult)).toString('base64')
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
