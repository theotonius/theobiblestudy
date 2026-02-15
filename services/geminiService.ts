
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Retry Logic for stability
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * The API key must be obtained exclusively from the environment variable process.env.API_KEY.
 * This is the standard way the app retrieves its credentials.
 */
const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("CRITICAL ERROR: process.env.API_KEY is missing. Check your .env.local file.");
  }
  return key;
};

export const generateReflection = async (songTitle: string, lyrics: string[]) => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key পাওয়া যায়নি। দয়া করে আপনার .env.local ফাইলটি চেক করুন।";

  const ai = new GoogleGenAI({ apiKey });
  
  return withRetry(async () => {
    const prompt = `Based on the lyrics of the Bible song "${songTitle}", provide a short spiritual reflection and a related Bible verse in Bengali. 
    Lyrics: ${lyrics.join(' ')}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a thoughtful spiritual guide. Provide encouraging and deep reflections in Bengali."
      }
    });
    return response.text;
  }).catch(error => {
    console.error("Reflection Error:", error);
    return "এখন ব্যাখ্যা তৈরি করা যাচ্ছে না। সম্ভবত আপনার এপিআই কী-তে সমস্যা আছে।";
  });
};

/**
 * Explains a Bible verse using Gemini 3 Flash with Google Search grounding.
 */
export const explainVerseStream = async (verseReference: string, onChunk: (text: string, sources?: any[]) => void) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key (API_KEY) খুঁজে পাওয়া যায়নি।");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview'; 
  
  const prompt = `Please search for and provide a comprehensive explanation for the Bible verse: "${verseReference}". 
  MANDATORY: You must search the web to find the EXACT text of this verse in Bengali.
  
  Structure your response accurately in Bengali using these markers:
  [[VERSE]]
  (The full verse text in Bengali)
  
  [[CONTEXT]]
  (The historical and biblical context)
  
  [[MEANING]]
  (The spiritual meaning)
  
  [[APPLICATION]]
  (Practical life application)
  
  [[PRAYER]]
  (A short prayer)

  Use ONLY Bengali for all sections.`;
  
  try {
    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are an expert Bible Scholar. Always use the googleSearch tool to find accurate verse wording. Your response MUST be in Bengali.",
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      }
    });

    let fullText = '';
    let allSources: any[] = [];

    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
        const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (sources) {
          sources.forEach(s => {
            if (s.web && !allSources.some(existing => existing.web?.uri === s.web.uri)) {
              allSources.push(s);
            }
          });
        }
        onChunk(fullText, allSources.length > 0 ? allSources : undefined);
      }
    }
    
    return fullText;
  } catch (error: any) {
    console.error("Explanation Stream Error:", error);
    throw error;
  }
};

export const fetchSongFromAI = async (query: string) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find the lyrics for the Bible song: "${query}". Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            reference: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['Worship', 'Praise', 'Hymn', 'Kids'] },
            lyrics: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "reference", "category", "lyrics"]
        }
      }
    });
    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  }).catch(error => {
    console.error("Fetch Song Error:", error);
    return null;
  });
};

export const speakLyrics = async (text: string) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read these lyrics warmly: ${text}` }] }],
      config: {
        responseModalalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");
    return base64Audio;
  }).catch(error => {
    console.error("TTS Error:", error);
    return null;
  });
};

export const decodeBase64Audio = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};
