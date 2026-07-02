import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_ADVICE_RECIPIENT as string;

function generateAdvice(score: number): string {
  if (score >= 500) return `素晴らしい！スコア${score}点はDiamondランク級の実力です。敵の出現パターンを完全に把握できています。次は1000点を目指してみましょう。`;
  if (score >= 300) return `スコア${score}点、Goldランク相当の実力です！画面の端から端へ大きく動くことで、より多くの敵を一度に倒せます。`;
  if (score >= 150) return `スコア${score}点でSilverランク圏内です。弾は自動発射されているので、自機を絶えず動かすことに集中しましょう。`;
  if (score >= 100) return `スコア${score}点、NFTミントラインを突破しました！序盤のうちにできるだけ敵を倒してスコアを稼ぐ戦略が有効です。`;
  return `スコア${score}点です。自機を動かして敵の前に立つことだけに集中しましょう。NFTミントには100点が必要です！`;
}

export async function GET(req: NextRequest) {
  const paymentHeader = req.headers.get('X-PAYMENT');

  if (!paymentHeader) {
    return NextResponse.json(
      {
        error: 'Payment required',
        paymentRequirements: {
          scheme: 'exact',
          network: 'base',
          maxAmountRequired: '1000',
          resource: `https://${req.headers.get('host')}/api/advice`,
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

  // 署名が届いていればアドバイスを返す
  const score = parseInt(req.nextUrl.searchParams.get('score') || '0', 10);
  const advice = generateAdvice(score);
  return NextResponse.json({ advice });
}
