"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  Server,
  CloudOff,
  TrendingUp,
  Calculator,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Gamepad2,
  Info,
} from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "../animations";
import { cn } from "@/lib/utils";

const costComparisons = [
  {
    title: "Traditional Cloud Hosting",
    icon: Server,
    costs: [
      { label: "Monthly server costs", value: "$50-500+", negative: true },
      { label: "Bandwidth overage fees", value: "Variable", negative: true },
      { label: "Idle server charges", value: "24/7 billing", negative: true },
      { label: "Viral spike protection", value: "None", negative: true },
    ],
    warning: "A game going viral overnight could mean a $10,000+ surprise bill",
    gradient: "from-red-500/20 to-orange-500/20",
    borderColor: "border-red-500/30",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
  },
  {
    title: "Kaspa Network",
    icon: Coins,
    costs: [
      { label: "Monthly server costs", value: "$0", negative: false },
      { label: "Bandwidth fees", value: "$0", negative: false },
      { label: "Idle time charges", value: "$0", negative: false },
      { label: "Viral spike protection", value: "Built-in", negative: false },
    ],
    highlight:
      "Pay only for actual gameplay—approximately 0.062 KAS per 3-minute game",
    gradient: "from-primary/20 to-secondary/20",
    borderColor: "border-primary/30",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
  },
];

const mathBreakdown = {
  costPerGame: 0.062,
  kasPrice: 0.03,
  get kasPerDollar() {
    return 1 / this.kasPrice;
  },
  get gamesPerDollar() {
    return Math.floor(this.kasPerDollar / this.costPerGame);
  },
  get hoursPerDollar() {
    return ((this.gamesPerDollar * 3) / 60).toFixed(1);
  },
};

const benefits = [
  {
    icon: CloudOff,
    title: "Zero Infrastructure Costs",
    description:
      "No servers to rent, no bandwidth to pay for. The Kaspa network handles everything.",
    stat: "$0/month",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: TrendingUp,
    title: "Scales with Demand",
    description:
      "Whether you have 10 players or 10,000, your costs stay proportional. No surprise bills.",
    stat: "Linear scaling",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Censorship Resistant",
    description:
      "Your game runs on a decentralized network. No single entity can shut it down.",
    stat: "Unstoppable",
    gradient: "from-purple-500 to-violet-500",
  },
];

