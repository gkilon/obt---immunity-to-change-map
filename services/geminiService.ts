
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { OBTData } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("MISSING_ENV_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeOBTMap = async (data: OBTData, lang: 'he' | 'en' = 'he'): Promise<string> => {
  try {
    const ai = getAiClient();
    const systemInstruction = `
      You are an expert organizational psychologist specializing in the OBT Map (One Big Thing) model.
      Your goal is to review the user's map and help them deepen their logic.
      Respond in ${lang === 'he' ? 'Hebrew' : 'English'}.
    `;
    const prompt = `
      Current OBT Map Details:
      1. One Big Thing (Goal): ${data.column1 || "Empty"}
      2. Counter-productive Behaviors: ${data.column2 || "Empty"}
      3. Worry Box: ${data.column3_worries || "Empty"}
      4. Competing Commitments: ${data.column3_commitments || "Empty"}
      5. Big Assumptions: ${data.column4 || "Empty"}

      Task: Provide a strategic overview of the map's consistency and depth.
    `;
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction }
    });
    return response.text || "No response.";
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
};

export const generateStepSuggestion = async (type: 'small' | 'big', data: OBTData, lang: 'he' | 'en' = 'he'): Promise<string> => {
  try {
    const ai = getAiClient();
    const isSmall = type === 'small';
    const systemInstruction = `
      You are an expert OBT Coach. Based on the user's OBT map, suggest specific progress examples.
      Type: ${isSmall ? 'SMALL PROGRESS (Safe experiments, noticing behaviors)' : 'SIGNIFICANT PROGRESS (Challenging core assumptions, habit change)'}.
      Respond in ${lang === 'he' ? 'Hebrew' : 'English'}.
    `;
    const prompt = `
      OBT Map Summary:
      Goal: ${data.column1}
      Competing Commitment: ${data.column3_commitments}
      Big Assumption: ${data.column4}
      
      Give 3 practical examples of how ${isSmall ? 'Small Progress' : 'Significant Progress'} would look like in terms of "Expectations vs Results".
    `;
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction }
    });
    return response.text || "";
  } catch (error: any) {
    return "Error generating suggestions.";
  }
};

export const generateSuggestions = async (field: keyof OBTData, currentData: OBTData, lang: 'he' | 'en' = 'he'): Promise<string> => {
  try {
    const ai = getAiClient();
    let context = "";
    let task = "";
    switch(field) {
      case 'column1':
        task = `Suggest 3 examples of powerful "One Big Thing" goals.`;
        break;
      case 'column2':
        context = `Goal: "${currentData.column1}"`;
        task = `Suggest 3 counter-productive behaviors.`;
        break;
      case 'column3_worries':
        context = `Behaviors: "${currentData.column2}"`;
        task = `Suggest 3 worries that might arise if stopping these behaviors.`;
        break;
      case 'column3_commitments':
        context = `Worry: "${currentData.column3_worries}"`;
        task = `Suggest 3 Competing Commitments (Hidden motivations).`;
        break;
      case 'column4':
        context = `Competing Commitment: "${currentData.column3_commitments}"`;
        task = `Suggest 3 Big Assumptions that hold this immunity in place.`;
        break;
    }
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: task,
      config: {
        systemInstruction: `Expert OBT Coach. Language: ${lang === 'he' ? 'Hebrew' : 'English'}. Context: ${context}`
      }
    });
    return response.text || "";
  } catch (error: any) {
    throw error;
  }
};
