import { GoogleGenAI, Modality, Type } from "@google/genai";

/**
 * Retrieves the API key with fallback support
 */
const getApiKey = () => {
  // First priority: environment variable
  const envKey = process.env.API_KEY;
  if (envKey && envKey.trim().length > 5) return envKey.trim();
  
  // Fallback: check window object if user placed it in index.html (experimental)
  const windowKey = (window as any).API_KEY;
  if (windowKey && windowKey.trim().length > 5) return windowKey.trim();
  
  return null;
};

/**
 * আধ্যাত্মিক ব্যাখ্যা তৈরি করে
 */
export const generateReflection = async (songTitle: string, lyrics: string[]) => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key পাওয়া যায়নি। দয়া করে কী চেক করুন।";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on the lyrics of the Bible song "${songTitle}", provide a short spiritual reflection and a related Bible verse in Bengali. 
      Lyrics: ${lyrics.join(' ')}`,
      config: {
        systemInstruction: "You are a thoughtful spiritual guide. Provide encouraging and deep reflections in Bengali."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Reflection Error:", error);
    return "দুঃখিত, এই মুহূর্তে ব্যাখ্যা তৈরি করা সম্ভব হচ্ছে না।";
  }
};

/**
 * বাইবেলের পদের ব্যাখ্যা দেয়
 */
export const explainVerseStream = async (verseReference: string, onChunk: (text: string, sources?: any[]) => void) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key খুঁজে পাওয়া যায়নি।");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Please search for and provide a comprehensive explanation for the Bible verse: "${verseReference}". 
    Structure your response accurately in Bengali using these markers: [[VERSE]], [[CONTEXT]], [[MEANING]], [[APPLICATION]], [[PRAYER]].`;
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are an expert Bible Scholar. Your response MUST be in Bengali.",
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      }
    });

    let fullText = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
        const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        onChunk(fullText, sources);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Explanation Error:", error);
    throw error;
  }
};

/**
 * লিরিক্স খুঁজে বের করে
 */
export const fetchSongFromAI = async (query: string) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
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
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Fetch Song Error:", error);
    return null;
  }
};

/**
 * লিরিক্স পাঠ করে শোনায়
 */
export const speakLyrics = async (text: string) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read these lyrics warmly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const decodeBase64Audio = decode;

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
