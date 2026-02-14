
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
 * Explains a Bible verse with depth and beautiful structure.
 */
export const explainVerseStream = async (verseReference: string, onChunk: (text: string) => void) => {
  try {
    const prompt = `Explain the Bible verse "${verseReference}" in Bengali with great depth. 
    Use this EXACT structure with clear headings:

    📖 **মূল পাঠ ও অনুবাদ**
    [বাংলা অনুবাদ ও সাধারণ অর্থ]

    📜 **ঐতিহাসিক প্রেক্ষাপট**
    [কখন এবং কেন এটি বলা হয়েছিল]

    💎 **আধ্যাত্মিক মুক্তো (গভীর অর্থ)**
    [৩-৪টি গভীর পয়েন্ট যেখানে মূল গ্রীক/হিব্রু শব্দের ভাবার্থ থাকবে]

    🌱 **আমাদের জীবনে প্রয়োগ**
    [দৈনন্দিন জীবনে কীভাবে কাজ করবে]

    🙏 **একটি প্রার্থনা**
    [পদটির ওপর ভিত্তি করে ছোট সুন্দর প্রার্থনা]

    Ensure high-quality, scholarly yet touching language.`;
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class Bible Scholar. Provide profound, structured, and beautiful verse explanations in Bengali. Use sophisticated yet readable language.",
        thinkingConfig: { thinkingBudget: 8192 },
        temperature: 0.2,
        maxOutputTokens: 3000
      }
    });

    let fullText = '';
    for await (const chunk of response) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        onChunk(fullText);
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
