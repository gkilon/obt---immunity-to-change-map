import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ITCData } from '../types';

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeITCMap = async (data: ITCData): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    You are an expert organizational psychologist and coach specializing in the "Immunity to Change" (Kegan & Lahey) model.
    Analyze the user's current Immunity to Change map (in Hebrew) and provide a short, supportive, and insightful suggestion for the next step or a missing piece.
    
    Current Map:
    1. Improvement Goal (מטרת השיפור): ${data.column1 || "Empty"}
    2. Behaviors (התנהגויות מעכבות): ${data.column2 || "Empty"}
    3. Worries (תיבת הדאגות): ${data.column3_worries || "Empty"}
    4. Hidden Commitments (מחויבות נסתרת): ${data.column3_commitments || "Empty"}
    5. Big Assumptions (הנחות יסוד): ${data.column4 || "Empty"}

    Instructions:
    - If the map is mostly empty, suggest a starting point for the Goal.
    - If they have a Goal but no behaviors, ask what they are doing instead.
    - If they have behaviors, help them uncover the "Worry" that drives those behaviors.
    - If the map is full, offer a "Big Assumption" test they could try.
    - Keep the tone professional, empathetic, and coaching-oriented.
    - Respond in Hebrew.
    - Keep it concise (max 3-4 sentences).
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "לא התקבלה תשובה מהמודל.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("שגיאה בתקשורת עם הבינה המלאכותית");
  }
};

export const generateSuggestions = async (field: keyof ITCData, currentData: ITCData): Promise<string> => {
  const ai = getAiClient();

  let focusInstruction = "";
  switch(field) {
    case 'column1': focusInstruction = "Suggest 3 powerful improvement goals based on common leadership challenges."; break;
    case 'column2': focusInstruction = `Based on the goal "${currentData.column1}", suggest 3 things a person might do or not do that prevents this goal.`; break;
    case 'column3_worries': focusInstruction = `Based on the behaviors "${currentData.column2}", what might be the deep underlying worry or fear (The 'Worries Box')? Provide 2-3 examples.`; break;
    case 'column3_commitments': focusInstruction = `Based on the worry "${currentData.column3_worries}", what is the competing hidden commitment (e.g., 'I am committed to not looking foolish')?`; break;
    case 'column4': focusInstruction = `Based on the hidden commitment "${currentData.column3_commitments}", what is the Big Assumption being made (e.g., 'If I delegate, things will fall apart')?`; break;
  }

  const prompt = `
    Context: Immunity to Change map (Kegan & Lahey).
    Task: ${focusInstruction}
    Language: Hebrew.
    Format: Bullet points.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    return "לא ניתן ליצור הצעות כרגע.";
  }
};