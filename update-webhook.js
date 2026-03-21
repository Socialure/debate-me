/**
 * Updates the ElevenLabs agent webhook URL after deployment.
 * Usage: WEBHOOK_URL=https://your-url.onrender.com node update-webhook.js
 */
import 'dotenv/config';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.error('Set WEBHOOK_URL in .env or environment');
  process.exit(1);
}

async function main() {
  console.log(`Updating agent ${AGENT_ID} webhook → ${WEBHOOK_URL}/api/debate-search`);

  // First get current agent config to preserve tools
  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY },
  });

  if (!getRes.ok) {
    console.error('Failed to get agent:', getRes.status, await getRes.text());
    return;
  }

  const agent = await getRes.json();
  const tools = agent.conversation_config?.agent?.prompt?.tools || [];

  // Update webhook URL in all webhook tools
  const updatedTools = tools.map((tool) => {
    if (tool.type === 'webhook' && tool.api_schema?.url) {
      return {
        ...tool,
        api_schema: {
          ...tool.api_schema,
          url: `${WEBHOOK_URL}/api/debate-search`,
        },
      };
    }
    return tool;
  });

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            tools: updatedTools,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error('Failed to update:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  const newTools = data.conversation_config?.agent?.prompt?.tools || [];
  console.log('✅ Webhook URL updated!');
  newTools.forEach((t) => {
    if (t.api_schema?.url) console.log(`   ${t.name} → ${t.api_schema.url}`);
  });
}

main().catch(console.error);
