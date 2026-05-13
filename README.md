# Mancala AI Visualizer
 
This is a program for watching Kalah(6,4) games played by search agents, with optional human vs AI play. Built as part of a group project on combinatorial game theory, the visualizer is the frontend counterpart to the Python implementation our team developed for benchmarking the agents.
 
## What it shows
 
Three matchups are selectable from the dropdown:
 
- **Heuristic α-β  vs  Plain α-β.** Two minimax agents that share the same alpha-beta search to depth 4, where the only difference is the evaluation function. The plain alpha-beta scores positions by store differential alone, while heuristic alpha-beta uses a weighted combination of four features (own store count, opponent store, hoarding in the leftmost pit, and bonus-turn potential). The matchup isolates how much the richer evaluation is worth.
- **Heuristic α-β  vs  Random.** The heuristic agent is put against a baseline that picks legal moves uniformly at random. Heuristic minimax has been shown to beat random agents in 99.5% of games when going first; this is the floor of the benchmark.
- **You  vs  Heuristic α-β.** Click one of your pits (bottom row) to make a move, then the heuristic agent responds automatically. This is a good way to feel how strong the agent actually is before looking at the win-rate numbers.
## How the animation works
 
When an agent picks a move, the source pit is highlighted in gold, then a small gold marker walks one pit at a time along the sowing path. Each pit count increments at the moment the marker arrives. Captures are signaled by a brief pulse on both the captured pit and its opposite, after which the totals jump to the player's store. Bonus turns are marked in the move log.
  
## Running locally
 
The app is a single React component (`App.jsx`) that drops into a vanilla Vite + React project.
 
```bash
npm create vite@latest mancala-viewer -- --template react
cd mancala-viewer
npm install
npm install lucide-react
```
 
Then replace the generated `src/App.jsx` with the file in this repo and run:
 
```bash
npm run dev
```
 
Open the URL the dev server prints (usually `http://localhost:5173/`). Save any change to `App.jsx` and the page reloads.
 
## Algorithms
 
All game logic and agents are implemented inside `App.jsx` and are a direct port of the team's Python notebook implementation. The two non-trivial agents share the same alpha-beta search; only their evaluation functions differ.
 
**Plain alpha-beta minimax.** Standard minimax with alpha-beta pruning, searching to depth 4 from the current position. Evaluation function is `own_store - opponent_store`. The bonus-turn rule is handled by checking `current_player` at each recursive call rather than alternating max and min levels by depth, which means a chain of bonus moves does not consume search depth.
 
**Heuristic minimax.** executes the same search, but with a different evaluation. The evaluation is a weighted linear combination of four features from Hunter (2021):
 
- H1: maximizes stones in the leftmost pit on the player's side (hoarding)
- H4: minimizes stones in the player's own store
- H6: negation of the opponent's store count
- H7: 1 if it is still the player's turn at this leaf, 0 otherwise (bonus-turn potential)
  
**Random agent.** Picks uniformly from the legal moves at the current state. Serves as the floor of the benchmark ladder.
 
By Harsh Singh, Julio Beckman, Leonardo Trejo Arcos, Miguel Pena

Built for CS-374: Analysis of Algorithms at Saint Mary's College of California.
