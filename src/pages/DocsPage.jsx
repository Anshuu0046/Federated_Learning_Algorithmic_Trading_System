import { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    id: 'overview',
    icon: 'info',
    title: 'Project Overview',
    content: [
      {
        heading: 'What is Nexus Intelligence?',
        text: 'Nexus Intelligence is a research platform that demonstrates Federated Learning (FL) applied to stock market prediction. Instead of collecting all sensitive financial data into a single central server, FL allows individual nodes (clients) to train machine learning models locally on their own private data. Only the learned model parameters (weights/gradients) are shared with the central server — never the raw data itself.',
      },
      {
        heading: 'Why Federated Learning?',
        text: 'Traditional machine learning requires centralizing all training data, which creates massive privacy and security risks — especially in finance. Federated Learning solves this by keeping data where it originates. Each participant trains locally, and only mathematical summaries (model weights) are sent to the server for aggregation. This means better models without compromising data privacy.',
      },
      {
        heading: 'The Use Case: Stock Prediction',
        text: 'In our simulation, 5 client nodes each hold real historical price data for a major tech company (Apple, Alphabet, Tesla, Microsoft, Amazon). Each client trains a local model to recognize price patterns in their specific stock. The central server then aggregates these local models using Federated Averaging (FedAvg) to produce a single global model that benefits from insights across all 5 stocks — without any client ever sharing their raw trading data.',
      },
    ],
  },
  {
    id: 'architecture',
    icon: 'account_tree',
    title: 'System Architecture',
    content: [
      {
        heading: 'High-Level Architecture',
        text: 'The system follows a star topology: one central Aggregation Server connected to 5 Edge Client nodes. The server orchestrates training rounds and performs weight aggregation. Each client independently trains on its local dataset and reports only its updated model weights back to the server.',
      },
      {
        heading: 'Frontend (React + Vite)',
        text: 'The dashboard is built with React 19 and Vite. It uses Recharts for data visualization, Framer Motion for animations, and Tailwind CSS for styling. The entire FL simulation runs client-side in JavaScript, making it fully self-contained with no backend server needed for the demo.',
      },
      {
        heading: 'Simulation Engine',
        text: 'The core simulation lives in federatedEngine.js. It creates 5 client objects, each loaded with real Yahoo Finance stock data. When a training round is triggered, each client simulates local gradient descent (loss decay with noise), updates its weight vector, and sends it to the aggregator. The server then computes the Federated Average and distributes the new global weights back to all clients.',
      },
      {
        heading: 'Data Pipeline',
        text: 'Real historical stock data (OHLCV — Open, High, Low, Close, Volume) for AAPL, GOOGL, TSLA, MSFT, and AMZN is pre-fetched from Yahoo Finance and stored as a static JSON file (real_stock_data.json). The stockData.js module loads this data, generates predictions with noise, computes moving-average-based BUY/SELL/HOLD signals, and calculates cumulative returns.',
      },
    ],
  },
  {
    id: 'fedavg',
    icon: 'merge',
    title: 'FedAvg Algorithm',
    content: [
      {
        heading: 'What is Federated Averaging?',
        text: 'Federated Averaging (FedAvg), proposed by McMahan et al. (2017), is the foundational algorithm for Federated Learning. It works by having each client perform multiple steps of stochastic gradient descent (SGD) on their local data, then sending the resulting model weights to a central server. The server computes the arithmetic mean of all client weights to produce a new global model, which is then sent back to all clients for the next round.',
      },
      {
        heading: 'The Mathematical Process',
        text: 'Given N clients, each with local weights w₁, w₂, ..., wₙ after local training, the global weight update is: w_global = (1/N) × Σ wᵢ. In practice, this can be weighted by dataset size: w_global = Σ (nᵢ/n_total) × wᵢ, where nᵢ is the number of samples on client i. Our simulation uses equal weighting since all clients have comparable dataset sizes (~200 data points each).',
      },
      {
        heading: 'Training Round Lifecycle',
        list: [
          'Server broadcasts current global weights to all 5 clients',
          'Each client initializes its local model with the global weights',
          'Each client runs 10 epochs of local training on its own stock data',
          'Clients send their updated local weights back to the server',
          'Server computes FedAvg: averages all 5 weight vectors element-wise',
          'New global model is distributed → next round begins',
        ],
      },
      {
        heading: 'Convergence Behavior',
        text: 'As training rounds progress, the global loss decreases and global accuracy increases. The loss typically starts near 1.0 and converges toward 0.01–0.05 over 20 rounds. Each round benefits from the collective learning of all clients, achieving better generalization than any single client could alone — this is the core advantage of federated learning.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: 'shield',
    title: 'Privacy & Security',
    content: [
      {
        heading: 'Data Never Leaves the Client',
        text: 'The fundamental privacy guarantee of Federated Learning is that raw data never leaves the client node. In our system, each client\'s stock price data (OHLCV records) stays entirely local. The server only ever sees aggregated model weight vectors — numerical arrays that encode learned patterns but reveal nothing about the underlying data.',
      },
      {
        heading: 'What Gets Transmitted',
        text: 'Only model parameter vectors (arrays of floating-point numbers representing learned weights) travel across the network. These weight vectors are the result of gradient descent optimization and encode abstract statistical patterns — not individual data points. An attacker intercepting these weights cannot reconstruct the original stock prices or trading signals.',
      },
      {
        heading: 'Future: Differential Privacy & Secure Aggregation',
        text: 'The architecture is designed to support additional privacy layers in v2: Differential Privacy (adding calibrated noise to weights before transmission), Secure Aggregation (cryptographic protocols ensuring the server can only see the sum of weights, not individual contributions), and Fully Homomorphic Encryption (FHE) to aggregate without decrypting.',
      },
    ],
  },
  {
    id: 'dashboard',
    icon: 'dashboard',
    title: 'Dashboard Guide',
    content: [
      {
        heading: 'Overview Tab',
        text: 'The main dashboard view shows four key metrics at the top: Global Loss (should decrease), Global Accuracy (should increase), Active Nodes (5 clients), and current Training Round. Below, you\'ll see the Network Topology visualization showing the aggregator connected to all edge nodes, and the Server Panel with controls.',
      },
      {
        heading: 'Running a Training Round',
        text: 'Click the "New Training Round" button or the "Run Training Round" button in the sidebar. This triggers one complete FedAvg cycle: all 5 clients train locally for 10 epochs, upload weights, the server aggregates via FedAvg, and distributes the new global model. Watch the metrics update in real-time.',
      },
      {
        heading: 'Market Nodes (Client Cards)',
        text: 'Each of the 5 client cards represents a stock: Apple, Alphabet, Tesla, Microsoft, Amazon. Each card shows the client\'s current loss, accuracy, signal (BUY/SELL/HOLD), and status. Click any card to see detailed views including the actual vs. predicted price chart, loss history, and trading signals.',
      },
      {
        heading: 'Performance Tab (Analytics)',
        text: 'Shows backtest results: equity curves visualizing portfolio value over time based on the federated model\'s predictions, and Sharpe ratio analysis comparing risk-adjusted returns across stocks.',
      },
      {
        heading: 'Federation Tab',
        text: 'A full-screen view of the network topology — the star graph showing the Aggregation Server at the center and all 5 client nodes orbiting around it. Animated connections show data flow during training rounds.',
      },
      {
        heading: 'Privacy Tab',
        text: 'Explains the security model: local execution, weight-only aggregation, the FedAvg protocol, and future homomorphic encryption readiness.',
      },
    ],
  },
  {
    id: 'techstack',
    icon: 'code',
    title: 'Tech Stack',
    content: [
      {
        heading: 'Frontend',
        list: [
          'React 19 — Component-based UI framework',
          'Vite 8 — Lightning-fast build tool and dev server',
          'Tailwind CSS 4 — Utility-first CSS framework (dark neon theme)',
          'Framer Motion — Declarative animations and transitions',
          'Recharts — Composable charting library for data visualization',
          'Lucide React — Modern icon library',
          'React Router v7 — Client-side routing',
        ],
      },
      {
        heading: 'Simulation Layer',
        list: [
          'federatedEngine.js — Core FedAvg simulation with seeded RNG for reproducibility',
          'stockData.js — Real Yahoo Finance data loader with signal generation (SMA crossover)',
          'real_stock_data.json — Pre-fetched OHLCV data for 5 major tech stocks',
        ],
      },
      {
        heading: 'Python Backend (Reference)',
        list: [
          'Flower (flwr) — Production FL framework for real distributed training',
          'PyTorch — Deep learning framework for LSTM-based stock prediction model',
          'yfinance — Yahoo Finance data fetching API',
          'The Python backend in python_backend/ is a real FL pipeline built with Flower, designed for actual distributed training across multiple machines',
        ],
      },
    ],
  },
  {
    id: 'keyfiles',
    icon: 'folder',
    title: 'Key Files',
    content: [
      {
        heading: 'Core Simulation',
        list: [
          'src/simulation/federatedEngine.js — FedAvg engine: client creation, local training, weight aggregation, round management',
          'src/simulation/stockData.js — Data loading, prediction generation, SMA-based signal generation, returns calculation',
        ],
      },
      {
        heading: 'Main Pages',
        list: [
          'src/pages/Dashboard.jsx — Primary dashboard page with tab routing (Overview, Analytics, Network, Privacy)',
          'src/pages/LoginPage.jsx — Authentication gate (demo credentials: admin / nexus2026)',
          'src/pages/DocsPage.jsx — This documentation page',
        ],
      },
      {
        heading: 'Visualization Components',
        list: [
          'src/components/charts/AnalyticsCharts.jsx — Recharts-powered equity curves and Sharpe ratio analysis',
          'src/components/server/NetworkTopology.jsx — SVG-based federated network topology graph',
          'src/components/server/ServerPanel.jsx — Server status and aggregation controls',
          'src/components/clients/ClientCard.jsx — Individual client node summary card',
          'src/components/clients/ClientDetail.jsx — Expanded client detail with price charts',
        ],
      },
    ],
  },
];

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const navigate = useNavigate();
  const current = sections.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex">
      {/* Sidebar */}
      <aside className="w-72 h-screen sticky top-0 flex flex-col bg-[rgba(2,6,16,0.8)] backdrop-blur-2xl border-r border-[rgba(99,102,241,0.1)] shadow-[24px_0_48px_rgba(0,0,0,0.4)]">
        <div className="px-8 pt-8 mb-6">
          <h1 className="text-lg font-black text-[#818cf8]" style={{ fontFamily: 'Manrope' }}>Nexus Intelligence</h1>
          <p className="text-[10px] text-[#475569] uppercase tracking-widest mt-1">Documentation</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {sections.map((s, i) => {
            const isActive = activeSection === s.id;
            return (
              <Motion.button
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => setActiveSection(s.id)}
                className={`group flex items-center gap-3 w-full py-3 px-4 rounded-xl relative transition-all duration-300 text-left ${isActive
                  ? 'bg-[rgba(99,102,241,0.1)] text-[#818cf8] shadow-[0_0_15px_rgba(99,102,241,0.2)] translate-x-1'
                  : 'text-[#64748b] hover:text-[#94a3b8] hover:bg-[rgba(99,102,241,0.05)]'
                  }`}
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{s.icon}</span>
                <span className="text-sm font-medium">{s.title}</span>
              </Motion.button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-[rgba(99,102,241,0.1)] space-y-2">
          <button onClick={() => navigate('/dashboard')} className="w-full bg-gradient-to-r from-primary to-secondary text-on-primary-fixed py-3 rounded-xl font-bold glow-primary text-sm tracking-wide transition-transform hover:scale-[1.02]">
            Go to Dashboard
          </button>
          <button onClick={() => { window.location.href = '/nexus_site.html'; }} className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl text-sm tracking-wide transition-all hover:border-primary hover:text-primary">
            Landing Page
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero Banner */}
        <div className="relative overflow-hidden border-b border-[rgba(99,102,241,0.1)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(99,102,241,0.08)] via-transparent to-[rgba(125,233,255,0.05)]" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[rgba(99,102,241,0.04)] blur-[120px]" />
          <div className="relative max-w-4xl mx-auto px-12 py-16">
            <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase text-on-surface-variant mb-6">
              <div className="w-6 h-px bg-outline" />
              Research Documentation
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4" style={{ fontFamily: 'Manrope' }}>
              Nexus <em className="text-primary">Intelligence</em>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              A privacy-preserving Federated Learning platform for collaborative stock market prediction across decentralized market nodes.
            </p>
            <div className="flex gap-6 mt-8">
              {[
                { label: 'Clients', value: '5 Nodes' },
                { label: 'Algorithm', value: 'FedAvg' },
                { label: 'Data', value: 'Real OHLCV' },
                { label: 'Rounds', value: '20 Max' },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-lg px-5 py-3">
                  <div className="text-[9px] uppercase tracking-[0.15em] text-on-surface-variant mb-1">{stat.label}</div>
                  <div className="text-sm font-bold text-primary">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-4xl mx-auto px-12 py-12">
          <AnimatePresence mode="wait">
            <Motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-black tracking-tight mb-10 flex items-center gap-4" style={{ fontFamily: 'Manrope' }}>
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{current.icon}</span>
                {current.title}
              </h2>

              <div className="space-y-10">
                {current.content.map((block, i) => (
                  <Motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i }}
                    className="glass-card rounded-xl p-8"
                  >
                    <h3 className="text-xl font-bold mb-4 text-on-surface" style={{ fontFamily: 'Manrope' }}>{block.heading}</h3>
                    {block.text && (
                      <p className="text-on-surface-variant leading-[1.85] text-[15px]">{block.text}</p>
                    )}
                    {block.list && (
                      <ul className="space-y-3 mt-2">
                        {block.list.map((item, j) => (
                          <li key={j} className="flex items-start gap-3 text-on-surface-variant text-[15px] leading-relaxed">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Motion.div>
                ))}
              </div>

              {/* Section navigation */}
              <div className="flex justify-between items-center mt-16 pt-8 border-t border-outline-variant/20">
                {(() => {
                  const idx = sections.findIndex((s) => s.id === activeSection);
                  const prev = idx > 0 ? sections[idx - 1] : null;
                  const next = idx < sections.length - 1 ? sections[idx + 1] : null;
                  return (
                    <>
                      {prev ? (
                        <button onClick={() => setActiveSection(prev.id)} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-lg">arrow_back</span>
                          {prev.title}
                        </button>
                      ) : <div />}
                      {next ? (
                        <button onClick={() => setActiveSection(next.id)} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                          {next.title}
                          <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                      ) : <div />}
                    </>
                  );
                })()}
              </div>
            </Motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DocsPage;
