"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Shuffle,
  Radio,
  Database,
  ChevronRight,
  Box,
  ArrowRight,
  Circle,
  GitBranch,
  Cpu,
  Network,
} from "lucide-react";
import { ScrollReveal } from "../animations";
import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "overview",
    label: "High-Level Architecture",
    icon: Layers,
  },
  {
    id: "folding",
    label: "Recursive Folding",
    icon: Shuffle,
  },
  {
    id: "relay",
    label: "Kaspa Relay",
    icon: Radio,
  },
  {
    id: "state",
    label: "Deterministic State",
    icon: Database,
  },
];

function OverviewDiagram() {
  return (
    <div className="relative py-8">
      {/* Main flow diagram */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
        {/* Players */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-xl border border-primary/30 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-neon-cyan to-blue-500 flex items-center justify-center">
            <Network className="w-8 h-8 text-background" />
          </div>
          <h4 className="font-semibold text-foreground">Players</h4>
          <p className="text-sm text-muted-foreground mt-1">P2P Connected</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-primary"
        >
          <ArrowRight className="w-8 h-8 rotate-90 lg:rotate-180" />
          <ArrowRight className="w-8 h-8 rotate-90 lg:rotate-0" />
        </motion.div>

        {/* Kaspa Relay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6 rounded-xl border border-kaspa-primary/30 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-kaspa-primary to-neon-green flex items-center justify-center">
            <Radio className="w-8 h-8 text-background" />
          </div>
          <h4 className="font-semibold text-foreground">Kaspa Relay</h4>
          <p className="text-sm text-muted-foreground mt-1">DAG Mailbox</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-primary"
        >
          <ArrowRight className="w-8 h-8 rotate-90 lg:rotate-180" />
          <ArrowRight className="w-8 h-8 rotate-90 lg:rotate-0" />
        </motion.div>

        {/* Players */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-xl border border-primary/30 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-neon-cyan to-blue-500 flex items-center justify-center">
            <Network className="w-8 h-8 text-background" />
          </div>
          <h4 className="font-semibold text-foreground">Players</h4>
          <p className="text-sm text-muted-foreground mt-1">P2P Connected</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-primary"
        >
        </motion.div>
      </div>

      {/* Entropy pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-12 glass p-6 rounded-xl border border-border/50"
      >
        <h4 className="text-lg font-semibold mb-4 text-center">
          Entropy Pipeline
        </h4>
        <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-4 text-sm">
          <span className="tag tag-info">Blocks</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="tag">Recursive Folding</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="tag tag-success">VRF</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="tag bg-gradient-to-r from-neon-cyan/20 to-neon-green/20 border-primary/40">
            Game State
          </span>
        </div>
      </motion.div>

      {/* Key points */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 grid sm:grid-cols-2 gap-4"
      >
        {[
          "Kaspa serves as both randomness source and relay layer",
          "No centralized game servers required",
          "All state transitions are deterministic and reproducible",
          "Entropy is publicly auditable on-chain",
        ].map((point, i) => (
          <div key={i} className="flex items-start gap-3 p-4 glass rounded-lg">
            <Circle className="w-2 h-2 mt-2 flex-shrink-0 fill-primary text-primary" />
            <span className="text-muted-foreground">{point}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function FoldingDiagram() {
  return (
    <div className="py-8 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h4 className="text-xl font-semibold mb-3">
          Cryptographic Entropy Whitening
        </h4>
        <p className="text-muted-foreground">
          Recursive Folding takes raw PoW data from Kaspa blocks and applies
          iterative cryptographic mixing to produce statistically uniform,
          NIST-compliant random numbers.
        </p>
      </div>

      {/* Process flow */}
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-neon-cyan via-primary to-neon-green hidden lg:block" />

        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
          {[
            {
              title: "Block Hash Ingestion",
              desc: "Fetch Kaspa block hashes as primary entropy sources",
              step: 1,
            },
            {
              title: "Multi-Source Integration",
              desc: "Mix secondary entropy (QRNG/Bitcoin) with primary hash pool",
              step: 2,
            },
            {
              title: "Recursive Folding",
              desc: "Apply iterative mixing to achieve high-density entropy accumulation",
              step: 3,
            },
            {
              title: "Statistical Whitening",
              desc: "Perform Cryptographic Whitening via feedback-driven bit-level diffusion",
              step: 4,
            },
            {
              title: "NIST Validation",
              desc: "Pass output through SP 800-22 statistical test battery",
              step: 5,
            },
            {
              title: "VRF Proof Generation",
              desc: "Produce verifiable random value and cryptographic proof",
              step: 6,
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "glass p-5 rounded-xl border border-border/50",
                i % 2 === 0 ? "lg:text-right" : "",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-3",
                  i % 2 === 0 ? "lg:flex-row-reverse" : "",
                )}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <h5 className="font-semibold text-foreground">
                    {item.title}
                  </h5>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Properties */}
      <div className="glass p-6 rounded-xl border border-neon-green/30">
        <h4 className="font-semibold mb-4 text-neon-green">Key Properties</h4>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            Reproducible: Same input always produces same output
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            Unpredictable: Output cannot be predicted before block is mined
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            Verifiable: Anyone can verify the transformation
          </li>
        </ul>
      </div>
    </div>
  );
}

function RelayDiagram() {
  return (
    <div className="py-8 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h4 className="text-xl font-semibold mb-3">CGNAT↔CGNAT Connectivity</h4>
        <p className="text-muted-foreground">
          Kaspa is the relay and uses the BlockDAG as a decentralized mailbox,
          enabling peer discovery and NAT traversal without centralized
          infrastructure.
        </p>
      </div>

      {/* Connection diagram */}
      <div className="relative py-12">
        <div className="flex justify-center items-center gap-4 lg:gap-16">
          {/* Player A */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-white" />
            </div>
            <p className="font-semibold">Player A</p>
            <p className="text-xs text-muted-foreground">Behind CGNAT</p>
          </motion.div>

          {/* Connection visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 max-w-xs relative"
          >
            <div className="glass p-4 rounded-xl border border-kaspa-primary/30 text-center">
              <GitBranch className="w-8 h-8 mx-auto mb-2 text-kaspa-primary" />
              <p className="text-sm font-semibold">Kaspa DAG</p>
              <p className="text-xs text-muted-foreground">Mailbox Layer</p>
            </div>

            {/* Animated connection lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              style={{ left: "-50%", width: "200%" }}
            >
              <motion.path
                d="M 0 50% Q 25% 20%, 50% 50%"
                stroke="url(#gradientLeft)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <motion.path
                d="M 50% 50% Q 75% 80%, 100% 50%"
                stroke="url(#gradientRight)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
              />
              <defs>
                <linearGradient
                  id="gradientLeft"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#49eacb" />
                </linearGradient>
                <linearGradient
                  id="gradientRight"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#49eacb" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Player B */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Cpu className="w-10 h-10 text-white" />
            </div>
            <p className="font-semibold">Player B</p>
            <p className="text-xs text-muted-foreground">Behind CGNAT</p>
          </motion.div>
        </div>
      </div>

      {/* How it works */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: "Initiate",
            desc: "Player publishes connection intent to Kaspa",
          },
          {
            title: "Discover",
            desc: "Peers find each other through scanning/walking the Kaspa DAG or alternatively sharing the initiator block hash out of band",
          },
          {
            title: "Connect",
            desc: "Communication is done securely with End-to-End encryption on Kaspa",
          },
        ].map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="glass p-5 rounded-xl text-center"
          >
            <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-kaspa-primary/20 border border-kaspa-primary/50 flex items-center justify-center text-sm font-bold text-kaspa-primary">
              {i + 1}
            </div>
            <h5 className="font-semibold mb-1">{step.title}</h5>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StateDiagram() {
  return (
    <div className="py-8 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h4 className="text-xl font-semibold mb-3">
          Deterministic State & Anchoring
        </h4>
        <p className="text-muted-foreground">
          Game state is fully deterministic. Given the same seed and action
          sequence, any node can reconstruct the exact same state. Periodic
          anchoring to the DAG enables verification and replay.
        </p>
      </div>

      {/* Merkle tree visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass p-8 rounded-xl"
      >
        <h5 className="text-center font-semibold mb-6">
          Merkle Tree Structure
        </h5>

        <div className="flex flex-col items-center space-y-4">
          {/* Root */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-neon-purple to-pink-500 flex items-center justify-center">
            <Box className="w-8 h-8 text-white" />
          </div>
          <p className="text-xs text-muted-foreground">State Root</p>

          {/* Branches */}
          <div className="flex gap-8 lg:gap-16">
            {["Actions", "VRF Seeds", "Player States"].map((label, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-2 h-8 bg-gradient-to-b from-neon-purple to-primary" />
                <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Anchoring explanation */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-xl border border-neon-cyan/30">
          <h5 className="font-semibold mb-3 text-neon-cyan">
            Periodic Anchoring
          </h5>
          <p className="text-sm text-muted-foreground mb-4">
            State roots are periodically committed to the Kaspa DAG, creating
            immutable checkpoints that anyone can verify.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Every 500ms a heartbeat anchor is created</li>
            <li>• Merkle proof enables verification</li>
            <li>• Dispute resolution via on-chain data</li>
          </ul>
        </div>

        <div className="glass p-6 rounded-xl border border-neon-green/30">
          <h5 className="font-semibold mb-3 text-neon-green">
            Full Replayability
          </h5>
          <p className="text-sm text-muted-foreground mb-4">
            Given an anchor point and action log, anyone can replay the entire
            game session with bit-perfect accuracy.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Spectators can join mid-game</li>
            <li>• Post-game analysis and verification</li>
            <li>• Perfect for esports and tournaments</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ArchitectureSection() {
  const [activeTab, setActiveTab] = useState("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewDiagram />;
      case "folding":
        return <FoldingDiagram />;
      case "relay":
        return <RelayDiagram />;
      case "state":
        return <StateDiagram />;
      default:
        return <OverviewDiagram />;
    }
  };

  return (
    <section id="architecture" className="section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-kaspa-secondary/20 to-background" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <span className="tag mb-4 inline-block">Technical Deep Dive</span>
          <h2 className="section-title mb-4">
            How{' '}
            <span className="font-bold">
              <span className="text-primary">ꓘ</span>
              <span className="text-secondary">K</span>
            </span>{' '}
            Works
          </h2>
          <p className="section-subtitle mx-auto">
            Explore the technical architecture that makes provable, serverless
            multiplayer gaming possible.
          </p>
        </ScrollReveal>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-primary text-background shadow-glow-sm"
                  : "glass text-muted-foreground hover:text-foreground hover:bg-primary/10",
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="glass rounded-2xl p-6 lg:p-10 border border-border/50 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
