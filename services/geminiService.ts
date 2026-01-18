import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ITCData } from '../types';

// ============================================================================
// 🔑 Gemini API Setup
// ============================================================================

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("MISSING_ENV_KEY");
  }

  return new GoogleGenAI({ apiKey });
};

// Main analysis of the whole map
export const analyzeITCMap = async (data: ITCData, lang: 'he' | 'en' = 'he'): Promise<string> => {
  try {
    const ai = getAiClient();
    
    const systemInstruction = `
      You are an expert organizational psychologist specializing in the "Immunity to Change" (OBT Map) model.
      Your goal is to review the user's map and help them deepen their logic.
      Be supportive, challenging, and concise. 
      IMPORTANT: Respond in ${lang === 'he' ? 'Hebrew' : 'English'}.
    `;
    
    const prompt = `
      Current Map Details:
      1. Goal: ${data.column1 || "Empty"}
      2. Behaviors: ${data.column2 || "Empty"}
      3. Worries: ${data.column3_worries || "Empty"}
      4. Hidden Commitments: ${data.column3_commitments || "Empty"}
      5. Assumptions: ${data.column4 || "Empty"}

      Task:
      - Look for the logical "gap" or "leak" in the map.
      - If Column 1 is present but 2 is empty, ask about obstructing behaviors.
      - If Column 2 is present but 3 is empty, ask about fears associated with stopping those behaviors.
      - If Column 3 is present, check if the Commitment (Part B) actually protects against the Worry (Part A).
      - If Column 4 is present, check if it truly makes the Commitment necessary.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || (lang === 'he' ? "לא התקבלה תשובה." : "No response received.");
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return `Error:\n${error.message}`;
  }
};

// Context-aware suggestions for specific fields
export const generateSuggestions = async (field: keyof ITCData, currentData: ITCData, lang: 'he' | 'en' = 'he'): Promise<string> => {
  try {
    const ai = getAiClient();

    let context = "";
    let task = "";

    switch(field) {
      case 'column1':
        task = `
          Suggest 3 examples of powerful, adaptive "Improvement Goals" (מטרת השיפור) starting with ${lang === 'he' ? '"אני מחויב ל..."' : '"I am committed to..."'}.
        `;
        break;

      case 'column2':
        context = `User's Goal: "${currentData.column1}"`;
        task = `
          Suggest 3 specific behaviors that work AGAINST this goal.
          Format: ${lang === 'he' ? '"במקום זאת, אני..."' : '"Instead, I..."'}.
        `;
        break;

      case 'column3_worries':
        context = `User's Behaviors: "${currentData.column2}"`;
        task = `
          Suggest 3 distinct "Worries" or "Fears" that might arise if they stopped those behaviors.
          Format: ${lang === 'he' ? '"אני דואג ש..."' : '"I am worried that..."'}.
        `;
        break;

      case 'column3_commitments':
        context = `User's Worry: "${currentData.column3_worries}"`;
        task = `
          Based on the specific worry above, suggest 3 Hidden Commitments.
          Format: ${lang === 'he' ? '"אני מחויב ל..."' : '"I am committed to..."'}.
        `;
        break;

      case 'column4':
        context = `User's Hidden Commitment: "${currentData.column3_commitments}"`;
        task = `
          Suggest 3 assumptions that anchor this commitment.
          Format: ${lang === 'he' ? '"אני מניח ש..."' : '"I assume that..."'}.
        `;
        break;
    }

    const systemInstruction = `
      Role: Expert Immunity to Change Coach.
      Language: ${lang === 'he' ? 'Hebrew' : 'English'}.
      Context: ${context}
      
      Output instructions:
      - Provide exactly 3 bullet points.
      - Keep them short and punchy.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: task,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    
    return response.text || "No response.";
  } catch (error: any) {
    console.error("Gemini Suggestion Error:", error);
    throw error;
  }
};