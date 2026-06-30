import { WalletBar } from '@/components/WalletBar';
import { Game } from '@/components/Game';
import { NftGallery } from '@/components/NftGallery';

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-5 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-base-blue">
            on base
          </p>
          <h1 className="font-display text-2xl font-bold text-white">Base Shooter NFT</h1>
        </div>
      </header>

      <WalletBar />

      <Game />

      <NftGallery />

      <footer className="pb-6 text-center text-[11px] text-base-mist">
        NFTの画像・メタデータはすべてオンチェーンで生成されます。
      </footer>
    </main>
  );
}
