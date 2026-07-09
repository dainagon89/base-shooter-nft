'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

const SHOOTER_CONTRACT = 'const SHOOTER_CONTRACT = '0x015E39BDb413F928aB1B4c0a120E91d83fc48208';

interface OwnedNft {
  tokenId: number;
  image: string;
  rank: string;
  score: string;
}

export function NftGallery() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setNfts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `https://base.blockscout.com/api/v2/addresses/${address}/nft?type=ERC-721`
        );
        const data = await res.json();

        if (!data.items) {
          if (!cancelled) setNfts([]);
          return;
        }

const filtered = data.items.filter(
  (item: { token: { address?: string } }) =>
    (item.token?.address || '').toLowerCase() === SHOOTER_CONTRACT.toLowerCase()
);

        const items: OwnedNft[] = filtered.map((item: {
          id: string;
          metadata?: {
            image?: string;
            attributes?: { trait_type: string; value: string | number }[];
          };
        }) => {
          const attrs = item.metadata?.attributes || [];
          const scoreAttr = attrs.find((a) => a.trait_type === 'Score');
          const rankAttr = attrs.find((a) => a.trait_type === 'Rank');

          let image = item.metadata?.image || '';
          if (image.startsWith('ipfs://')) {
            image = image.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }

          return {
            tokenId: Number(item.id),
            image,
            score: scoreAttr ? String(scoreAttr.value) : '-',
            rank: rankAttr ? String(rankAttr.value) : '-',
          };
        });

        if (!cancelled) setNfts(items.sort((a: OwnedNft, b: OwnedNft) => b.tokenId - a.tokenId));
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
  }, [address]);

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
            {nft.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nft.image} alt={`#${nft.tokenId}`} className="w-full" />
            ) : (
              <div className="flex h-24 items-center justify-center bg-base-ink text-xs text-base-mist">
                画像なし
              </div>
            )}
            <div className="p-2 text-center font-mono text-xs text-base-mist">
              #{nft.tokenId} ・ {nft.rank} ・ {nft.score}pt
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
