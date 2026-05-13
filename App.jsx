import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
function createBoard() {
  return {
    board: [
      [4, 4, 4, 4, 4, 4, 0],
      [4, 4, 4, 4, 4, 4, 0],
    ],
    currentPlayer: 0,
  };
}

function copyBoard(s) {
  return { board: s.board.map((r) => r.slice()), currentPlayer: s.currentPlayer };
}

function getLegalMoves(s, p) {
  const m = [];
  for (let i = 0; i < 6; i++) if (s.board[p][i] > 0) m.push(i);
  return m;
}

function isTerminal(s) {
  let e0 = true, e1 = true;
  for (let i = 0; i < 6; i++) {
    if (s.board[0][i] !== 0) e0 = false;
    if (s.board[1][i] !== 0) e1 = false;
  }
  return e0 || e1;
}

function collectRemaining(s) {
  for (let p = 0; p < 2; p++) {
    for (let i = 0; i < 6; i++) {
      s.board[p][6] += s.board[p][i];
      s.board[p][i] = 0;
    }
  }
}

function distributeStones(s, player, pit) {
  let stones = s.board[player][pit];
  s.board[player][pit] = 0;
  let cs = player, cp = pit;
  while (stones > 0) {
    cp += 1;
    if (cp === 7) { cs = 1 - cs; cp = 0; }
    if (cp === 6 && cs !== player) { cs = 1 - cs; cp = 0; }
    s.board[cs][cp] += 1;
    stones -= 1;
  }
  if (cs === player && cp === 6) return true;
  if (cs === player && cp < 6 && s.board[player][cp] === 1) {
    const op = 5 - cp;
    const cap = s.board[1 - player][op];
    if (cap > 0) {
      s.board[player][6] += cap + 1;
      s.board[player][cp] = 0;
      s.board[1 - player][op] = 0;
    }
  }
  return false;
}

function makeMove(s, pit) {
  const player = s.currentPlayer;
  const bonus = distributeStones(s, player, pit);
  if (!bonus) s.currentPlayer = 1 - player;
  if (isTerminal(s)) collectRemaining(s);
  return bonus;
}

function computeSowingPath(s, player, pit) {
  const stones = s.board[player][pit];
  const path = [];
  let cs = player, cp = pit;
  for (let i = 0; i < stones; i++) {
    cp += 1;
    if (cp === 7) { cs = 1 - cs; cp = 0; }
    if (cp === 6 && cs !== player) { cs = 1 - cs; cp = 0; }
    path.push([cs, cp]);
  }
  return path;
}

const evalStoreDiff = (s, p) => s.board[p][6] - s.board[1 - p][6];

const W1 = 0.2, W4 = 1.0, W6 = 0.6, W7 = 0.9;
const evalHeuristic = (s, p) =>
  W1 * s.board[p][0] +
  W4 * s.board[p][6] +
  W6 * (-s.board[1 - p][6]) +
  W7 * (s.currentPlayer === p ? 1 : 0);

