
import React, { useState, useEffect, useRef } from 'react';
import { OBTData, AnalysisStatus, ProgressRow } from './types';
import { analyzeOBTMap, generateSuggestions, generateStepSuggestion } from './services/geminiService';
import { TextAreaField } from './components/TextAreaField';
import { BrainCircuit, LogIn, LogOut, X, Layout, Languages, ShieldAlert, ShieldCheck, ClipboardList, TrendingUp, Lightbulb, Plus, Trash2, Sparkles, ExternalLink, Mail, Lock, UserPlus } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const translations = {
  he: {
    dir: 'rtl' as const,
    title: 'מפת OBT',
    workspace: 'Workspace',
    innovation: 'Innovation in Human Capital',
    tabMap: 'מפת ה-OBT',
    tabProgress: 'טבלת התקדמות',
    login: 'כניסה',
    register: 'הרשמה',
    logout: 'התנתק',
    aiAnalysis: 'ניתוח AI',
    progressTitle: 'טבלת התקדמות OBT',
    progressSub: 'בחינת הנחות יסוד ושינוי התנהגותי',
    headerAssumption: 'הנחת היסוד אותה אני רוצה לבחון',
    headerTopic: 'נושא',
    headerSmall: 'התקדמות קטנה',
    headerBig: 'התקדמות משמעותית',
    addRow: 'הוסף שורה חדשה',
    aiCoachTitle: 'המאמן הדיגיטלי מציע',
    close: 'סגור',
    col1Title: 'One Big Thing',
    col1Desc: 'היעד המרכזי לשיפור עצמי',
    col1GuideBtn: 'מדריך לכתיבה',
    col2Title: 'התנהגויות מעכבות',
    col2Desc: 'מה אני עושה במקום לקדם את היעד?',
    col2AiBtn: 'הצעות AI',
    col3aTitle: 'תיבת הפחד',
    col3aDesc: 'דאגות שעולות כשמפסיקים את ההתנהגות',
    col3aAiBtn: 'הצעות AI',
    col3bTitle: 'מחויבויות מתחרות',
    col3bDesc: 'המוטיבציה הסמויה לשמר את המצב',
    col3bAiBtn: 'הצעות AI',
    col4Title: 'הנחות יסוד',
    col4Desc: 'האמונות שמחזיקות את המנגנון',
    col4AiBtn: 'הצעות AI',
    guideTitle: 'איך כותבים OBT?',
    guideIntro: 'ה-One Big Thing (OBT) הוא לב התהליך. הנה הקריטריונים לכתיבה נכונה:',
    guideCriteria: [
      { title: 'ממוקד בשיפור עצמי', desc: 'התמקד בשינוי שאתה רוצה לחולל בעצמך, לא באחרים.' },
      { title: 'בעל ערך גבוה', desc: 'בחר משהו שאם תשתפר בו, ההשפעה על חייך תהיה משמעותית.' },
      { title: 'מנוסח בחיוב', desc: 'כתוב מה אתה רוצה להשיג, ולא ממה אתה רוצה להימנע.' }
    ],
    guideClose: 'הבנתי, בואו נתחיל',
    link360: 'מעבר לשאלון 360',
    authWelcome: 'ברוכים הבאים ל-OBT',
    authSubtitle: 'התחברו כדי לשמור את המפה האישית שלכם',
    emailPlaceholder: 'אימייל',
    passwordPlaceholder: 'סיסמה',
    loginBtn: 'התחברות',
    registerBtn: 'יצירת חשבון',
    googleBtn: 'כניסה עם Google',
    toggleToRegister: 'אין לך חשבון? הירשם כאן',
    toggleToLogin: 'כבר יש לך חשבון? התחבר כאן'
  },
  en: {
    dir: 'ltr' as const,
    title: 'OBT Map',
    workspace: 'Workspace',
    innovation: 'Innovation in Human Capital',
    tabMap: 'OBT Map',
    tabProgress: 'Progress Table',
    login: 'Login',
    register: 'Sign Up',
    logout: 'Logout',
    aiAnalysis: 'AI Analysis',
    progressTitle: 'OBT Progress Table',
    progressSub: 'Testing Big Assumptions & Behavioral Change',
    headerAssumption: 'Big Assumption to Test',
    headerTopic: 'Topic',
    headerSmall: 'Small Progress',
    headerBig: 'Significant Progress',
    addRow: 'Add New Row',
    aiCoachTitle: 'Digital Coach Suggestions',
    close: 'Close',
    col1Title: 'One Big Thing',
    col1Desc: 'Central self-improvement goal',
    col1GuideBtn: 'Writing Guide',
    col2Title: 'Counter-productive Behaviors',
    col2Desc: 'What do I do instead of moving forward?',
    col2AiBtn: 'AI Suggestions',
    col3aTitle: 'Worry Box',
    col3aDesc: 'Fears that arise when stopping behaviors',
    col3aAiBtn: 'AI Suggestions',
    col3bTitle: 'Competing Commitments',
    col3bDesc: 'Hidden motivations to maintain the status quo',
    col3bAiBtn: 'AI Suggestions',
    col4Title: 'Big Assumptions',
    col4Desc: 'Beliefs holding the immunity in place',
    col4AiBtn: 'AI Suggestions',
    guideTitle: 'How to write an OBT?',
    guideIntro: 'The One Big Thing (OBT) is the heart of the process. Here are the criteria:',
    guideCriteria: [
      { title: 'Self-Improvement Focused', desc: 'Focus on a change you want to make in yourself, not others.' },
      { title: 'High Value', desc: 'Choose something that will have a significant impact if achieved.' },
      { title: 'Positively Framed', desc: 'State what you want to achieve, rather than what you want to avoid.' }
    ],
    guideClose: 'Got it, let\'s start',
    link360: 'Go to 360 Questionnaire',
    authWelcome: 'Welcome to OBT',
    authSubtitle: 'Sign in to save your personal map',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    loginBtn: 'Login',
    registerBtn: 'Sign Up',
    googleBtn: 'Sign in with Google',
    toggleToRegister: "Don't have an account? Sign up",
    toggleToLogin: "Already have an account? Login"
  }
};

