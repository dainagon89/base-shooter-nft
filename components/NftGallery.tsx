'use client';
import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESS, shooterRewardAbi } from '@/lib/contract';

interface OwnedNft {
  tokenId: number;
  image: string;
  rank: string;
  score: string;
}

export function NftGallery() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !publicClient) {
      setNfts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        console.log('NftGallery: CONTRACT_ADDRESS =', CONTRACT_ADDRESS);
        console.log('NftGallery: address =', address);

        const balance = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: shooterRewardAbi,
          functionName: 'balanceOf',
          args: [address],
        })) as bigint;

        console.log('NftGallery: balance =', balance.toString());

        const items: OwnedNft[] = [];

        for (let i = BigInt(0); i < balance; i++) {
          const tokenId = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: shooterRewardAbi,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, i],
          })) as bigint;

          console.log('NftGallery: tokenId =', tokenId.toString());

          const uri = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: shooterRewardAbi,
            functionName: 'tokenURI',
            args: [tokenId],
          })) as string;

          const jsonStr = atob(uri.replace('data:application/json;base64,', ''));
          const meta = JSON.parse(jsonStr) as {
            image: string;
            attributes?: { trait_type: string; value: string | number }[];
          };

          const scoreAttr = meta.attributes?.find((a) => a.trait_type === 'Score');
          const rankAttr = meta.attributes?.find((a) => a.trait_type === 'Rank');

          items.push({
            tokenId: Number(tokenId),
            image: meta.image,
            score: scoreAttr ? String(scoreAttr.value) : '-',
            rank: rankAttr ? String(rankAttr.value) : '-',
          });
        }

        if (!cancelled) setNfts(items.reverse());
      } catch (err) {
        console.error('NftGallery error:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  if (!isConnected) return null;

  return (
    <div className="rounded-2xl border border-base-line bg-base-panel p-5">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-base-mist">
        あなたのNFT
      </h2>

      {loading && <p className="text-sm text-base-mist">読み込み中…</p>}

      {error && (
        <p className="text-sm text-red-400">エラー: {error}</p>
      )}

      {!loading && !error && nfts.length === 0 && (
        <p className="text-sm text-base-mist">まだミントしたNFTがありません。</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {nfts.map((nft) => (
          <div key={nft.tokenId} className="overflow-hidden rounded-xl border border-base-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nft.image} alt={`#${nft.tokenId}`} className="w-full" />
            <div className="p-2 text-center font-mono text-xs text-base-mist">
              #{nft.tokenId} ・ {nft.rank} ・ {nft.score}pt
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
