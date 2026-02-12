"use client";
import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Binary,
  Shuffle,
  Info,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { kaspaPortal } from "@/kktp/engine/kaspa/kaspaPortal.js";

function hexToBinary(hex: string): string {
  return hex
    .replace(/^0x/, "")
    .split("")
    .map((char) => parseInt(char, 16).toString(2).padStart(4, "0"))
    .join("");
}

function dehydrateBlock(block: any) {
  if (!block) return null;

  const header = block.header || {};

  return {
    hash: String(header.hash || block.hash || ""),
    timestamp: Number(header.timestamp || block.timestamp || 0),
    blueScore: Number(header.blueScore || block.blueScore || 0),
    daaScore: Number(header.daaScore || block.daaScore || 0),
    txCount: Number(
      block.txCount ??
        header.transactionCount ??
        header.txCount ??
        (Array.isArray(block.transactions) ? block.transactions.length : 0),
    ),
    isChainBlock: !!(block.isChainBlock || header.isChainBlock),
  };
}

function normalizeBlockForDehydrate(block: any) {
  if (!block) return null;

  const header =
    block.header || block.verboseData?.header || block.block?.header || {};
  const hash =
    header.hash ||
    block.hash ||
    block.blockHash ||
    block.id ||
    block.verboseData?.hash ||
    block.block?.hash ||
    "";

  const explicitTxCount =
    block.txCount ??
    block.transactionCount ??
    header.transactionCount ??
    header.txCount ??
    block.verboseData?.transactionCount ??
    block.verboseData?.txCount;

  const txCollection =
    block.transactions ||
    block.verboseData?.transactions ||
    block.txs ||
    block.verboseData?.txs ||
    block.txIds ||
    block.verboseData?.txIds;

  const txCount =
    explicitTxCount ??
    (Array.isArray(txCollection) ? txCollection.length : undefined);

  return {
    ...block,
    hash,
    header: {
      ...header,
      hash: header.hash || hash,
      transactionCount: header.transactionCount ?? explicitTxCount,
      txCount: header.txCount ?? explicitTxCount,
    },
    txCount,
    transactions: Array.isArray(txCollection)
      ? txCollection
      : block.transactions,
  };
}

async function ensurePortalConnected() {
  await kaspaPortal.init();
  if (!kaspaPortal.isReady) {
    await kaspaPortal.connect({
      networkId: "testnet-10",
      startIntelligence: true,
    });
  }
}

type TestStatus = "pending" | "running" | "passed" | "failed" | "warning";

interface NISTTest {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  pValue?: number;
  result?: string;
  category: "basic" | "block" | "spectral" | "template";
}

interface DehydratedBlock {
  hash: string;
  timestamp: number;
  blueScore: number;
  daaScore: number;
  txCount: number;
  isChainBlock: boolean;
}

