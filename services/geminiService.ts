
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
    Structure:
    - **প্রতিফলন**: [Short meaningful text]
    - **সংশ্লিষ্ট পদ**: [Verse]`;
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
 * Explains a Bible verse using Gemini 3 Flash with mandatory Google Search grounding.
 * Optimized for live environments to prevent refusals or empty responses.
 */
export const explainVerseStream = async (verseReference: string, onChunk: (text: string, sources?: any[]) => void) => {
  try {
    // Re-initializing to ensure fresh state for each live call
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview'; 
    
    // The prompt is engineered to demand a search-based scholarly response
    const prompt = `ACT AS A BIBLE SCHOLAR. 
    TASK: Research and explain the Bible verse: "${verseReference}" in Bengali.
    MANDATORY: You MUST use Google Search to verify the exact Bengali text and historical context.
    
    RESPONSE STRUCTURE:
    [[VERSE]]
    (The full Bengali verse text)
    
    [[CONTEXT]]
    (Historical and situational context from your search)
    
    [[MEANING]]
    (Deep spiritual and theological meaning)
    
    [[APPLICATION]]
    (How this applies to modern daily life)
    
    [[PRAYER]]
    (A short prayer related to this verse)
    
    If the verse is not found, state that you are searching alternative translations.
    Cite your sources at the end. Output only in Bengali.`;
    
    const response = await aiInstance.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized Bible Study AI. Your primary goal is to provide accurate, scholarly, and spiritual explanations in Bengali. You HAVE PERMISSION to discuss religious texts for educational purposes. ALWAYS use the googleSearch tool for accuracy. Do not refuse requests for Bible verse explanations.",
        tools: [{ googleSearch: {} }],
        temperature: 0.1, // Low temperature for factual consistency
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
    
    if (!fullText) {
      throw new Error("Empty response from AI");
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
