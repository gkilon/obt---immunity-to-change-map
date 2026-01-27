
import React, { useState, useEffect, useRef } from 'react';
import { OBTData, AnalysisStatus, ProgressRow } from './types';
import { analyzeOBTMap, generateSuggestions, generateStepSuggestion } from './services/geminiService';
import { TextAreaField } from './components/TextAreaField';
import { BrainCircuit, LogIn, LogOut, X, Layout, Languages, ShieldAlert, ShieldCheck, ClipboardList, TrendingUp, Lightbulb, Plus, Trash2, Sparkles, ExternalLink, Mail, Lock, UserPlus, Info, Target, Zap, MessageSquare, FastForward, Flag } from 'lucide-react';
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
    col1Title: 'OBT - המחויבות שאני מציב לעצמי',
    col1Desc: 'היעד המרכזי לשיפור עצמי - מה הדבר האחד שחשוב לי לשפר?',
    col1GuideBtn: 'מדריך לכתיבה',
    col2Title: 'התנהגויות סותרות',
    col2Desc: 'מה אני עושה או לא עושה שסותר את המחויבות שלי בטור 1?',
    col2AiBtn: 'הצעות AI',
    col3aTitle: 'תיבת הדאגות',
    col3aDesc: 'הדאגות שעולות כשאני מדמיין את עצמי פועל הפוך מההתנהגויות בטור 2',
    col3aAiBtn: 'הצעות AI',
    col3bTitle: 'מחויבויות מתחרות',
    col3bDesc: 'המוטיבציה הסמויה - למה אני מחויב כדי להרגיש בטוח?',
    col3bAiBtn: 'הצעות AI',
    col4Title: 'הנחות יסוד',
    col4Desc: 'האמונות המגבילות שיוצרות את החסינות לשינוי',
    col4AiBtn: 'הצעות AI',
    guideTitle: 'איך כותבים OBT איכותי?',
    guideIntro: 'OBT מוצלח הוא כזה שמתמקד בשינוי פנימי ובהתפתחות אישית, ולא רק בביצוע משימות חיצוניות.',
    guideCriteria: [
      { 
        title: 'מיקוד עצמי', 
        desc: 'המחויבות צריכה להיות עליכם ועל היכולת שלכם להשתנות, ולא על ניסיון לשנות אחרים.' 
      },
      { 
        title: 'שינוי התנהגותי', 
        desc: 'הגדירו יעד שנוגע לאופן שבו אתם פועלים ומגיבים, ולא רק לתוצאה טכנית או פרויקט ספציפי.' 
      },
      { 
        title: 'חיבור למשמעות', 
        desc: 'כתבו למה השינוי הזה חשוב לכם ומה הוא יאפשר לכם להשיג או להיות ברמה המקצועית והאישית.' 
      },
      { 
        title: 'יציאה מאזור הנוחות', 
        desc: 'בחרו נושא שבאמת מאתגר אתכם ומעורר בכם תחושת דריכות - שם נמצאת ההתפתחות האמיתית.' 
      }
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
    col1Title: 'OBT - My Primary Commitment',
    col1Desc: 'What is the one thing you are committed to improving?',
    col1GuideBtn: 'Writing Guide',
    col2Title: 'Contradictory Behaviors',
    col2Desc: 'What do you do or not do that goes against your commitment?',
    col2AiBtn: 'AI Suggestions',
    col3aTitle: 'Worry Box',
    col3aDesc: 'Fears that arise when you imagine doing the opposite of Col 2',
    col3aAiBtn: 'AI Suggestions',
    col3bTitle: 'Competing Commitments',
    col3bDesc: 'Hidden motivations to maintain psychological safety',
    col3bAiBtn: 'AI Suggestions',
    col4Title: 'Big Assumptions',
    col4Desc: 'Deep beliefs holding the immunity system in place',
    col4AiBtn: 'AI Suggestions',
    guideTitle: 'Writing a Great OBT',
    guideIntro: 'A successful OBT focuses on internal growth and personal development rather than just external tasks.',
    guideCriteria: [
      { title: 'Self-Focus', desc: 'The commitment should be about you and your ability to change, not about trying to change others.' },
      { title: 'Behavioral Change', desc: 'Define a goal regarding how you act and react, not just a technical outcome or project.' },
      { title: 'Value Alignment', desc: 'State why this change matters and what it will allow you to achieve or become.' },
      { title: 'Beyond Comfort Zone', desc: 'Choose something that truly challenges you and sparks growth through genuine effort.' }
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
                <TextAreaField 
                  label={t.col1Title} 
                  subLabel={t.col1Desc} 
                  value={data.column1} 
                  onChange={(val) => updateField('column1', val)} 
                  onAutoGenerate={() => setShowGoalGuide(true)} 
                  aiButtonText={t.col1GuideBtn} 
                  actionIcon={Lightbulb} 
                  heightClass="h-[550px]" 
                  dir={t.dir as "rtl" | "ltr"} 
                />
                <div className="mt-4 pt-4 border-t border-onyx-700/30">
                  <a href="https://gleaming-sunshine-f0c058.netlify.app/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-onyx-800/50 hover:bg-onyx-700 text-bronze-400 rounded-xl transition-all font-medium text-sm border border-onyx-700/50">
                    <ExternalLink size={16} /> {t.link360}
                  </a>
                </div>
              </div>
              <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-2 h-full shadow-card backdrop-blur-sm">
                <TextAreaField 
                  label={t.col2Title} 
                  subLabel={t.col2Desc} 
                  value={data.column2} 
                  onChange={(val) => updateField('column2', val)} 
                  onAutoGenerate={() => handleGenerateSuggestion('column2')} 
                  aiButtonText={t.col2AiBtn} 
                  heightClass="h-[550px]" 
                  dir={t.dir as "rtl" | "ltr"} 
                />
              </div>
              <div className="flex flex-col gap-8 h-full">
                <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-5 flex-1 shadow-card relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute -top-4 -right-4 w-24 h-24 opacity-[0.03] rotate-12"><ShieldAlert size={96} /></div>
                  <TextAreaField 
                    label={t.col3aTitle} 
                    subLabel={t.col3aDesc} 
                    value={data.column3_worries} 
                    onChange={(val) => updateField('column3_worries', val)} 
                    onAutoGenerate={() => handleGenerateSuggestion('column3_worries')} 
                    aiButtonText={t.col3aAiBtn} 
                    heightClass="h-44" 
                    dir={t.dir as "rtl" | "ltr"} 
                  />
                </div>
                <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-5 flex-1 shadow-card relative overflow-hidden backdrop-blur-sm">
                   <div className="absolute -top-4 -right-4 w-24 h-24 opacity-[0.03] rotate-12"><ShieldCheck size={96} /></div>
                  <TextAreaField 
                    label={t.col3bTitle} 
                    subLabel={t.col3bDesc} 
                    value={data.column3_commitments} 
                    onChange={(val) => updateField('column3_commitments', val)} 
                    onAutoGenerate={() => handleGenerateSuggestion('column3_commitments')} 
                    aiButtonText={t.col3bAiBtn} 
                    heightClass="h-44" 
                    dir={t.dir as "rtl" | "ltr"} 
                  />
                </div>
              </div>
              <div className="bg-onyx-800/40 rounded-2xl border border-onyx-700/50 p-2 h-full shadow-card backdrop-blur-sm">
                <TextAreaField 
                  label={t.col4Title} 
                  subLabel={t.col4Desc} 
                  value={data.column4} 
                  onChange={(val) => updateField('column4', val)} 
                  onAutoGenerate={() => handleGenerateSuggestion('column4')} 
                  aiButtonText={t.col4AiBtn} 
                  heightClass="h-[550px]" 
                  dir={t.dir as "rtl" | "ltr"} 
                />
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
              <h2 className="text-3xl md:text-5xl font-bold text-onyx-100 mb-4 tracking-tight">{t.progressTitle}</h2>
              <p className="text-onyx-400 text-lg md:text-xl font-light">{t.progressSub}</p>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-onyx-800/20 rounded-3xl border border-onyx-700/50 shadow-2xl backdrop-blur-md overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-onyx-950 text-onyx-100 text-lg font-bold border-b border-onyx-700/50">
                    <th className="p-6 w-[25%]">{t.headerAssumption}</th>
                    <th className="p-6 w-[15%]">{t.headerTopic}</th>
                    <th className="p-6 w-[30%]">{t.headerSmall}</th>
                    <th className="p-6 w-[30%]">{t.headerBig}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-onyx-700/30">
                  {(data.progressRows || []).map((row) => (
                    <tr key={row.id} className="group transition-colors align-top">
                      <td className="p-4 bg-onyx-800/20 border-l border-onyx-700/30">
                        <textarea className="w-full h-80 p-4 bg-onyx-950/90 border-2 border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none font-medium text-lg leading-relaxed shadow-lg" value={row.assumption} onChange={(e) => updateRow(row.id, 'assumption', e.target.value)} />
                      </td>
                      <td className="p-4 bg-onyx-800/10 border-l border-onyx-700/30">
                        <textarea className="w-full h-80 p-4 bg-onyx-950/90 border-2 border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none font-medium text-lg leading-relaxed shadow-lg" value={row.topic} onChange={(e) => updateRow(row.id, 'topic', e.target.value)} />
                      </td>
                      <td className="p-4 bg-onyx-800/20 border-l border-onyx-700/30 relative">
                        <div className="flex flex-col h-full gap-3">
                          <textarea className="w-full h-80 p-4 bg-onyx-950/90 border-2 border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none font-medium text-lg leading-relaxed shadow-lg" value={row.smallStep} onChange={(e) => updateRow(row.id, 'smallStep', e.target.value)} />
                          <button onClick={() => handleStepAi('small', row)} className="bg-bronze-700 hover:bg-bronze-600 text-white px-5 py-2.5 rounded-lg border border-bronze-500/30 transition-all text-xs font-bold shadow-xl flex items-center gap-2 w-fit">
                            <Sparkles size={14} /> AI Suggestions
                          </button>
                        </div>
                      </td>
                      <td className="p-4 bg-onyx-800/10 relative">
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
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-8">
              {(data.progressRows || []).map((row) => (
                <div key={row.id} className="bg-onyx-800/40 border border-onyx-700 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 bg-bronze-500 h-full opacity-50"></div>
                  
                  <div className="flex justify-between items-center border-b border-onyx-700 pb-3">
                    <span className="text-onyx-400 text-xs font-bold uppercase tracking-widest">{lang === 'he' ? 'מעקב התקדמות' : 'Progress Track'}</span>
                    <button onClick={() => deleteRow(row.id)} className="text-onyx-600 hover:text-red-400 transition-colors p-1"><Trash2 size={20} /></button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-bronze-400 text-sm font-bold flex items-center gap-2"><Target size={14} /> {t.headerAssumption}</label>
                    <textarea className="w-full h-32 p-4 bg-onyx-950/60 border border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none text-base" value={row.assumption} onChange={(e) => updateRow(row.id, 'assumption', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-onyx-300 text-sm font-bold flex items-center gap-2"><MessageSquare size={14} /> {t.headerTopic}</label>
                    <textarea className="w-full h-24 p-4 bg-onyx-950/60 border border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none text-base" value={row.topic} onChange={(e) => updateRow(row.id, 'topic', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-onyx-300 text-sm font-bold flex items-center gap-2"><FastForward size={14} /> {t.headerSmall}</label>
                    <div className="space-y-3">
                      <textarea className="w-full h-32 p-4 bg-onyx-950/60 border border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none text-base" value={row.smallStep} onChange={(e) => updateRow(row.id, 'smallStep', e.target.value)} />
                      <button onClick={() => handleStepAi('small', row)} className="bg-onyx-800 hover:bg-onyx-700 text-bronze-400 px-4 py-2 rounded-lg border border-onyx-700 transition-all text-xs font-bold flex items-center gap-2">
                        <Sparkles size={14} /> AI Suggestions
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-bronze-500 text-sm font-bold flex items-center gap-2"><Flag size={14} /> {t.headerBig}</label>
                    <div className="space-y-3">
                      <textarea className="w-full h-32 p-4 bg-onyx-950/60 border border-onyx-700 rounded-xl text-onyx-100 outline-none focus:border-bronze-500 transition-all resize-none text-base" value={row.significantStep} onChange={(e) => updateRow(row.id, 'significantStep', e.target.value)} />
                      <button onClick={() => handleStepAi('big', row)} className="bg-bronze-700 hover:bg-bronze-600 text-white px-4 py-2 rounded-lg transition-all text-xs font-bold flex items-center gap-2 shadow-lg">
                        <Sparkles size={14} /> AI Suggestions
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 flex justify-center mt-6">
              <button onClick={addRow} className="flex items-center gap-3 bg-onyx-800 hover:bg-onyx-700 text-onyx-100 px-10 py-4 rounded-2xl border border-onyx-700 transition-all font-bold text-lg shadow-2xl">
                <Plus size={24} /> {t.addRow}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals remain the same... */}
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

      {showGoalGuide && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" dir={t.dir}>
          <div className="bg-onyx-800 rounded-3xl border border-onyx-700 shadow-2xl max-w-2xl w-full p-0 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-onyx-950/80 p-8 flex justify-between items-center border-b border-onyx-700/50">
               <h3 className="text-2xl font-medium text-onyx-100 flex items-center gap-4"><Target size={24} className="text-bronze-400" /> {t.guideTitle}</h3>
               <button onClick={() => setShowGoalGuide(false)} className="text-onyx-500 hover:text-white transition-colors bg-onyx-800 p-2 rounded-lg"><X size={24} /></button>
            </div>
            <div className="p-8 bg-onyx-800 overflow-y-auto">
               <p className="text-onyx-200 text-lg mb-8 leading-relaxed font-light">{t.guideIntro}</p>
               <div className="grid gap-6">
                 {t.guideCriteria.map((item, idx) => (
                   <div key={idx} className="bg-onyx-950/40 p-6 rounded-2xl border border-onyx-700/50 hover:border-bronze-500/30 transition-all group">
                     <div className="flex items-start gap-4">
                       <div className="mt-1 text-bronze-500"><Zap size={20} /></div>
                       <div>
                        <h4 className="text-bronze-400 font-bold text-lg mb-2 group-hover:text-bronze-300 transition-colors">{item.title}</h4>
                        <p className="text-onyx-400 leading-relaxed text-sm font-light">{item.desc}</p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
            <div className="p-8 border-t border-onyx-700/50 bg-onyx-950/50 text-center">
              <button onClick={() => setShowGoalGuide(false)} className="bg-bronze-700 text-white hover:bg-bronze-600 px-12 py-3 rounded-xl font-bold transition-all shadow-xl">{t.guideClose}</button>
            </div>
          </div>
        </div>
      )}

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
