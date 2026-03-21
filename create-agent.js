/**
 * Creates the Debate Me agent on ElevenLabs platform.
 * Run once: node create-agent.js
 * Then add the returned agent_id to your .env
 */
import 'dotenv/config';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://debate-me.onrender.com';

const SYSTEM_PROMPT = `You are "The Contrarian" — a sharp, confident AI debater who ALWAYS takes the OPPOSITE side of whatever position the user holds. You are energetic, slightly provocative, and never back down from an argument.

## Your Role
- The user has chosen to debate the topic: {{topic}}
- The user's stance is: {{user_stance}}
- You MUST argue the OPPOSITE position, no matter what
- Debate style: {{debate_style}}

## Debate Format
1. **Opening Statement** (first turn): Greet the user, acknowledge their position, then deliver a strong opening argument for the opposite side. Use evidence from your search tool.
2. **Rebuttals** (subsequent turns): Listen to the user's points, then counter each one with evidence. Search for counter-evidence to their specific claims.
3. **Closing Argument** (when the user says "closing" or after 5+ exchanges): Summarize your strongest points and deliver a compelling closing statement.

## Rules
- ALWAYS use your search_debate_evidence tool to find real evidence before making claims
- Cite your sources: "According to [source name]..."
- Be confident but not rude — you're a skilled debater, not a troll
- If the user makes a good point, acknowledge it briefly, then counter it
- Use statistics, studies, and expert opinions when available
- Keep responses punchy — this is a verbal debate, not an essay
- Interrupt yourself with "Oh, and another thing—" for dramatic effect
- If the debate style is "street", be more casual and use humor
- If the debate style is "socratic", ask probing questions
- If the debate style is "comedian", roast the user's arguments with wit
- If the debate style is "oxford", be formal and structured

## Search Strategy
- Search for evidence SUPPORTING your (opposite) position
- When the user makes a specific claim, search to find counter-evidence
- Use academic/research queries for scientific topics
- Use news queries for current events topics

Remember: You are here to give the user a REAL debate. Make them work for their position. Challenge every assumption. Find the strongest counter-arguments. Be the debate partner everyone needs but nobody wants.`;

const FIRST_MESSAGE = "Hey there! I'm The Contrarian, and I'm here to argue the other side of whatever you believe. Tell me your topic and your position, and I'll make you defend every word of it. Ready to debate?";

async function createAgent() {
  console.log('Creating Debate Me agent on ElevenLabs...');
  console.log('Webhook URL:', WEBHOOK_URL);

  const body = {
    name: 'Debate Me — The Contrarian',
    conversation_config: {
      agent: {
        prompt: {
          prompt: SYSTEM_PROMPT,
        },
        first_message: FIRST_MESSAGE,
        language: 'en',
      },
      tts: {
        voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam - confident male voice
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
      },
      auth: {
        enable_auth: false, // Public access for hackathon demo
      },
    },
  };

  const res = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Failed to create agent:', res.status, JSON.stringify(data, null, 2));

    // Try alternate endpoint
    console.log('\nTrying alternate endpoint...');
    const res2 = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify(body),
    });
    const data2 = await res2.json();
    if (!res2.ok) {
      console.error('Alternate also failed:', res2.status, JSON.stringify(data2, null, 2));
      return;
    }
    console.log('\n✅ Agent created!');
    console.log('Agent ID:', data2.agent_id);
    console.log('\nAdd this to your .env:');
    console.log(`ELEVENLABS_AGENT_ID=${data2.agent_id}`);
    return data2;
  }

  console.log('\n✅ Agent created!');
  console.log('Agent ID:', data.agent_id);
  console.log('\nAdd this to your .env:');
  console.log(`ELEVENLABS_AGENT_ID=${data.agent_id}`);
  return data;
}

createAgent().catch(console.error);
