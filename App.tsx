
import React, { useState, useEffect, useRef } from 'react';
import { OBTData, AnalysisStatus, ProgressRow } from './types';
import { analyzeOBTMap, generateSuggestions, generateStepSuggestion } from './services/geminiService';
import { TextAreaField } from './components/TextAreaField';
import { BrainCircuit, RefreshCw, Sparkles, LogIn, LogOut, X, Layout, Languages, ShieldAlert, ShieldCheck, ClipboardList, TrendingUp, Lightbulb, Plus, Trash2, CheckCircle2 } from 'lucide-react';
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
    guideClose: 'הבנתי, בואו נתחיל'
  },
  en: {
    dir: 'ltr' as const,
    title: 'OBT Map',
    workspace: 'Workspace',
    innovation: 'Innovation in Human Capital',
    tabMap: 'OBT Map',
    tabProgress: 'Progress Table',
    login: 'Login',
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
    guideClose: 'Got it, let\'s start'
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
        if (JSON.stringify(remoteData) !== JSON.stringify(data)) {
          isRemoteUpdate.current = true;
          setData(remoteData);
        }
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
      } catch (error) {
        console.error("Error saving data:", error);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    };
    const timeoutId = setTimeout(saveData, 1000); 
    return () => clearTimeout(timeoutId);
  }, [data, user, isDataLoaded]);

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

  const handleStepAi = async (type: 'small' | 'big', row: ProgressRow) => {
    setAiStatus(AnalysisStatus.LOADING);
    const thinkingMsg = lang === 'he' ? "המאמן מייצר דוגמאות..." : "Coach is generating examples...";
    setActiveSuggestion(thinkingMsg);
    try {
      const result = await generateStepSuggestion(type, { ...data, column4: row.assumption || data.column4, column2: row.topic }, lang);
      setActiveSuggestion(result);
      setAiStatus(AnalysisStatus.IDLE);
    } catch (e: any) {
      setAiStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen pb-20 relative bg-onyx-950 text-onyx-100 font-sans" dir={t.dir}>
      <header className="bg-onyx-900/95 border-b border-onyx-800 sticky top-0 z-50 px-6 py-4 backdrop-blur-sm">
        <div className="max-w-[1920px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3" dir="ltr">
              <div className="bg-bronze-600 p-2 rounded-lg text-white"><Layout size={22} /></div>
              <h1 className="text-xl font-bold tracking-tight text-white">{t.title}</h1>
            </div>
            <nav className="flex bg-onyx-800/50 rounded-xl p-1 border border-onyx-700/50">
              <button onClick={() => setActiveTab('map')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'map' ? 'bg-bronze-600 text-white shadow-lg' : 'text-onyx-400 hover:text-white'}`}>{t.tabMap}</button>
              <button onClick={() => setActiveTab('progress')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'progress' ? 'bg-bronze-600 text-white shadow-lg' : 'text-onyx-400 hover:text-white'}`}>{t.tabProgress}</button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setLang(lang === 'he' ? 'en' : 'he')} className="text-onyx-400 hover:text-white text-sm font-medium border border-onyx-700 px-3 py-1.5 rounded-lg">{lang === 'he' ? 'English' : 'עברית'}</button>
            {user ? (
              <button onClick={() => signOut(auth)} className="text-onyx-400 hover:text-red-400"><LogOut size={20} /></button>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="bg-white text-onyx-950 px-5 py-2 rounded-lg font-bold text-sm shadow-xl">{t.login}</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-6 py-10">
        {activeTab === 'map' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[700px]">
            <div className="bg-onyx-900/40 p-4 rounded-3xl border border-onyx-800 h-full"><TextAreaField label={t.col1Title} value={data.column1} onChange={(v) => updateField('column1', v)} heightClass="h-[500px]" dir={t.dir} /></div>
            <div className="bg-onyx-900/40 p-4 rounded-3xl border border-onyx-800 h-full"><TextAreaField label={t.col2Title} value={data.column2} onChange={(v) => updateField('column2', v)} heightClass="h-[500px]" dir={t.dir} /></div>
            <div className="flex flex-col gap-6 h-full">
              <div className="bg-onyx-900/40 p-4 rounded-3xl border border-onyx-800 flex-1"><TextAreaField label={t.col3aTitle} value={data.column3_worries} onChange={(v) => updateField('column3_worries', v)} heightClass="h-40" dir={t.dir} /></div>
              <div className="bg-onyx-900/40 p-4 rounded-3xl border border-onyx-800 flex-1"><TextAreaField label={t.col3bTitle} value={data.column3_commitments} onChange={(v) => updateField('column3_commitments', v)} heightClass="h-40" dir={t.dir} /></div>
            </div>
            <div className="bg-onyx-900/40 p-4 rounded-3xl border border-onyx-800 h-full"><TextAreaField label={t.col4Title} value={data.column4} onChange={(v) => updateField('column4', v)} heightClass="h-[500px]" dir={t.dir} /></div>
          </div>
        ) : (
          <div className="w-full animate-fade-in">
            <h2 className="text-4xl font-black text-white text-center mb-12">{t.progressTitle}</h2>
            <div className="overflow-x-auto bg-onyx-900/60 rounded-[2rem] border border-onyx-800 shadow-2xl min-h-[600px]">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-onyx-950 text-onyx-300">
                    <th className="p-6 text-right font-bold border-b border-onyx-800">{t.headerAssumption}</th>
                    <th className="p-6 text-right font-bold border-b border-onyx-800">{t.headerTopic}</th>
                    <th className="p-6 text-right font-bold border-b border-onyx-800">{t.headerSmall}</th>
                    <th className="p-6 text-right font-bold border-b border-onyx-800">{t.headerBig}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.progressRows || []).map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="p-4 border-b border-onyx-800 w-1/4">
                        <textarea 
                          className="w-full h-80 p-5 bg-onyx-950 border border-onyx-700 rounded-2xl text-white outline-none focus:border-bronze-500 shadow-inner resize-none block opacity-100 visible"
                          value={row.assumption}
                          onChange={(e) => updateRow(row.id, 'assumption', e.target.value)}
                        />
                      </td>
                      <td className="p-4 border-b border-onyx-800 w-1/6">
                        <textarea 
                          className="w-full h-80 p-5 bg-onyx-950 border border-onyx-700 rounded-2xl text-white outline-none focus:border-bronze-500 shadow-inner resize-none block opacity-100 visible"
                          value={row.topic}
                          onChange={(e) => updateRow(row.id, 'topic', e.target.value)}
                        />
                      </td>
                      <td className="p-4 border-b border-onyx-800 w-1/4">
                        <div className="flex flex-col gap-3">
                          <textarea 
                            className="w-full h-80 p-5 bg-onyx-950 border border-onyx-700 rounded-2xl text-white outline-none focus:border-bronze-500 shadow-inner resize-none block opacity-100 visible"
                            value={row.smallStep}
                            onChange={(e) => updateRow(row.id, 'smallStep', e.target.value)}
                          />
                          <button onClick={() => handleStepAi('small', row)} className="bg-bronze-700 hover:bg-bronze-600 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Sparkles size={14} /> AI Suggestions</button>
                        </div>
                      </td>
                      <td className="p-4 border-b border-onyx-800 w-1/4">
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-2">
                            <textarea 
                              className="flex-1 h-80 p-5 bg-onyx-950 border border-onyx-700 rounded-2xl text-white outline-none focus:border-bronze-500 shadow-inner resize-none block opacity-100 visible"
                              value={row.significantStep}
                              onChange={(e) => updateRow(row.id, 'significantStep', e.target.value)}
                            />
                            <button onClick={() => deleteRow(row.id)} className="text-onyx-600 hover:text-red-500 p-2 h-fit"><Trash2 size={20} /></button>
                          </div>
                          <button onClick={() => handleStepAi('big', row)} className="bg-bronze-700 hover:bg-bronze-600 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Sparkles size={14} /> AI Suggestions</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-8 flex justify-center bg-onyx-950/40">
                <button onClick={addRow} className="flex items-center gap-3 bg-onyx-800 hover:bg-onyx-700 text-white px-10 py-4 rounded-2xl border border-onyx-700 transition-all font-bold shadow-2xl">
                  <Plus size={24} /> {t.addRow}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {activeSuggestion && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-onyx-900 border border-onyx-700 rounded-[2rem] max-w-2xl w-full p-10 relative overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
            <button onClick={() => setActiveSuggestion(null)} className="absolute top-6 left-6 text-onyx-500 hover:text-white"><X size={28} /></button>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Sparkles className="text-bronze-400" /> {t.aiCoachTitle}</h3>
            <div className="overflow-y-auto text-onyx-100 text-lg leading-relaxed whitespace-pre-wrap pr-4">{activeSuggestion}</div>
            <button onClick={() => setActiveSuggestion(null)} className="mt-8 w-full bg-white text-onyx-950 py-4 rounded-2xl font-black uppercase tracking-tighter shadow-xl hover:bg-bronze-50 transition-all">{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