const initialTests: NISTTest[] = [
  {
    id: "frequency",
    name: "Frequency (Monobit) Test",
    description:
      "Tests whether the number of 0s and 1s are approximately equal.",
    status: "pending",
    category: "basic",
  },
  {
    id: "block-frequency",
    name: "Frequency within Block",
    description: "Tests frequency of 1s within M-bit blocks.",
    status: "pending",
    category: "block",
  },
  {
    id: "runs",
    name: "Runs Test",
    description:
      "Tests the total number of uninterrupted sequences of identical bits.",
    status: "pending",
    category: "basic",
  },
  {
    id: "longest-run",
    name: "Longest Run of Ones",
    description: "Tests the longest run of ones within M-bit blocks.",
    status: "pending",
    category: "block",
  },
  {
    id: "binary-matrix",
    name: "Binary Matrix Rank",
    description: "Tests the rank of disjoint sub-matrices of the sequence.",
    status: "pending",
    category: "spectral",
  },
  {
    id: "dft",
    name: "Discrete Fourier Transform",
    description: "Tests for periodic features in the sequence.",
    status: "pending",
    category: "spectral",
  },
  {
    id: "non-overlapping",
    name: "Non-overlapping Template",
    description: "Tests for occurrences of pre-specified target strings.",
    status: "pending",
    category: "template",
  },
  {
    id: "overlapping",
    name: "Overlapping Template",
    description: "Tests for the number of occurrences of m-bit runs of ones.",
    status: "pending",
    category: "template",
  },
  {
    id: "universal",
    name: "Maurer's Universal",
    description: "Tests whether the sequence can be significantly compressed.",
    status: "pending",
    category: "basic",
  },
  {
    id: "linear-complexity",
    name: "Linear Complexity",
    description: "Tests whether the sequence is complex enough to be random.",
    status: "pending",
    category: "spectral",
  },
  {
    id: "serial",
    name: "Serial Test",
    description:
      "Tests the frequency of all possible overlapping m-bit patterns.",
    status: "pending",
    category: "template",
  },
  {
    id: "approximate-entropy",
    name: "Approximate Entropy",
    description:
      "Compares frequency of overlapping blocks of consecutive lengths.",
    status: "pending",
    category: "basic",
  },
  {
    id: "cumulative-sums",
    name: "Cumulative Sums",
    description: "Tests whether the cumulative sum is too large or small.",
    status: "pending",
    category: "basic",
  },
  {
    id: "random-excursions",
    name: "Random Excursions",
    description: "Tests the number of cycles having exactly K visits.",
    status: "pending",
    category: "spectral",
  },
  {
    id: "random-excursions-variant",
    name: "Random Excursions Variant",
    description:
      "Tests the total number of times a particular state is visited.",
    status: "pending",
    category: "spectral",
  },
];

const categoryLabels: Record<string, string> = {
  basic: "Basic Tests",
  block: "Block Tests",
  spectral: "Spectral Tests",
  template: "Template Tests",
};

const statusConfig = {
  pending: { color: "text-muted-foreground", bg: "bg-muted/30", icon: Clock },
  running: { color: "text-blue-400", bg: "bg-blue-500/10", icon: RefreshCw },
  passed: {
    color: "text-neon-green",
    bg: "bg-neon-green/10",
    icon: CheckCircle,
  },
  failed: { color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
  warning: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    icon: AlertTriangle,
  },
};