const INITIAL_DATA: OBTData = {
  column1: '',
  column2: '',
  column3_worries: '',
  column3_commitments: '',
  column4: '',
  progressRows: [
    { id: '1', assumption: '', topic: '', smallStep: '', significantStep: '' }
  ]
};

const App: React.FC = () => {
  const [lang, setLang] = useState<'he' | 'en'>('he');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'map' | 'progress'>('map');
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<OBTData>(INITIAL_DATA);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isRemoteUpdate = useRef(false);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGoalGuide, setShowGoalGuide] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [aiStatus, setAiStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        const saved = localStorage.getItem('obt_data');
        if (saved) setData(JSON.parse(saved));
        else setData(INITIAL_DATA);
        setIsDataLoaded(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data() as OBTData;
        isRemoteUpdate.current = true;
        setData(remoteData);
      }
      setIsDataLoaded(true);
    });
    return () => unsubscribe();
  }, [user]);

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
        localStorage.setItem('obt_data', JSON.stringify(data));
      } catch (error) {
        console.error("Error saving data:", error);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    };
    const timeoutId = setTimeout(saveData, 1000); 
    return () => clearTimeout(timeoutId);
  }, [data, user, isDataLoaded]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowLoginModal(false);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const updateField = (field: keyof OBTData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateRow = (id: string, field: keyof ProgressRow, value: string) => {
    setData(prev => ({
      ...prev,
      progressRows: (prev.progressRows || []).map(row => 
        row.id === id ? { ...row, [field]: value } : row
      )
    }));
  };

  const addRow = () => {
    const newRow: ProgressRow = {
      id: Date.now().toString(),
      assumption: '',
      topic: '',
      smallStep: '',
      significantStep: ''
    };
    setData(prev => ({
      ...prev,
      progressRows: [...(prev.progressRows || []), newRow]
    }));
  };

  const deleteRow = (id: string) => {
    setData(prev => ({
      ...prev,
      progressRows: (prev.progressRows || []).filter(r => r.id !== id)
    }));
  };

  const handleGenerateSuggestion = async (field: keyof OBTData) => {
    setAiStatus(AnalysisStatus.LOADING);
    setActiveSuggestion(lang === 'he' ? "המאמן מכין הצעות..." : "Coach is preparing suggestions...");
    try {
      const result = await generateSuggestions(field, data, lang);
      setActiveSuggestion(result);
      setAiStatus(AnalysisStatus.IDLE);
    } catch (e: any) {
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const handleAnalysis = async () => {
    setAiStatus(AnalysisStatus.LOADING);
    setActiveSuggestion(lang === 'he' ? "מנתח את מפת ה-OBT שלך..." : "Analyzing your OBT map...");
    try {
      const result = await analyzeOBTMap(data, lang);
      setActiveSuggestion(result);
      setAiStatus(AnalysisStatus.SUCCESS);
    } catch (e: any) {
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  const handleStepAi = async (type: 'small' | 'big', row: ProgressRow) => {
    setAiStatus(AnalysisStatus.LOADING);
    setActiveSuggestion(lang === 'he' ? "המאמן מייצר דוגמאות..." : "Coach is generating examples...");
    try {
      const contextData: OBTData = {
        ...data,
        column4: row.assumption || data.column4,
        column2: row.topic || data.column2
      };
      const result = await generateStepSuggestion(type, contextData, lang);
      setActiveSuggestion(result);
      setAiStatus(AnalysisStatus.IDLE);
    } catch (e: any) {
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className={`min-h-screen pb-20 relative bg-onyx-900 text-onyx-200 selection:bg-bronze-500/30 selection:text-white`} dir={t.dir}>
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-bronze-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <header className="bg-onyx-900/90 backdrop-blur-md border-b border-onyx-700/50 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4" dir="ltr">
               <div className="bg-onyx-800 p-2.5 rounded-lg border border-onyx-700 shadow-sm text-bronze-400">
                 <Layout size={24} strokeWidth={1.5} />
               </div>
               <div className="flex flex-col justify-center items-start text-left">
                 <h1 className="text-2xl font-normal text-onyx-100 tracking-tight leading-none">{t.title}</h1>
                 <p className="text-[10px] text-onyx-500 uppercase tracking-widest font-medium mt-1">{t.innovation}</p>
               </div>
            </div>

            <nav className="flex bg-onyx-950/50 rounded-lg p-1 border border-onyx-700/50 mx-4">
              <button onClick={() => setActiveTab('map')} className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'map' ? 'bg-bronze-700 text-white shadow-lg' : 'text-onyx-400 hover:text-onyx-200'}`}><ClipboardList size={16} /> {t.tabMap}</button>
              <button onClick={() => setActiveTab('progress')} className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'progress' ? 'bg-bronze-700 text-white shadow-lg' : 'text-onyx-400 hover:text-onyx-200'}`}><TrendingUp size={16} /> {t.tabProgress}</button>
            </nav>
          </div>
          
          <div className="flex gap-3 items-center">
            {isSaving && <span className="text-xs text-onyx-500 animate-pulse">{lang === 'he' ? 'שומר...' : 'Saving...'}</span>}
            <button onClick={() => setLang(lang === 'he' ? 'en' : 'he')} className="flex items-center gap-2 bg-onyx-800/80 hover:bg-onyx-700 text-onyx-300 px-4 py-2 rounded border border-onyx-700 transition-all text-sm font-medium">
              <Languages size={16} /> {lang === 'he' ? 'English' : 'עברית'}
            </button>
            {!user ? (
              <button onClick={() => { setAuthMode('login'); setShowLoginModal(true); }} className="flex items-center gap-2 bg-onyx-100 text-onyx-950 px-6 py-2 rounded hover:bg-white transition-all font-medium text-sm shadow-md"><LogIn size={16} /> {t.login}</button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-onyx-400 hidden md:block">{user.email}</span>
                <button onClick={() => signOut(auth)} className="bg-onyx-700 hover:bg-red-900/30 text-onyx-400 p-2 rounded transition-colors" title={t.logout}><LogOut size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {activeTab === 'map' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 min-h-[750px] items-start">
              <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-2 h-full shadow-card backdrop-blur-sm flex flex-col">
                <TextAreaField label={t.col1Title} subLabel={t.col1Desc} value={data.column1} onChange={(val) => updateField('column1', val)} onAutoGenerate={() => setShowGoalGuide(true)} aiButtonText={t.col1GuideBtn} actionIcon={Lightbulb} heightClass="h-[550px]" dir={t.dir as "rtl" | "ltr"} />
                <div className="mt-4 pt-4 border-t border-onyx-700/30">
                  <a href="https://gleaming-sunshine-f0c058.netlify.app/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-onyx-800/50 hover:bg-onyx-700 text-bronze-400 rounded-xl transition-all font-medium text-sm border border-onyx-700/50">
                    <ExternalLink size={16} /> {t.link360}
                  </a>
                </div>
              </div>
              <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-2 h-full shadow-card backdrop-blur-sm">
                <TextAreaField label={t.col2Title} subLabel={t.col2Desc} value={data.column2} onChange={(val) => updateField('column2', val)} onAutoGenerate={() => handleGenerateSuggestion('column2')} aiButtonText={t.col2AiBtn} heightClass="h-[550px]" dir={t.dir as "rtl" | "ltr"} />
              </div>
              <div className="flex flex-col gap-8 h-full">
                <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-5 flex-1 shadow-card relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute -top-4 -right-4 w-24 h-24 opacity-[0.03] rotate-12"><ShieldAlert size={96} /></div>
                  <TextAreaField label={t.col3aTitle} subLabel={t.col3aDesc} value={data.column3_worries} onChange={(val) => updateField('column3_worries', val)} onAutoGenerate={() => handleGenerateSuggestion('column3_worries')} aiButtonText={t.col3aAiBtn} heightClass="h-44" dir={t.dir as "rtl" | "ltr"} />
                </div>
                <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-5 flex-1 shadow-card relative overflow-hidden backdrop-blur-sm">
                   <div className="absolute -top-4 -right-4 w-24 h-24 opacity-[0.03] rotate-12"><ShieldCheck size={96} /></div>
                  <TextAreaField label={t.col3bTitle} subLabel={t.col3bDesc} value={data.column3_commitments} onChange={(val) => updateField('column3_commitments', val)} onAutoGenerate={() => handleGenerateSuggestion('column3_commitments')} aiButtonText={t.col3bAiBtn} heightClass="h-44" dir={t.dir as "rtl" | "ltr"} />
                </div>
              </div>
              <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-2 h-full shadow-card backdrop-blur-sm">
                <TextAreaField label={t.col4Title} subLabel={t.col4Desc} value={data.column4} onChange={(val) => updateField('column4', val)} onAutoGenerate={() => handleGenerateSuggestion('column4')} aiButtonText={t.col4AiBtn} heightClass="h-[550px]" dir={t.dir as "rtl" | "ltr"} />
              </div>
            </div>
            <div className="mt-16 flex justify-center">
               <button onClick={handleAnalysis} className="group relative flex items-center gap-4 bg-bronze-700 hover:bg-bronze-600 text-white px-12 py-5 rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1 font-bold text-xl border border-bronze-600/50">
                <BrainCircuit size={28} className="group-hover:rotate-12 transition-transform" /> 
                <span>{lang === 'he' ? 'נתח את מפת ה-OBT שלי' : 'Analyze my OBT Map'}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="animate-fade-in max-w-[1920px] mx-auto px-4">
            <div className="mb-14 text-center">
              <h2 className="text-5xl font-bold text-onyx-100 mb-4 tracking-tight">{t.progressTitle}</h2>
              <p className="text-onyx-400 text-xl font-light">{t.progressSub}</p>
            </div>

            <div className="bg-onyx-800/20 rounded-3xl border border-onyx-700/50 shadow-2xl backdrop-blur-md overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-onyx-950/60 text-onyx-100 text-lg font-bold">
                    <th className="p-6 border-b border-onyx-700/50 w-[25%]">{t.headerAssumption}</th>
                    <th className="p-6 border-b border-onyx-700/50 w-[15%]">{t.headerTopic}</th>
                    <th className="p-6 border-b border-onyx-700/50 w-[30%]">{t.headerSmall}</th>
                    <th className="p-6 border-b border-onyx-700/50 w-[30%]">{t.headerBig}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-onyx-700/30">
                  {(data.progressRows || []).map((row) => (
                    <tr key={row.id} className="group transition-colors align-top">
                      <td className="p-4 bg-bronze-500/[0.04] border-l border-onyx-700/30">
                        <textarea className="w-full h-80 p-4 bg-onyx-950/90 border-2 border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none font-medium text-lg leading-relaxed shadow-lg" value={row.assumption} onChange={(e) => updateRow(row.id, 'assumption', e.target.value)} />
                      </td>
                      <td className="p-4 bg-bronze-500/[0.02] border-l border-onyx-700/30">
                        <textarea className="w-full h-80 p-4 bg-onyx-950/90 border-2 border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none font-medium text-lg leading-relaxed shadow-lg" value={row.topic} onChange={(e) => updateRow(row.id, 'topic', e.target.value)} />
                      </td>
                      <td className="p-4 bg-bronze-500/[0.06] border-l border-onyx-700/30 relative">
                        <div className="flex flex-col h-full gap-3">
                          <textarea className="w-full h-80 p-4 bg-onyx-950/90 border-2 border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none font-medium text-lg leading-relaxed shadow-lg" value={row.smallStep} onChange={(e) => updateRow(row.id, 'smallStep', e.target.value)} />
                          <button onClick={() => handleStepAi('small', row)} className="bg-bronze-700 hover:bg-bronze-600 text-white px-5 py-2.5 rounded-lg border border-bronze-500/30 transition-all text-xs font-bold shadow-xl flex items-center gap-2 w-fit">
                            <Sparkles size={14} /> AI Suggestions
                          </button>
                        </div>
                      </td>
                      <td className="p-4 bg-bronze-500/[0.08] relative">
                        <div className="flex flex-col h-full gap-3">
                          <div className="flex gap-2 h-full">
                            <textarea className="flex-1 h-80 p-4 bg-onyx-950/90 border-2 border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none font-medium text-lg leading-relaxed shadow-lg" value={row.significantStep} onChange={(e) => updateRow(row.id, 'significantStep', e.target.value)} />
                            <button onClick={() => deleteRow(row.id)} className="p-2 text-onyx-600 hover:text-red-400 transition-colors h-fit self-start"><Trash2 size={24} /></button>
                          </div>
                          <button onClick={() => handleStepAi('big', row)} className="bg-bronze-700 hover:bg-bronze-600 text-white px-5 py-2.5 rounded-lg border border-bronze-500/30 transition-all text-xs font-bold shadow-xl flex items-center gap-2 w-fit">
                            <Sparkles size={14} /> AI Suggestions
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-10 bg-onyx-950/20 flex justify-center">
                <button onClick={addRow} className="flex items-center gap-3 bg-onyx-800 hover:bg-onyx-700 text-onyx-100 px-10 py-4 rounded-2xl border border-onyx-700 transition-all font-bold text-lg shadow-2xl">
                  <Plus size={24} /> {t.addRow}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" dir={t.dir}>
          <div className="bg-onyx-800 rounded-3xl border border-onyx-700 shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-onyx-500 hover:text-white transition-colors"><X size={24} /></button>
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-bronze-700/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-bronze-400">
                 {authMode === 'login' ? <LogIn size={32} /> : <UserPlus size={32} />}
               </div>
               <h2 className="text-2xl font-bold text-onyx-100">{t.authWelcome}</h2>
               <p className="text-onyx-400 mt-2">{t.authSubtitle}</p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative">
                <Mail className="absolute right-4 top-3.5 text-onyx-500" size={18} />
                <input type="email" placeholder={t.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-onyx-950/50 border border-onyx-700 rounded-xl py-3 pr-12 pl-4 text-onyx-100 focus:border-bronze-500 outline-none transition-all" />
              </div>
              <div className="relative">
                <Lock className="absolute right-4 top-3.5 text-onyx-500" size={18} />
                <input type="password" placeholder={t.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-onyx-950/50 border border-onyx-700 rounded-xl py-3 pr-12 pl-4 text-onyx-100 focus:border-bronze-500 outline-none transition-all" />
              </div>
              
              {authError && <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-lg">{authError}</p>}
              
              <button type="submit" disabled={authLoading} className="w-full bg-bronze-700 hover:bg-bronze-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                {authLoading ? <Sparkles className="animate-spin" size={18} /> : (authMode === 'login' ? t.loginBtn : t.registerBtn)}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-onyx-700"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-onyx-800 px-2 text-onyx-500">Or</span></div>
            </div>

            <button onClick={handleGoogleSignIn} className="w-full bg-white text-onyx-950 font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {t.googleBtn}
            </button>

            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-onyx-400 hover:text-bronze-400 transition-colors text-sm font-medium">
              {authMode === 'login' ? t.toggleToRegister : t.toggleToLogin}
            </button>
          </div>
        </div>
      )}

      {/* AI Suggestion Modal */}
      {activeSuggestion && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" dir={t.dir}>
          <div className="bg-onyx-800 rounded-3xl border border-onyx-700 shadow-2xl max-w-2xl w-full p-0 relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-onyx-950/80 p-8 flex justify-between items-center border-b border-onyx-700/50">
               <h3 className="text-2xl font-medium text-onyx-100 flex items-center gap-4"><Sparkles size={24} className="text-bronze-400" /> {t.aiCoachTitle}</h3>
               <button onClick={() => setActiveSuggestion(null)} className="text-onyx-500 hover:text-white transition-colors bg-onyx-800 p-2 rounded-lg"><X size={24} /></button>
            </div>
            <div className="p-12 overflow-y-auto bg-onyx-800 text-onyx-100 text-xl font-light leading-relaxed whitespace-pre-wrap">{activeSuggestion}</div>
            <div className="p-8 border-t border-onyx-700/50 bg-onyx-950/50 text-center">
              <button onClick={() => setActiveSuggestion(null)} className="bg-onyx-100 text-onyx-950 hover:bg-white px-12 py-3 rounded-xl font-bold transition-all shadow-xl">{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
