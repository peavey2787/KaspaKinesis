"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { KKGameEngine, GameEvent } from "@/kktp/kkGameEngine.js";
import { kaspaPortal } from "@/kktp/engine/kaspa/kaspaPortal.js";

type ChatMessage = {
  id: number;
  from: "me" | "peer" | "system";
  text: string;
  timestamp: Date;
};

type DiscoveryItem = {
  id: string;
  label: string;
  raw: any;
};

type LobbyDiscoveryController = {
  stop?: () => void;
};

type WalletOption = {
  id: string;
  label: string;
  value: string;
};


export function RelayVisualizer() {
  const lastWalletKey = "kktp.lastWallet";
  const [walletName, setWalletName] = useState("");
  const [walletPassword, setWalletPassword] = useState("");
  const [networkId, setNetworkId] = useState("testnet-10");
  const [rpcEndpoint, setRpcEndpoint] = useState("");
  const [displayName, setDisplayName] = useState(
    () => `Player-${Math.random().toString(36).slice(2, 6)}`,
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addressCopyState, setAddressCopyState] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  const [joinCodeCopyState, setJoinCodeCopyState] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");

  const [lobbyName, setLobbyName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [hostResult, setHostResult] = useState<{
    lobbyId: string | null;
    joinCode: string | null;
  } | null>(null);

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>([]);
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState<string | null>(
    null,
  );

  const [joinCode, setJoinCode] = useState("");
  const [isInLobby, setIsInLobby] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [isHostingLobby, setIsHostingLobby] = useState(false);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  const messageIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const discoveryRef = useRef<LobbyDiscoveryController | null>(null);
  const gameRef = useRef<KKGameEngine | null>(null);
  if (!gameRef.current) {
    gameRef.current = new KKGameEngine();
  }
  const kkGame = gameRef.current;

  // Wallet selection state
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [engineReady, setEngineReady] = useState(false); // Track if engine is alive
  const [lastWallet, setLastWallet] = useState<string>("");

  const normalizeBalance = useCallback((value: unknown) => {
    if (typeof value === "bigint") {
      return Number(value) / 100_000_000;
    }
    if (typeof value === "string" && value.trim() !== "") {
      // wallet_service returns sompiToKaspaString() which is comma-formatted
      // (e.g. "1,000.1234"). Strip commas so Number() can parse it.
      const cleaned = value.replace(/,/g, "");
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    return null;
  }, []);


  // 1. Define how to fetch wallets as a reusable callback
  const fetchWallets = useCallback(async (options?: {
    networkId?: string;
    rpcUrl?: string;
  }) => {
    const bootstrapWalletName = "__kk_wallets_bootstrap__";
    const bootstrapPassword = "__kk_wallets_bootstrap_pw__";
    const effectiveNetworkId = options?.networkId || networkId;
    const effectiveRpcUrl = options?.rpcUrl;

    const listAndSet = async () => {
      const list = await kaspaPortal.getAllWallets();
      console.log("✅ [kaspaPortal] Wallets found:", list);
      if (Array.isArray(list)) {
        const options = list
          .map((item: any, index: number) => {
            const filename =
              typeof item === "string" ? item : item?.filename || item?.title;
            const label =
              typeof item === "string"
                ? item
                : item?.title || item?.filename || `Wallet ${index + 1}`;
            if (!filename) return null;
            return {
              id: `${filename}-${index}`,
              label,
              value: filename,
            };
          })
          .filter(
            (option): option is WalletOption =>
              option !== null && option.value !== bootstrapWalletName,
          );
        setWallets(options as WalletOption[]);
      }
    };

    try {
      console.log("📂 [kaspaPortal] Fetching wallet list...");
      await kaspaPortal.init();
      await listAndSet();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Wallet not initialized")) {
        try {
          await kaspaPortal.connect({
            networkId: effectiveNetworkId,
            rpcUrl: effectiveRpcUrl,
            startIntelligence: true,
          });
          await listAndSet();
          return;
        } catch (connectErr) {
          console.error("❌ [kaspaPortal] Failed to connect for wallets:", connectErr);
        }
        try {
          await kaspaPortal.createOrOpenWallet({
            password: bootstrapPassword,
            walletFilename: bootstrapWalletName,
          });
          await listAndSet();
          return;
        } catch (initErr) {
          console.error("❌ [kaspaPortal] Failed to bootstrap wallet list:", initErr);
          return;
        }
      }
      console.error("❌ [kaspaPortal] Failed to list wallets:", err);
    }
  }, [networkId]);

  // 2. Main Boot Sequence
  useEffect(() => {
    const storedWallet = typeof window !== "undefined"
      ? window.localStorage.getItem(lastWalletKey) || ""
      : "";
    if (storedWallet) {
      setLastWallet(storedWallet);
    }
    const bootEngine = async () => {
      try {
        console.log("🚀 [kkGameEngine] Pre-initializing system hooks...");
        setEngineReady(true);
      } catch (err) {
        console.error("💀 [kkGameEngine] Critical boot failure:", err);
      }
    };
    bootEngine();
  }, []);

  useEffect(() => {
    if (!walletName) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(lastWalletKey, walletName);
    setLastWallet(walletName);
  }, [walletName]);

  useEffect(() => {
    if (!lastWallet || walletName) return;
    const match = wallets.find((wallet) => wallet.value === lastWallet);
    if (match) {
      setWalletName(match.value);
    }
  }, [lastWallet, walletName, wallets]);

  // (Wallets are now loaded by fetchWallets in the boot sequence)

  const pushChatMessage = useCallback(
    (from: ChatMessage["from"], text: string, timestamp?: Date) => {
      messageIdRef.current += 1;
      setChatMessages((prev) => [
        ...prev,
        {
          id: messageIdRef.current,
          from,
          text,
          timestamp: timestamp ?? new Date(),
        },
      ]);
    },
    [],
  );

  const normalizeIncomingChat = useCallback((msg: any) => {
    const fromJsonString = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    };

    const fromObject = (value: any) => {
      const senderName =
        value?.senderName ||
        value?.displayName ||
        value?.name ||
        value?.from ||
        null;
      const body =
        value?.text ??
        value?.plaintext ??
        value?.message ??
        value?.content ??
        null;

      const tsRaw = value?.timestamp ?? value?.time ?? null;
      const ts =
        typeof tsRaw === "number"
          ? new Date(tsRaw)
          : typeof tsRaw === "string" && tsRaw.trim() !== ""
            ? new Date(Number.isFinite(Number(tsRaw)) ? Number(tsRaw) : tsRaw)
            : null;

      if (typeof body === "string" && body.trim() !== "") {
        return {
          text: senderName ? `${senderName}: ${body}` : body,
          timestamp: ts ?? new Date(),
        };
      }

      // Fallback: show something readable without spamming huge JSON.
      const fallback =
        senderName && typeof senderName === "string"
          ? `${senderName}: [message]`
          : "[message]";
      return { text: fallback, timestamp: ts ?? new Date() };
    };

    if (typeof msg === "string") {
      const parsed = fromJsonString(msg);
      if (parsed) return fromObject(parsed);
      return { text: msg, timestamp: new Date() };
    }

    if (msg && typeof msg === "object") {
      return fromObject(msg);
    }

    return { text: String(msg), timestamp: new Date() };
  }, []);

  const Spinner = ({ label }: { label?: string }) => (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-label={label ?? "Loading"}
      />
    </span>
  );

  const copyText = useCallback(async (text: string) => {
    if (!text) return false;

    // Prefer modern async clipboard API.
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to legacy method.
    }

    // Legacy fallback (works in more WebViews / older mobile browsers).
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.left = "-1000px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    setAddressCopyState("copying");
    const ok = await copyText(address);
    setAddressCopyState(ok ? "copied" : "error");
    window.setTimeout(() => setAddressCopyState("idle"), 1500);
  }, [address, copyText]);

  const copyJoinCode = useCallback(async () => {
    const code = hostResult?.joinCode || joinCode;
    if (!code) return;
    setJoinCodeCopyState("copying");
    const ok = await copyText(code);
    setJoinCodeCopyState(ok ? "copied" : "error");
    window.setTimeout(() => setJoinCodeCopyState("idle"), 1500);
  }, [copyText, hostResult?.joinCode, joinCode]);

  const resolveRpcUrl = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.includes("://")) return trimmed;
    return `ws://${trimmed}`;
  }, []);

  const connectKaspa = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const rpcUrl = resolveRpcUrl(rpcEndpoint);
      await kaspaPortal.init();
      await kaspaPortal.connect({
        networkId,
        rpcUrl,
        startIntelligence: true,
      });
      setIsConnected(true);
      await fetchWallets({ networkId, rpcUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [fetchWallets, networkId, resolveRpcUrl, rpcEndpoint]);

  // 3. Modify your existing initWallet to refresh the list (in case they just created a new one)
  const initWallet = useCallback(async () => {
    setError(null);
    setIsInitializing(true);
    try {
      const result = await kkGame.init({
        password: walletPassword,
        walletName,
        onBalanceChange: (nextBalance: number) => {
          const normalized = normalizeBalance(nextBalance);
          if (normalized !== null) {
            setBalance(normalized);
          }
        },
      });
      setAddress(result.address.toString());
      const normalizedResult = normalizeBalance(result.balance);
      if (normalizedResult !== null) {
        setBalance(normalizedResult);
      }
      setIsReady(true);
      // Refresh the list after a successful init/creation
      await fetchWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize wallet");
    } finally {
      setIsInitializing(false);
    }
  }, [walletPassword, walletName, fetchWallets, normalizeBalance]);

  useEffect(() => {
    if (!isReady) return;
    const handleBalance = (data: any) => {
      const normalized = normalizeBalance(data?.balance ?? data);
      if (normalized !== null) {
        setBalance(normalized);
      }
    };

    kkGame.on(GameEvent.BALANCE_CHANGED, handleBalance);
    return () => {
      kkGame.off(GameEvent.BALANCE_CHANGED, handleBalance);
    };
  }, [isReady, normalizeBalance]);

  const refreshBalance = useCallback(async () => {
    try {
      const nextBalance = await kkGame.getBalance();
      const normalized = normalizeBalance(nextBalance);
      if (normalized !== null) {
        setBalance(normalized);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh balance",
      );
    }
  }, [normalizeBalance]);

  const hostLobby = useCallback(async () => {
    setError(null);
    setIsHostingLobby(true);
    try {
      // KKGameEngine supports displayName, but the TS type for createLobby()
      // in this demo is narrower than the runtime implementation.
      const result = await kkGame.createLobby({
        name: lobbyName || "KKTP Lobby",
        maxPlayers,
        displayName: displayName.trim() || undefined,
      } as any);
      setHostResult({
        lobbyId: result.lobbyId ?? null,
        joinCode: result.joinCode ?? null,
      });
      if (result.joinCode) {
        setJoinCode(result.joinCode);
      }
      setIsInLobby(kkGame.isInLobby());
      setIsInLobby(true);
      pushChatMessage(
        "system",
        `Lobby hosted. Join code: ${result.joinCode ?? "unknown"}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to host lobby";
      setError(message);
    } finally {
      setIsHostingLobby(false);
    }
  }, [kkGame, lobbyName, maxPlayers, displayName, pushChatMessage]);

  const normalizeDiscoveries = useCallback((results: any): DiscoveryItem[] => {
    if (!results) return [];
    const list = Array.isArray(results)
      ? results
      : results.lobbies || results.results || results.items || [];

    return list.map((item: any, index: number) => {
      const id = item.lobbyId || item.id || item.joinCode || `lobby-${index}`;
      const label =
        item.name ||
        item.lobbyName ||
        item.joinCode ||
        item.lobbyId ||
        `Lobby ${index + 1}`;
      return { id, label, raw: item };
    });
  }, []);

  const startDiscovery = useCallback(async () => {
    setError(null);
    setIsDiscovering(true);
    try {
      const resultsBuffer: DiscoveryItem[] = [];
      const unsubscribe = kkGame.searchLobbies((lobby: any) => {
        resultsBuffer.push(...normalizeDiscoveries([lobby]));
        const deduped = new Map(resultsBuffer.map((item) => [item.id, item]));
        setDiscoveries(Array.from(deduped.values()));
      });
      discoveryRef.current = {
        stop: () => {
          (unsubscribe as (() => void) | undefined)?.();
        },
      };
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start discovery",
      );
      setIsDiscovering(false);
    }
  }, [normalizeDiscoveries]);

  const stopDiscovery = useCallback(() => {
    discoveryRef.current?.stop?.();
    discoveryRef.current = null;
    setIsDiscovering(false);
  }, []);

  const joinLobby = useCallback(async () => {
    setError(null);
    setIsJoiningLobby(true);
    try {
      const selected = discoveries.find(
        (item) => item.id === selectedDiscoveryId,
      );
      const lobbyOrCode = selected?.raw || joinCode;
      if (!lobbyOrCode) {
        setError("Provide a join code or select a discovered lobby");
        return;
      }
      await kkGame.joinLobby(lobbyOrCode, displayName);
      setIsInLobby(true);
      pushChatMessage("system", "Joined lobby. You can start chatting now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join lobby");
    } finally {
      setIsJoiningLobby(false);
    }
  }, [
    kkGame,
    discoveries,
    selectedDiscoveryId,
    joinCode,
    displayName,
    pushChatMessage,
  ]);

  const leaveLobby = useCallback(async () => {
    try {
      await kkGame.leaveLobby("user-left");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave lobby");
    } finally {
      setIsInLobby(false);
      setChatMessages([]);
    }
  }, []);

  const sendChat = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatInput("");
    pushChatMessage("me", trimmed);
    setIsSendingChat(true);
    try {
      await kkGame.sendLobbyMessage(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSendingChat(false);
    }
  }, [kkGame, chatInput, pushChatMessage]);

  useEffect(() => {
    if (!isReady) return;
    const handleMessage = (msg: any) => {
      const normalized = normalizeIncomingChat(msg);
      pushChatMessage("peer", normalized.text, normalized.timestamp);
    };
    const handleJoin = (member: any) => {
      pushChatMessage(
        "system",
        `${member?.name || "A player"} joined the lobby`,
      );
    };
    const handleLeave = (member: any) => {
      pushChatMessage("system", `${member?.name || "A player"} left the lobby`);
    };

    const syncLobbyState = () => {
      setIsInLobby(kkGame.isInLobby());
    };

    kkGame.on(GameEvent.MESSAGE_RECEIVED, handleMessage);
    kkGame.on(GameEvent.PLAYER_JOINED, handleJoin);
    kkGame.on(GameEvent.PLAYER_LEFT, handleLeave);
    kkGame.on(GameEvent.LOBBY_UPDATED, syncLobbyState);
    kkGame.on(GameEvent.LOBBY_CLOSED, syncLobbyState);

    return () => {
      kkGame.off(GameEvent.MESSAGE_RECEIVED, handleMessage);
      kkGame.off(GameEvent.PLAYER_JOINED, handleJoin);
      kkGame.off(GameEvent.PLAYER_LEFT, handleLeave);
      kkGame.off(GameEvent.LOBBY_UPDATED, syncLobbyState);
      kkGame.off(GameEvent.LOBBY_CLOSED, syncLobbyState);
    };
  }, [isReady, normalizeIncomingChat, pushChatMessage]);

  useEffect(() => {
    if (!isInLobby) return;
    chatEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [isInLobby, chatMessages.length]);

  useEffect(() => {
    return () => {
      stopDiscovery();
    };
  }, [stopDiscovery]);

  useEffect(() => {
    return () => {
      void kkGame.shutdown().catch(() => undefined);
    };
  }, [kkGame]);

  return (
    <div className="space-y-8">
      <section className="glass rounded-xl p-6 border border-border/50 space-y-4">
        <h2 className="text-lg font-semibold">Connection</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Direct RPC (ip:port)
            </label>
            <input
              value={rpcEndpoint}
              onChange={(e) => setRpcEndpoint(e.target.value)}
              className="w-full input"
              placeholder="127.0.0.1:16110"
              style={{ color: "#0d9488" }}
              disabled={isConnecting || isConnected}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use public nodes/resolver.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Network ID</label>
            <select
              className="w-full input"
              style={{ color: "#0d9488" }}
              value={networkId}
              onChange={(e) => setNetworkId(e.target.value)}
              disabled={isConnecting || isConnected}
            >
              <option value="mainnet">Mainnet</option>
              <option value="testnet-10">Testnet-10</option>
              <option value="devnet">Devnet</option>
              <option value="simnet">Simnet</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={connectKaspa}
              className="btn-primary w-full whitespace-nowrap"
              disabled={isConnecting || isConnected}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isConnecting && <Spinner label="Connecting to Kaspa" />}
                {isConnecting
                  ? "Connecting to Kaspa..."
                  : isConnected
                    ? "Connected"
                    : "Connect"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {isConnected && (
        <section className="glass rounded-xl p-6 border border-border/50 space-y-4">
          <h2 className="text-lg font-semibold">Wallet</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              {wallets.length > 0 && (
                <div className="mb-2">
                  <label className="text-sm text-muted-foreground">
                    Select Existing Wallet
                  </label>
                  <select
                    className="w-full input"
                    style={{ color: "#0d9488" }}
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                  >
                    <option value="">-- Choose a wallet --</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.value}>
                        {wallet.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="text-sm text-muted-foreground">Wallet Name</label>
              <input
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="w-full input"
                placeholder="my-wallet"
                style={{ color: "#0d9488" }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Wallet Password
              </label>
              <input
                type="password"
                value={walletPassword}
                onChange={(e) => setWalletPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!isInitializing && walletName && walletPassword) {
                      void initWallet();
                    }
                  }
                }}
                className="w-full input"
                placeholder="password"
                style={{ color: "#0d9488" }}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={initWallet}
                className="btn-primary w-full whitespace-nowrap"
                disabled={isInitializing || !walletName || !walletPassword}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isInitializing && <Spinner label="Initializing wallet" />}
                  {isInitializing ? "Initializing..." : "Initialize Wallet"}
                </span>
              </button>
              <button
                onClick={refreshBalance}
                className="btn-secondary"
                disabled={!isReady}
              >
                Refresh Balance
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">Address</div>
              <div className="mt-1 flex items-start justify-between gap-3">
                <div className="font-mono break-all text-sm">
                  {address || "Not initialized"}
                </div>
                <button
                  type="button"
                  onClick={copyAddress}
                  disabled={!address || addressCopyState === "copying"}
                  className="btn-secondary shrink-0"
                  aria-label="Copy wallet address"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {addressCopyState === "copying" && (
                      <Spinner label="Copying address" />
                    )}
                    {addressCopyState === "copied"
                      ? "Copied"
                      : addressCopyState === "error"
                        ? "Copy failed"
                        : "Copy"}
                  </span>
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Copy this address, then visit the{" "}
                <a
                  href="https://faucet-tn10.kaspanet.io"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:opacity-80"
                >
                  testnet-10 faucet
                </a>{" "}
                to get coins.
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">Balance (KAS)</div>
              <div className="text-xl font-semibold">
                {balance !== null ? balance.toFixed(4) : "--"}
              </div>
            </div>
          </div>
        </section>
      )}

      {isReady && (
        <section className="glass rounded-xl p-6 border border-border/50 space-y-4">
          <h2 className="text-lg font-semibold">Username</h2>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Username:</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full input"
              placeholder="Player name"
              style={{ color: "#0d9488" }}
            />
          </div>
        </section>
      )}

      {isReady && (
        <section className="glass rounded-xl p-6 border border-border/50 space-y-6">
          <h2 className="text-lg font-semibold">Lobbies</h2>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium">Host a Lobby</h3>
              <input
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                className="w-full input"
                placeholder="Lobby name"
                disabled={!isReady}
                style={{ color: "#0d9488" }}
              />
              <input
                type="number"
                min={2}
                max={8}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full input"
                disabled={!isReady}
                style={{ color: "#0d9488" }}
              />
              <button
                onClick={hostLobby}
                className="btn-primary w-full"
                disabled={!isReady || isHostingLobby}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isHostingLobby && <Spinner label="Hosting lobby" />}
                  {isHostingLobby ? "Hosting..." : "Host a Lobby"}
                </span>
              </button>
              {hostResult && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="break-all">
                    <span className="font-medium">Lobby ID:</span>{" "}
                    <span className="font-mono">{hostResult.lobbyId || "unknown"}</span>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1 break-all">
                      <span className="font-medium">Join Code:</span>{" "}
                      <span className="font-mono">
                        {hostResult.joinCode || "unknown"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyJoinCode}
                      disabled={
                        !hostResult.joinCode || joinCodeCopyState === "copying"
                      }
                      className="btn-secondary shrink-0 self-start"
                    >
                      {joinCodeCopyState === "copying"
                        ? "Copying..."
                        : joinCodeCopyState === "copied"
                          ? "Copied"
                          : joinCodeCopyState === "error"
                            ? "Copy failed"
                            : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Discover Lobbies</h3>
              <button
                onClick={isDiscovering ? stopDiscovery : startDiscovery}
                className="btn-secondary w-full"
                disabled={!isReady}
              >
                {isDiscovering ? "Stop Discovering" : "Discover Lobbies"}
              </button>
              <div className="rounded-lg border border-border/50 bg-card/40 p-2 max-h-56 overflow-y-auto">
                <div className="space-y-2">
                  {discoveries.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No lobbies found yet.
                    </div>
                  )}
                  {discoveries.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="lobby"
                        value={item.id}
                        checked={selectedDiscoveryId === item.id}
                        onChange={() => setSelectedDiscoveryId(item.id)}
                        disabled={!isReady}
                      />
                      <span className="text-base font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Join Lobby</h3>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="flex-1 input"
                  placeholder="Join code or lobby anchor"
                  disabled={!isReady}
                  style={{ color: "#0d9488" }}
                />
                <button
                  type="button"
                  onClick={copyJoinCode}
                  disabled={!joinCode || joinCodeCopyState === "copying"}
                  className="btn-secondary shrink-0"
                >
                  {joinCodeCopyState === "copying"
                    ? "Copying..."
                    : joinCodeCopyState === "copied"
                      ? "Copied"
                      : joinCodeCopyState === "error"
                        ? "Copy failed"
                        : "Copy"}
                </button>
              </div>
              <button
                onClick={joinLobby}
                className="btn-primary w-full"
                disabled={!isReady || isJoiningLobby}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isJoiningLobby && <Spinner label="Joining lobby" />}
                  {isJoiningLobby ? "Joining..." : "Join Lobby"}
                </span>
              </button>
              {isInLobby && (
                <button onClick={leaveLobby} className="btn-secondary w-full">
                  Leave Lobby
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {isInLobby && (
        <section className="glass rounded-xl p-6 border border-border/50 space-y-4">
          <h2 className="text-lg font-semibold">Lobby Chat</h2>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendChat();
                }
              }}
              className="flex-1 input"
              placeholder="Type a message"
              style={{ color: "#0d9488" }}
            />
            <button
              onClick={sendChat}
              className="btn-primary"
              disabled={!isInLobby || isSendingChat}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isSendingChat && <Spinner label="Sending message" />}
                {isSendingChat ? "Sending..." : "Send"}
              </span>
            </button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {chatMessages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No messages yet.
              </div>
            )}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.from === "me"
                    ? "bg-primary/10 text-primary ml-12"
                    : msg.from === "peer"
                      ? "bg-neon-green/10 text-neon-green mr-12"
                      : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="text-xs opacity-60">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
                <div>{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
