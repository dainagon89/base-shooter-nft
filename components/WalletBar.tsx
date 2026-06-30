'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { TARGET_CHAIN_ID } from '@/lib/wagmiConfig';

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletBar() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const onWrongChain = isConnected && chainId !== TARGET_CHAIN_ID;

  if (!isConnected) {
    return (
      <div className="flex flex-wrap gap-3">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="focus-ring rounded-full border border-base-line bg-base-panel px-5 py-2 text-sm font-medium text-white transition hover:border-base-blue disabled:opacity-50"
          >
            {connector.name} で接続
          </button>
        ))}
      </div>
    );
  }

  if (onWrongChain) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
        <span>ネットワークが違います</span>
        <button
          onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
          disabled={isSwitching}
          className="focus-ring rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
        >
          切り替える
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-base-line bg-base-panel px-4 py-2">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span className="font-mono text-sm text-base-mist">
        {address ? truncateAddress(address) : ''}
      </span>
      <button
        onClick={() => disconnect()}
        className="focus-ring text-xs text-base-mist underline hover:text-white"
      >
        切断
      </button>
    </div>
  );
}
