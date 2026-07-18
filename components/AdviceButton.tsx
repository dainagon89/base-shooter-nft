'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { TARGET_CHAIN_ID } from '@/lib/wagmiConfig';

interface Props {
  score: number;
}

export function AdviceButton({ score }: Props) {
  const { isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const canUse = isConnected && chainId === TARGET_CHAIN_ID && !paid;

  const handleClick = async () => {
    if (!walletClient) return;
    setLoading(true);
    setError(null);

    try {
      const res1 = await fetch(`/api/advice?score=${score}`);
      if (res1.status !== 402) throw new Error('Unexpected response');
      const { paymentRequirements } = await res1.json();

      const validAfter = Math.floor(Date.now() / 1000) - 1;
      const validBefore = Math.floor(Date.now() / 1000) + 60;
      const nonce = crypto.getRandomValues(new Uint8Array(32));
      const nonceHex = `0x${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;

      const signature = await walletClient.signTypedData({
        domain: {
          name: 'USD Coin',
          version: '2',
          chainId: 8453,
          verifyingContract: paymentRequirements.asset as `0x${string}`,
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
        message: {
          from: walletClient.account.address,
          to: paymentRequirements.payTo as `0x${string}`,
          value: BigInt(paymentRequirements.maxAmountRequired),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce: nonceHex,
        },
      });

      const payment = btoa(JSON.stringify({
        scheme: 'exact',
        network: 'base',
        payload: {
          signature,
          authorization: {
            from: walletClient.account.address,
            to: paymentRequirements.payTo,
            value: paymentRequirements.maxAmountRequired,
            validAfter: String(validAfter),
            validBefore: String(validBefore),
            nonce: nonceHex,
          },
        },
      }));

      const res2 = await fetch(`/api/advice?score=${score}`, {
        headers: { 'X-PAYMENT': payment },
      });

      if (!res2.ok) throw new Error('決済の確認に失敗しました');
      const data = await res2.json();
      setAdvice(data.advice);
      setPaid(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected || chainId !== TARGET_CHAIN_ID) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {!advice && (
        <button
          onClick={handleClick}
          disabled={loading || !canUse}
          className="focus-ring rounded-full border border-base-line bg-base-panel px-5 py-2 text-xs font-medium text-base-mist transition hover:border-base-blue hover:text-white disabled:opacity-50"
        >
          {loading ? '分析中…' : 'AIアドバイスを受ける ($0.001 USDC)'}
        </button>
      )}

      {advice && (
        <div className="max-w-xs rounded-xl border border-base-line bg-base-panel p-3 text-left text-xs text-base-mist">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-base-blue">
            AI アドバイス
          </p>
          <p className="leading-relaxed text-white">{advice}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
