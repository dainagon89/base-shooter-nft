import { createMcpHandler } from '@vercel/mcp-adapter';
import { z } from 'zod';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { shooterRewardAbi } from '@/lib/contract';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      'get_game_info',
      'Base Shooter NFTゲームの概要、遊び方、NFTミントの条件などを返します。',
      {},
      async () => {
        return {
          content: [
            {
              type: 'text' as const,
              text: `# Base Shooter NFT\n\n## ゲーム概要\nBaseチェーン上で動くシューティングゲームです。画面をドラッグして自機を動かし、敵を撃ち落としてスコアを稼ぎます。\n\n## NFTミント条件\n- Bronze: 100〜149点\n- Silver: 150〜299点\n- Gold: 300〜499点\n- Diamond: 500点以上\n\n## x402機能\n- AIアドバイスを$0.001 USDCで取得できます\n\n## リンク\n- ゲームURL: https://base-shooter-nft.vercel.app\n- コントラクト: https://basescan.org/address/${CONTRACT_ADDRESS}`,
            },
          ],
        };
      }
    );

    server.tool(
      'get_player_info',
      '指定したウォレットアドレスのBase Shooter NFT保有数とスコア情報を取得します。',
      {
        address: z.string().describe('調べたいウォレットアドレス (0xから始まる形式)'),
      },
      async ({ address }) => {
        try {
          const addr = address as `0x${string}`;
          const balance = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: shooterRewardAbi,
            functionName: 'balanceOf',
            args: [addr],
          });

          const nftCount = Number(balance);

          if (nftCount === 0) {
            return {
              content: [{ type: 'text' as const, text: `${address} はまだBase Shooter NFTを保有していません。スコア100点以上でプレイするとNFTがミントできます。` }],
            };
          }

          const nftInfo: string[] = [];
          for (let i = 0; i < Math.min(nftCount, 5); i++) {
            const tokenId = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: shooterRewardAbi,
              functionName: 'tokenOfOwnerByIndex',
              args: [addr, BigInt(i)],
            });
            const score = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: shooterRewardAbi,
              functionName: 'scoreOf',
              args: [tokenId],
            });
            const rank = Number(score) >= 500 ? 'Diamond' : Number(score) >= 300 ? 'Gold' : Number(score) >= 150 ? 'Silver' : 'Bronze';
            nftInfo.push(`  #${tokenId.toString()}: ${rank} (スコア${score.toString()}点)`);
          }

          return {
            content: [{ type: 'text' as const, text: `${address} の情報:\n- 保有NFT数: ${nftCount}枚\n- NFT一覧:\n${nftInfo.join('\n')}` }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}` }],
          };
        }
      }
    );

    server.tool(
      'get_total_supply',
      'Base Shooter NFTの総ミント数を取得します。',
      {},
      async () => {
        try {
          const totalSupply = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: [{ type: 'function', name: 'totalSupply', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }] as const,
            functionName: 'totalSupply',
          });
          return {
            content: [{ type: 'text' as const, text: `Base Shooter NFTの総ミント数: ${totalSupply.toString()} NFT\nコントラクト: https://basescan.org/address/${CONTRACT_ADDRESS}` }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text' as const, text: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}` }],
          };
        }
      }
    );
  },
  { capabilities: { tools: {} } }
);