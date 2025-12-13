import React, { useState, useEffect, useRef } from 'react';
import { ITCData, AnalysisStatus } from './types';
import { analyzeITCMap, generateSuggestions, testApiConnection } from './services/geminiService';
import { TextAreaField } from './components/TextAreaField';
import { FileDown, BrainCircuit, RefreshCw, AlertCircle, Sparkles, LogIn, LogOut, Cloud, X, Mail, Lock, ShieldAlert, ShieldCheck, Layout } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Default empty state
const INITIAL_DATA: ITCData = {
  column1: '',
  column2: '',
  column3_worries: '',
  column3_commitments: '',
  column4: ''
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<ITCData>(INITIAL_DATA);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isRemoteUpdate = useRef(false);
  
  // Auth Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [aiStatus, setAiStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        const saved = localStorage.getItem('obt_itc_data');
        if (saved) setData(JSON.parse(saved));
        setIsDataLoaded(true);
      } else {
        setShowLoginModal(false);
        setEmail('');
        setPassword('');
        setAuthError('');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Firestore Real-time Listener (Read)
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data() as ITCData;
        setData(prev => {
           if (JSON.stringify(prev) !== JSON.stringify(remoteData)) {
             isRemoteUpdate.current = true;
             return remoteData;
           }
           return prev;
        });
      }
      setIsDataLoaded(true);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Auto-Save to Firestore (Write)
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    const saveData = async () => {
      setIsSaving(true);
      try {
        await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      } catch (error) {
        console.error("Error saving data:", error);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    };
    const timeoutId = setTimeout(saveData, 800); 
    return () => clearTimeout(timeoutId);
  }, [data, user, isDataLoaded]);

  // 4. Local Storage Backup
  useEffect(() => {
    if (!user && isDataLoaded) {
      localStorage.setItem('obt_itc_data', JSON.stringify(data));
    }
  }, [data, user, isDataLoaded]);

  const updateField = (field: keyof ITCData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Auth Handlers
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setAuthError('');
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setAuthError("התחברות נכשלה.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      if (authMode === 'register') await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError("שגיאה בפרטי ההתחברות.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("האם להתנתק מהמערכת?")) {
      await signOut(auth);
      setData(INITIAL_DATA);
    }
  };

  const handleAnalysis = async () => {
    setAiStatus(AnalysisStatus.LOADING);
    setAiMessage('');
    try {
      const result = await analyzeITCMap(data);
      setAiMessage(result);
      setAiStatus(AnalysisStatus.SUCCESS);
    } catch (e: any) {
      setAiMessage(e.message || "אירעה שגיאה.");
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const handleGenerateSuggestion = async (field: keyof ITCData) => {
    setAiStatus(AnalysisStatus.LOADING);
    setActiveSuggestion("המאמן הדיגיטלי חושב על רעיונות עבורך...");
    try {
      const suggestion = await generateSuggestions(field, data);
      setActiveSuggestion(suggestion);
      setAiStatus(AnalysisStatus.IDLE);
    } catch (e: any) {
      setActiveSuggestion(`שגיאה:\n${e.message}`);
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const handleTestConnection = async () => {
    setAiStatus(AnalysisStatus.LOADING);
    setAiMessage('בודק חיבור...');
    const result = await testApiConnection();
    setAiMessage(result.message);
    setAiStatus(result.success ? AnalysisStatus.SUCCESS : AnalysisStatus.ERROR);
  };

  const closeAiMessage = () => {
    setAiMessage('');
    setAiStatus(AnalysisStatus.IDLE);
  };

  const clearData = () => {
    if (confirm('האם אתה בטוח? הנתונים יימחקו.')) {
      setData(INITIAL_DATA);
      setAiMessage('');
      setActiveSuggestion(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 relative bg-onyx-900 text-onyx-200">
      
      {/* Background Ambience - Softer and more diffused */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-bronze-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-onyx-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* --- HEADER --- */}
      <header className="bg-onyx-900/90 backdrop-blur-md border-b border-onyx-700/50 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="bg-onyx-800 p-2.5 rounded-lg border border-onyx-700 shadow-sm text-bronze-500">
               <Layout size={24} strokeWidth={1.5} />
             </div>
             <div>
               <h1 className="text-2xl font-normal text-onyx-100 tracking-tight leading-none">OBT <span className="text-onyx-600 font-light mx-1">|</span> <span className="font-light tracking-wide text-onyx-300">Workspace</span></h1>
               <div className="flex items-center gap-3 mt-1">
                 {user && (
                   <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-all border ${isSaving ? 'bg-bronze-500/10 border-bronze-500/30 text-bronze-300' : 'bg-onyx-800 border-onyx-700 text-onyx-400'}`}>
                     <Cloud size={10} /> {isSaving ? 'SYNCING...' : 'SYNCED'}
                   </span>
                 )}
               </div>
             </div>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Auth Buttons */}
            {!user ? (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-onyx-200 text-onyx-900 px-6 py-2 rounded hover:bg-white transition-all font-medium text-sm shadow-sm transform hover:-translate-y-0.5">
                <LogIn size={16} />
                <span>כניסה</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-onyx-800 rounded pl-1 pr-4 py-1 border border-onyx-700">
                 <div className="hidden md:block text-right mr-2">
                    <p className="text-[10px] text-bronze-500 font-bold uppercase tracking-wider">משתמש מחובר</p>
                    <p className="text-xs font-medium text-onyx-300 leading-none">{user.email?.split('@')[0]}</p>
                 </div>
                 <button onClick={handleLogout} className="bg-onyx-700 hover:bg-red-900/30 text-onyx-400 hover:text-red-300 p-2 rounded transition-colors" title="התנתק">
                   <LogOut size={14} />
                 </button>
              </div>
            )}

            <div className="h-6 w-px bg-onyx-700 mx-2 hidden sm:block"></div>

            <button 
              onClick={handleAnalysis} 
              disabled={aiStatus === AnalysisStatus.LOADING}
              className="flex items-center gap-2 bg-bronze-700 hover:bg-bronze-600 text-white px-5 py-2 rounded transition-all shadow-lg shadow-black/10 font-medium text-sm disabled:opacity-50 disabled:grayscale border border-bronze-600/50"
            >
              {aiStatus === AnalysisStatus.LOADING ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
              <span className="hidden sm:inline">ניתוח AI</span>
            </button>
            
             <button onClick={() => window.print()} className="bg-onyx-800 hover:bg-onyx-700 text-onyx-400 border border-onyx-700 px-3 py-2 rounded transition-all">
              <FileDown size={18} />
            </button>
             <button onClick={clearData} className="bg-onyx-800 hover:bg-red-900/20 text-onyx-400 hover:text-red-400 border border-onyx-700 px-3 py-2 rounded transition-all">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-10 sm:px-6 lg:px-8">
        
        {/* Guest Warning */}
        {!user && (
          <div className="max-w-3xl mx-auto bg-onyx-800/50 border border-onyx-700 p-4 mb-10 rounded-lg backdrop-blur-sm flex items-center justify-center gap-3 text-center shadow-sm">
             <AlertCircle className="h-4 w-4 text-bronze-500 shrink-0" />
               <p className="text-sm text-onyx-300 font-light">
                 מצב אורח פעיל. <button onClick={() => setShowLoginModal(true)} className="underline font-medium hover:text-white">התחבר למערכת</button> לשמירה קבועה בענן.
               </p>
           </div>
        )}
        
        {/* AI Feedback Area */}
        {(aiMessage || aiStatus === AnalysisStatus.LOADING) && (
           <div className="max-w-5xl mx-auto mb-16 animate-fade-in relative z-20">
             <div className={`bg-onyx-800 rounded-lg border relative overflow-hidden shadow-lg ${aiStatus === AnalysisStatus.ERROR ? 'border-red-900/30' : 'border-bronze-500/20'}`}>
                {/* Decorative stripe */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-onyx-800 via-bronze-600 to-onyx-800 opacity-60"></div>
                
                <button onClick={closeAiMessage} className="absolute top-4 left-4 p-2 text-onyx-500 hover:text-white transition-all z-20"><X size={20} /></button>
                <div className="p-8 md:p-10">
                  <h2 className="text-lg font-medium mb-6 flex items-center gap-3 text-onyx-100 border-b border-onyx-700 pb-4 tracking-wide">
                    {aiStatus === AnalysisStatus.LOADING ? (
                      <><RefreshCw className="animate-spin text-bronze-500" size={20} /> מעבד נתונים...</>
                    ) : aiStatus === AnalysisStatus.ERROR ? (
                      <><AlertCircle className="text-red-500" size={20} /> שגיאת מערכת</>
                    ) : (
                      <><BrainCircuit className="text-bronze-500" size={20} /> ניתוח מפה</>
                    )}
                  </h2>
                  <div className="prose prose-invert max-w-none text-onyx-300 leading-loose text-lg font-light whitespace-pre-wrap">
                    {aiMessage || "אנא המתן..."}
                  </div>
                </div>
             </div>
           </div>
        )}

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[750px] items-start">
          
          {/* COLUMN 1 */}
          <div className="flex flex-col bg-onyx-800 rounded-lg border border-onyx-700/60 hover:border-bronze-500/30 transition-colors duration-300 group h-full shadow-card">
            <div className="p-6 border-b border-onyx-700/60 flex justify-between items-start relative overflow-hidden">
               <div>
                 <h2 className="font-medium text-onyx-100 text-lg tracking-wide">מטרת השיפור</h2>
                 <p className="text-[10px] text-bronze-500 font-bold uppercase tracking-[0.2em] mt-2">המחויבות הגלויה</p>
               </div>
               <span className="font-bold text-onyx-700/20 text-8xl leading-none absolute -bottom-6 -left-4 select-none group-hover:text-onyx-700/30 transition-colors duration-500">1</span>
            </div>
            <div className="flex-1 p-2">
              <TextAreaField 
                label="" 
                subLabel="למה אני מחויב? מה הדבר שאני הכי רוצה לשנות בהתנהלות שלי?"
                value={data.column1}
                onChange={(val) => updateField('column1', val)}
                placeholder="..."
                onAutoGenerate={() => handleGenerateSuggestion('column1')}
                aiButtonText="עזרה בניסוח מטרת השיפור"
                heightClass="h-[550px]"
              />
            </div>
          </div>

          {/* COLUMN 2 */}
          <div className="flex flex-col bg-onyx-800 rounded-lg border border-onyx-700/60 hover:border-bronze-500/30 transition-colors duration-300 group h-full shadow-card">
            <div className="p-6 border-b border-onyx-700/60 flex justify-between items-start relative overflow-hidden">
               <div>
                 <h2 className="font-medium text-onyx-100 text-lg tracking-wide">מה אני עושה?</h2>
                 <p className="text-[10px] text-bronze-500 font-bold uppercase tracking-[0.2em] mt-2">התנהגויות מעכבות</p>
               </div>
               <span className="font-bold text-onyx-700/20 text-8xl leading-none absolute -bottom-6 -left-4 select-none group-hover:text-onyx-700/30 transition-colors duration-500">2</span>
            </div>
            <div className="flex-1 p-2">
              <TextAreaField 
                label="" 
                subLabel="מה אני עושה (או לא עושה) שמונע את השגת המטרה?"
                value={data.column2}
                onChange={(val) => updateField('column2', val)}
                placeholder="..."
                onAutoGenerate={() => handleGenerateSuggestion('column2')}
                aiButtonText="עזרה בזיהוי התנהגויות מעכבות"
                heightClass="h-[550px]"
              />
            </div>
          </div>

          {/* COLUMN 3: SPLIT */}
          <div className="flex flex-col rounded-lg border border-onyx-700/60 overflow-hidden h-full shadow-card bg-onyx-800">
             
            {/* WORRIES (Top Half) */}
            <div className="flex-1 flex flex-col p-6 relative group border-b border-onyx-700/60">
              <div className="absolute inset-0 bg-gradient-to-b from-red-900/5 to-transparent pointer-events-none"></div>
              {/* Added shrink-0 and reduced margin to ensure header stays compact */}
              <div className="flex justify-between items-center mb-2 shrink-0 relative z-10">
                 <div className="flex items-center gap-3">
                   <div className="text-red-400/80"><ShieldAlert size={18} /></div>
                   <h2 className="font-medium text-onyx-100 text-lg tracking-wide">תיבת הדאגות</h2>
                 </div>
                 <span className="font-bold text-onyx-700/20 text-6xl leading-none select-none">3a</span>
              </div>
              
              {/* Added flex-1 and min-h-0 wrapper for TextAreaField to fill remaining space properly */}
              <div className="flex-1 min-h-0 relative z-10">
                <TextAreaField 
                    label="" 
                    subLabel="דמיין שאתה עושה את ההפך מטור 2. מה הדבר המפחיד ביותר שעלול לקרות?"
                    value={data.column3_worries}
                    onChange={(val) => updateField('column3_worries', val)}
                    placeholder="..."
                    onAutoGenerate={() => handleGenerateSuggestion('column3_worries')}
                    aiButtonText="עזרה בזיהוי הדאגה החוסמת"
                    heightClass="h-full"
                />
              </div>
            </div>

            {/* HIDDEN COMMITMENTS (Bottom Half) */}
            <div className="flex-1 flex flex-col p-6 relative group">
               <div className="absolute inset-0 bg-gradient-to-t from-bronze-900/5 to-transparent pointer-events-none"></div>
               {/* Added shrink-0 and reduced margin */}
               <div className="flex justify-between items-center mb-2 shrink-0 relative z-10">
                   <div className="flex items-center gap-3">
                     <div className="text-bronze-500"><ShieldCheck size={18} /></div>
                     <h2 className="font-medium text-onyx-100 text-lg tracking-wide">מחויבות נסתרת</h2>
                   </div>
                   <span className="font-bold text-onyx-700/20 text-6xl leading-none select-none">3b</span>
               </div>
               
              {/* Added flex-1 and min-h-0 wrapper */}
              <div className="flex-1 min-h-0 relative z-10">
                <TextAreaField 
                    label="" 
                    subLabel="כדי לא להרגיש את הדאגה הזו, למה אני מחויב באמת?"
                    value={data.column3_commitments}
                    onChange={(val) => updateField('column3_commitments', val)}
                    placeholder="..."
                    onAutoGenerate={() => handleGenerateSuggestion('column3_commitments')}
                    aiButtonText="עזרה בהבנת הרווח הסמוי (מחויבות)"
                    heightClass="h-full"
                />
              </div>
            </div>
          </div>

          {/* COLUMN 4 */}
          <div className="flex flex-col bg-onyx-800 rounded-lg border border-onyx-700/60 hover:border-bronze-500/30 transition-all duration-300 group h-full shadow-card relative overflow-hidden">
             {/* Subtle gradient overlay */}
             <div className="absolute inset-0 bg-gradient-to-br from-onyx-800 to-onyx-900 pointer-events-none -z-10"></div>
            
            <div className="p-6 border-b border-onyx-700/60 flex justify-between items-start relative">
               <div>
                 <h2 className="font-medium text-onyx-100 text-lg tracking-wide">הנחות יסוד</h2>
                 <p className="text-[10px] text-bronze-500 font-bold uppercase tracking-[0.2em] mt-2">התפיסה המקבעת</p>
               </div>
               <span className="font-bold text-onyx-700/20 text-8xl leading-none absolute -bottom-6 -left-4 select-none group-hover:text-onyx-700/30 transition-colors duration-500">4</span>
            </div>
            <div className="flex-1 p-2">
              <TextAreaField 
                label="" 
                subLabel="מה אני מניח על העולם שגורם למחויבות הנסתרת להרגיש כמו אמת מוחלטת?"
                value={data.column4}
                onChange={(val) => updateField('column4', val)}
                placeholder="..."
                onAutoGenerate={() => handleGenerateSuggestion('column4')}
                aiButtonText="עזרה בניסוח הנחות היסוד"
                heightClass="h-[550px]"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-20 border-t border-onyx-800 pt-8 text-center">
          <p className="text-onyx-500 text-xs tracking-widest uppercase">OBT System | Based on Kegan & Lahey</p>
        </div>
      </main>

      {/* Suggestions Modal */}
      {activeSuggestion && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-onyx-800 rounded-lg border border-onyx-700 shadow-2xl max-w-lg w-full p-0 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-onyx-900 p-6 flex justify-between items-center border-b border-onyx-700">
               <h3 className="text-lg font-medium text-onyx-100 flex items-center gap-3 tracking-wide">
                 <Sparkles size={18} className="text-bronze-500" /> המאמן מציע
               </h3>
               <button onClick={() => setActiveSuggestion(null)} className="text-onyx-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-onyx-800">
              <div className="prose prose-invert prose-lg max-w-none text-onyx-200 whitespace-pre-wrap leading-relaxed font-light">
                {activeSuggestion}
              </div>
            </div>
            
            <div className="p-6 border-t border-onyx-700 bg-onyx-900 text-center">
              <button onClick={() => setActiveSuggestion(null)} className="bg-onyx-100 text-onyx-900 hover:bg-white px-8 py-2 rounded font-bold transition-all shadow-lg transform hover:-translate-y-0.5 text-sm uppercase tracking-wider">
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-onyx-800 rounded-lg border border-onyx-700 shadow-2xl max-w-md w-full p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-bronze-600 to-onyx-800"></div>
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 left-4 text-onyx-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
              
              <div className="text-center mb-10">
                <div className="bg-onyx-900 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm border border-onyx-700">
                  <LogIn className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-medium text-onyx-100 tracking-wide">
                  {authMode === 'login' ? 'כניסה למערכת' : 'יצירת חשבון'}
                </h3>
                <p className="text-onyx-400 mt-3 text-sm font-light">
                  {authMode === 'login' ? 'התחבר כדי לגשת למפה שלך' : 'הצטרף אלינו כדי לשמור את ההתקדמות שלך'}
                </p>
              </div>

              {authError && (
                <div className="bg-red-900/10 text-red-300 text-sm p-4 rounded mb-6 flex items-start gap-3 border border-red-500/20">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-onyx-400 mb-2 uppercase tracking-wider">אימייל</label>
                  <div className="relative group">
                    <Mail className="absolute right-4 top-3.5 text-onyx-500 group-focus-within:text-bronze-500 transition-colors" size={18} />
                    <input 
                      type="email" 
                      required
                      className="w-full pr-12 pl-4 py-3 border border-onyx-700 rounded bg-onyx-900 focus:border-bronze-500/50 outline-none transition-all text-white placeholder-onyx-600 font-light"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-onyx-400 mb-2 uppercase tracking-wider">סיסמה</label>
                  <div className="relative group">
                    <Lock className="absolute right-4 top-3.5 text-onyx-500 group-focus-within:text-bronze-500 transition-colors" size={18} />
                    <input 
                      type="password" 
                      required
                      className="w-full pr-12 pl-4 py-3 border border-onyx-700 rounded bg-onyx-900 focus:border-bronze-500/50 outline-none transition-all text-white placeholder-onyx-600 font-light"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-onyx-100 hover:bg-white text-onyx-900 py-3 rounded font-bold shadow-lg transition-all flex justify-center items-center gap-2 mt-6 uppercase tracking-wider text-sm"
                >
                  {authLoading ? <RefreshCw className="animate-spin" size={18} /> : (authMode === 'login' ? 'התחבר' : 'הרשמה')}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-onyx-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-onyx-800 text-onyx-500 font-light text-xs uppercase">או באמצעות</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                type="button"
                className="w-full bg-onyx-900 border border-onyx-700 text-onyx-300 hover:bg-onyx-700 hover:text-white font-medium py-3 rounded transition-all flex items-center justify-center gap-3 text-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100" alt="Google" />
                Google
              </button>

              <div className="mt-8 text-center text-sm text-onyx-400 font-light">
                {authMode === 'login' ? (
                  <>
                    אין לך חשבון?{' '}
                    <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-bronze-500 hover:text-bronze-400 font-medium underline">
                      הירשם
                    </button>
                  </>
                ) : (
                  <>
                    יש לך חשבון?{' '}
                    <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-bronze-500 hover:text-bronze-400 font-medium underline">
                      התחבר
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default App;