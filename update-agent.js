/**
 * Updates the Debate Me agent with improved config.
 * Run: node update-agent.js
 */
import 'dotenv/config';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://debate-me.onrender.com';

const updateBody = {
  conversation_config: {
    agent: {
      first_message:
        "Welcome to the Master Debate Off! I'm a Master Debater — I argue the opposite of whatever you believe. You think {{user_stance}}? Oh, that's adorable. I've got the entire internet loaded up and ready to prove you catastrophically wrong on {{topic}}. Let's go, champ.",
      dynamic_variables: {
        dynamic_variable_placeholders: {
          topic: 'a topic the user will choose',
          user_stance: 'the position the user takes',
          debate_style: 'oxford',
        },
      },
      prompt: {
        tools: [
          {
            type: 'webhook',
            name: 'search_debate_evidence',
            description:
              'Search the internet for evidence, statistics, and expert opinions to support your debate arguments. Use this EVERY TIME you need to make a factual claim or counter the user. Be specific in your search query — include the exact claim you want evidence for.',
            force_pre_tool_speech: true,
            response_timeout_secs: 20,
            api_schema: {
              url: `${WEBHOOK_URL}/api/debate-search`,
              method: 'POST',
              content_type: 'application/json',
              request_body_schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: {
                    type: 'string',
                    description:
                      'Specific search query to find evidence. Example: "studies showing remote work decreases productivity" or "statistics on pineapple pizza popularity"',
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
              },
            },
          },
        ],
      },
    },
    turn: {
      turn_timeout: 10,
      turn_eagerness: 'normal',
    },
  },
  platform_settings: {
    widget: {
      variant: 'compact',
      avatar: {
        type: 'orb',
        color_1: '#ff4444',
        color_2: '#ff6b35',
      },
      bg_color: '#12121a',
      text_color: '#e8e8f0',
      btn_color: '#ff4444',
      btn_text_color: '#ffffff',
      border_color: '#2a2a3a',
      focus_color: '#ff6b35',
      action_text: 'Start Debate',
      text_input_enabled: true,
      feedback_mode: 'none',
      show_conversation_id: false,
      default_expanded: true,
      language_selector: false,
      supports_text_only: true,
    },
    auth: {
      enable_auth: false,
    },
  },
};

async function main() {
  console.log(`Updating agent ${AGENT_ID}...`);
  console.log(`Webhook URL: ${WEBHOOK_URL}/api/debate-search`);

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify(updateBody),
  });

  if (!res.ok) {
    console.error('Failed:', res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log('\n✅ Agent updated!');
  console.log('First msg:', data.conversation_config?.agent?.first_message?.substring(0, 80));
  console.log('Widget bg:', data.platform_settings?.widget?.bg_color);
  console.log(
    'Pre-tool speech:',
    data.conversation_config?.agent?.prompt?.tools?.[0]?.force_pre_tool_speech
  );
  console.log(
    'Dynamic vars:',
    Object.keys(
      data.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {}
    )
  );
}

main().catch(console.error);
