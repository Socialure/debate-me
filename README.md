# MASTER DEBATE — Agent That Argues Back with Live Evidence

> Pick a topic. Take a side. The Agent takes the opposite — and searches the internet for real evidence to destroy your argument.

🔴 **Live**: [debate.directivecreator.com](https://debate.directivecreator.com)

Built for [ElevenHacks #1](https://hacks.elevenlabs.io/) by [Socialure](https://github.com/Socialure).

## What It Does

**Master Debate** is a voice-powered agent debater that:

1. **Takes the opposite side** of whatever you believe
2. **Searches the internet in real-time** for evidence to counter your arguments
3. **Cites real sources** — BLS data, academic papers, news articles
4. **Adapts its debate style** — Oxford formal, street debate, Socratic method, or comedy roast

## How It Works

```
You speak → ElevenAgent (STT) → GLM-4.5 AIR
                                       ↓
                              Server-side webhook fires
                                       ↓
                              Node.js backend
                                       ↓
                              Firecrawl Search API → web evidence
                                       ↓
                              Returns evidence to LLM
                                       ↓
                              ElevenAgent (TTS) → You hear the rebuttal
```

The ElevenLabs agent has a **server-side webhook tool** (`search_debate_evidence`) that calls our backend whenever it needs evidence. The backend searches the web via Firecrawl and returns formatted results with sources. The agent synthesizes this into spoken rebuttals with citations.

**Pre-tool speech** is enabled — the agent talks while searching ("Let me look that up...") so there's no awkward silence during searches.

## Stack

| Component | Technology |
|-----------|-----------|
| Voice Agent | ElevenLabs Conversational AI (ElevenAgents) |
| LLM | GLM-4.5 AIR (via ElevenLabs) |
| Web Search | Firecrawl Search API |
| Backend | Node.js + Express |
| Frontend | Static HTML + ElevenLabs Widget |
| Deployment | Render |

## Quick Start

### Prerequisites
- Node.js 18+
- [Firecrawl API key](https://firecrawl.dev)
- [ElevenLabs API key](https://elevenlabs.io) (with Conversational AI enabled)

### Setup

```bash
git clone https://github.com/Socialure/debate-me.git
cd debate-me
npm install
cp .env.example .env
# Edit .env with your API keys
```

### Create the ElevenLabs Agent

```bash
node create-agent.js
# Copy the returned agent_id to your .env
```

### Configure the Search Tool

```bash
node configure-tool.js
```

### Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Socialure/debate-me)

After deploying, update the webhook URL:

```bash
WEBHOOK_URL=https://your-app.onrender.com node update-webhook.js
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FIRECRAWL_API_KEY` | Firecrawl API key for web search |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent ID (from create-agent.js) |
| `WEBHOOK_URL` | Your deployed backend URL (for webhook config) |
| `PORT` | Server port (default: 3000) |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Frontend UI |
| `/api/debate-search` | POST | Webhook for ElevenLabs agent (Firecrawl search) |
| `/api/evidence-stream` | GET | SSE stream of live evidence updates |
| `/api/test-search?q=...` | GET | Test Firecrawl search |
| `/api/health` | GET | Health check |
| `/api/config` | GET | Agent ID for frontend |

## Debate Styles

- **Oxford Formal** — structured, evidence-heavy, formal tone
- **Street Debate** — casual, humorous, rapid-fire
- **Socratic Method** — probing questions that dismantle assumptions
- **Comedy Roast** — witty roasts of your arguments

## Features

- 8 preset topics + custom topic input
- Live evidence feed — see every search the agent makes via SSE
- Pre-tool speech — agent talks while searching
- Dynamic variables — topic, stance, and style passed at conversation start
- Dark theme UI matching the ElevenLabs widget

## Human-Agent Collaboration

This project was built as a collaboration between a human and agents in the [Socialure](https://github.com/Socialure) agent system, during [The Synthesis](https://hack-synthesis.devfolio.co/) and [ElevenHacks #1](https://hacks.elevenlabs.io/) hackathons.

## License

MIT

---

Built by [Socialure](https://github.com/Socialure) for ElevenHacks #1.
Powered by [ElevenLabs](https://elevenlabs.io) + [Firecrawl](https://firecrawl.dev).
