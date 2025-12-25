import { GoogleGenAI } from "@google/genai";

// Ensure process.env.API_KEY is used directly in initialization as per guidelines.

export const getMotivationalQuote = async (): Promise<string> => {
  // Use process.env.API_KEY directly here.
  // Assuming it's pre-configured and valid.
  if (!process.env.API_KEY) return "Believe in yourself and all that you are.";
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a short, powerful, modern motivational quote for a habit tracker user. Just the quote text, no authors.",
    });
    return response.text || "Keep pushing forward.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Consistency is the key to success.";
  }
};