function alphaBeta(s, depth, alpha, beta, player, evalFn) {
  if (isTerminal(s) || depth === 0) {
    if (isTerminal(s)) collectRemaining(s);
    return evalFn(s, player);
  }
  const cur = s.currentPlayer;
  const moves = getLegalMoves(s, cur);
  if (cur === player) {
    let best = -Infinity;
    for (const m of moves) {
      const c = copyBoard(s);
      makeMove(c, m);
      const nd = c.currentPlayer === cur ? depth : depth - 1;
      const v = alphaBeta(c, nd, alpha, beta, player, evalFn);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const c = copyBoard(s);
      makeMove(c, m);
      const nd = c.currentPlayer === cur ? depth : depth - 1;
      const v = alphaBeta(c, nd, alpha, beta, player, evalFn);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

function minimaxAgent(s, depth, evalFn) {
  const player = s.currentPlayer;
  let bestMove = null, bestValue = -Infinity;
  for (const m of getLegalMoves(s, player)) {
    const c = copyBoard(s);
    makeMove(c, m);
    const nd = c.currentPlayer === player ? depth : depth - 1;
    const v = alphaBeta(c, nd, -Infinity, Infinity, player, evalFn);
    if (v > bestValue) { bestValue = v; bestMove = m; }
  }
  return bestMove;
}

function randomAgent(s) {
  const m = getLegalMoves(s, s.currentPlayer);
  return m.length ? m[Math.floor(Math.random() * m.length)] : null;
}

const AGENTS = {
  human: { name: 'You', short: 'You', kind: 'human' },
  random: { name: 'Random Agent', short: 'Random', kind: 'auto', fn: (s) => randomAgent(s) },
  plain: { name: 'Plain Alpha-Beta', short: 'Plain α-β', kind: 'auto', fn: (s) => minimaxAgent(s, 4, evalStoreDiff) },
  heuristic: { name: 'Heuristic Minimax', short: 'Heuristic α-β', kind: 'auto', fn: (s) => minimaxAgent(s, 4, evalHeuristic) },
};

const MATCHUPS = [
  { id: 'heur-vs-plain', label: 'Heuristic α-β  vs  Plain α-β', p0: 'heuristic', p1: 'plain' },
  { id: 'heur-vs-random', label: 'Heuristic α-β  vs  Random', p0: 'heuristic', p1: 'random' },
  { id: 'you-vs-heur', label: 'You  vs  Heuristic α-β', p0: 'human', p1: 'heuristic' },
];

const matchupHasHuman = (m) =>
  AGENTS[m.p0].kind === 'human' || AGENTS[m.p1].kind === 'human';



const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.mancala-root {
  --bg: #EFE6CF;
  --bg-deep: #E0D2B0;
  --surface: #D4C094;
  --pit-bg: #B4A07A;
  --pit-deep: #8E7B5C;
  --ink: #2A1E16;
  --ink-soft: #4A3829;
  --muted: #7A6651;
  --line: #C0AC85;
  --p0: #A8431F;
  --p1: #2C5159;
  --gold: #d4b814;
  --gold-light: #F4D082;

  font-family: 'Fraunces', Georgia, serif;
  color: var(--ink);
  background: var(--bg);
  background-image:
    radial-gradient(at 0% 0%, rgba(184,137,63,0.10) 0%, transparent 50%),
    radial-gradient(at 100% 100%, rgba(44,81,89,0.08) 0%, transparent 55%);
  min-height: 100vh;
  padding: 2.5rem 1.5rem;
}

.mancala-mono {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
}
.mancala-display {
  font-family: 'Fraunces', Georgia, serif;
  color: rgb(48, 44, 30);
}

.mancala-board {
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg-deep) 100%);
  border-radius: 28px;
  box-shadow:
    inset 0 0 0 1px rgba(42,30,22,0.18),
    inset 0 2px 0 rgba(255,250,235,0.5),
    0 18px 50px -12px rgba(42,30,22,0.28);
  padding: 1.5rem 1.25rem;
  position: relative;
}

.mancala-pit {
  background: linear-gradient(165deg, var(--pit-deep) 0%, var(--pit-bg) 100%);
  border-radius: 50%;
  box-shadow:
    inset 0 4px 8px rgba(42,30,22,0.5),
    inset 0 -1px 0 rgba(255,250,235,0.18);
  transition: transform 0.18s ease, box-shadow 0.22s ease;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  user-select: none;
}
.mancala-pit.is-last {
  box-shadow:
    inset 0 4px 8px rgba(42,30,22,0.5),
    inset 0 -1px 0 rgba(255,250,235,0.18),
    0 0 0 3px var(--gold),
    0 0 28px 6px rgba(184,137,63,0.45);
  transform: translateY(-2px);
}
.mancala-pit.is-source {
  box-shadow:
    inset 0 4px 8px rgba(42,30,22,0.55),
    inset 0 -1px 0 rgba(255,250,235,0.18),
    0 0 0 2px var(--gold-light);
}
.mancala-pit.is-arriving {
  animation: pit-arrive 0.32s ease-out;
}
.mancala-pit.is-captured {
  animation: pit-capture 0.5s ease-out;
}
.mancala-pit.is-clickable {
  cursor: pointer;
  box-shadow:
    inset 0 4px 8px rgba(42,30,22,0.45),
    inset 0 -1px 0 rgba(255,250,235,0.2),
    0 0 0 1.5px rgba(244,208,130,0.65);
}
.mancala-pit.is-clickable:hover {
  box-shadow:
    inset 0 3px 6px rgba(42,30,22,0.4),
    inset 0 -1px 0 rgba(255,250,235,0.22),
    0 0 0 3px var(--gold-light),
    0 0 24px 4px rgba(244,208,130,0.45);
  transform: translateY(-3px);
}
.mancala-pit.is-clickable:active {
  transform: translateY(-1px);
}

@keyframes pit-arrive {
  0%   { background: linear-gradient(165deg, var(--gold-light), var(--gold)); }
  100% { background: linear-gradient(165deg, var(--pit-deep), var(--pit-bg)); }
}

@keyframes pit-capture {
  0%   { background: linear-gradient(165deg, var(--gold-light), var(--gold)); transform: translateY(0) scale(1); }
  40%  { background: linear-gradient(165deg, var(--gold-light), var(--gold)); transform: translateY(-3px) scale(1.04); }
  100% { background: linear-gradient(165deg, var(--pit-deep), var(--pit-bg)); transform: translateY(0) scale(1); }
}

.mancala-store {
  background: linear-gradient(165deg, var(--pit-deep) 0%, var(--pit-bg) 100%);
  border-radius: 999px;
  box-shadow:
    inset 0 4px 8px rgba(42,30,22,0.5),
    inset 0 -1px 0 rgba(255,250,235,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.mancala-store.is-arriving {
  animation: store-arrive 0.36s ease-out;
}
@keyframes store-arrive {
  0%   { box-shadow: inset 0 4px 8px rgba(42,30,22,0.5), 0 0 0 4px var(--gold-light), 0 0 24px rgba(244,208,130,0.6); }
  100% { box-shadow: inset 0 4px 8px rgba(42,30,22,0.5), 0 0 0 0px var(--gold-light), 0 0 0 rgba(244,208,130,0); }
}

.mancala-stones {
  font-weight: 500;
  color: rgb(48, 44, 30);
  text-shadow: 0 1px 2px rgba(0,0,0,0.45);
  font-variation-settings: 'opsz' 144;
}

.flying-marker {
  position: absolute;
  width: 22px;
  height: 22px;
  margin-left: -11px;
  margin-top: -11px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, var(--gold-light) 0%, var(--gold) 60%, #8A6429 100%);
  box-shadow:
    0 0 0 1px rgba(42,30,22,0.3),
    0 4px 14px rgba(184,137,63,0.55),
    inset 0 1px 2px rgba(255,255,255,0.4);
  pointer-events: none;
  z-index: 10;
  animation-name: hop;
  animation-fill-mode: forwards;
  animation-timing-function: cubic-bezier(0.45, 0.0, 0.55, 1.0);
}
@keyframes hop {
  from { left: var(--start-x); top: var(--start-y); }
  to   { left: var(--end-x);   top: var(--end-y); }
}

.btn {
  font-family: 'Fraunces', Georgia, serif;
  background: var(--ink);
  color: var(--bg);
  border: none;
  border-radius: 999px;
  padding: 0.6rem 1.4rem;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.btn:hover { background: var(--ink-soft); }
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn.is-ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--line);
}
.btn.is-ghost:hover { background: rgba(42,30,22,0.06); }

.select {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--ink);
  color: var(--ink);
  padding: 0.35rem 1.5rem 0.35rem 0;
  cursor: pointer;
  appearance: none;
  outline: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--ink) 50%),
                    linear-gradient(-45deg, transparent 50%, var(--ink) 50%);
  background-position: calc(100% - 8px) 50%, calc(100% - 3px) 50%;
  background-size: 5px 5px;
  background-repeat: no-repeat;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  width: 130px;
}
.slider::-webkit-slider-runnable-track { height: 2px; background: var(--line); border-radius: 2px; }
.slider::-moz-range-track { height: 2px; background: var(--line); border-radius: 2px; }
.slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  background: var(--ink); border: none;
  height: 14px; width: 14px; border-radius: 50%;
  margin-top: -6px;
}
.slider::-moz-range-thumb {
  background: var(--ink); border: none;
  height: 14px; width: 14px; border-radius: 50%;
}

