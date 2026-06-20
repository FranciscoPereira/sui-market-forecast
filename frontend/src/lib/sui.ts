import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  MARKET_REGISTRY_ID,
  SUI_CLOCK_ID,
  NETWORK,
  RPC_URL,
} from "./constants";
import type { CreateMarketForm, TradeForm, Outcome } from "@/types";
import { suiToMist } from "./utils";

export const suiClient = new SuiClient({ url: RPC_URL });

// ── Market creation transaction ───────────────────────────────────────────────

export function buildCreateMarketTx(form: CreateMarketForm, sender: string): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);

  const resolutionMs = new Date(form.resolutionDate).getTime();
  const feeMist = suiToMist(Number(form.creationFee));

  const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(feeMist)]);

  tx.moveCall({
    target: `${PACKAGE_ID}::market_factory::create_market`,
    arguments: [
      tx.object(MARKET_REGISTRY_ID),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(form.question))),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(form.yesLabel))),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(form.noLabel))),
      tx.pure.u64(resolutionMs),
      tx.pure.address(form.oracle),
      feeCoin,
      tx.object(SUI_CLOCK_ID),
    ],
  });

  return tx;
}

// ── Buy position (mint YES + NO) ──────────────────────────────────────────────

export function buildBuyPositionTx(
  marketId: string,
  collateralSui: number,
  sender: string
): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);

  const collateralMist = suiToMist(collateralSui);
  const [collateralCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(collateralMist)]);

  const [yesCoin, noCoin, position] = tx.moveCall({
    target: `${PACKAGE_ID}::market_factory::buy_position`,
    arguments: [
      tx.object(marketId),
      collateralCoin,
      tx.object(SUI_CLOCK_ID),
    ],
  });

  // Transfer outcome tokens and position receipt to sender
  tx.transferObjects([yesCoin, noCoin, position], sender);

  return tx;
}

// ── Redeem winning tokens ─────────────────────────────────────────────────────

export function buildRedeemTx(
  marketId: string,
  outcome: Outcome,
  tokenObjectId: string,
  sender: string
): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);

  const fn = outcome === "YES" ? "redeem_yes" : "redeem_no";
  const [suiCoin] = tx.moveCall({
    target: `${PACKAGE_ID}::market_factory::${fn}`,
    arguments: [tx.object(marketId), tx.object(tokenObjectId)],
  });

  tx.transferObjects([suiCoin], sender);
  return tx;
}

// ── Close full position (burn equal YES + NO) ─────────────────────────────────

export function buildClosePositionTx(
  marketId: string,
  yesTokenId: string,
  noTokenId: string,
  sender: string
): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);

  const [suiCoin] = tx.moveCall({
    target: `${PACKAGE_ID}::market_factory::close_position`,
    arguments: [
      tx.object(marketId),
      tx.object(yesTokenId),
      tx.object(noTokenId),
    ],
  });

  tx.transferObjects([suiCoin], sender);
  return tx;
}

// ── DeepBook: place limit order ───────────────────────────────────────────────

export function buildLimitOrderTx(
  poolId: string,
  accountCapId: string,
  isYes: boolean,
  isBid: boolean,
  price: number,
  quantity: number,
  sender: string
): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);

  const fn = isYes
    ? isBid ? "place_limit_bid_yes" : "place_limit_ask_yes"
    : isBid ? "place_limit_bid_no"  : "place_limit_ask_no";

  const priceMist = Math.round(price * 1_000_000_000);
  const clientOrderId = Date.now();
  const expireTs = 0; // never expires

  tx.moveCall({
    target: `${PACKAGE_ID}::deepbook_pool::${fn}`,
    arguments: [
      tx.object(poolId),
      tx.object(accountCapId),
      tx.pure.u64(clientOrderId),
      tx.pure.u64(priceMist),
      tx.pure.u64(quantity),
      tx.pure.u64(expireTs),
      tx.object(SUI_CLOCK_ID),
    ],
  });

  return tx;
}

// ── Fetch all markets from chain ──────────────────────────────────────────────

export async function fetchMarkets(): Promise<unknown[]> {
  const events = await suiClient.queryEvents({
    query: {
      MoveEventType: `${PACKAGE_ID}::market_factory::MarketCreated`,
    },
    limit: 50,
    order: "descending",
  });
  return events.data;
}

// ── Fetch user token balances ─────────────────────────────────────────────────

export async function fetchUserCoins(owner: string, coinType: string) {
  return suiClient.getCoins({ owner, coinType });
}
