import React, { useState, useEffect, useCallback } from 'react';
import { ITCData, AnalysisStatus } from './types';
import { analyzeITCMap, generateSuggestions } from './services/geminiService';
import { TextAreaField } from './components/TextAreaField';
import { Save, FileDown, BrainCircuit, RefreshCw, AlertCircle, Sparkles, LogIn, LogOut, Cloud, CloudOff, X, Mail, Lock } from 'lucide-react';
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
    setAuthError(''); // Clear previous errors
    try {
      setAuthLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google Login failed", error);
      let msg = "התחברות עם גוגל נכשלה.";
      
      // Specific Error Handling
      if (error.code === 'auth/popup-closed-by-user') {
        msg = "חלון ההתחברות נסגר לפני סיום הפעולה.";
      } else if (error.code === 'auth/unauthorized-domain') {
        msg = "שגיאת דומיין: יש להוסיף את הכתובת לרשימת Authorized Domains ב-Firebase.";
      } else if (error.code === 'auth/invalid-api-key') {
        msg = "שגיאת קונפיגורציה: נראה שקובץ firebase.ts לא עודכן עם המפתחות שלך.";
      } else if (error.code === 'auth/operation-not-allowed') {
        msg = "התחברות עם גוגל אינה מאופשרת בפרויקט ה-Firebase שלך.";
      } else if (error.message && error.message.includes('configuration')) {
         msg = "שגיאת קונפיגורציה: בדוק את קובץ firebase.ts";
      }

      setAuthError(msg);
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
      if (error.code === 'auth/email-already-in-use') msg = "האימייל כבר קיים במערכת.";
      if (error.code === 'auth/weak-password') msg = "סיסמה חלשה מדי (לפחות 6 תווים).";
      if (error.code === 'auth/invalid-email') msg = "כתובת אימייל לא תקינה.";
      if (error.code === 'auth/invalid-api-key') msg = "שגיאת קונפיגורציה: קובץ firebase.ts אינו מעודכן.";
      if (error.code === 'auth/network-request-failed') msg = "שגיאת תקשורת. בדוק את החיבור לאינטרנט.";
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
    setAiStatus(AnalysisStatus.LOADING);
    setActiveSuggestion("טוען הצעות...");
    try {
      const suggestion = await generateSuggestions(field, data);
      setActiveSuggestion(suggestion);
      setAiStatus(AnalysisStatus.IDLE);
    } catch (e: any) {
      // Use clean message from error
      setActiveSuggestion(`שגיאה בקבלת הצעות:\n${e.message}`);
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
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-white text-brand-900 px-4 py-2 rounded-full transition-all shadow-md font-bold text-sm hover:bg-brand-50">
                <LogIn size={16} />
                <span>התחבר לשמירה</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 mr-2">
                 <div className="hidden md:flex flex-col items-end text-xs text-brand-100">
                    <span className="font-bold">{user.email?.split('@')[0]}</span>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white border-2 border-brand-200 uppercase overflow-hidden">
                     {user.photoURL ? (
                       <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                     ) : (
                       user.email?.[0] || 'U'
                     )}
                 </div>
                 <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500/80 p-2 rounded-full transition-colors text-white" title="התנתק">
                   <LogOut size={16} />
                 </button>
              </div>
            )}

            <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block"></div>

            <button onClick={handleAnalysis} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white px-4 py-2 rounded-md transition-all shadow-md font-medium text-sm">
              <BrainCircuit size={16} />
              <span className="hidden sm:inline">ניתוח כללי</span>
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
                   אתה עובד במצב אורח. הנתונים נשמרים בדפדפן זה בלבד. <button onClick={() => setShowLoginModal(true)} className="underline font-bold hover:text-yellow-800">התחבר עכשיו</button> כדי לשמור ולגשת למפה מכל מכשיר.
                 </p>
               </div>
             </div>
           </div>
        )}
        
        {/* AI Analysis/Coaching Box */}
        {(aiMessage || aiStatus === AnalysisStatus.LOADING) && (
           <div className={`mb-8 bg-white border ${aiStatus === AnalysisStatus.ERROR ? 'border-red-300 bg-red-50' : 'border-brand-100'} rounded-xl shadow-lg p-6 relative overflow-hidden animate-fade-in`}>
              <div className={`absolute top-0 right-0 w-2 h-full ${aiStatus === AnalysisStatus.ERROR ? 'bg-red-500' : 'bg-brand-500'}`}></div>
              <h2 className={`text-xl font-bold mb-2 flex items-center gap-2 ${aiStatus === AnalysisStatus.ERROR ? 'text-red-800' : 'text-brand-800'}`}>
                {aiStatus === AnalysisStatus.LOADING ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>המאמן הדיגיטלי חושב...</span>
                  </>
                ) : aiStatus === AnalysisStatus.ERROR ? (
                   <>
                    <AlertCircle className="text-red-500" size={20} />
                    <span>שגיאה</span>
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

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
              
              <div className="text-center mb-6">
                <div className="bg-brand-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <LogIn className="text-brand-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {authMode === 'login' ? 'התחברות לחשבון' : 'יצירת חשבון חדש'}
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  שמור את המפה שלך וגש אליה מכל מקום
                </p>
              </div>

              {authError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {authError}
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">כתובת אימייל</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      required
                      className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      required
                      className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-brand-500/30 transition-all flex justify-center items-center gap-2"
                >
                  {authLoading ? <RefreshCw className="animate-spin" size={18} /> : (authMode === 'login' ? 'התחבר' : 'הירשם')}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">או המשך עם</span>
                </div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                type="button"
                className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>

              <div className="mt-6 text-center text-sm text-slate-600">
                {authMode === 'login' ? (
                  <>
                    אין לך עדיין חשבון?{' '}
                    <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-brand-600 font-bold hover:underline">
                      הירשם עכשיו
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
              aiButtonText="צריך רעיונות למטרות?"
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
              aiButtonText="צריך עזרה בזיהוי ההתנהגויות?"
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
                aiButtonText="צריך עזרה בחשיפת הדאגה?"
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
                aiButtonText="מהי המחויבות הנסתרת?"
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
              aiButtonText="צריך עזרה בניסוח ההנחה?"
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