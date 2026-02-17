import { supabase } from './supabase';

export interface LeaderboardEntry {
  player_name: string;
  score: number;
}

const TABLE = 'leaderboard';
const LIMIT = 50;

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('player_name, score')
    .order('score', { ascending: false })
    .limit(LIMIT);
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function submitScore(
  playerName: string,
  score: number
): Promise<void> {
  if (!supabase) throw new Error('Leaderboard unavailable');
  const name = playerName.trim();
  if (!name) throw new Error('Please enter a name');
  const { error } = await supabase.from(TABLE).insert({
    player_name: name,
    score,
  });
  if (error) throw error;
}
