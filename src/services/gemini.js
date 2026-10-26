
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

function getModel() {
  const model = process.env.GEMINI_MODEL;

  if (!model) {
    throw new Error(
      'GEMINI_MODEL is missing in backend .env. Set it to a supported model ID.'
    );
  }

  return model;
}

function getStatusCode(err) {
  const candidates = [
    err?.status,
    err?.statusCode,
    err?.code,
    err?.response?.status
  ];

  for (const value of candidates) {
    const status = Number(value);

    if (Number.isInteger(status) && status >= 400 && status <= 599) {
      return status;
    }
  }

  const message = String(err?.message || '');
  const match = message.match(/\b(429|500|502|503|504)\b/);

  return match ? Number(match[1]) : null;
}

function isTemporaryError(err) {
  const status = getStatusCode(err);
  const message = String(err?.message || '');

  if ([429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  return /\bUNAVAILABLE\b|\bINTERNAL\b|\bDEADLINE_EXCEEDED\b|high demand|temporarily unavailable|overloaded/i
    .test(message);
}

function createFriendlyError(originalError) {
  console.error('Original Gemini error:', {
  message: originalError?.message,
  status: originalError?.status,
  statusCode: originalError?.statusCode,
  code: originalError?.code
});
  const status = getStatusCode(originalError);

  const error = new Error(
    status === 429
      ? 'AI service is receiving too many requests right now. Please wait a moment and try again.'
      : 'AI service is temporarily busy. Please try again in a little while.'
  );

  error.status = status === 429 ? 429 : 503;
  error.code = 'AI_SERVICE_BUSY';

  return error;
}

async function generateWithRetry({ contents, temperature = 0.4 }) {
  const ai = getClient();
  const model = getModel();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { temperature }
      });

      const output = response.text;

      if (!output) {
        throw new Error('Gemini returned an empty response.');
      }

      return output;
    } catch (err) {
      if (!isTemporaryError(err)) {
        throw err;
      }

      if (attempt === maxAttempts) {
        console.error(
          `Gemini remained unavailable after ${maxAttempts} attempts.`
        );

        throw createFriendlyError(err);
      }

      // Exponential backoff with jitter:
      // approximately 2 seconds, then 4 seconds, plus a small random delay.
      const baseDelay = 2000 * (2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 1000);
      const delay = baseDelay + jitter;

      console.warn(
        `Gemini temporary error (${getStatusCode(err) || 'unknown'}). ` +
        `Retrying attempt ${attempt + 1}/${maxAttempts} in ${delay}ms.`
      );

      await wait(delay);
    }
  }

  throw new Error('Gemini request failed.');
}

async function generateDraft({ prompt, technology }) {
  const contents =
    `You are the AI assistant inside Skill & Service, a marketplace for workers and clients.\n` +
    `Technology: ${technology}\n` +
    `User request: ${prompt}\n\n` +
    `Give a practical, well-structured answer. If code is requested, ` +
    `include complete code and explain filenames. ` +
    `Do not claim to have executed or deployed anything.`;

  return generateWithRetry({
    contents,
    temperature: 0.4
  });
}

async function generateChatReply({ message, technology, history = [] }) {
  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          item =>
            item &&
            ['user', 'assistant'].includes(item.role) &&
            typeof item.content === 'string' &&
            item.content.trim().length > 0
        )
        .slice(-20)
    : [];

  const contents = [
    ...safeHistory.map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }]
    })),
    {
      role: 'user',
      parts: [
        {
          text:
            `You are the AI chat assistant inside Skill & Service, a marketplace for workers and clients.\n` +
            `Selected technology: ${technology || 'General'}.\n` +
            `Answer the user's latest message using the conversation history above.\n` +
            `Understand follow-up questions in the context of previous messages.\n` +
            `Give one clear, complete response to the latest message, then stop.\n` +
            `When code is requested, provide code and explain where it belongs.\n` +
            `Never claim you executed, deployed, or changed anything unless that actually happened.\n\n` +
            `Latest user message: ${message}`
        }
      ]
    }
  ];

  return generateWithRetry({
    contents,
    temperature: 0.5
  });
}

module.exports = {
  generateDraft,
  generateChatReply
};
