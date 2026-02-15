import { GoogleGenAI, Modality, Type } from "@google/genai";

/**
 * গান বা কবিতার আধ্যাত্মিক ব্যাখ্যা তৈরি করে (Gemini 3 Flash)।
 */
export const generateReflection = async (songTitle: string, lyrics: string[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    return "দুঃখিত, এই মুহূর্তে ব্যাখ্যা তৈরি করা সম্ভব হচ্ছে না। আপনার API Key সঠিক আছে কি না তা যাচাই করুন।";
  }
};

/**
 * গুগল সার্চ ব্যবহার করে বাইবেলের পদের ব্যাখ্যা দেয় (Gemini 3 Flash)।
 */
export const explainVerseStream = async (verseReference: string, onChunk: (text: string, sources?: any[]) => void) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
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
  } catch (error) {
    console.error("Explanation Stream Error:", error);
    throw error;
  }
};

/**
 * এআই ব্যবহার করে গানের লিরিক্স খুঁজে বের করে (Gemini 3 Flash)।
 */
export const fetchSongFromAI = async (query: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  } catch (error) {
    console.error("Fetch Song Error:", error);
    return null;
  }
};

/**
 * লিরিক্স পাঠ করে শোনায় (Gemini TTS)।
 */
export const speakLyrics = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

// Audio Decoding Utilities
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
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