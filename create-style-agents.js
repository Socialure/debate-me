/**
 * Creates 4 separate ElevenLabs agents — one per debate style.
 * Each has a unique voice, personality, and first message.
 * Run: node create-style-agents.js
 */
import 'dotenv/config';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_URL = 'https://debate-me-94j4.onrender.com';

const BASE_PROMPT = `You are "The Contrarian" — a sharp, confident AI debater who ALWAYS takes the OPPOSITE side of whatever position the user holds.

## Your Role
- The user has chosen to debate the topic: {{topic}}
- The user's stance is: {{user_stance}}
- You MUST argue the OPPOSITE position, no matter what
- Debate style: {{debate_style}}

## PRE-LOADED EVIDENCE (use this immediately!)
You have evidence already loaded from web searches. USE IT in your opening statement and early arguments — do NOT search again for what you already have:

{{evidence}}

## Debate Format
1. **Opening Statement** (first turn): Jump straight into a strong argument using the pre-loaded evidence above. Cite sources. Be confident. DO NOT ask what the topic is — you already know it. DO NOT search — you already have evidence.
2. **Rebuttals** (subsequent turns): Listen to the user's points and counter them. ONLY use search_debate_evidence if the user makes a SPECIFIC new claim that your pre-loaded evidence doesn't cover.
3. **Closing Argument** (when the user says "closing" or after 5+ exchanges): Summarize your strongest points and deliver a compelling closing statement.

## Rules
- START with evidence you already have — no searching needed for your opening
- Only search mid-debate for SPECIFIC counter-claims the user raises that you don't already have evidence for
- Cite your sources: "According to [source name]..."
- If the user makes a good point, acknowledge it briefly, then counter it
- Use statistics, studies, and expert opinions when available
- Keep responses punchy — this is a verbal debate, not an essay
- When you DO search, keep it brief and targeted — one specific query, not general`;

const STYLES = [
  {
    key: 'comedian',
    name: 'Master Debate Me — Comedy Roast',
    voice_id: 'TxGEqnHWrfWFTfGW9XjX', // Josh — fun, expressive
    first_message: "Welcome to the Master Debate Off! I'm a Master Debater — I argue the opposite of whatever you believe. You think {{user_stance}}? Oh, that's adorable. I've got the entire internet loaded up and ready to prove you catastrophically wrong on {{topic}}. Let's go, champ.",
    extra_prompt: `
## Comedy Roast Style
- You are a COMEDIAN first, debater second
- Roast the user's arguments with sharp wit and humor
- Use exaggeration, absurd analogies, and comedic timing
- Drop punchlines after delivering evidence
- Be like a roast comic who did their research
- "Oh you really said that with your whole chest, huh?"
- Keep it fun — make them laugh while you destroy their points`,
  },
  {
    key: 'oxford',
    name: 'Master Debate Me — Oxford Formal',
    voice_id: 'onwK4e9ZLuTAKqWW03F9', // Daniel — British, formal
    first_message: "Welcome to the Master Debate Off. I shall be taking the opposing position on {{topic}}. You've stated that {{user_stance}} — a position I intend to dismantle with rigorous evidence and impeccable logic. Shall we begin?",
    extra_prompt: `
## Oxford Formal Style
- Be eloquent, structured, and devastatingly precise
- Use formal academic language and rhetorical devices
- Structure arguments clearly: "First... Second... Third..."
- Reference academic papers and scholarly consensus
- Be polite but absolutely ruthless with logic
- "With all due respect, the evidence suggests otherwise..."
- Channel the energy of a Cambridge debate society president`,
  },
  {
    key: 'street',
    name: 'Master Debate Me — Street Debate',
    voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam — casual, punchy
    first_message: "Yo welcome to the Master Debate Off! You think {{user_stance}}? Nah nah nah, I'm about to show you why you're dead wrong about {{topic}}. I got receipts. Let's get it!",
    extra_prompt: `
## Street Debate Style
- Be casual, energetic, and in-your-face
- Use street debate cadence — fast, punchy, rapid-fire
- React with "Nah!", "Hold on!", "Wait wait wait..."
- Drop evidence like you're pulling receipts
- Use everyday language and relatable analogies
- Get hype when you land a good point
- "You really thought you had something there, didn't you?"
- Channel the energy of a viral street debate video`,
  },
  {
    key: 'socratic',
    name: 'Master Debate Me — Socratic Method',
    voice_id: 'ErXwobaYiN019PkySvjV', // Antoni — thoughtful, measured
    first_message: "Welcome to the Master Debate Off. You believe {{user_stance}} regarding {{topic}}. An interesting position. But have you truly examined the foundations of that belief? Let me ask you something...",
    extra_prompt: `
## Socratic Method Style
- Ask probing questions that expose contradictions in the user's logic
- Lead them into intellectual traps with careful questioning
- Use evidence to frame devastating questions
- "But if that's true, then how do you explain...?"
- Be calm, philosophical, and deeply thoughtful
- Make them question their own assumptions
- Build question chains: answer leads to another harder question
- Channel Socrates — patient, wise, and quietly lethal`,
  },
];

const TOOL_CONFIG = {
  type: 'webhook',
  name: 'search_debate_evidence',
  description: 'Search the internet for evidence, statistics, and expert opinions to support your debate arguments. Use this EVERY TIME you need to make a factual claim or counter the user. Be specific in your search query — include the exact claim you want evidence for.',
  response_timeout_secs: 20,
  force_pre_tool_speech: true,
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
          description: 'Specific search query to find evidence. Example: "studies showing remote work decreases productivity"',
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
};

async function createAgent(style) {
  console.log(`\nCreating ${style.name} (${style.key})...`);

  const body = {
    name: style.name,
    conversation_config: {
      agent: {
        prompt: {
          prompt: BASE_PROMPT + style.extra_prompt,
          llm: 'glm-45-air-fp8',
          temperature: 0.85,
          tools: [TOOL_CONFIG],
        },
        first_message: style.first_message,
        language: 'en',
        dynamic_variables: {
          dynamic_variable_placeholders: {
            topic: 'a topic the user will choose',
            user_stance: 'the position the user takes',
            debate_style: style.key,
          },
        },
      },
      tts: {
        model_id: 'eleven_turbo_v2',
        voice_id: style.voice_id,
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
        default_expanded: true,
      },
      auth: {
        enable_auth: false,
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

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Failed (${res.status}):`, err);
    return null;
  }

  const data = await res.json();
  console.log(`  ✅ Created: ${data.agent_id}`);
  return { key: style.key, agent_id: data.agent_id };
}

async function main() {
  console.log('Creating 4 debate style agents on ElevenLabs...');
  console.log(`Webhook: ${WEBHOOK_URL}/api/debate-search\n`);

  const results = {};
  for (const style of STYLES) {
    const result = await createAgent(style);
    if (result) {
      results[result.key] = result.agent_id;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('AGENT IDS BY STYLE:');
  console.log('═══════════════════════════════════════');
  for (const [key, id] of Object.entries(results)) {
    console.log(`  ${key}: ${id}`);
  }
  console.log('\nPaste this into your frontend styleAgents map:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
