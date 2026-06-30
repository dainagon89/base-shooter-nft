import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

// NEXT_PUBLIC_CHAIN_ID で本番チェーンを切り替える:
//   8453  = Base（メインネット・デフォルト）
//   84532 = Base Sepolia（テストネット）
const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);

export const TARGET_CHAIN_ID = (
  envChainId === baseSepolia.id ? baseSepolia.id : base.id
) as typeof base.id | typeof baseSepolia.id;

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Base Shooter NFT' }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
