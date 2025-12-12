import React, { useState, useEffect } from 'react';
import { ITCData, AnalysisStatus } from './types';
import { analyzeITCMap, generateSuggestions, testApiConnection } from './services/geminiService';
import { TextAreaField } from './components/TextAreaField';
import { FileDown, BrainCircuit, RefreshCw, AlertCircle, Sparkles, LogIn, LogOut, Cloud, X, Mail, Lock, ShieldAlert, ShieldCheck, Activity, Settings, Key, CheckCircle } from 'lucide-react';
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
  
  // Auth Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Settings / API Key Modal
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isEnvKey, setIsEnvKey] = useState(false);

  const [aiStatus, setAiStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  // Check for API Key on mount (Local Storage OR Environment Variable)
  useEffect(() => {
    // 1. Check Local Storage (Manual Override)
    const storedKey = localStorage.getItem('gemini_api_key');
    
    // 2. Check Environment Variable (Netlify/Vite)
    const envKey = process.env.API_KEY;

    if (storedKey && storedKey.length > 10) {
      setApiKeyInput(storedKey);
      setHasKey(true);
      setIsEnvKey(false);
    } else if (envKey && envKey.length > 10 && envKey !== "undefined") {
      setHasKey(true);
      setIsEnvKey(true);
    }
  }, []);

  // Save API Key
  const handleSaveKey = () => {
    if (apiKeyInput.trim().length < 10) {
      alert("אנא הזן מפתח API תקין");
      return;
    }
    localStorage.setItem('gemini_api_key', apiKeyInput.trim());
    setHasKey(true);
    setIsEnvKey(false);
    setShowSettings(false);
    handleTestConnection(); // Auto test after save
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKeyInput('');
    // Re-check env key
    const envKey = process.env.API_KEY;
    if (envKey && envKey.length > 10 && envKey !== "undefined") {
       setHasKey(true);
       setIsEnvKey(true);
       setAiMessage('חזרנו להשתמש במפתח המערכת (Netlify).');
    } else {
       setHasKey(false);
       setIsEnvKey(false);
       setAiMessage('מפתח ה-API הוסר בהצלחה.');
    }
    setAiStatus(AnalysisStatus.IDLE);
  };

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Fallback to local storage if not logged in
        const saved = localStorage.getItem('obt_itc_data');
        if (saved) setData(JSON.parse(saved));
        setIsDataLoaded(true);
      } else {
        // Close modal on successful login
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
             return remoteData;
           }
           return prev;
        });
      }
      setIsDataLoaded(true);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Auto-Save to Firestore (Write) with Debounce
  useEffect(() => {
    if (!user || !isDataLoaded) return;

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

    const timeoutId = setTimeout(saveData, 1000); // Debounce 1s
    return () => clearTimeout(timeoutId);
  }, [data, user, isDataLoaded]);

  // 4. Local Storage Backup (for Guest mode)
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
      console.error("Google Login failed", error);
      setAuthError("התחברות נכשלה. אנא נסה שוב.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth error", error);
      let msg = "אירעה שגיאה. נסה שנית.";
      if (error.code === 'auth/wrong-password') msg = "סיסמה שגויה.";
      if (error.code === 'auth/user-not-found') msg = "משתמש לא נמצא.";
      if (error.code === 'auth/email-already-in-use') msg = "האימייל כבר קיים.";
      setAuthError(msg);
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
    if (!hasKey) {
      setShowSettings(true);
      setAiMessage("אנא הזן מפתח API כדי להשתמש ביכולות ה-AI.");
      setAiStatus(AnalysisStatus.ERROR);
      return;
    }
    setAiStatus(AnalysisStatus.LOADING);
    setAiMessage('');
    try {
      const result = await analyzeITCMap(data);
      setAiMessage(result);
      setAiStatus(AnalysisStatus.SUCCESS);
    } catch (e: any) {
      setAiMessage(e.message || "אירעה שגיאה בניתוח הנתונים.");
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const handleGenerateSuggestion = async (field: keyof ITCData) => {
    if (!hasKey) {
       setShowSettings(true);
       alert("יש להגדיר מפתח API תחילה");
       return;
    }
    setAiStatus(AnalysisStatus.LOADING);
    setActiveSuggestion("המאמן הדיגיטלי חושב על רעיונות עבורך...");
    try {
      const suggestion = await generateSuggestions(field, data);
      setActiveSuggestion(suggestion);
      setAiStatus(AnalysisStatus.IDLE);
    } catch (e: any) {
      setActiveSuggestion(`שגיאה בקבלת הצעות:\n${e.message}`);
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const handleTestConnection = async () => {
    if (!hasKey) {
      setShowSettings(true);
      return;
    }
    setAiStatus(AnalysisStatus.LOADING);
    setAiMessage('בודק חיבור לשרתי גוגל...');
    const result = await testApiConnection();
    setAiMessage(result.message);
    setAiStatus(result.success ? AnalysisStatus.SUCCESS : AnalysisStatus.ERROR);
  };

  const closeAiMessage = () => {
    setAiMessage('');
    setAiStatus(AnalysisStatus.IDLE);
  };

  const clearData = () => {
    if (confirm('האם אתה בטוח שברצונך לנקות את הטופס?')) {
      setData(INITIAL_DATA);
      setAiMessage('');
      setActiveSuggestion(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-brand-600 p-2.5 rounded-xl shadow-lg shadow-brand-500/20 text-white">
               <BrainCircuit size={26} strokeWidth={2.5} />
             </div>
             <div>
               <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">OBT</h1>
               <div className="flex items-center gap-2">
                 <p className="text-slate-500 text-sm font-medium tracking-wide">כלי לניהול התהליך האישי</p>
                 {user && (
                   <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${isSaving ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                     <Cloud size={10} /> {isSaving ? 'שומר...' : 'שמור'}
                   </span>
                 )}
               </div>
             </div>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* API Settings Button */}
            <button
               onClick={() => setShowSettings(true)}
               className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${hasKey ? 'bg-white border-slate-200 text-slate-600 hover:text-brand-600' : 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'}`}
               title="הגדרות API"
            >
               <Settings size={20} className={hasKey ? "" : "text-rose-600"} />
               {!hasKey && <span className="text-xs font-bold hidden sm:inline">חסר מפתח</span>}
            </button>

            {/* Auth Buttons */}
            {!user ? (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-all font-bold text-sm shadow-md">
                <LogIn size={16} />
                <span>התחברות</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                 <div className="hidden md:block text-right">
                    <p className="text-xs text-slate-400 font-medium">מחובר כ-</p>
                    <p className="text-sm font-bold text-slate-700">{user.email?.split('@')[0]}</p>
                 </div>
                 <button onClick={handleLogout} className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 p-2.5 rounded-lg transition-colors border border-slate-200" title="התנתק">
                   <LogOut size={18} />
                 </button>
              </div>
            )}

            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            {/* Diagnostic Button */}
            <button 
               onClick={handleTestConnection}
               className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2.5 rounded-lg transition-all shadow-sm group relative"
               title="בדיקת חיבור ל-AI"
            >
               <Activity size={20} className={`group-hover:text-brand-500 ${hasKey ? 'text-slate-600' : 'text-slate-300'}`} />
            </button>

            <button 
              onClick={handleAnalysis} 
              disabled={aiStatus === AnalysisStatus.LOADING}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-5 py-2.5 rounded-lg transition-all shadow-md shadow-brand-500/30 font-bold text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {aiStatus === AnalysisStatus.LOADING ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              <span className="hidden sm:inline">ניתוח מפה מלא</span>
            </button>
            
             <button onClick={() => window.print()} className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2.5 rounded-lg transition-all shadow-sm">
              <FileDown size={20} />
            </button>
            <button onClick={clearData} className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 px-3 py-2.5 rounded-lg transition-all shadow-sm">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Guest Warning */}
        {!user && (
          <div className="max-w-4xl mx-auto bg-amber-50 border border-amber-200 p-4 mb-8 rounded-xl flex items-start gap-3 shadow-sm">
             <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
             <div className="flex-1">
               <p className="text-sm text-amber-800 font-medium">
                 מצב אורח: הנתונים נשמרים בדפדפן זה בלבד. <button onClick={() => setShowLoginModal(true)} className="underline font-bold hover:text-amber-900">התחבר עכשיו</button> כדי לגבות את המפה שלך ולגשת אליה מכל מכשיר.
               </p>
             </div>
           </div>
        )}
        
        {/* AI Feedback Area */}
        {(aiMessage || aiStatus === AnalysisStatus.LOADING) && (
           <div className="max-w-5xl mx-auto mb-10 animate-fade-in relative z-10">
             <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border relative ${aiStatus === AnalysisStatus.ERROR ? 'border-red-200' : 'border-brand-100'}`}>
                
                {/* Close Button */}
                <button 
                  onClick={closeAiMessage} 
                  className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-20"
                  title="סגור הודעה"
                >
                  <X size={20} />
                </button>

                <div className={`h-1.5 w-full ${aiStatus === AnalysisStatus.ERROR ? 'bg-red-500' : 'bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 animate-gradient'}`}></div>
                <div className="p-6 md:p-8">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                    {aiStatus === AnalysisStatus.LOADING ? (
                      <><RefreshCw className="animate-spin text-brand-500" size={20} /> מעבד נתונים...</>
                    ) : aiStatus === AnalysisStatus.ERROR ? (
                      <><AlertCircle className="text-red-500" size={20} /> תוצאות בדיקה / שגיאה</>
                    ) : (
                      <><Sparkles className="text-brand-500" size={20} /> תובנות המאמן הדיגיטלי</>
                    )}
                  </h2>
                  <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {aiMessage || "אנא המתן..."}
                  </div>
                </div>
             </div>
           </div>
        )}

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[700px]">
          
          {/* COLUMN 1 */}
          <div className="flex flex-col bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden hover:border-brand-300 transition-colors group">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <span className="font-black text-slate-300 text-4xl leading-none select-none">1</span>
               <div className="text-right">
                 <h2 className="font-bold text-slate-800 text-lg">מטרת השיפור</h2>
                 <p className="text-xs text-slate-500 font-medium">המחויבות הגלויה</p>
               </div>
            </div>
            <div className="flex-1 p-5">
              <TextAreaField 
                label="" 
                subLabel="למה אני מחויב? מה הדבר שאני הכי רוצה לשנות בהתנהלות שלי?"
                value={data.column1}
                onChange={(val) => updateField('column1', val)}
                placeholder="לדוגמה: אני מחויב להיות יותר אסרטיבי מול המנהל שלי..."
                onAutoGenerate={() => handleGenerateSuggestion('column1')}
                aiButtonText="רעיון לשלב הבא"
                heightClass="h-full min-h-[400px]"
                colorClass="border-slate-200 focus:border-brand-400 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* COLUMN 2 */}
          <div className="flex flex-col bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden hover:border-brand-300 transition-colors group">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <span className="font-black text-slate-300 text-4xl leading-none select-none">2</span>
               <div className="text-right">
                 <h2 className="font-bold text-slate-800 text-lg">מה אני עושה?</h2>
                 <p className="text-xs text-slate-500 font-medium">התנהגויות מעכבות</p>
               </div>
            </div>
            <div className="flex-1 p-5">
              <TextAreaField 
                label="" 
                subLabel="מה אני עושה (או לא עושה) שמונע את השגת המטרה מטור 1?"
                value={data.column2}
                onChange={(val) => updateField('column2', val)}
                placeholder="לדוגמה: אני שותק בישיבות, אני נמנע מעימותים..."
                onAutoGenerate={() => handleGenerateSuggestion('column2')}
                aiButtonText="רעיון לשלב הבא"
                heightClass="h-full min-h-[400px]"
                colorClass="border-slate-200 focus:border-brand-400 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* COLUMN 3 (SPLIT) */}
          <div className="flex flex-col rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-brand-200 overflow-hidden ring-1 ring-brand-100 bg-white">
            
            {/* WORRIES (Top Half) */}
            <div className="flex-1 p-5 border-b-2 border-dashed border-slate-200 bg-gradient-to-b from-rose-50/50 to-transparent">
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                   <div className="bg-rose-100 p-1.5 rounded-md text-rose-600"><ShieldAlert size={18} /></div>
                   <div>
                     <h2 className="font-bold text-slate-800 text-lg leading-tight">תיבת הדאגות</h2>
                   </div>
                 </div>
                 <span className="font-black text-slate-200 text-4xl leading-none select-none">3</span>
              </div>
              
              <TextAreaField 
                label="" 
                subLabel="דמיין שאתה עושה את ההפך מטור 2. מה הדבר המפחיד ביותר שעלול לקרות?"
                value={data.column3_worries}
                onChange={(val) => updateField('column3_worries', val)}
                placeholder="אני דואג ש..."
                onAutoGenerate={() => handleGenerateSuggestion('column3_worries')}
                aiButtonText="רעיון לשלב הבא"
                heightClass="h-48"
                colorClass="border-rose-100 focus:border-rose-400 focus:ring-rose-100 bg-white"
              />
            </div>

            {/* HIDDEN COMMITMENTS (Bottom Half) */}
            <div className="flex-1 p-5 bg-gradient-to-b from-amber-50/50 to-transparent">
               <div className="flex items-center gap-2 mb-4">
                   <div className="bg-amber-100 p-1.5 rounded-md text-amber-600"><ShieldCheck size={18} /></div>
                   <div>
                     <h2 className="font-bold text-slate-800 text-lg leading-tight">מחויבות נסתרת</h2>
                   </div>
               </div>
               
              <TextAreaField 
                label="" 
                subLabel="כדי לא להרגיש את הדאגה הזו, למה אני מחויב באמת?"
                value={data.column3_commitments}
                onChange={(val) => updateField('column3_commitments', val)}
                placeholder="אני מחויב ל..."
                onAutoGenerate={() => handleGenerateSuggestion('column3_commitments')}
                aiButtonText="רעיון לשלב הבא"
                heightClass="h-48"
                colorClass="border-amber-100 focus:border-amber-400 focus:ring-amber-100 bg-white"
              />
            </div>
          </div>

          {/* COLUMN 4 */}
          <div className="flex flex-col bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden hover:border-brand-300 transition-colors group">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <span className="font-black text-slate-300 text-4xl leading-none select-none">4</span>
               <div className="text-right">
                 <h2 className="font-bold text-slate-800 text-lg">הנחות יסוד</h2>
                 <p className="text-xs text-slate-500 font-medium">התפיסה המקבעת</p>
               </div>
            </div>
            <div className="flex-1 p-5">
              <TextAreaField 
                label="" 
                subLabel="מה אני מניח על העולם שגורם למחויבות הנסתרת להרגיש כמו אמת מוחלטת?"
                value={data.column4}
                onChange={(val) => updateField('column4', val)}
                placeholder="אני מניח שאם..."
                onAutoGenerate={() => handleGenerateSuggestion('column4')}
                aiButtonText="רעיון לשלב הבא"
                heightClass="h-full min-h-[400px]"
                colorClass="border-slate-200 focus:border-brand-400 focus:ring-brand-100"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-slate-200 pt-8 text-center">
          <p className="text-slate-400 text-sm font-medium">© OBT | מבוסס על מודל Immunity to Change של רוברט קגן וליסה לייהי</p>
        </div>
      </main>

      {/* --- MODALS --- */}
      
      {/* Settings / API Key Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative overflow-hidden">
             <button onClick={() => setShowSettings(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
             </button>
             
             <div className="text-center mb-6">
                <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <Settings className="text-slate-600" size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800">הגדרות מערכת</h3>
                <p className="text-slate-500 mt-2">הגדרת מפתח ה-AI שלך בצורה מאובטחת</p>
             </div>

             <div className="space-y-4">
               
               {isEnvKey ? (
                 <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-emerald-800">
                    <CheckCircle className="shrink-0 mt-0.5 text-emerald-600" size={20} />
                    <div>
                      <span className="font-bold block">מפתח מערכת מזוהה</span>
                      <p className="text-sm">המערכת משתמשת במפתח API שמוגדר בשרת (Environment Variable). אין צורך להגדיר מפתח ידנית.</p>
                    </div>
                 </div>
               ) : (
                 <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800">
                    <strong>למה צריך את זה?</strong> כדי שהמערכת תוכל לתת לך משוב חכם, עליה להשתמש במפתח פרטי. 
                    המפתח נשמר <strong>רק בדפדפן שלך</strong> ולא עובר לאף שרת אחר.
                 </div>
               )}

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1.5">מפתח Gemini API {isEnvKey && '(אופציונלי - דריסה ידנית)'}</label>
                 <div className="relative group">
                    <Key className="absolute right-3 top-3 text-slate-400" size={20} />
                    <input 
                      type="password"
                      className="w-full pr-10 pl-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm"
                      placeholder={isEnvKey ? "המפתח מוגדר בשרת. הזן כאן רק כדי לשנות." : "הדבק כאן את המפתח החדש (מתחיל ב-AIza...)"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                 </div>
                 {!isEnvKey && (
                   <p className="text-xs text-slate-400 mt-1">
                     אין לך מפתח? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline hover:text-brand-800">הוצא מפתח בחינם כאן</a>
                   </p>
                 )}
               </div>

               <div className="flex gap-3 mt-6">
                 <button 
                   onClick={handleSaveKey}
                   className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all"
                 >
                   {isEnvKey && apiKeyInput.length === 0 ? "סגור" : "שמור מפתח והתחבר"}
                 </button>
                 {(!isEnvKey && hasKey) || (isEnvKey && apiKeyInput.length > 0) ? (
                   <button 
                     onClick={handleClearKey}
                     className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold transition-all border border-red-100"
                   >
                     נקה
                   </button>
                 ) : null}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Suggestions Modal */}
      {activeSuggestion && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-0 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brand-600 p-4 flex justify-between items-center">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Sparkles size={18} /> רעיון לשלב הבא
               </h3>
               <button onClick={() => setActiveSuggestion(null)} className="text-brand-200 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap">
                {activeSuggestion}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button onClick={() => setActiveSuggestion(null)} className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-brand-500/20">
                תודה, הבנתי
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
          <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
              
              <div className="text-center mb-8">
                <div className="bg-brand-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100 rotate-3">
                  <LogIn className="text-brand-600" size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800">
                  {authMode === 'login' ? 'ברוכים הבאים' : 'יצירת חשבון'}
                </h3>
                <p className="text-slate-500 mt-2">
                  {authMode === 'login' ? 'התחבר כדי לגשת למפה שלך' : 'הצטרף אלינו כדי לשמור את ההתקדמות שלך'}
                </p>
              </div>

              {authError && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-6 flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">כתובת אימייל</label>
                  <div className="relative group">
                    <Mail className="absolute right-3 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                    <input 
                      type="email" 
                      required
                      className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all bg-slate-50 focus:bg-white"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">סיסמה</label>
                  <div className="relative group">
                    <Lock className="absolute right-3 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                    <input 
                      type="password" 
                      required
                      className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all bg-slate-50 focus:bg-white"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all flex justify-center items-center gap-2 mt-2"
                >
                  {authLoading ? <RefreshCw className="animate-spin" size={20} /> : (authMode === 'login' ? 'התחבר' : 'הירשם')}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-400 font-medium">או המשך באמצעות</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                type="button"
                className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Google
              </button>

              <div className="mt-8 text-center text-sm text-slate-600">
                {authMode === 'login' ? (
                  <>
                    אין לך עדיין חשבון?{' '}
                    <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-brand-600 font-bold hover:underline">
                      הירשם עכשיו בחינם
                    </button>
                  </>
                ) : (
                  <>
                    יש לך כבר חשבון?{' '}
                    <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-brand-600 font-bold hover:underline">
                      התחבר כאן
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          header, button, .animate-fade-in, .sticky { display: none !important; }
          body { background: white; padding: 0; }
          .grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px; page-break-inside: avoid; }
          textarea { border: 1px solid #ccc; resize: none; overflow: hidden; font-size: 11px; font-family: sans-serif; }
          .shadow-xl, .shadow-lg, .shadow-md, .shadow-sm { box-shadow: none !important; }
          h1, h2, h3 { color: black !important; }
        }
      `}</style>
    </div>
  );
};

export default App;