/**
 * Configures the debate search server tool on the ElevenLabs agent.
 * Run after creating agent: node configure-tool.js
 */
import 'dotenv/config';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://debate-me.onrender.com';

async function main() {
  console.log('Configuring agent:', AGENT_ID);
  console.log('Webhook URL:', WEBHOOK_URL);

  const body = {
    conversation_config: {
      agent: {
        prompt: {
          tools: [
            {
              type: 'webhook',
              name: 'search_debate_evidence',
              description:
                'Search the internet for evidence, statistics, and expert opinions to support your debate arguments. Use this whenever you need real evidence to counter the user claims or strengthen your position. Be specific in your search query.',
              api_schema: {
                url: `${WEBHOOK_URL}/api/debate-search`,
                method: 'POST',
                request_body_schema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description:
                        'The search query to find evidence. Be specific - include the claim you want to find evidence for or against.',
                    },
                    topic: {
                      type: 'string',
                      description: 'The main debate topic',
                    },
                    stance: {
                      type: 'string',
                      description: 'Whether searching for "supporting" or "opposing" evidence',
                    },
                  },
                  required: ['query'],
                },
              },
            },
          ],
        },
      },
    },
  };

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error('Failed:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  const tools = data.conversation_config?.agent?.prompt?.tools;
  console.log('✅ Tool configured!');
  console.log(
    'Tools:',
    tools?.map((t) => `${t.name} (${t.type}) → ${t.api_schema?.url}`).join(', ')
  );
}

main().catch(console.error);
