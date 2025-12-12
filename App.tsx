import React, { useState, useEffect, useCallback } from 'react';
import { ITCData, AnalysisStatus } from './types';
import { analyzeITCMap, generateSuggestions } from './services/geminiService';
import { TextAreaField } from './components/TextAreaField';
import { Save, FileDown, BrainCircuit, RefreshCw, AlertCircle, Sparkles, LogIn, LogOut, Cloud, CloudOff } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
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
  
  const [aiStatus, setAiStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Fallback to local storage if not logged in
        const saved = localStorage.getItem('obt_itc_data');
        if (saved) setData(JSON.parse(saved));
        setIsDataLoaded(true);
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
        // Only update state if remote data is different to avoid cursor jumps
        // Simple check: we rely on React's state merging, but for text inputs
        // receiving external updates while typing can be tricky.
        // For this implementation, we simply load the data.
        // Optimally, we check if the timestamp is newer.
        // Here we just load it.
        setData(prev => {
           // We only overwrite if it's drastically different or initial load
           // to prevent overwriting active typing in a race condition.
           // For simplicity in this demo: we accept the server state.
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

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      alert("התחברות נכשלה, נסה שוב.");
    }
  };

  const handleLogout = async () => {
    if (confirm("האם להתנתק מהמערכת?")) {
      await signOut(auth);
      setData(INITIAL_DATA); // Clear data on logout for privacy
    }
  };

  const handleAnalysis = async () => {
    setAiStatus(AnalysisStatus.LOADING);
    try {
      const result = await analyzeITCMap(data);
      setAiMessage(result);
      setAiStatus(AnalysisStatus.SUCCESS);
    } catch (e) {
      setAiMessage("אירעה שגיאה בניתוח הנתונים.");
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const handleGenerateSuggestion = async (field: keyof ITCData) => {
    setAiStatus(AnalysisStatus.LOADING);
    setActiveSuggestion("טוען הצעות...");
    try {
      const suggestion = await generateSuggestions(field, data);
      setActiveSuggestion(suggestion);
      setAiStatus(AnalysisStatus.IDLE);
    } catch (e) {
      setActiveSuggestion("שגיאה בקבלת הצעות");
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const clearData = () => {
    if (confirm('האם אתה בטוח שברצונך לנקות את הטופס?')) {
      setData(INITIAL_DATA);
      setAiMessage('');
      setActiveSuggestion(null);
    }
  };

  const closeSuggestion = () => setActiveSuggestion(null);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-l from-brand-900 via-brand-800 to-brand-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
             <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/20">
               <BrainCircuit size={28} className="text-brand-100" />
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tight">OBT</h1>
               <div className="flex items-center gap-2">
                 <p className="text-brand-100 text-sm font-light tracking-wider">כלי לניהול התהליך האישי</p>
                 {user && isSaving && <span className="text-xs text-brand-200 animate-pulse flex items-center gap-1"><Cloud size={10} /> שומר...</span>}
                 {user && !isSaving && <span className="text-xs text-brand-200 flex items-center gap-1"><Cloud size={10} /> שמור בענן</span>}
               </div>
             </div>
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Login/Logout Section */}
            {!user ? (
              <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-brand-900 px-4 py-2 rounded-full transition-all shadow-md font-bold text-sm hover:bg-brand-50">
                <LogIn size={16} />
                <span>התחבר לשמירה</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 mr-2">
                 <div className="hidden md:flex flex-col items-end text-xs text-brand-100">
                    <span className="font-bold">שלום, {user.displayName?.split(' ')[0]}</span>
                    <span>{user.email}</span>
                 </div>
                 {user.photoURL ? (
                   <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border-2 border-brand-200" />
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white border-2 border-brand-200">
                     {user.displayName?.[0]}
                   </div>
                 )}
                 <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/80 p-2 rounded-full transition-colors text-white" title="התנתק">
                   <LogOut size={16} />
                 </button>
              </div>
            )}

            <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block"></div>

            <button onClick={handleAnalysis} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-md transition-all shadow-md font-medium text-sm">
              <BrainCircuit size={16} />
              <span className="hidden sm:inline">ניתוח AI</span>
            </button>
             <button onClick={() => window.print()} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md transition-all font-medium text-sm backdrop-blur-sm">
              <FileDown size={16} />
            </button>
            <button onClick={clearData} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-100 px-3 py-2 rounded-md transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {!user && (
          <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 mb-6 rounded-lg shadow-sm">
             <div className="flex">
               <div className="flex-shrink-0">
                 <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
               </div>
               <div className="mr-3">
                 <p className="text-sm text-yellow-700 font-medium">
                   אתה עובד במצב אורח. הנתונים נשמרים בדפדפן זה בלבד. <button onClick={handleLogin} className="underline font-bold hover:text-yellow-800">התחבר עכשיו</button> כדי לשמור ולגשת למפה מכל מכשיר.
                 </p>
               </div>
             </div>
           </div>
        )}
        
        {/* AI Analysis/Coaching Box */}
        {(aiMessage || aiStatus === AnalysisStatus.LOADING) && (
           <div className="mb-8 bg-white border border-brand-100 rounded-xl shadow-lg p-6 relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 w-2 h-full bg-brand-500"></div>
              <h2 className="text-xl font-bold text-brand-800 mb-2 flex items-center gap-2">
                {aiStatus === AnalysisStatus.LOADING ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>המאמן הדיגיטלי חושב...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="text-yellow-500" size={20} />
                    <span>תובנות המאמן הדיגיטלי</span>
                  </>
                )}
              </h2>
              <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                {aiMessage || "מנתח את המפה שלך..."}
              </div>
           </div>
        )}

        {/* Suggestion Modal/Overlay */}
        {activeSuggestion && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative border-t-4 border-brand-500">
              <button onClick={closeSuggestion} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600">
                <AlertCircle size={24} className="rotate-45" /> {/* Using as close icon */}
              </button>
              <h3 className="text-xl font-bold mb-4 text-brand-900">הצעות השראה</h3>
              <div className="whitespace-pre-wrap text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 max-h-[60vh] overflow-y-auto">
                {activeSuggestion}
              </div>
              <div className="mt-6 text-center">
                <button onClick={closeSuggestion} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-full font-medium transition-colors">
                  הבנתי, תודה
                </button>
              </div>
            </div>
          </div>
        )}

        {/* The Grid / Table */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px]">
          
          {/* Column 1: Goal */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="bg-brand-50 text-brand-800 px-4 py-2 rounded-full w-fit text-sm font-black tracking-wide border border-brand-100">טור 1</div>
            <TextAreaField 
              label="מטרת השיפור" 
              subLabel="למה אני מחויב? מה הדבר שאני רוצה לשנות בעצמי?"
              value={data.column1}
              onChange={(val) => updateField('column1', val)}
              placeholder="אני מחויב ל..."
              onAutoGenerate={() => handleGenerateSuggestion('column1')}
              heightClass="flex-1 min-h-[300px]"
              colorClass="border-blue-100 focus:border-blue-400"
            />
          </div>

          {/* Column 2: Doing/Not Doing */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="bg-brand-50 text-brand-800 px-4 py-2 rounded-full w-fit text-sm font-black tracking-wide border border-brand-100">טור 2</div>
            <TextAreaField 
              label="מה אני עושה/לא עושה?" 
              subLabel="מהם ההתנהגויות שלי שמונעות את מימוש מטרת השיפור?"
              value={data.column2}
              onChange={(val) => updateField('column2', val)}
              placeholder="במקום זאת, אני..."
              onAutoGenerate={() => handleGenerateSuggestion('column2')}
              heightClass="flex-1 min-h-[300px]"
              colorClass="border-blue-100 focus:border-blue-400"
            />
          </div>

          {/* Column 3: Split Column */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow overflow-hidden">
            {/* Top Half: Worries Box */}
            <div className="flex-1 p-6 border-b-2 border-slate-100 bg-red-50/30">
              <div className="bg-brand-50 text-brand-800 px-4 py-2 rounded-full w-fit text-sm font-black tracking-wide border border-brand-100 mb-4">טור 3 - חלק א'</div>
              <TextAreaField 
                label="תיבת הדאגות" 
                subLabel="כשאני מדמיין את עצמי עושה את ההפך מטור 2, מה הדבר המפחיד ביותר שעלול לקרות?"
                value={data.column3_worries}
                onChange={(val) => updateField('column3_worries', val)}
                placeholder="אני דואג ש..."
                onAutoGenerate={() => handleGenerateSuggestion('column3_worries')}
                heightClass="h-48"
                colorClass="border-red-100 focus:border-red-400 bg-red-50/50"
              />
            </div>

            {/* Bottom Half: Hidden Commitment */}
            <div className="flex-1 p-6 bg-amber-50/30">
               <div className="bg-brand-50 text-brand-800 px-4 py-2 rounded-full w-fit text-sm font-black tracking-wide border border-brand-100 mb-4">טור 3 - חלק ב'</div>
              <TextAreaField 
                label="מחויבות נסתרת" 
                subLabel="כדי לא להרגיש את הדאגה הזו, למה אני מחויב בעצם?"
                value={data.column3_commitments}
                onChange={(val) => updateField('column3_commitments', val)}
                placeholder="אני מחויב ל..."
                onAutoGenerate={() => handleGenerateSuggestion('column3_commitments')}
                heightClass="h-48"
                colorClass="border-amber-100 focus:border-amber-400 bg-amber-50/50"
              />
            </div>
          </div>

          {/* Column 4: Big Assumptions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
            <div className="bg-brand-50 text-brand-800 px-4 py-2 rounded-full w-fit text-sm font-black tracking-wide border border-brand-100">טור 4</div>
            <TextAreaField 
              label="הנחות יסוד גדולות" 
              subLabel="מה אני מניח על העולם או על עצמי שגורם למחויבות הנסתרת להיראות הכרחית?"
              value={data.column4}
              onChange={(val) => updateField('column4', val)}
              placeholder="אני מניח ש..."
              onAutoGenerate={() => handleGenerateSuggestion('column4')}
              heightClass="flex-1 min-h-[300px]"
              colorClass="border-purple-100 focus:border-purple-400"
            />
          </div>

        </div>

        {/* Footer info */}
        <div className="mt-12 text-center text-slate-400 text-sm">
          <p>© כל הזכויות שמורות ל-OBT | מבוסס על מודל Immunity to Change של רוברט קגן וליסה לייהי</p>
        </div>
      </main>
      
      {/* Print styles override */}
      <style>{`
        @media print {
          header button { display: none; }
          .animate-fade-in { display: none; }
          body { background: white; }
          .grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px; }
          textarea { border: 1px solid #ccc; resize: none; overflow: hidden; font-size: 12px; }
          .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default App;