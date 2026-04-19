import React, { useState, useEffect } from 'react';
import { 
  X, Timer, CheckSquare, Calculator, Languages, FileText, 
  Play, Pause, RotateCcw, Plus, Trash2, Globe, Copy, Check,
  ChevronRight, ChevronLeft, Save, Lock, Crown,
  ArrowRightLeft, Layers, Search, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUserProfile } from '../context/UserProfileContext';
import { cn } from '../lib/utils';
import { performWebSearch } from '../services/gemini';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ToolboxProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgrade?: () => void;
}

type ToolType = 'pomodoro' | 'tasks' | 'calculator' | 'translator' | 'notes' | 'unit_converter' | 'flashcards' | 'web_search' | null;

export const Toolbox: React.FC<ToolboxProps> = ({ isOpen, onClose, onOpenUpgrade }) => {
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const { isPaid } = useUserProfile();

  const tools = [
    { id: 'pomodoro', name: 'Pomodoro Timer', icon: Timer, color: 'text-rose-500', bg: 'bg-rose-50', new: false },
    { id: 'tasks', name: 'Study Tasks', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50', new: false },
    { id: 'calculator', name: 'Expert Calculator', icon: Calculator, color: 'text-emerald-500', bg: 'bg-emerald-50', new: true },
    { id: 'translator', name: 'Lingo Translator', icon: Languages, color: 'text-purple-500', bg: 'bg-purple-50', new: true },
    { id: 'notes', name: 'Quick Notes', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50', new: false },
    { id: 'unit_converter', name: 'Unit Converter', icon: ArrowRightLeft, color: 'text-indigo-500', bg: 'bg-indigo-50', new: true },
    { id: 'flashcards', name: 'Study Flashcards', icon: Layers, color: 'text-pink-500', bg: 'bg-pink-50', new: true },
    { id: 'web_search', name: 'Web Search', icon: Search, color: 'text-cyan-500', bg: 'bg-cyan-50', new: true },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px]"
          />
          
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-sm bg-[#EFF3F9] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 pb-2 flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-800">
                {activeTool ? tools.find(t => t.id === activeTool)?.name : 'Tools'}
              </h3>
              <button 
                onClick={activeTool ? () => setActiveTool(null) : onClose}
                className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-500"
              >
                {activeTool ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar">
              {!isPaid ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center relative">
                    <CheckSquare className="w-8 h-8 text-amber-500" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900">Toolbox is Locked</h3>
                    <p className="text-sm text-slate-500 font-medium">Pomodoro, Expert Calculator, and Smart Notes are part of the SALU AI Plus experience.</p>
                  </div>
                  <div className="w-full bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
                    <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0">
                      <Crown className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                      Get 100 daily credits & all tools for Rs. 200/month
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      onOpenUpgrade?.();
                      onClose();
                    }}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-brand-500/20"
                  >
                    Upgrade Now
                  </button>
                </div>
              ) : !activeTool ? (
                <div className="flex flex-col gap-1">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id as ToolType)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-slate-200/50 rounded-2xl transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-center shrink-0">
                        <tool.icon className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <span className="text-base font-medium text-slate-700">{tool.name}</span>
                        {tool.new && (
                          <span className="px-3 py-1 bg-[#1A73E8] text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                            New
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2">
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                    {activeTool === 'pomodoro' && <PomodoroTool />}
                    {activeTool === 'tasks' && <TasksTool />}
                    {activeTool === 'calculator' && <CalculatorTool />}
                    {activeTool === 'translator' && <TranslatorTool />}
                    {activeTool === 'notes' && <NotesTool />}
                    {activeTool === 'unit_converter' && <UnitConverterTool />}
                    {activeTool === 'flashcards' && <FlashcardsTool />}
                    {activeTool === 'web_search' && <WebSearchTool />}
                  </div>
                </div>
              )}
            </div>

            {/* Footer space for mobile comfort */}
            <div className="h-6 sm:h-2" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- MINI TOOLS ---

const PomodoroTool = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Timer finished
          const nextMode = mode === 'work' ? 'break' : 'work';
          setMode(nextMode);
          setMinutes(nextMode === 'work' ? 25 : 5);
          setSeconds(0);
          setIsActive(false);
          // Play a sound or notify if possible
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, mode]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setMinutes(mode === 'work' ? 25 : 5);
    setSeconds(0);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8">
      <div className="flex gap-4">
        <button 
          onClick={() => { setMode('work'); setMinutes(25); setSeconds(0); setIsActive(false); }}
          className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", mode === 'work' ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-slate-100 text-slate-400")}
        >
          Work
        </button>
        <button 
          onClick={() => { setMode('break'); setMinutes(5); setSeconds(0); setIsActive(false); }}
          className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", mode === 'break' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-400")}
        >
          Break
        </button>
      </div>

      <div className="text-8xl font-black text-slate-900 tracking-tighter tabular-nums flex items-baseline gap-2">
        {minutes.toString().padStart(2, '0')}
        <span className="text-slate-200 text-6xl">:</span>
        {seconds.toString().padStart(2, '0')}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={reset}
          className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all active:scale-90"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button 
          onClick={toggle}
          className={cn("p-6 rounded-[2rem] text-white shadow-xl transition-all active:scale-95", mode === 'work' ? "bg-rose-500 shadow-rose-200" : "bg-emerald-500 shadow-emerald-200")}
        >
          {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
        </button>
      </div>
    </div>
  );
};

