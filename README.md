# Hex Merge (v2)
Drop numbered hexes; 3+ connected equal numbers merge into the next number at the drop spot; chains = combo multipliers.
Modes: Vs Computer (Easy→Master), Daily Puzzle, Online 1v1 rooms, Pass & Play, Team 2v2 (vs computers, pass & play, online).
Online uses the Star Tiles transport (mq.js, public MQTT brokers, retained per-move messages); every move carries the sender's full state (authoritative totals).
Global leaderboard: run `supabase.sql` once in the Supabase SQL editor; until then the board shows local bests.