function CostComparisonCard({
  comparison,
  index,
}: {
  comparison: (typeof costComparisons)[0];
  index: number;
}) {
  const Icon = comparison.icon;
  const isKaspa = index === 1;

  return (
    <motion.div whileHover={{ y: -5 }} className="h-full">
      <div
        className={cn(
          "h-full rounded-2xl p-6 lg:p-8 border transition-all duration-300",
          comparison.borderColor,
          `bg-gradient-to-br ${comparison.gradient}`,
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              comparison.iconBg,
            )}
          >
            <Icon className={cn("w-7 h-7", comparison.iconColor)} />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {comparison.title}
          </h3>
        </div>

        {/* Cost items */}
        <div className="space-y-3 mb-6">
          {comparison.costs.map((cost, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/30"
            >
              <span className="text-muted-foreground text-sm">
                {cost.label}
              </span>
              <span
                className={cn(
                  "font-semibold text-sm",
                  cost.negative ? "text-red-400" : "text-primary",
                )}
              >
                {cost.negative ? (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {cost.value}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {cost.value}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Warning or Highlight */}
        {comparison.warning && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{comparison.warning}</p>
          </div>
        )}
        {comparison.highlight && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-primary">{comparison.highlight}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MathCard() {
  return (
    <div className="glass rounded-2xl p-8 border border-primary/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">The Math</h3>
          <p className="text-sm text-muted-foreground">
            What does gameplay actually cost?
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-muted/30">
          <p className="text-3xl font-bold text-primary mb-1">
            ~{mathBreakdown.costPerGame}
          </p>
          <p className="text-xs text-muted-foreground">KAS per 3-min game</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/30">
          <p className="text-3xl font-bold text-secondary mb-1">
            ${mathBreakdown.kasPrice}
          </p>
          <p className="text-xs text-muted-foreground">Price per KAS</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/30">
          <p className="text-3xl font-bold text-neon-cyan mb-1">
            ~{mathBreakdown.gamesPerDollar}
          </p>
          <p className="text-xs text-muted-foreground">Games per $1</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-muted/30">
          <p className="text-3xl font-bold text-neon-green mb-1">
            ~{mathBreakdown.hoursPerDollar}h
          </p>
          <p className="text-xs text-muted-foreground">Playtime per $1</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Gamepad2 className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Bottom Line</span>
        </div>
        <p className="text-muted-foreground text-sm">
          With just <span className="text-primary font-semibold">$1</span>,
          players can enjoy approximately{" "}
          <span className="text-primary font-semibold">
            {mathBreakdown.gamesPerDollar} full 3-minute games
          </span>
          —that's{" "}
          <span className="text-secondary font-semibold">
            ~{mathBreakdown.hoursPerDollar} hours
          </span>{" "}
          of gameplay. No subscriptions, no hidden fees.
        </p>
      </div>
    </div>
  );
}

function BenefitCard({
  benefit,
  index,
}: {
  benefit: (typeof benefits)[0];
  index: number;
}) {
  const Icon = benefit.icon;

  return (
    <motion.div whileHover={{ y: -5 }} className="h-full">
      <div className="h-full glass rounded-xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300">
        <div
          className={cn(
            "w-14 h-14 rounded-xl mb-5 flex items-center justify-center bg-gradient-to-br",
            benefit.gradient,
          )}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="text-2xl font-bold text-primary mb-2">
          {benefit.stat}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {benefit.title}
        </h3>
        <p className="text-muted-foreground text-sm">{benefit.description}</p>
      </div>
    </motion.div>
  );
}

export function EconomicsSection() {
  return (
    <section id="economics" className="section relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-kaspa-secondary/10 to-background" />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Zero Infrastructure Costs
            </span>
          </div>

          <h2 className="section-title mb-4">
            Game Dev{" "}
            <span className="font-bold">
              <span className="text-primary">Economics</span>
            </span>
          </h2>
          <p className="section-subtitle mx-auto">
            Traditional game servers drain your wallet 24/7. With{" "}
            <span className="text-primary">ꓘ</span>
            <span className="text-secondary">K</span>, you pay nothing to host.
            Players only pay micro-amounts of KAS when they actually play.
          </p>
        </ScrollReveal>

        {/* Cost Comparison */}
        <div className="grid lg:grid-cols-2 gap-6 mb-16">
          {costComparisons.map((comparison, index) => (
            <ScrollReveal key={comparison.title} delay={index * 0.1}>
              <CostComparisonCard comparison={comparison} index={index} />
            </ScrollReveal>
          ))}
        </div>

        {/* Math Breakdown */}
        <ScrollReveal className="mb-16">
          <MathCard />
        </ScrollReveal>

        {/* Benefits Grid */}
        <StaggerContainer className="grid md:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <StaggerItem key={benefit.title}>
              <BenefitCard benefit={benefit} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Censorship Note */}
        <ScrollReveal>
          <div className="max-w-3xl mx-auto">
            <div className="glass rounded-2xl p-8 border border-primary/20 text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold font-display mb-4">
                Your Game Can't Be Shut Down
              </h3>
              <p className="text-muted-foreground mb-6">
                Once deployed, your game runs on Kaspa's decentralized network.
                No company, government, or third party can take it offline. Your
                game logic executes peer-to-peer, making it truly
                censorship-resistant.
              </p>
              <div className="grid gap-4 text-left">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                  <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Note:</span>{" "}
                    Kaspa Kinesis is a neutral, non-custodial gaming protocol. It
                    facilitates the cryptographic synchronization of game state
                    via the Kaspa BlockDAG. The developers do not have custody
                    of user assets, do not facilitate financial wagering, and
                    have no technical ability to alter or revert on-chain game
                    data. By using this software, users acknowledge they are
                    operating in a peer-to-peer, self-sovereign environment.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                  <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Note:</span>{" "}
                    The dev still has to distribute the game, but there are
                    several free platforms to do so such as{" "}
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      GitHub
                    </a>
                    ,{" "}
                    <a
                      href="https://www.bittorrent.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      BitTorrent Network
                    </a>
                    ,{" "}
                    <a
                      href="https://itch.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      itch.io
                    </a>
                    , or{" "}
                    <a
                      href="https://ipfs.tech"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      IPFS
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
