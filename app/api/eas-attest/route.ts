import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, encodeAbiParameters, parseAbiParameters } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const EAS_CONTRACT = '0x4200000000000000000000000000000000000021' as `0x${string}`;

const EAS_ABI = [
  {
    type: 'function',
    name: 'attest',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'expirationTime', type: 'uint64' },
              { name: 'revocable', type: 'bool' },
              { name: 'refUID', type: 'bytes32' },
              { name: 'data', type: 'bytes' },
              { name: 'value', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'payable',
  },
] as const;

function getRank(score: number): string {
  if (score >= 500) return 'Diamond';
  if (score >= 300) return 'Gold';
  if (score >= 150) return 'Silver';
  return 'Bronze';
}

export async function POST(req: NextRequest) {
  try {
    const { playerAddress, score } = await req.json();

    if (!playerAddress || score === undefined) {
      return NextResponse.json({ error: 'Missing playerAddress or score' }, { status: 400 });
    }

    const schemaUID = process.env.EAS_SCHEMA_UID_SHOOTER as `0x${string}`;
    const privateKey = process.env.AGENT_PRIVATE_KEY!;
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    const rank = getRank(score);

    const encodedData = encodeAbiParameters(
      parseAbiParameters('address playerAddress, uint256 score, string rank, uint256 timestamp'),
      [
        playerAddress as `0x${string}`,
        BigInt(score),
        rank,
        BigInt(Math.floor(Date.now() / 1000)),
      ]
    );

    const hash = await walletClient.writeContract({
      address: EAS_CONTRACT,
      abi: EAS_ABI,
      functionName: 'attest',
      args: [
        {
          schema: schemaUID,
          data: {
            recipient: playerAddress as `0x${string}`,
            expirationTime: BigInt(0),
            revocable: true,
            refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
            data: encodedData,
            value: BigInt(0),
          },
        },
      ],
    });

    return NextResponse.json({ hash });
  } catch (error) {
    console.error('EAS attest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'EAS attestation failed' },
      { status: 500 }
    );
  }
}
