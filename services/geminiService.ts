import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ITCData } from '../types';
import { GOOGLE_GENAI_API_KEY } from '../config';

// ============================================================================
// 🔑 Gemini API Setup
// ============================================================================

const getAiClient = () => {
  // 1. Priority: Check Local Storage (User entered via UI)
  // This is the safest way for client-side apps to avoid exposing keys in code
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.length > 10) {
      return new GoogleGenAI({ apiKey: localKey });
    }
  }

  // 2. Fallback: Environment Variable (Injected by Vite)
  let apiKey = process.env.API_KEY;
  
  // 3. Fallback: Config file (Not recommended for production, but kept for legacy)
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    if (GOOGLE_GENAI_API_KEY && GOOGLE_GENAI_API_KEY !== "YOUR_API_KEY_HERE" && GOOGLE_GENAI_API_KEY !== "") {
      apiKey = GOOGLE_GENAI_API_KEY;
    }
  }
  
  if (!apiKey || apiKey === "undefined") {
    // We don't return null here anymore to allow the UI to catch the specific error
    // But connection test will fail gracefully
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

// Helper to translate errors
const formatError = (error: any): string => {
  const msg = error.message || error.toString();
  
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('disabled')) {
    return '⛔ שגיאת הרשאה (403): ה-API של גוגל חסום או שהמפתח נפסל.\nפתרון: צור מפתח חדש ב-Google AI Studio והזן אותו בהגדרות האתר.';
  }
  
  if (msg.includes('400') || msg.includes('INVALID_ARGUMENT') || msg.includes('API key not valid')) {
    return '🔑 מפתח לא תקין (400): המפתח שהוזן שגוי.\nפתרון: בדוק בהגדרות (גלגל שיניים) שהעתקת את המפתח במלואו.';
  }

  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return '⏳ עומס / מכסה (429): חרגת ממכסת הבקשות החינמית לדקה/יום.\nפתרון: המתן מספר דקות ונסה שוב.';
  }
  
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return '🌐 שגיאת רשת: לא ניתן להתחבר לשרתי גוגל. בדוק את חיבור האינטרנט שלך.';
  }

  return `שגיאה לא ידועה: ${msg}`; // Return original if unknown
};

// --- Diagnostic Tool ---
export const testApiConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return { success: false, message: "לא מוגדר מפתח API. אנא לחץ על כפתור ההגדרות (⚙️) והזן את המפתח שלך." };
    }
    
    // Minimal request to test connection
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Test connection',
    });
    
    return { success: true, message: "✅ חיבור תקין! המפתח נשמר ועובד מצוין." };
  } catch (error: any) {
    return { success: false, message: formatError(error) };
  }
};

// Main analysis of the whole map
export const analyzeITCMap = async (data: ITCData): Promise<string> => {
  try {
    const ai = getAiClient();
    
    if (!ai) {
      return `שגיאה: מפתח API חסר.
נא ללחוץ על כפתור ההגדרות (⚙️) בראש העמוד ולהזין את מפתח ה-Gemini שלך.`;
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
    return `תקלה בקבלת תשובה:\n${formatError(error)}`;
  }
};

// Context-aware suggestions for specific fields
export const generateSuggestions = async (field: keyof ITCData, currentData: ITCData): Promise<string> => {
  try {
    const ai = getAiClient();
    
    if (!ai) {
      throw new Error("מפתח API חסר. הגדר אותו בהגדרות (⚙️).");
    }

    let context = "";
    let task = "";

    switch(field) {
      case 'column1': // Goal
        task = `
          The user is starting the process.
          Suggest 3 examples of powerful, adaptive "Improvement Goals" (מטרת השיפור) formatted as: "אני מחויב ל..." (I am committed to...).
          Examples should cover common leadership or personal challenges.
        `;
        break;

      case 'column2': // Doing/Not Doing
        context = `User's Goal (Col 1): "${currentData.column1}"`;
        task = `
          The user wants to achieve the goal above but isn't succeeding yet.
          Suggest 3 specific behaviors (what they are doing or NOT doing) that effectively work AGAINST this goal.
          Format: "במקום זאת, אני..." (Instead, I...).
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
    throw new Error(formatError(error));
  }
};