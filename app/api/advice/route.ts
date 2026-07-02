import { NextRequest, NextResponse } from 'next/server';

const FACILITATOR_URL = 'https://x402.org/facilitator';
const PAYMENT_AMOUNT = 1000;
const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_ADVICE_RECIPIENT as `0x${string}`;

function generateAdvice(score: number): string {
  if (score >= 500) return `素晴らしい！スコア${score}点はDiamondランク級の実力です。敵の出現パターンを完全に把握できています。次は1000点を目指してみましょう。`;
  if (score >= 300) return `スコア${score}点、Goldランク相当の実力です！画面の端から端へ大きく動くことで、より多くの敵を一度に倒せます。`;
  if (score >= 150) return `スコア${score}点でSilverランク圏内です。弾は自動発射されているので、自機を絶えず動かすことに集中しましょう。`;
  if (score >= 100) return `スコア${score}点、NFTミントラインを突破しました！序盤のうちにできるだけ敵を倒してスコアを稼ぐ戦略が有効です。`;
  return `スコア${score}点です。自機を動かして敵の前に立つことだけに集中しましょう。NFTミントには100点が必要です！`;
}

async function verifyPayment(paymentHeader: string, resource: string): Promise<boolean> {
  try {
    const res = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: paymentHeader,
        paymentRequirements: {
          scheme: 'exact',
          network: 'base',
          maxAmountRequired: String(PAYMENT_AMOUNT),
          resource,
          description: 'Base Shooter NFT - AIアドバイス',
          mimeType: 'application/json',
          payTo: PAYMENT_ADDRESS,
          maxTimeoutSeconds: 60,
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          outputSchema: undefined,
          extra: { name: 'USDC', version: '2' },
        },
      }),
    });
    const data = await res.json();
    return data.isValid === true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const resource = `${protocol}://${host}/api/advice`;

  const paymentHeader = req.headers.get('X-PAYMENT');

  if (!paymentHeader) {
    return NextResponse.json(
      {
        error: 'Payment required',
        paymentRequirements: {
          scheme: 'exact',
          network: 'base',
          maxAmountRequired: String(PAYMENT_AMOUNT),
          resource,
          description: 'Base Shooter NFT - AIアドバイス ($0.001 USDC)',
          mimeType: 'application/json',
          payTo: PAYMENT_ADDRESS,
          maxTimeoutSeconds: 60,
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          outputSchema: undefined,
          extra: { name: 'USDC', version: '2' },
        },
      },
      { status: 402 }
    );
  }

  const isValid = await verifyPayment(paymentHeader, resource);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid payment' }, { status: 402 });
  }

  const score = parseInt(req.nextUrl.searchParams.get('score') || '0', 10);
  const advice = generateAdvice(score);

  return NextResponse.json({ advice });
}