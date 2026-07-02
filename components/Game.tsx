'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { concat, encodeFunctionData } from 'viem';
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { CONTRACT_ADDRESS, shooterRewardAbi } from '@/lib/contract';
import { BUILDER_CODE_DATA_SUFFIX } from '@/lib/builderCode';
import { TARGET_CHAIN_ID } from '@/lib/wagmiConfig';
import { AdviceButton } from '@/components/AdviceButton';

const MINT_THRESHOLD = 100;
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 480;
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 14;
const PLAYER_Y = CANVAS_HEIGHT - 30;
const BULLET_SPEED = 6;
const FIRE_INTERVAL_MS = 280;
const STARTING_LIVES = 3;

type GameState = 'idle' | 'playing' | 'gameover';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Game() {
  const { isConnected, chainId } = useAccount();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFireRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const playerXRef = useRef(CANVAS_WIDTH / 2);
  const bulletsRef = useRef<Rect[]>([]);
  const enemiesRef = useRef<Rect[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(STARTING_LIVES);
  const spawnIntervalRef = useRef(1100);
  const gameStateRef = useRef<GameState>('idle');

  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [finalScore, setFinalScore] = useState(0);
  const [hasMinted, setHasMinted] = useState(false);

  const {
    data: hash,
    sendTransaction,
    isPending: isMinting,
    error: mintError,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) setHasMinted(true);
  }, [isConfirmed]);

  const startGame = useCallback(() => {
    bulletsRef.current = [];
    enemiesRef.current = [];
    scoreRef.current = 0;
    livesRef.current = STARTING_LIVES;
    spawnIntervalRef.current = 1100;
    playerXRef.current = CANVAS_WIDTH / 2;
    lastFireRef.current = 0;
    lastSpawnRef.current = 0;
    setScore(0);
    setLives(STARTING_LIVES);
    setHasMinted(false);
    gameStateRef.current = 'playing';
    setGameState('playing');
  }, []);

  // ゲームループ（canvasへの描画と当たり判定）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      if (gameStateRef.current === 'playing') {
        // 自動発射
        if (time - lastFireRef.current > FIRE_INTERVAL_MS) {
          lastFireRef.current = time;
          bulletsRef.current.push({ x: playerXRef.current - 2, y: PLAYER_Y - 6, w: 4, h: 10 });
        }

        // 敵スポーン（時間経過で間隔が短くなる＝難易度上昇）
        if (time - lastSpawnRef.current > spawnIntervalRef.current) {
          lastSpawnRef.current = time;
          spawnIntervalRef.current = Math.max(400, spawnIntervalRef.current - 12);
          const w = 28;
          enemiesRef.current.push({ x: Math.random() * (CANVAS_WIDTH - w), y: -20, w, h: 20 });
        }

        // 弾の移動
        bulletsRef.current.forEach((b) => (b.y -= BULLET_SPEED));
        bulletsRef.current = bulletsRef.current.filter((b) => b.y > -20);

        // 敵の移動
        const enemySpeed = 1.2 + scoreRef.current / 400;
        enemiesRef.current.forEach((e) => (e.y += enemySpeed));

        // 当たり判定: 弾 vs 敵
        const survivors: Rect[] = [];
        for (const e of enemiesRef.current) {
          let hit = false;
          bulletsRef.current = bulletsRef.current.filter((b) => {
            const collide = b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y;
            if (collide) hit = true;
            return !collide;
          });
          if (hit) {
            scoreRef.current += 10;
            setScore(scoreRef.current);
          } else {
            survivors.push(e);
          }
        }
        enemiesRef.current = survivors;

        // 画面下に到達した敵 → ライフ減少
        const remaining: Rect[] = [];
        for (const e of enemiesRef.current) {
          if (e.y > CANVAS_HEIGHT) {
            livesRef.current -= 1;
            setLives(livesRef.current);
          } else {
            remaining.push(e);
          }
        }
        enemiesRef.current = remaining;

        if (livesRef.current <= 0) {
          gameStateRef.current = 'gameover';
          setFinalScore(scoreRef.current);
          setGameState('gameover');
        }
      }

      // 描画
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#0A0B0D';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#0052FF';
      ctx.fillRect(playerXRef.current - PLAYER_WIDTH / 2, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT);

      ctx.fillStyle = '#7DD3FC';
      bulletsRef.current.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));

      ctx.fillStyle = '#F87171';
      enemiesRef.current.forEach((e) => ctx.fillRect(e.x, e.y, e.w, e.h));

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const handlePointerMove = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || gameStateRef.current !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const x = (clientX - rect.left) * scaleX;
    playerXRef.current = Math.min(CANVAS_WIDTH - PLAYER_WIDTH / 2, Math.max(PLAYER_WIDTH / 2, x));
  };

  const onMint = () => {
    // 通常のミント呼び出しデータを作る
    const callData = encodeFunctionData({
      abi: shooterRewardAbi,
      functionName: 'mintReward',
      args: [BigInt(finalScore)],
    });

    // 末尾にBuilder Codeの識別データ（ERC-8021）を付けて送信する。
    // コントラクトはこの余分なデータを無視して通常通り動作する。
    sendTransaction({
      to: CONTRACT_ADDRESS,
      data: concat([callData, BUILDER_CODE_DATA_SUFFIX]),
    });
  };

  const canMint =
    gameState === 'gameover' &&
    isConnected &&
    chainId === TARGET_CHAIN_ID &&
    finalScore >= MINT_THRESHOLD &&
    !hasMinted;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between font-mono text-sm text-base-mist">
        <span>
          SCORE <span className="text-white">{score}</span>
        </span>
        <span>
          LIVES <span className="text-white">{'♥'.repeat(Math.max(lives, 0))}</span>
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-base-line">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block w-full touch-none"
          onPointerMove={(e) => handlePointerMove(e.clientX)}
          onPointerDown={(e) => handlePointerMove(e.clientX)}
        />

        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 text-center">
            <p className="max-w-xs text-sm text-base-mist">
              画面をドラッグして自機を動かそう。弾は自動発射、敵を倒してスコアを稼げ。
            </p>
            <button
              onClick={startGame}
              className="focus-ring rounded-full bg-base-blue px-8 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              スタート
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-center">
            <p className="font-mono text-4xl font-semibold text-white">{finalScore}</p>
            <p className="text-sm text-base-mist">最終スコア</p>

            {finalScore < MINT_THRESHOLD && (
              <p className="max-w-xs text-xs text-base-mist">
                NFTミントには{MINT_THRESHOLD}点以上が必要です。
              </p>
            )}

            {finalScore >= MINT_THRESHOLD && !isConnected && (
              <p className="text-xs text-base-mist">ウォレットを接続するとミントできます。</p>
            )}

            {canMint && (
              <button
                onClick={onMint}
                disabled={isMinting || isConfirming}
                className="focus-ring rounded-full bg-base-blue px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {isMinting || isConfirming ? 'ミント中…' : 'NFTをミントする'}
              </button>
            )}

            {(isConfirming || isConfirmed || mintError) && (
              <p className="text-xs">
                {isConfirming && <span className="text-base-mist">トランザクション確認中…</span>}
                {isConfirmed && <span className="text-emerald-400">ミント成功 ✓</span>}
                {mintError && <span className="text-red-400">ミントに失敗しました</span>}
              </p>
            )}
<AdviceButton score={finalScore} />

            <button
              onClick={startGame}
              className="focus-ring text-xs text-base-mist underline hover:text-white"
            >
              もう一度プレイ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
