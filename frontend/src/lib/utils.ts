import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Market, MarketStatus } from "@/types";
import { MIST_PER_SUI } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mistToSui(mist: bigint | string | number): number {
  const n = typeof mist === "bigint" ? mist : BigInt(mist);
  return Number(n) / Number(MIST_PER_SUI);
}

export function suiToMist(sui: number | string): bigint {
  return BigInt(Math.round(Number(sui) * Number(MIST_PER_SUI)));
}

export function formatSui(mist: bigint | string | number, decimals = 4): string {
  return mistToSui(mist).toFixed(decimals);
}

export function formatProbability(bps: number): string {
  return ((bps / 10_000) * 100).toFixed(1) + "%";
}

export function formatTimeLeft(resolutionMs: number): string {
  const diff = resolutionMs - Date.now();
  if (diff <= 0) return "Expired";
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins  = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function outcomeToStatus(outcome: number, resolutionTime: number): MarketStatus {
  if (outcome === 1) return "RESOLVED_YES";
  if (outcome === 2) return "RESOLVED_NO";
  if (outcome === 3) return "INVALID";
  if (Date.now() >= resolutionTime) return "EXPIRED";
  return "OPEN";
}

export function shortenAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

// Derive mock price from supply ratio when DeepBook feed is unavailable
export function supplyToImpliedProb(yesSupply: string, noSupply: string): number {
  const yes = Number(yesSupply);
  const no  = Number(noSupply);
  const total = yes + no;
  if (total === 0) return 5000; // 50%
  return Math.round((yes / total) * 10_000);
}
