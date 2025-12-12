import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ITCData } from '../types';
import { GOOGLE_GENAI_API_KEY } from '../config';

// ============================================================================
// 🔑 Gemini API Setup
// ============================================================================

const getAiClient = () => {
  let apiKey = GOOGLE_GENAI_API_KEY;

  // בדיקה אם המפתח הוא עדיין ברירת המחדל
  const isDefaultKey = !apiKey || apiKey === "YOUR_API_KEY_HERE";

  // נסיון חלופי: משתני סביבה (אם קיימים בסביבת הפיתוח)
  if (isDefaultKey) {
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env?.API_KEY) {
        // @ts-ignore
        apiKey = process.env.API_KEY;
      }
    } catch (e) {
      // process is not defined
    }
  }

  // אם עדיין אין מפתח תקין, החזר null (מצב הדגמה)
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    return null; 
  }
  
  return new GoogleGenAI({ apiKey });
};

// Main analysis of the whole map
export const analyzeITCMap = async (data: ITCData): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // DEMO MODE: If no API key, return a simulation
    if (!ai) {
      return `[מצב הדגמה - חסר מפתח API]
      
לא הוגדר מפתח Gemini API בקובץ config.ts.
כדי לקבל ניתוח אמיתי:
1. פתח את הקובץ config.ts
2. הדבק שם את המפתח שלך.

הנה ניתוח לדוגמה:
המפה שלך מראה התחלה טובה. הפער הלוגי המרכזי נמצא בין טור 2 (התנהגויות) לטור 3 (דאגות).
שאלת מפתח: האם הדאגה שציינת בטור 3 היא באמת הדבר הכי גרוע שיקרה אם תפסיק את ההתנהגות בטור 2?`;
    }
    
    const systemInstruction = `
      You are an expert organizational psychologist specializing in Robert Kegan and Lisa Lahey's "Immunity to Change" model.
      Your goal is to review the user's map and help them deepen their logic.
      Be supportive, challenging, and concise. Write in Hebrew.
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
      - If Column 1 is present but 2 is empty, ask: "What are you doing instead of your goal?"
      - If Column 2 is present but 3 is empty, ask: "Imagine doing the opposite of Col 2 - what is the scary feeling that comes up?"
      - If Column 3 is present, check if the Commitment (Part B) actually protects against the Worry (Part A).
      - If Column 4 is present, check if it truly makes the Commitment necessary.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "לא התקבלה תשובה מהמודל.";
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return `שגיאה: ${error.message || "תקלה בתקשורת עם ה-AI"}`;
  }
};

// Context-aware suggestions for specific fields
export const generateSuggestions = async (field: keyof ITCData, currentData: ITCData): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // DEMO MODE
    if (!ai) {
      return `[מצב הדגמה] חסר מפתח API.
נא לעדכן את הקובץ config.ts עם המפתח שלך כדי לקבל הצעות אמיתיות.`;
    }

    let context = "";
    let task = "";

    switch(field) {
      case 'column1': // Goal
        task = `
          The user is starting the process.
          Suggest 3 examples of powerful, adaptive "Improvement Goals" (מטרת השיפור) formatted as: "אני מחויב ל..." (I am committed to...).
          Examples should cover: Delegation, Work-Life Balance, or Assertiveness.
        `;
        break;

      case 'column2': // Doing/Not Doing
        context = `User's Goal (Col 1): "${currentData.column1}"`;
        task = `
          The user wants to achieve the goal above but isn't succeeding yet.
          Suggest 3 specific behaviors (what they are doing or NOT doing) that effectively work AGAINST this goal.
          Format: "במקום זאת, אני..." (Instead, I...).
          Example logic: If goal is delegation, behavior might be "I micromanage every email".
        `;
        break;

      case 'column3_worries': // Worries
        context = `User's Behaviors (Col 2): "${currentData.column2}"`;
        task = `
          We need to find the "Immunity".
          Ask the user to imagine doing the OPPOSITE of their behaviors listed above.
          Suggest 3 distinct "Worries" or "Fears" that might arise if they stopped those behaviors.
          Format: "אני דואג ש..." (I am worried that...).
          Focus on deep fears: rejection, loss of control, looking incompetent.
        `;
        break;

      case 'column3_commitments': // Hidden Commitments
        context = `User's Worry (Col 3 Part A): "${currentData.column3_worries}"`;
        task = `
          Based on the specific worry above, what is the Hidden Commitment that protects the user?
          This represents the "Immune System".
          Suggest 3 Hidden Commitments.
          Format: "אני מחויב ל..." (I am committed to [preventing the worry]).
          Logic: If worry is "loss of control", commitment is "I am committed to being in control at all times".
        `;
        break;

      case 'column4': // Big Assumptions
        context = `User's Hidden Commitment (Col 3 Part B): "${currentData.column3_commitments}"`;
        task = `
          What is the "Big Assumption" that makes the hidden commitment above feel like an absolute truth?
          Suggest 3 assumptions that anchor this commitment.
          Format: "אני מניח ש..." (I assume that...).
          Logic: If commitment is "staying in control", assumption is "I assume that if I lose control, the project will fail and I will be fired".
        `;
        break;
    }

    const systemInstruction = `
      Role: You are an expert Immunity to Change Coach.
      Language: Hebrew.
      Context: ${context}
      
      Output instructions:
      - Provide exactly 3 bullet points.
      - Keep them short and punchy.
      - Directly relate to the input context provided.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: task,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    
    return response.text || "לא התקבלה תשובה.";
  } catch (error: any) {
    console.error("Gemini Suggestion Error:", error);
    // Throwing here so the UI catches it in the modal
    throw new Error(error.message || "שגיאה ביצירת הצעות");
  }
};