/**
 * LobbyUtxo - UTXO management and send utilities
 *
 * Handles UTXO refresh waiting and message sending with retry logic.
 * Critical for preventing "Insufficient funds" errors from race conditions.
 *
 * @module kktp/lobby/parts/lobbyUtxo
 */

import { truncate } from "./lobbyUtils.js";
import { Logger, LogModule } from "../../core/logger.js";

const log = Logger.create(LogModule.lobby.parts.lobbyUtxo);

/**
 * Wait for wallet UTXO refresh after a transaction
 * This prevents "Insufficient funds" errors from UTXO race conditions
 * when sending multiple transactions in quick succession.
 * @param {import("./lobbyContext.js").LobbyContext} ctx
 * @param {number} [delayMs=1500] - Initial delay to wait
 * @param {number} [maxWaitMs=5000] - Maximum total wait time
 */
export async function waitForUtxoRefresh(ctx, delayMs = 1500, maxWaitMs = 5000) {
  if (!ctx.adapter || typeof ctx.adapter.getBalance !== "function") {
    log.warn("KKTP Lobby: No adapter.getBalance available for UTXO refresh");
    return;
  }

  log.info("KKTP Lobby: Waiting for UTXO refresh...");
  const startTime = Date.now();

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  let attempts = 0;
  const maxAttempts = Math.ceil((maxWaitMs - delayMs) / 500);

  while (attempts < maxAttempts && Date.now() - startTime < maxWaitMs) {
    try {
      const balance = await ctx.adapter.getBalance();
      if (balance && balance > 0n) {
        log.info("KKTP Lobby: UTXO refresh complete", {
          balance: balance.toString(),
          waitedMs: Date.now() - startTime,
        });
        return;
      }
    } catch (err) {
      log.debug("KKTP Lobby: Balance check during UTXO wait", err.message);
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log.warn("KKTP Lobby: UTXO refresh timeout, proceeding anyway", {
    waitedMs: Date.now() - startTime,
  });
}

/**
 * Check if an error is UTXO-related
 * @param {Error} err
 * @returns {boolean}
 */
export function isUtxoError(err) {
  const message = err?.message || "";
  return (
    message.includes("Insufficient funds") ||
    message.includes("UTXO") ||
    message.includes("no spendable")
  );
}

/**
 * Send a message with retry logic for transient failures
 * Handles UTXO availability issues with exponential backoff.
 * @param {import("./lobbyContext.js").LobbyContext} ctx
 * @param {string} mailboxId - Target mailbox
 * @param {string} message - Message to send
 * @param {number} [maxRetries=3] - Maximum retry attempts
 */
export async function sendWithRetry(ctx, mailboxId, message, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log.info("KKTP Lobby: Send attempt", {
        attempt,
        maxRetries,
        mailboxId: truncate(mailboxId),
      });
      await ctx.sm.sendMessage(mailboxId, message);
      return; // Success!
    } catch (err) {
      lastError = err;
      const utxoError = isUtxoError(err);

      log.warn("KKTP Lobby: Send attempt failed", {
        attempt,
        maxRetries,
        error: err.message,
        isUtxoError: utxoError,
      });

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        log.info("KKTP Lobby: Retrying in", { delayMs: delay });

        // Wait for UTXO refresh before retry if it's a UTXO error
        if (utxoError) {
          await waitForUtxoRefresh(ctx, delay, delay + 2000);
        } else {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  // All retries exhausted
  throw lastError;
}