const TasksTool = () => {
  const [tasks, setTasks] = useState<{id: number, text: string, done: boolean}[]>(() => {
    const saved = localStorage.getItem('toolbox_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');

  useEffect(() => {
    localStorage.setItem('toolbox_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: input, done: false }]);
    setInput('');
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={addTask} className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New task..."
          className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-100 active:scale-95">
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
        {tasks.length === 0 && (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <CheckSquare className="w-12 h-12 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest italic">All clear!</p>
          </div>
        )}
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl group">
            <button 
              onClick={() => toggleTask(task.id)}
              className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", task.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300")}
            >
              {task.done && <Check className="w-4 h-4" />}
            </button>
            <span className={cn("flex-1 text-sm font-medium", task.done ? "text-slate-400 line-through" : "text-slate-700")}>
              {task.text}
            </span>
            <button onClick={() => removeTask(task.id)} className="p-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalculatorTool = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const btn = (val: string) => {
    if (display === '0') setDisplay(val);
    else setDisplay(display + val);
  };

  const op = (c: string) => {
    setEquation(display + ' ' + c + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
        const full = equation + display;
        // Basic eval replacement for safety if needed, but for mini-tool eval is okay
        const result = eval(full);
        setEquation(full + ' =');
        setDisplay(result.toString());
    } catch (e) {
        setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-900 rounded-3xl p-6 text-right">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest min-h-[1rem]">{equation}</p>
        <p className="text-4xl font-black text-white truncate">{display}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button onClick={clear} className="p-4 bg-slate-100 rounded-2xl font-black text-rose-500">C</button>
        <button onClick={() => op('/')} className="p-4 bg-slate-100 rounded-2xl font-black text-brand-500">÷</button>
        <button onClick={() => op('*')} className="p-4 bg-slate-100 rounded-2xl font-black text-brand-500">×</button>
        <button onClick={() => setDisplay(display.slice(0, -1) || '0')} className="p-4 bg-slate-100 rounded-2xl font-black text-slate-500">←</button>
        
        {[7,8,9].map(n => <button key={n} onClick={() => btn(n.toString())} className="p-4 bg-slate-100 rounded-2xl font-black text-slate-700">{n}</button>)}
        <button onClick={() => op('-')} className="p-4 bg-slate-100 rounded-2xl font-black text-brand-500">-</button>
        
        {[4,5,6].map(n => <button key={n} onClick={() => btn(n.toString())} className="p-4 bg-slate-100 rounded-2xl font-black text-slate-700">{n}</button>)}
        <button onClick={() => op('+')} className="p-4 bg-slate-100 rounded-2xl font-black text-brand-500">+</button>
        
        {[1,2,3].map(n => <button key={n} onClick={() => btn(n.toString())} className="p-4 bg-slate-100 rounded-2xl font-black text-slate-700">{n}</button>)}
        <button onClick={calculate} className="p-4 bg-brand-500 row-span-2 rounded-2xl font-black text-white shadow-lg shadow-brand-200">=</button>
        
        <button onClick={() => btn('0')} className="col-span-2 p-4 bg-slate-100 rounded-2xl font-black text-slate-700">0</button>
        <button onClick={() => btn('.')} className="p-4 bg-slate-100 rounded-2xl font-black text-slate-700">.</button>
      </div>
    </div>
  );
};

const TranslatorTool = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [target, setTarget] = useState('Urdu');
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = async () => {
    if (!text.trim()) return;
    setIsTranslating(true);
    // Simple mock since we want it as a tool. In real use it could call Gemini.
    // But since this is a "small work" tool, I'll use a prompt suggestion
    setResult("Translate result would appear here. (Use the main chat for high-quality SALU AI translation)");
    setIsTranslating(false);
  };

  const languages = ['Urdu', 'Sindhi', 'English', 'Arabic', 'Spanish', 'French'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {languages.map(l => (
          <button 
            key={l}
            onClick={() => setTarget(l)}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all", target === l ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-400")}
          >
            {l}
          </button>
        ))}
      </div>
      
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text to translate..."
        className="w-full bg-slate-50 border-slate-100 rounded-2xl p-4 text-sm h-32 focus:ring-purple-500"
      />

      <button 
        onClick={translate}
        disabled={!text.trim() || isTranslating}
        className="w-full py-4 bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-purple-100 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Globe className="w-4 h-4" /> Translate to {target}
      </button>

      {result && (
        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 relative group">
          <p className="text-sm font-medium text-purple-900">{result}</p>
          <button className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 text-purple-500 hover:bg-purple-100 rounded-lg transition-all">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const NotesTool = () => {
  const [content, setContent] = useState(() => {
    return localStorage.getItem('toolbox_notes') || '';
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('toolbox_notes', content);
      setLastSaved(new Date());
    }, 1000);
    return () => clearTimeout(timeout);
  }, [content]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 min-h-[300px] relative">
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing your study notes..."
          className="w-full h-full bg-amber-50/30 border-amber-100 rounded-3xl p-6 text-sm font-medium text-slate-700 focus:ring-amber-500 leading-relaxed no-scrollbar"
        />
        <div className="absolute top-2 right-4 flex items-center gap-2">
            <div className="px-2 py-1 rounded bg-amber-100 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                Editable
            </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
        <div className="flex items-center gap-1.5">
            <Save className="w-3 h-3" />
            {lastSaved ? `Auto-saved at ${lastSaved.toLocaleTimeString()}` : 'Not saved yet'}
        </div>
        <div className="flex items-center gap-1.5">
            {content.length} Characters
        </div>
      </div>
    </div>
  );
};

const UnitConverterTool = () => {
  const [category, setCategory] = useState<'length' | 'weight' | 'temperature'>('length');
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('ft');
  
  const units = {
    length: ['m', 'km', 'cm', 'mm', 'in', 'ft', 'yd', 'mi'],
    weight: ['kg', 'g', 'mg', 'lb', 'oz'],
    temperature: ['°C', '°F', 'K']
  };

  useEffect(() => {
    setFromUnit(units[category][0]);
    setToUnit(units[category][1]);
  }, [category]);

  const ratios: Record<string, number> = {
    'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001, 'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.34,
    'kg': 1, 'g': 0.001, 'mg': 0.000001, 'lb': 0.453592, 'oz': 0.0283495
  };

  const convert = () => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (category === 'temperature') {
        if (fromUnit === toUnit) return num.toFixed(2);
        let c = 0;
        if (fromUnit === '°C') c = num;
        else if (fromUnit === '°F') c = (num - 32) * 5/9;
        else if (fromUnit === 'K') c = num - 273.15;
        
        if (toUnit === '°C') return c.toFixed(2);
        if (toUnit === '°F') return ((c * 9/5) + 32).toFixed(2);
        if (toUnit === 'K') return (c + 273.15).toFixed(2);
        return '0';
    } else {
        const inBase = num * ratios[fromUnit];
        const res = (inBase / ratios[toUnit]).toFixed(4);
        return res.replace(/\.?0+$/, '') || '0';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        {(['length', 'weight', 'temperature'] as const).map(c => (
          <button 
            key={c} onClick={() => setCategory(c)}
            className={cn("flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all", category === c ? "bg-indigo-500 text-white shadow" : "text-slate-400")}
          >
            {c}
          </button>
        ))}
      </div>
      
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">From</label>
        <div className="flex gap-2">
          <input type="number" value={value} onChange={e => setValue(e.target.value)} className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 text-lg font-bold" />
          <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="w-24 bg-slate-100 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
            {units[category].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-center -my-2 z-10 relative">
        <button onClick={() => {const temp=fromUnit; setFromUnit(toUnit); setToUnit(temp);}} className="w-10 h-10 bg-indigo-500 text-white shadow-lg shadow-indigo-200 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
          <ArrowRightLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">To</label>
        <div className="flex gap-2">
          <div className="flex-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl px-4 py-3 text-lg font-black flex items-center overflow-x-auto no-scrollbar">
            {convert()}
          </div>
          <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="w-24 bg-slate-100 border-none rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
            {units[category].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

const FlashcardsTool = () => {
  const [cards, setCards] = useState<{id:number, front:string, back:string}[]>(() => {
    const saved = localStorage.getItem('toolbox_flashcards');
    return saved ? JSON.parse(saved) : [{id:1, front: "Mitosis", back: "Cell division resulting in two identical daughter cells"}];
  });
  
  useEffect(() => { localStorage.setItem('toolbox_flashcards', JSON.stringify(cards)); }, [cards]);

  const [mode, setMode] = useState<'study' | 'edit'>('study');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const addCard = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    setCards([...cards, { id: Date.now(), front: newFront, back: newBack }]);
    setNewFront(''); setNewBack('');
  };

  const removeCard = (id: number) => {
    setCards(cards.filter(c => c.id !== id));
    if (currentIndex >= cards.length - 1) setCurrentIndex(Math.max(0, cards.length - 2));
  };

  const nextCard = () => { setIsFlipped(false); setCurrentIndex((prev) => (prev + 1) % cards.length); };
  const prevCard = () => { setIsFlipped(false); setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-2">
        <button onClick={() => setMode('study')} className={cn("flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all", mode === 'study' ? "bg-pink-500 text-white shadow" : "text-slate-400")}>Study</button>
        <button onClick={() => setMode('edit')} className={cn("flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all", mode === 'edit' ? "bg-pink-500 text-white shadow" : "text-slate-400")}>Edit Cards ({cards.length})</button>
      </div>

      {mode === 'study' ? (
        cards.length > 0 ? (
            <div className="flex flex-col items-center gap-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentIndex + 1} / {cards.length}</p>
                
                <div 
                  onClick={() => setIsFlipped(!isFlipped)} 
                  className="w-full aspect-[4/3] cursor-pointer group"
                >
                  <div className={cn("w-full h-full transition-all duration-300 shadow-xl rounded-3xl flex items-center justify-center p-6 text-center border-2", isFlipped ? "bg-pink-500 border-pink-500 text-white shadow-pink-200" : "bg-white border-pink-100 text-slate-800")}>
                      <div className="animate-in fade-in duration-300">
                        {isFlipped ? (
                            <p className="text-lg font-medium">{cards[currentIndex].back}</p>
                        ) : (
                            <p className="text-xl font-bold">{cards[currentIndex].front}</p>
                        )}
                      </div>
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                    <button onClick={prevCard} className="flex-1 p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl flex justify-center active:scale-95 transition-all"><ChevronLeft className="w-5 h-5"/></button>
                    <button onClick={nextCard} className="flex-1 p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl flex justify-center active:scale-95 transition-all"><ChevronRight className="w-5 h-5"/></button>
                </div>
            </div>
        ) : (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <Layers className="w-12 h-12 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest italic">No flashcards yet!</p>
              <button onClick={() => setMode('edit')} className="mt-4 px-4 py-2 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold uppercase tracking-widest">Add Cards</button>
            </div>
        )
      ) : (
        <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto no-scrollbar">
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-2 border border-slate-100">
                <input value={newFront} onChange={e=>setNewFront(e.target.value)} placeholder="Front (e.g. Concept)" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none" />
                <textarea value={newBack} onChange={e=>setNewBack(e.target.value)} placeholder="Back (e.g. Definition)" rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none resize-none" />
                <button onClick={addCard} className="w-full py-3 bg-pink-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest mt-2 active:scale-95 shadow-md shadow-pink-200">Add Card</button>
            </div>
            
            <div className="flex flex-col gap-2">
                {cards.map(c => (
                    <div key={c.id} className="bg-white border border-slate-100 p-3 rounded-2xl flex justify-between items-center group shadow-sm">
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-slate-800 truncate">{c.front}</span>
                            <span className="text-xs text-slate-400 truncate max-w-[200px]">{c.back}</span>
                        </div>
                        <button onClick={() => removeCard(c.id)} className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all ml-2">
                            <Trash2 className="w-4 h-4"/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

const WebSearchTool = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setResult('');
    try {
      const res = await performWebSearch(query);
      setResult(res);
    } catch (err: any) {
      setResult('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-h-[400px]">
      <form onSubmit={handleSearch} className="flex gap-2 shrink-0">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
        />
        <button 
          type="submit" 
          disabled={isLoading || !query.trim()}
          className="p-3 bg-cyan-500 text-white rounded-2xl shadow-lg shadow-cyan-100 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center shrink-0 w-12"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col">
        {isLoading && !result ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-cyan-500 my-8">
            <Search className="w-8 h-8 animate-pulse opacity-50" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Searching web...</p>
          </div>
        ) : result ? (
          <div className="w-full text-sm text-slate-700 leading-relaxed select-text markdown-body">
            <Markdown remarkPlugins={[remarkGfm]}>{result}</Markdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 my-8 opacity-50">
            <Globe className="w-12 h-12" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-center">Enter a query above to <br/> search the internet</p>
          </div>
        )}
      </div>
    </div>
  );
};
