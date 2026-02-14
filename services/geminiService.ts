
import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export const generateReflection = async (songTitle: string, lyrics: string[]) => {
  return withRetry(async () => {
    const prompt = `Based on the lyrics of the Bible song "${songTitle}", provide a short spiritual reflection and a related Bible verse in Bengali. 
    Lyrics: ${lyrics.join(' ')}
    Structure:
    - Reflection: [Bengali]
    - Verse: [Bengali Verse]`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a thoughtful spiritual guide providing short, encouraging reflections in Bengali."
      }
    });
    return response.text;
  }).catch(error => {
    console.error("Reflection Error:", error);
    return "এখন ব্যাখ্যা তৈরি করা যাচ্ছে না। অনুগ্রহ করে পরে চেষ্টা করুন।";
  });
};

/**
 * Explains a Bible verse using Gemini 3 Flash with Mandatory Google Search.
 * Returns the text stream and also provides access to grounding metadata.
 */
export const explainVerseStream = async (verseReference: string, onChunk: (text: string, sources?: any[]) => void) => {
  try {
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `SEARCH GOOGLE for the Bible verse: "${verseReference}". 
    Then, provide an in-depth study in Bengali using this structure:
    
    [[VERSE]]
    (The exact full text of the verse in Bengali from a reliable translation)
    
    [[CONTEXT]]
    (Historical background and why this was written)
    
    [[MEANING]]
    (Spiritual depth and theological explanation)
    
    [[APPLICATION]]
    (How to apply this in modern daily life)
    
    [[PRAYER]]
    (A short prayer based on this verse)
    
    MANDATORY: Use Google Search to verify the verse content. Always output in Bengali.`;
    
    const response = await aiInstance.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert biblical scholar. You MUST use the googleSearch tool for every request to provide accurate and grounded information. Your response should be theological, encouraging, and formatted with the requested markers. Do not refuse requests for biblical analysis.",
        tools: [{ googleSearch: {} }],
        temperature: 0.1 // Precision is key for study
      }
    });

    let fullText = '';
    let allSources: any[] = [];

    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
        
        // Extract search grounding metadata
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
  } catch (error) {
    console.error("Explanation Stream Error:", error);
    throw error;
  }
};

export const fetchSongFromAI = async (query: string) => {
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
  return withRetry(async () => {
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
