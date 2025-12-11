import { LeaderboardEntry } from "../types/leaderboard";
import { HttpClient } from "./HttpClient";

export class LeaderboardManager {
  private static instance: LeaderboardManager;
  private leaderboardData: LeaderboardEntry[] = [];

  private constructor() {}

  public static getInstance(): LeaderboardManager {
    if (!LeaderboardManager.instance) {
      LeaderboardManager.instance = new LeaderboardManager();
    }
    return LeaderboardManager.instance;
  }

  public async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const entries = await HttpClient.get<LeaderboardEntry[]>(
      "/leaderboard/global"
    );
    this.leaderboardData = entries;
    return entries;
  }

  public getCurrentLeaderboard(): LeaderboardEntry[] {
    return this.leaderboardData;
  }

  public async refreshLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard();
  }
}