.divider {
  height: 1px;
  background: var(--line);
  border: none;
  margin: 0;
}

.player-card {
  background: rgba(255,250,235,0.4);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: border-color 0.25s ease, background 0.25s ease;
}
.player-card.is-active {
  border-color: var(--ink);
  background: rgba(255,250,235,0.7);
}
.player-card .swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
}
.player-card .your-turn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--gold);
  border-radius: 999px;
}

.thinking {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-style: italic;
}

.log-row {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.4rem 0;
  border-bottom: 1px dotted var(--line);
  font-size: 0.9rem;
}
.log-row:last-child { border-bottom: none; }
.log-row .idx { font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; color: var(--muted); }
.log-row .who-pit { color: var(--ink-soft); }
.log-row .badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}

.banner {
  background: var(--ink);
  color: var(--bg);
  padding: 0.7rem 1.25rem;
  border-radius: 999px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
`;


function Pit({ value, isLast, isSource, isArriving, isCaptured, isClickable, onClick, pitRef }) {
  const cls = [
    'mancala-pit',
    isLast ? 'is-last' : '',
    isSource ? 'is-source' : '',
    isArriving ? 'is-arriving' : '',
    isCaptured ? 'is-captured' : '',
    isClickable ? 'is-clickable' : '',
  ].filter(Boolean).join(' ');
  return (
    <div
      ref={pitRef}
      className={cls}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <span
        key={value}
        className="mancala-stones mancala-display"
        style={{ fontSize: 'clamp(1.3rem, 2.8vw, 2rem)' }}
      >
        {value}
      </span>
    </div>
  );
}

function Store({ value, label, accent, isArriving, storeRef }) {
  return (
    <div className="flex flex-col items-center gap-2" style={{ alignSelf: 'center' }}>
      <div className="tag">{label}</div>
      <div
        ref={storeRef}
        className={`mancala-store ${isArriving ? 'is-arriving' : ''}`}
        style={{
          width: 'clamp(56px, 7vw, 78px)',
          height: 'clamp(150px, 19vw, 220px)',
        }}
      >
        <span
          key={value}
          className="mancala-stones mancala-display"
          style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
        >
          {value}
        </span>
      </div>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent }} />
    </div>
  );
}

function PlayerCard({ label, agentName, score, isActive, accent, statusBadge }) {
  return (
    <div className={`player-card ${isActive ? 'is-active' : ''}`}>
      <div className="swatch" style={{ background: accent }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tag">{label}</div>
        <div className="mancala-display" style={{ fontSize: '1.05rem', fontWeight: 500 }}>
          {agentName}
        </div>
      </div>
      {statusBadge}
      <div className="mancala-mono" style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--ink)' }}>
        {score}
      </div>
    </div>
  );
}

export default function App() {
  const [matchupId, setMatchupId] = useState('heur-vs-plain');
  const [state, setState] = useState(createBoard);
  const [displayBoard, setDisplayBoard] = useState(() => state.board.map(r => r.slice()));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [history, setHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [sourcePit, setSourcePit] = useState(null);
  const [arrivingPit, setArrivingPit] = useState(null);
  const [arrivingStore, setArrivingStore] = useState(null);
  const [capturedPits, setCapturedPits] = useState([]);
  const [flying, setFlying] = useState(null);
  const [animating, setAnimating] = useState(false);

  const boardRef = useRef(null);
  const pitRefs = useRef({});
  const positionsRef = useRef({});
  const flyKeyRef = useRef(0);
  const arrivingTimerRef = useRef(null);

  const matchup = useMemo(() => MATCHUPS.find((m) => m.id === matchupId), [matchupId]);
  const p0Agent = AGENTS[matchup.p0];
  const p1Agent = AGENTS[matchup.p1];
  const gameOver = isTerminal(state);

  const currentAgent = state.currentPlayer === 0 ? p0Agent : p1Agent;
  const humanTurn = !gameOver && !animating && currentAgent.kind === 'human';

  const hopMs = Math.max(60, Math.round(speed * 0.18));
  const pauseAfterMove = Math.max(120, Math.round(speed * 0.4));

  const measurePositions = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const positions = {};
    Object.entries(pitRefs.current).forEach(([key, el]) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      positions[key] = {
        x: rect.left + rect.width / 2 - boardRect.left,
        y: rect.top + rect.height / 2 - boardRect.top,
      };
    });
    positionsRef.current = positions;
  }, []);

  useLayoutEffect(() => {
    measurePositions();
    const onResize = () => measurePositions();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measurePositions]);

  const animateMove = useCallback((logicalState, pit) => {
    setAnimating(true);
    measurePositions();

    const player = logicalState.currentPlayer;
    const path = computeSowingPath(logicalState, player, pit);
    const sourceKey = `${player}-${pit}`;

    const startDisplay = logicalState.board.map(r => r.slice());
    startDisplay[player][pit] = 0;
    setDisplayBoard(startDisplay);
    setSourcePit({ player, pit });
    setLastMove({ player, pit });

    let stepIdx = 0;

    const doStep = () => {
      if (stepIdx >= path.length) {
        const finalState = copyBoard(logicalState);
        makeMove(finalState, pit);

        const sownOnly = logicalState.board.map(r => r.slice());
        sownOnly[player][pit] = 0;
        for (const [sd, pt] of path) sownOnly[sd][pt] += 1;

        const captures = [];
        for (let s = 0; s < 2; s++) {
          for (let p = 0; p < 6; p++) {
            if (finalState.board[s][p] !== sownOnly[s][p]) {
              captures.push({ side: s, pit: p });
            }
          }
        }

        const finishCleanup = () => {
          setState(finalState);
          setDisplayBoard(finalState.board.map(r => r.slice()));
          setSourcePit(null);
          setFlying(null);
          setCapturedPits([]);
          setAnimating(false);
        };

        if (captures.length > 0) {
          setDisplayBoard(sownOnly);
          setCapturedPits(captures);
          setFlying(null);
          setTimeout(finishCleanup, 500);
        } else {
          setFlying(null);
          setTimeout(finishCleanup, 80);
        }
        return;
      }

      const [tSide, tPit] = path[stepIdx];
      const fromKey = stepIdx === 0 ? sourceKey : `${path[stepIdx - 1][0]}-${path[stepIdx - 1][1]}`;
      const toKey = `${tSide}-${tPit}`;
      const fromPos = positionsRef.current[fromKey];
      const toPos = positionsRef.current[toKey];

      if (!fromPos || !toPos) {
        setDisplayBoard(prev => {
          const next = prev.map(r => r.slice());
          next[tSide][tPit] += 1;
          return next;
        });
        stepIdx++;
        doStep();
        return;
      }

      flyKeyRef.current += 1;
      setFlying({
        key: flyKeyRef.current,
        from: fromPos,
        to: toPos,
        duration: hopMs,
      });

      setTimeout(() => {
        setDisplayBoard(prev => {
          const next = prev.map(r => r.slice());
          next[tSide][tPit] += 1;
          return next;
        });
        if (tPit === 6) {
          setArrivingStore(tSide);
          if (arrivingTimerRef.current) clearTimeout(arrivingTimerRef.current);
          arrivingTimerRef.current = setTimeout(() => setArrivingStore(null), 320);
        } else {
          setArrivingPit({ side: tSide, pit: tPit });
          if (arrivingTimerRef.current) clearTimeout(arrivingTimerRef.current);
          arrivingTimerRef.current = setTimeout(() => setArrivingPit(null), 320);
        }
        stepIdx++;
        doStep();
      }, hopMs);
    };

    doStep();
  }, [hopMs, measurePositions]);

  // Handle a player click on a pit
  const handlePitClick = useCallback((side, pit) => {
    if (animating || gameOver) return;
    if (state.currentPlayer !== side) return;
    const agent = side === 0 ? p0Agent : p1Agent;
    if (agent.kind !== 'human') return;
    if (displayBoard[side][pit] === 0) return;

    const probe = copyBoard(state);
    const bonus = makeMove(probe, pit);
    setHistory(h => [
      ...h,
      { idx: h.length + 1, player: state.currentPlayer, pit, agent: agent.short, bonus },
    ]);
    animateMove(state, pit);
  }, [animating, gameOver, state, p0Agent, p1Agent, displayBoard, animateMove]);

  // Auto-step the game when an AUTO agent's turn comes up and not animating
  useEffect(() => {
    if (gameOver || animating) return;
    if (currentAgent.kind === 'human') return;     // wait for click
    if (!running) return;                           // respect Play/Pause for AI moves
    const t = setTimeout(() => {
      const move = currentAgent.fn(state);
      if (move === null || move === undefined) {
        setRunning(false);
        return;
      }
      const player = state.currentPlayer;
      const probe = copyBoard(state);
      const bonus = makeMove(probe, move);
      setHistory(h => [
        ...h,
        { idx: h.length + 1, player, pit: move, agent: currentAgent.short, bonus },
      ]);
      animateMove(state, move);
    }, pauseAfterMove);
    return () => clearTimeout(t);
  }, [running, gameOver, animating, state, currentAgent, pauseAfterMove, animateMove]);

  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [history.length]);

  const resetGame = useCallback((forMatchup) => {
    const m = forMatchup || matchup;
    const fresh = createBoard();
    setState(fresh);
    setDisplayBoard(fresh.board.map(r => r.slice()));
    setHistory([]);
    setLastMove(null);
    setSourcePit(null);
    setArrivingPit(null);
    setArrivingStore(null);
    setCapturedPits([]);
    setFlying(null);
    setAnimating(false);
    setRunning(matchupHasHuman(m));
  }, [matchup]);

  const onMatchupChange = useCallback((id) => {
    const newMatchup = MATCHUPS.find((m) => m.id === id);
    setMatchupId(id);
    resetGame(newMatchup);
  }, [resetGame]);

  let banner = null;
  if (gameOver) {
    const s0 = state.board[0][6];
    const s1 = state.board[1][6];
    if (s0 > s1) banner = `${p0Agent.short} wins  ${s0} : ${s1}`;
    else if (s1 > s0) banner = `${p1Agent.short} wins  ${s1} : ${s0}`;
    else banner = `Draw  ${s0} : ${s1}`;
  }

  const p1Pits = [5, 4, 3, 2, 1, 0];
  const p0Pits = [0, 1, 2, 3, 4, 5];

  const setPitRef = (key) => (el) => {
    if (el) pitRefs.current[key] = el;
    else delete pitRefs.current[key];
  };

  const isSourceP = (side, pit) =>
    sourcePit && sourcePit.player === side && sourcePit.pit === pit;
  const isArrivingP = (side, pit) =>
    arrivingPit && arrivingPit.side === side && arrivingPit.pit === pit;
  const isCapturedP = (side, pit) =>
    capturedPits.some(c => c.side === side && c.pit === pit);
  const isLastP = (side, pit) =>
    !animating && lastMove && lastMove.player === side && lastMove.pit === pit;
  const isClickableP = (side, pit) =>
    humanTurn && side === state.currentPlayer && displayBoard[side][pit] > 0;

  // Status badges for player cards
  const statusBadgeFor = (side) => {
    const agent = side === 0 ? p0Agent : p1Agent;
    if (gameOver) return null;
    if (state.currentPlayer !== side) return null;
    if (agent.kind === 'human') {
      return <span className="your-turn">Your turn</span>;
    }
    if (animating) {
      return <span className="thinking">moving…</span>;
    }
    if (running) {
      return <span className="thinking">thinking…</span>;
    }
    return null;
  };

  const isHumanMatchup = matchupHasHuman(matchup);

  return (
    <>
      <style>{STYLES}</style>
      <div className="mancala-root">
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <header style={{ marginBottom: '2.5rem' }}>
            <div className="tag" style={{ marginBottom: '0.5rem' }}>
              CS-374 Final Project by Harsh, Julio, Leo, Miguel
            </div>
            <h1
              className="mancala-display"
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.015em',
                margin: 0,
                fontVariationSettings: "'opsz' 144, 'SOFT' 30",
              }}
            >
            Mancala (Kalah)
            </h1>
            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--muted)',
                marginTop: '0.5rem',
                maxWidth: '56ch',
                lineHeight: 1.5,
                textAlign: 'left',
              }}
            >
            Select a matchup below.
            </p>

            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label className="tag" htmlFor="matchup">Matchup:</label>
              <select
                id="matchup"
                className="select"
                value={matchupId}
                onChange={(e) => onMatchupChange(e.target.value)}
              >
                {MATCHUPS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </header>

          <PlayerCard
            label="PLAYER 1"
            agentName={p1Agent.name}
            score={displayBoard[1][6]}
            isActive={state.currentPlayer === 1 && !gameOver}
            accent="var(--p1)"
            statusBadge={statusBadgeFor(1)}
          />

          <div className="mancala-board" ref={boardRef} style={{ margin: '1rem 0' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: '1.25rem',
                alignItems: 'center',
              }}
            >
              <Store
                value={displayBoard[1][6]}
                label="P1 store"
                accent="var(--p1)"
                isArriving={arrivingStore === 1}
                storeRef={setPitRef('1-6')}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.6rem' }}>
                  {p1Pits.map((pitIdx) => (
                    <Pit
                      key={`p1-${pitIdx}`}
                      value={displayBoard[1][pitIdx]}
                      isLast={isLastP(1, pitIdx)}
                      isSource={isSourceP(1, pitIdx)}
                      isArriving={isArrivingP(1, pitIdx)}
                      isCaptured={isCapturedP(1, pitIdx)}
                      isClickable={isClickableP(1, pitIdx)}
                      onClick={() => handlePitClick(1, pitIdx)}
                      pitRef={setPitRef(`1-${pitIdx}`)}
                    />
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.6rem' }}>
                  {p0Pits.map((pitIdx) => (
                    <Pit
                      key={`p0-${pitIdx}`}
                      value={displayBoard[0][pitIdx]}
                      isLast={isLastP(0, pitIdx)}
                      isSource={isSourceP(0, pitIdx)}
                      isArriving={isArrivingP(0, pitIdx)}
                      isCaptured={isCapturedP(0, pitIdx)}
                      isClickable={isClickableP(0, pitIdx)}
                      onClick={() => handlePitClick(0, pitIdx)}
                      pitRef={setPitRef(`0-${pitIdx}`)}
                    />
                  ))}
                </div>
                <div
                  className="mancala-mono"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'rgb(0,0,0)',
                    textAlign: 'center',
                    letterSpacing: '0.08em',
                    marginTop: '-0.2rem',

                  }}
                >
                  {p0Pits.map((i) => <span key={i}>pit {i}</span>)}
                </div>
              </div>

              <Store
                value={displayBoard[0][6]}
                label="P0 store"
                accent="var(--p0)"
                isArriving={arrivingStore === 0}
                storeRef={setPitRef('0-6')}
              />
            </div>

            {flying && (
              <div
                key={flying.key}
                className="flying-marker"
                style={{
                  ['--start-x']: `${flying.from.x}px`,
                  ['--start-y']: `${flying.from.y}px`,
                  ['--end-x']: `${flying.to.x}px`,
                  ['--end-y']: `${flying.to.y}px`,
                  animationDuration: `${flying.duration}ms`,
                }}
              />
            )}
          </div>

          <PlayerCard
            label="PLAYER 0 (moves first)"
            agentName={p0Agent.name}
            score={displayBoard[0][6]}
            isActive={state.currentPlayer === 0 && !gameOver}
            accent="var(--p0)"
            statusBadge={statusBadgeFor(0)}
          />

          <div
            style={{
              marginTop: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn"
              onClick={() => setRunning((r) => !r)}
              disabled={gameOver}
              title={isHumanMatchup
                ? (running ? 'AI auto-respond: ON. Click to pause.' : 'AI auto-respond: OFF. Click to enable.')
                : (running ? 'Pause auto-play' : 'Start auto-play')}
            >
              {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Play</>}
            </button>
            <button className="btn is-ghost" onClick={() => resetGame()}>
              <RotateCcw size={16} /> Reset
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto' }}>
              <span className="tag">Speed</span>
              <input
                className="slider"
                type="range"
                min="150"
                max="1500"
                step="50"
                value={1650 - speed}
                onChange={(e) => setSpeed(1650 - Number(e.target.value))}
              />
              <span className="mancala-mono" style={{ fontSize: '0.8rem', color: 'var(--muted)', minWidth: 40 }}>
                {speed}ms
              </span>
            </div>

            {banner && (
              <div className="banner" style={{ marginLeft: 'auto' }}>{banner}</div>
            )}
          </div>

          <hr className="divider" style={{ margin: '2.5rem 0 1.5rem' }} />

          <div>
            <div className="tag" style={{ marginBottom: '0.8rem' }}>
              Move log · {history.length} {history.length === 1 ? 'move' : 'moves'}
            </div>
            <div
              ref={logRef}
              style={{
                maxHeight: 240,
                overflowY: 'auto',
                paddingRight: '0.5rem',
              }}
            >
              {history.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.95rem', padding: '0.5rem 0' }}>
                  {'Click one of your pits (bottom row) to make your first move.'}
                </div>
              ) : (
                history.map((row) => (
                  <div className="log-row" key={row.idx}>
                    <span className="idx">{String(row.idx).padStart(2, '0')}</span>
                    <span className="who-pit">
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: row.player === 0 ? 'var(--p0)' : 'var(--p1)',
                          marginRight: 8,
                          verticalAlign: 'middle',
                        }}
                      />
                      P{row.player} ({row.agent})
                      <span style={{ color: 'var(--muted)' }}> &middot; pit </span>
                      <span className="mancala-mono">{row.pit}</span>
                    </span>
                    {row.bonus && <span className="badge">+ bonus</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}