import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

// ─── SSE Evidence Feed ─────────────────────────────────────────
// Clients connect to receive real-time evidence updates
const sseClients = new Set();

app.get('/api/evidence-stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function broadcastEvidence(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(msg);
  }
}

// ─── Firecrawl Search Helper ───────────────────────────────────
async function searchFirecrawl(query, limit = 5) {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Firecrawl error:', res.status, err);
    throw new Error(`Firecrawl search failed: ${res.status}`);
  }

  const data = await res.json();
  return data.data || [];
}

// Format search results for the LLM
function formatResults(results) {
  if (!results.length) return 'No relevant sources found.';

  return results
    .map((r, i) => {
      const title = r.title || r.metadata?.title || 'Untitled';
      const url = r.url || '';
      const snippet = r.markdown
        ? r.markdown.slice(0, 600)
        : r.description || 'No content available';
      return `[Source ${i + 1}] ${title}\nURL: ${url}\n${snippet}`;
    })
    .join('\n\n---\n\n');
}

// ─── ElevenLabs Server Tool Webhook ────────────────────────────
// ElevenLabs calls this when the agent invokes its server-side tool
app.post('/api/debate-search', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));

    // ElevenLabs sends tool parameters in the body
    const query = req.body.query || req.body.search_query || '';
    const topic = req.body.topic || '';
    const stance = req.body.stance || 'opposing';

    if (!query && !topic) {
      return res.json({
        evidence: 'No search query provided. Ask the user to clarify their argument.',
      });
    }

    const searchQuery = query || `${stance} evidence: ${topic}`;
    console.log(`Searching: "${searchQuery}"`);

    // Broadcast search start to SSE clients
    broadcastEvidence({
      type: 'searching',
      query: searchQuery,
      timestamp: new Date().toISOString(),
    });

    const results = await searchFirecrawl(searchQuery, 3); // 3 results for speed
    const formatted = formatResults(results);

    console.log(`Found ${results.length} results`);

    // Broadcast results to SSE clients
    broadcastEvidence({
      type: 'results',
      query: searchQuery,
      sources: results.map((r) => ({
        title: r.title || r.metadata?.title || 'Untitled',
        url: r.url || '',
        description: r.description || '',
      })),
      count: results.length,
      timestamp: new Date().toISOString(),
    });

    // Return evidence to the ElevenLabs agent
    res.json({
      evidence: formatted,
      source_count: results.length,
      search_query: searchQuery,
    });
  } catch (err) {
    console.error('Search error:', err.message);
    broadcastEvidence({
      type: 'error',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
    res.json({
      evidence:
        'Search temporarily unavailable. Continue the debate using your existing knowledge.',
      error: err.message,
    });
  }
});

// ─── Pre-fetch Evidence (called when debate starts) ──────────
// Searches for evidence BEFORE the conversation begins so the agent
// has ammunition loaded and doesn't need to pause mid-speech.
app.post('/api/prefetch-evidence', async (req, res) => {
  try {
    const { topic, user_stance } = req.body;
    if (!topic) return res.json({ evidence: '' });

    console.log(`Pre-fetching evidence for: "${topic}" (user stance: ${user_stance})`);

    // Run two searches in parallel: counter-evidence + general facts
    const [counterResults, factResults] = await Promise.all([
      searchFirecrawl(`arguments against: ${user_stance || topic}`, 3).catch(() => []),
      searchFirecrawl(`${topic} statistics facts studies evidence`, 3).catch(() => []),
    ]);

    // Broadcast to SSE so the live feed shows it
    const allResults = [...counterResults, ...factResults];
    if (allResults.length > 0) {
      broadcastEvidence({
        type: 'searching',
        query: `Pre-loading evidence on "${topic}"`,
        timestamp: new Date().toISOString(),
      });
      broadcastEvidence({
        type: 'results',
        query: `Pre-loaded evidence for debate`,
        sources: allResults.map((r) => ({
          title: r.title || r.metadata?.title || 'Untitled',
          url: r.url || '',
          description: r.description || '',
        })),
        count: allResults.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Format for the agent's context
    const formatted = formatResults(allResults);
    console.log(`Pre-fetched ${allResults.length} sources`);

    res.json({ evidence: formatted, count: allResults.length });
  } catch (err) {
    console.error('Pre-fetch error:', err.message);
    res.json({ evidence: '', count: 0 });
  }
});

// ─── Test Search Endpoint ─────────────────────────────────────
// Quick way to test Firecrawl integration from the browser
app.get('/api/test-search', async (req, res) => {
  const query = req.query.q || 'pineapple on pizza debate';
  try {
    const results = await searchFirecrawl(query, 3);
    res.json({
      success: true,
      query,
      count: results.length,
      results: results.map((r) => ({
        title: r.title || r.metadata?.title || 'Untitled',
        url: r.url || '',
        snippet: (r.markdown || r.description || '').slice(0, 200),
      })),
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'debate-me',
    firecrawl: !!FIRECRAWL_API_KEY,
    elevenlabs: !!ELEVENLABS_API_KEY,
    agentId: ELEVENLABS_AGENT_ID ? 'configured' : 'missing',
  });
});

// ─── Config endpoint (style-specific agent IDs) ──────────────
const STYLE_AGENTS = {
  comedian: 'agent_5701km52rkcxfy298xma2bd1fzvc',
  oxford:   'agent_1001km51541df5kv5jk52be7gxce',
  street:   'agent_8501km51556nf87tathk247fppdb',
  socratic: 'agent_1601km5156qmfshby22d83vtn324',
};

app.get('/api/config', (req, res) => {
  res.json({
    agentId: ELEVENLABS_AGENT_ID || STYLE_AGENTS.comedian,
    styleAgents: STYLE_AGENTS,
  });
});

// ─── Signed URL for JS SDK conversation auth ─────────────────
app.get('/api/signed-url', async (req, res) => {
  try {
    // Accept agent_id param for style-specific agents
    const agentId = req.query.agent_id || ELEVENLABS_AGENT_ID || STYLE_AGENTS.comedian;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      }
    );
    if (!response.ok) {
      const err = await response.text();
      console.error('Signed URL error:', response.status, err);
      return res.status(500).json({ error: 'Failed to get signed URL' });
    }
    const body = await response.json();
    res.json({ signedUrl: body.signed_url });
  } catch (err) {
    console.error('Signed URL error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve frontend ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ─── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎤 Debate Me server running on port ${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/api/debate-search`);
  console.log(`   Evidence SSE: http://localhost:${PORT}/api/evidence-stream`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
});
