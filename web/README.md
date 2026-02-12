> ### 📍 Navigation
> * [🎮 KKGameEngine Guide](./kktp/README.md)
> * [🏛️ Kaspa Portal Guide](./kktp/engine/kaspa/FACADE_GUIDE.md)
> * [🔍 Intelligence Guide](./kktp/engine/kaspa/intelligence/README.md)
> * [🔍 Lobby Guide](./kktp/lobby/README.md)
> * [🔍 Low Level Guide](./kktp/engine/kaspa/LOW_LEVEL_SDK.md)
> * [📡 KKTP Protocol](./kktp/protocol/docs/KKTP_PROTOCOL.md)
> * [🎮 DAG Dasher Demo](./kktp/game/README.md)

# ꓘK Kaspa Kinesis Game Engine SDK

**Provable Randomness meets Decentralized Networking.**
ꓘK Kaspa Kinesis is a zero‑infrastructure multiplayer engine that transforms the Kaspa BlockDAG into an unstoppable, serverless backbone. It solves the two hardest problems in decentralized gaming: **trusted entropy** and **peer connectivity**, creating an environment that cannot be shut down or censored.

By leveraging the high‑speed **Kaspa BlockDAG** as both a randomness source and a global relay, ꓘK enables real‑time, fair, and auditable gameplay **without managed servers, matchmaking systems, or NAT‑traversal infrastructure**.

---

### 💎 Economic Viability
Kaspa is the only L1 capable of powering this solution at scale. With **10 blocks-per-second** throughput and near-zero fees, running a game is virtually free for developers and players:
* **Cost:** ~$0.00186 USD (~0.062 KAS where 1 Kas = $0.03) per 3-minute game session.
* **Speed:** Instant transaction inclusion via the GHOSTDAG protocol.

---

#### 🎮 Lobby & Matchmaking Demo
https://github.com/user-attachments/assets/7bda3c79-74a0-4924-b655-4f3de54a266d

#### 🛡️ Anti-Cheat Audit Demo
https://github.com/user-attachments/assets/93acede1-5807-4957-ba95-429684878714

---

# 🔧 Core Components

### 🌀 Recursive Folding
A novel entropy‑extraction method that mixes and whitens PoW artifacts into **NIST‑grade randomness**, producing unbiased, verifiable entropy suitable for fairness‑critical applications.

### 📡 Kaspa Relay
A decentralized “mailbox” communication layer that enables **CGNAT‑to‑CGNAT connectivity** without TURN/STUN servers. Players behind restrictive networks can connect directly through the Kaspa DAG, enabling true peer‑to‑peer multiplayer.

### 🛡️ Audit‑Ready by Design
All entropy inputs and folded outputs are fully public and reproducible, enabling anyone to run **NIST tests** or replay a match to verify fairness. The system is currently designed for **transparent, post‑hoc anomaly detection** rather than continuous real‑time monitoring.

---

# 🛡️ Security Stack

* **Forward Secrecy**: Automated key rotation ensures past sessions remain secure even if a device is compromised.
* **NIST-Grade Crypto**: Powered by **XChaCha20-Poly1305** and **Blake2b** for authenticated, high-speed encryption.
* **Anti-Replay & Integrity**: Strict **RFC 8785** compliance and state-root anchoring prevent message tampering and replay attacks.

<details>
<summary><b>🔍 View Full Protocol Specifications</b></summary>

### Technical Deep Dive
* **Key Derivation**: HKDF (HMAC-based Extract-and-Expand) for session key derivation and VRF for session binding.
* **Ephemeral Keys**: Group keys rotate every 10 minutes; DM sessions utilize per-contact baseIndex branches.
* **Modern Cryptography**: 256-bit AEAD (XChaCha20-Poly1305) and Blake2b for mailbox IDs and Merkle-like state roots.
* **Race Condition Handling**: Intelligent DM buffering, prefix subscriptions, and message deduplication.
* **Protocol Compliance**: Full schema validation and canonicalization (RFC 8785).

</details>

---

# 🚀 Getting Started

## Game Engine

Follow these steps to get the **Kaspa Kinesis** engine up and running on your local machine.

Download/clone this repo and copy the kktp folder to your new/existing project. Be sure to delete the contents of the "game" folder and place/build your game there or where ever you want.

Then import and start using it:

```JS
import { KKGameEngine } from "../kkGameEngine.js";
const game = new KKGameEngine();

await game.init({
  password: 'user-password',
  walletName: 'my-game-wallet',
  network: 'testnet-10',
});

await game.startGame({
  gameId: 'match-123',
  playerId: 'player-1',
});
```

## Run the Website with Demos

### Pre‑requisites

- [Visual Studio Code](https://code.visualstudio.com/)

### 1. Installation

First, clone the repository to your local machine:

```bash
git clone https://github.com/peavey2787/KaspaKinesis
```

### 2. Open the Project

Navigate to the project folder.

Right‑click the folder and select **"Open with Code"** to launch Visual Studio Code.

Open the integrated terminal inside VS Code. If not visible,
open with shortcut: Ctrl + Shift + \` or go to Terminal → New Terminal in the top menu


### 3. Launch the website

You must be inside the web directory to execute commands:

```bash
cd web
```

Then choose your desired environment:

| Environment | Command         | Use Case                                      |
|------------|-----------------|-----------------------------------------------|
| Development | `start run dev` | Real‑time debugging and hot‑reloading.        |
| Production  | `start run prod`| Optimized performance for final testing.      |

---

# 🤝 Contributing

Contributions are welcome to the Kaspa Kinesis game engine! To keep the codebase clean and the history manageable, please follow this workflow:

## 🛠️ Pull Request Process

Fork the repository to your own GitHub account.

Clone your fork locally and create a custom branch for your feature or fix:

```Bash
git checkout -b feature/your-feature-name
```

Commit your changes and push them to your fork.

Submit a Pull Request (PR) to the main repository for review.

## 📜 Coding Standards (Naming Conventions)
To maintain consistency across the engine, we adhere to the following rules:

Classes: Use PascalCase (e.g., KKGameEngine, EntropyGenerator).

Everything Else: Use camelCase for variables, functions, methods, filenames, and properties (e.g., startGame, playerWallet, init()).

# ☕ Support the Cause
If you find this work useful or want to support it:

kaspa:qpfsh8feaq5evaum5auq9c29fvjnun0mrzj5ht6sz3sz09ptcdaj6qjx9fkug
