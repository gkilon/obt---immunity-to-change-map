export interface ITCData {
  column1: string; // מטרת השיפור (Improvement Goal)
  column2: string; // מה אני עושה/לא עושה (Doing/Not Doing)
  column3_worries: string; // תיבת הדאגות (Worries Box)
  column3_commitments: string; // מחויבות נסתרת (Hidden Commitments)
  column4: string; // הנחות יסוד (Big Assumptions)
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}