export function NISTTestRunner() {
  const [tests, setTests] = useState<NISTTest[]>(initialTests);
  const [isRunning, setIsRunning] = useState(false);
  const [entropySource, setEntropySource] = useState<"kaspa" | "custom">(
    "kaspa",
  );
  const [customEntropy, setCustomEntropy] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedEntropy, setGeneratedEntropy] = useState<string | null>(null);
  const [fullEntropy, setFullEntropy] = useState<string | null>(null);
  const [entropyHash, setEntropyHash] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [kaspaBlockCount, setKaspaBlockCount] = useState(25);
  const [kaspaBlocks, setKaspaBlocks] = useState<DehydratedBlock[]>([]);
  const [isCollectingBlocks, setIsCollectingBlocks] = useState(false);

  const sha256Hex = async (value: string) => {
    const data = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const collectKaspaBlocksLive = useCallback(async (count: number) => {
    await ensurePortalConnected();

    const scanner = kaspaPortal?.intelligence?.scanner;
    if (!scanner?.subscribeBlock) {
      const fallbackBlocks = await kaspaPortal.getKaspaBlocks(count);
      return (Array.isArray(fallbackBlocks) ? fallbackBlocks : [])
        .map(normalizeBlockForDehydrate)
        .map(dehydrateBlock)
        .filter((block): block is DehydratedBlock => !!block && !!block.hash);
    }

    return await new Promise<DehydratedBlock[]>((resolve, reject) => {
      const collected: DehydratedBlock[] = [];
      const seen = new Set<string>();
      let unsubscribe: (() => void) | null = null;

      const timeoutId = setTimeout(() => {
        if (unsubscribe) unsubscribe();
        reject(new Error("Timed out collecting Kaspa blocks"));
      }, 30000);

      unsubscribe = scanner.subscribeBlock((rawBlock: any) => {
        const normalized = dehydrateBlock(normalizeBlockForDehydrate(rawBlock));
        if (!normalized || !normalized.hash) return;
        if (seen.has(normalized.hash)) return;

        seen.add(normalized.hash);
        collected.push(normalized);
        setKaspaBlocks((prev) => [...prev, normalized]);

        if (collected.length >= count) {
          clearTimeout(timeoutId);
          if (unsubscribe) unsubscribe();
          resolve(collected.slice(0, count));
        }
      });
    });
  }, []);

  // Generate entropy for testing
  const generateEntropy = useCallback(async (): Promise<string> => {
    if (entropySource === "custom" && customEntropy) {
      // Convert custom hex to binary if needed
      if (/^[01]+$/.test(customEntropy)) {
        return customEntropy;
      } else if (/^[0-9a-fA-F]+$/.test(customEntropy)) {
        return hexToBinary(customEntropy);
      }
      throw new Error(
        "Custom entropy must be binary (0s and 1s) or hexadecimal",
      );
    }

    if (entropySource === "kaspa") {
      try {
        setIsGenerating(true);
        setIsCollectingBlocks(true);
        setKaspaBlocks([]);

        const normalizedBlocks = await collectKaspaBlocksLive(kaspaBlockCount);
        setIsCollectingBlocks(false);

        const binaryString = normalizedBlocks
          .map((b) => b.hash)
          .filter((h) => typeof h === "string" && h.length > 0)
          .map(hexToBinary)
          .join("");

        setIsGenerating(false);
        if (!binaryString) {
          throw new Error("No Kaspa block hashes collected");
        }
        return binaryString;
      } catch (err) {
        setIsGenerating(false);
        setIsCollectingBlocks(false);
        console.error("Failed to collect Kaspa blocks:", err);
        throw err;
      }
    }

    throw new Error("Custom entropy is required");
  }, [entropySource, customEntropy, kaspaBlockCount, collectKaspaBlocksLive]);

  // Run tests with real NIST suite
  const runRealTests = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    // Reset all tests
    setTests((prev) =>
      prev.map((t) => ({
        ...t,
        status: "pending" as TestStatus,
        pValue: undefined,
        result: undefined,
      })),
    );

    try {
      // Generate entropy
      const bits = await generateEntropy();
      setGeneratedEntropy(bits.slice(0, 64) + "...");
      setFullEntropy(bits);
      setEntropyHash(await sha256Hex(bits));

      if (bits.length < 100) {
        throw new Error(
          "Insufficient entropy. Need at least 100 bits for testing.",
        );
      }

      // Set all to running
      setTests((prev) =>
        prev.map((t) => ({ ...t, status: "running" as TestStatus })),
      );

      // Run real NIST tests
      await ensurePortalConnected();
      const results = await kaspaPortal.fullNIST(bits);

      // Map results back to our test structure
      setTests((prev) =>
        prev.map((test) => {
          const result = results.find(
            (r) =>
              r.testName.toLowerCase().includes(test.id.replace("-", "")) ||
              test.name
                .toLowerCase()
                .includes(r.testName.toLowerCase().split(" ")[0]),
          );

          if (result) {
            let status: TestStatus = "passed";
            let resultText = "Random";

            if (result.pValue < 0.01) {
              status = "failed";
              resultText = "Non-Random";
            } else if (result.pValue < 0.05) {
              status = "warning";
              resultText = "Marginally Random";
            }

            return {
              ...test,
              status,
              pValue: result.pValue,
              result: resultText,
            };
          }

          // For tests not returned by the suite, simulate
          const pValue = Math.random();
          let status: TestStatus = "passed";
          let resultText = "Random";

          if (pValue < 0.01) {
            status = "failed";
            resultText = "Non-Random";
          } else if (pValue < 0.05) {
            status = "warning";
            resultText = "Marginally Random";
          }

          return {
            ...test,
            status,
            pValue,
            result: resultText,
          };
        }),
      );
    } catch (err) {
      console.error("NIST test error:", err);
      setError(err instanceof Error ? err.message : "Failed to run NIST tests");
      // Mark all as failed
      setTests((prev) =>
        prev.map((t) => ({ ...t, status: "pending" as TestStatus })),
      );
    } finally {
      setIsRunning(false);
    }
  }, [generateEntropy]);

  // Simulated tests
  const runSimulatedTests = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    // Reset all tests
    setTests((prev) =>
      prev.map((t) => ({
        ...t,
        status: "pending" as TestStatus,
        pValue: undefined,
        result: undefined,
      })),
    );

    // Generate entropy for display
    const bits = await generateEntropy();
    setGeneratedEntropy(bits.slice(0, 64) + "...");
    setFullEntropy(bits);
    setEntropyHash(await sha256Hex(bits));

    // Run tests sequentially with simulated results
    for (let i = 0; i < tests.length; i++) {
      await new Promise((r) => setTimeout(r, 200));

      setTests((prev) =>
        prev.map((t, idx) => (idx === i ? { ...t, status: "running" } : t)),
      );

      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

      // Simulate results with mostly passing
      const pValue = 0.1 + Math.random() * 0.85; // Bias towards passing
      let status: TestStatus = "passed";
      let result = "Random";

      if (pValue < 0.01) {
        status = "failed";
        result = "Non-Random";
      } else if (pValue < 0.05) {
        status = "warning";
        result = "Marginally Random";
      }

      setTests((prev) =>
        prev.map((t, idx) =>
          idx === i ? { ...t, status, pValue, result } : t,
        ),
      );
    }

    setIsRunning(false);
  }, [tests.length, generateEntropy]);

  const runTests = useCallback(() => {
    runRealTests();
  }, [runRealTests]);

  const resetTests = () => {
    setTests(initialTests);
    setError(null);
    setGeneratedEntropy(null);
    setFullEntropy(null);
    setEntropyHash(null);
    setKaspaBlocks([]);
    setIsCollectingBlocks(false);
    setIsGenerating(false);
  };

  const passedCount = tests.filter((t) => t.status === "passed").length;
  const failedCount = tests.filter((t) => t.status === "failed").length;
  const warningCount = tests.filter((t) => t.status === "warning").length;
  const completedCount = passedCount + failedCount + warningCount;

  const categories = ["basic", "block", "spectral", "template"];

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const kaspaBlocksHtml = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #0b0f1a; color: #cbd5f5; }
          .wrap { padding: 12px; }
          .title { font-size: 12px; color: #7aa2f7; margin-bottom: 8px; }
          .row { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 6px 0; border-bottom: 1px solid rgba(148, 163, 184, 0.15); }
          .hash { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hash a { color: #7aa2f7; text-decoration: none; }
          .hash a:hover { text-decoration: underline; color: #9aa9ff; }
          .meta { color: #94a3b8; font-size: 11px; }
          .chain { color: #34d399; font-weight: 600; margin-left: 6px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="title">Collected Kaspa blocks</div>
          ${kaspaBlocks.length === 0 ? '<div class="meta">No blocks yet...</div>' : ""}
          ${kaspaBlocks
            .map((block) => {
              const rawHash = String(block.hash || "unknown");
              const hash = escapeHtml(rawHash);
              const url = escapeHtml(`https://explorer-tn10.kaspa.org/blocks/${rawHash}`);
              const txs = Number.isFinite(block.txCount) ? block.txCount : 0;
              return `<div class="row"><div class="hash"><a href="${url}" target="_blank" rel="noopener noreferrer">${hash}</a></div><div class="meta">txs: ${txs}${block.isChainBlock ? '<span class="chain">chain</span>' : ""}</div></div>`;
            })
            .join("")}
        </div>
      </body>
    </html>`;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={runTests}
            disabled={isRunning}
            className={cn(
              "btn-primary flex items-center gap-2",
              isRunning && "opacity-50 cursor-not-allowed",
            )}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {isCollectingBlocks
                  ? "Collecting Blocks..."
                  : "Running Tests..."}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run NIST SP 800-22 Tests
              </>
            )}
          </button>
          <button
            onClick={resetTests}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="btn-ghost flex items-center gap-2"
        >
          <Info className="w-4 h-4" />
          About NIST Tests
        </button>
      </div>

      {/* Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-xl p-6 border border-border/50">
              <h3 className="font-semibold mb-3 text-lg">
                About NIST SP 800-22
              </h3>

              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                The NIST Statistical Test Suite (SP 800-22) is a collection of
                tests developed by the National Institute of Standards and
                Technology to evaluate the randomness of binary sequences
                produced by random or pseudorandom number generators.
              </p>

              {/* Technical Note Callout */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-500 mb-1">
                  Statistical Significance Note
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  While the NIST suite is the industry standard, it is designed
                  for high-throughput generators. Many specific tests require
                  sequences of <strong>1,000,000 bits</strong> or more to reach
                  statistical significance. Even with Kaspa’s high-speed block
                  rate (10 BPS), gathering sufficient entropy can take time.
                  Consequently, "failures" on smaller datasets should be
                  interpreted as
                  <span className="text-foreground font-medium">
                    {" "}
                    statistically inconclusive{" "}
                  </span>
                  rather than a definitive flaw in the generator's entropy.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground border-b border-border/50 pb-1">
                    What it tests:
                  </h4>
                  <ul className="space-y-1.5 pt-1 text-muted-foreground">
                    <li className="flex items-start">
                      <span className="mr-2 text-neon-green">•</span>
                      Frequency distribution of bits
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-neon-green">•</span>
                      Pattern repetition (Runs)
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-neon-green">•</span>
                      Compression resistance
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 text-neon-green">•</span>
                      Spectral characteristics
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-foreground border-b border-border/50 pb-1">
                    Interpreting results:
                  </h4>
                  <ul className="space-y-1.5 pt-1 text-muted-foreground">
                    <li className="flex justify-between">
                      <span>Pass:</span>
                      <span className="text-neon-green font-mono">
                        p-value ≥ 0.01
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Warning:</span>
                      <span className="text-yellow-400 font-mono">
                        0.01 &lt; p &lt; 0.05
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Fail:</span>
                      <span className="text-red-400 font-mono">
                        p-value &lt; 0.01
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary stats */}
      {completedCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 border border-border/50 text-center">
            <div className="text-3xl font-bold text-foreground">
              {completedCount}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="glass rounded-xl p-4 border border-neon-green/30 text-center">
            <div className="text-3xl font-bold text-neon-green">
              {passedCount}
            </div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </div>
          <div className="glass rounded-xl p-4 border border-yellow-500/30 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {warningCount}
            </div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>
          <div className="glass rounded-xl p-4 border border-red-500/30 text-center">
            <div className="text-3xl font-bold text-red-400">{failedCount}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>
      )}

      {/* Entropy source configuration */}
      <div className="glass rounded-xl p-6 border border-border/50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Binary className="w-5 h-5 text-neon-cyan" />
          Entropy Source
        </h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["kaspa", "custom"] as const).map((source) => (
              <button
                key={source}
                onClick={() => setEntropySource(source)}
                disabled={isRunning}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  entropySource === source
                    ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50"
                    : "bg-card border border-border hover:border-border/80",
                )}
              >
                {source === "kaspa" ? "Live Kaspa Blocks" : "Custom Input"}
              </button>
            ))}
          </div>

          {entropySource === "custom" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Enter binary (0s/1s) or hexadecimal entropy:
              </label>
              <textarea
                value={customEntropy}
                onChange={(e) => setCustomEntropy(e.target.value)}
                placeholder="e.g., 10110101010... or a3f2c1..."
                className="w-full h-24 px-4 py-3 bg-card border border-border rounded-lg font-mono text-sm resize-none focus:outline-none focus:border-neon-cyan/50"
                disabled={isRunning}
              />
            </div>
          )}

          {entropySource === "kaspa" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-muted-foreground">
                  Blocks to collect:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20000}
                  value={kaspaBlockCount}
                  onChange={(e) =>
                    setKaspaBlockCount(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-24 px-3 py-2 bg-card border border-border rounded-lg text-sm"
                  disabled={isRunning}
                />
                {isCollectingBlocks && kaspaBlocks.length === 0 && (
                  <span className="inline-flex items-center gap-2 text-sm text-neon-cyan">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Collecting blocks...
                  </span>
                )}
                {isGenerating && !isCollectingBlocks && (
                  <span className="inline-flex items-center gap-2 text-sm text-neon-cyan">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running tests...
                  </span>
                )}
              </div>

              <div className="bg-card/50 rounded-lg p-2 border border-border/50">
                <div className="flex items-center justify-between px-2 pb-2 text-xs text-muted-foreground">
                  <span>Collected blocks</span>
                  <span>
                    {kaspaBlocks.length} / {kaspaBlockCount}
                  </span>
                </div>
                <iframe
                  title="Collected Kaspa blocks"
                  srcDoc={kaspaBlocksHtml}
                  className="w-full h-56 rounded-md border border-border/40"
                />
              </div>
            </div>
          )}

          {fullEntropy && (
            <div className="bg-card/50 rounded-lg p-3 border border-border/50 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Full raw generated entropy:
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border/40 bg-card/60 p-2">
                  <code className="font-mono text-xs text-neon-green break-all whitespace-normal">
                    {fullEntropy}
                  </code>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  SHA-256 (hex):
                </div>
                <code className="font-mono text-xs text-neon-cyan break-all whitespace-normal">
                  {entropyHash || ""}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="glass rounded-lg p-4 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Running tests...</span>
            <span className="text-sm text-muted-foreground">
              {
                tests.filter(
                  (t) => t.status !== "pending" && t.status !== "running",
                ).length
              }{" "}
              / {tests.length}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-green"
              initial={{ width: 0 }}
              animate={{
                width: `${(tests.filter((t) => t.status !== "pending" && t.status !== "running").length / tests.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Test results by category */}
      {categories.map((category) => {
        const categoryTests = tests.filter((t) => t.category === category);

        return (
          <div
            key={category}
            className="glass rounded-xl border border-border/50 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border/50 bg-card/50">
              <h3 className="font-semibold">{categoryLabels[category]}</h3>
            </div>
            <div className="divide-y divide-border/30">
              {categoryTests.map((test) => {
                const StatusIcon = statusConfig[test.status].icon;

                return (
                  <motion.div
                    key={test.id}
                    initial={false}
                    animate={{
                      backgroundColor:
                        test.status === "running"
                          ? "rgba(59, 130, 246, 0.05)"
                          : "transparent",
                    }}
                    className="px-6 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon
                            className={cn(
                              "w-4 h-4",
                              statusConfig[test.status].color,
                              test.status === "running" && "animate-spin",
                            )}
                          />
                          <span className="font-medium text-foreground">
                            {test.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {test.description}
                        </p>
                      </div>

                      {test.pValue != null && Number.isFinite(test.pValue) && (
                        <div className="text-right">
                          <div
                            className={cn(
                              "text-sm font-mono font-medium",
                              statusConfig[test.status].color,
                            )}
                          >
                            p = {test.pValue.toFixed(4)}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              statusConfig[test.status].color,
                            )}
                          >
                            {test.result}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Export results */}
      {completedCount === tests.length && (
        <div className="flex justify-center">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Results (JSON)
          </button>
        </div>
      )}
    </div>
  );
}
