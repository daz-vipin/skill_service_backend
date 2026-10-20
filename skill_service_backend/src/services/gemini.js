const { GoogleGenAI } = require('@google/genai');

let client;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing in backend .env');
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  return client;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateDraft({ prompt, technology }) {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL;

  if (!model) {
    throw new Error(
      'GEMINI_MODEL is missing in backend .env. Set it to a supported model ID.'
    );
  }

  const contents =
    `You are the AI assistant inside Skill & Service, a marketplace for workers and clients.\n` +
    `Technology: ${technology}\n` +
    `User request: ${prompt}\n\n` +
    `Give a practical, well-structured answer. If code is requested, ` +
    `include complete code and explain filenames. ` +
    `Do not claim to have executed or deployed anything.`;

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { temperature: 0.4 }
      });

      const output = response.text;

      if (!output) {
        throw new Error('Gemini returned an empty response.');
      }

      return output;
    } catch (err) {
      const message = String(err?.message || '');
      const isTemporary =
        /\b503\b|\b500\b|\b502\b|\b504\b|UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED/i
          .test(message);

      if (!isTemporary || attempt === maxAttempts) {
        throw err;
      }

      const delay = attempt * 2000;
      console.log(
        `Gemini temporary error. Retry ${attempt + 1}/${maxAttempts} in ${delay / 1000}s.`
      );

      await wait(delay);
    }
  }
}

module.exports = { generateDraft };