
export interface ProgressRow {
  id: string;
  assumption: string;
  topic: string;
  smallStep: string;
  significantStep: string;
}

export interface OBTData {
  column1: string; 
  column2: string; 
  column3_worries: string; 
  column3_commitments: string; 
  column4: string; 
  progressRows?: ProgressRow[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
