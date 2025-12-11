import { GoogleGenAI, Type } from "@google/genai";

export const generateCleaningTask = async (location) => {
  if (!location) throw new Error("Location is required");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const schema = {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "A short summary of the cleaning task (e.g., 'Organize', 'Scrub').",
      },
      details: {
        type: Type.STRING,
        description: "Specific details on how to clean or what to focus on (in Japanese).",
      },
      tools: {
        type: Type.STRING,
        description: "List of tools or supplies needed (e.g., 'Sponge, Detergent').",
      },
    },
    required: ["category", "details", "tools"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Propose a specific cleaning task for the location: "${location}" for a Japanese "Ōsōji" (Big Cleaning) event. 
      Keep the "category" very short (noun). 
      Keep "details" practical and actionable. 
      List "tools" simply.
      Return the response in Japanese.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback in case of error
    return {
      category: "掃除",
      details: "基本清掃",
      tools: "雑巾",
    };
  }
};