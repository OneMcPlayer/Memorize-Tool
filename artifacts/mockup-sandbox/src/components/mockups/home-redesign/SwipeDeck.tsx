import React, { useState, useRef, useEffect } from 'react';
import { Play, Settings2, Info, UserCircle2, Mic2, Sparkles, SlidersHorizontal, BookOpen, Clock } from 'lucide-react';
import './SwipeDeck.css';

const scripts = [
  { id: "a-porte-chiuse", title: "A PORTE CHIUSE", author: "Jean-Paul Sartre", characters: ["GARCIN","CAMERIERE"] },
  { id: "a-porte-chiuse-terza-scena", title: "A PORTE CHIUSE - TERZA SCENA", author: "Jean-Paul Sartre", characters: ["GARCIN","INES","CAMERIERE"] },
  { id: "finale-di-partita", title: "FINALE DI PARTITA", author: "Samuel Beckett", characters: ["HAMM","CLOV"], lastPlayed: true },
  { id: "il-compleanno", title: "IL COMPLEANNO", author: "Harold Pinter", characters: ["GOLDBERG","MCCANN"] },
  { id: "il-calapranzi", title: "IL CALAPRANZI", author: "Harold Pinter", characters: ["BEN","GUS"] },
  { id: "racconto-dinverno", title: "RACCONTO D'INVERNO", author: "William Shakespeare", characters: ["LEONTE","CAMILLO"] },
  { id: "misura-per-misura", title: "MISURA PER MISURA", author: "William Shakespeare", characters: ["ANGELO","ISABELLA"] },
  { id: "la-signorina-julie", title: "LA SIGNORINA JULIE", author: "August Strindberg", characters: ["JEAN","KRISTINA","JULIE"] },
  { id: "casa-di-bambola", title: "CASA DI BAMBOLA", author: "Henrik Ibsen", characters: ["NORA","KROGSTAD"] },
  { id: "scena-frate-lorenzo", title: "SCENA FRATE LORENZO", author: "William Shakespeare", characters: ["ROMEO","FRATE LORENZO"] },
  { id: "tartuffo", title: "TARTUFFO", author: "Moliere", characters: ["ORGONE","MARIANNA","DORINA"] },
  { id: "processo-al-potere", title: "PROCESSO AL POTERE", author: "Sconosciuto", characters: ["GIUDICE","IMPUTATO","TESTIMONE"] },
];

const gradients = [
  "from-zinc-900 to-zinc-800",
  "from-amber-900/50 to-zinc-900",
  "from-rose-900/40 to-zinc-900",
  "from-emerald-900/40 to-zinc-900",
  "from-blue-900/40 to-zinc-900",
  "from-indigo-900/40 to-zinc-900",
  "from-violet-900/40 to-zinc-900",
  "from-purple-900/40 to-zinc-900",
  "from-fuchsia-900/40 to-zinc-900",
  "from-pink-900/40 to-zinc-900",
  "from-rose-950 to-zinc-900",
  "from-slate-900 to-zinc-900",
];

export function SwipeDeck() {
  const [selectedScriptId, setSelectedScriptId] = useState(scripts[2].id);
  const [selectedCharacter, setSelectedCharacter] = useState("HAMM");
  const [contextLines, setContextLines] = useState(3);
  
  const carouselRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!carouselRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const id = entry.target.getAttribute('data-id');
          if (id) {
            setSelectedScriptId(id);
            const script = scripts.find(s => s.id === id);
            if (script && !script.characters.includes(selectedCharacter)) {
              setSelectedCharacter(script.characters[0]);
            }
          }
        }
      });
    }, {
      root: carouselRef.current,
      threshold: 0.5,
    });
    
    const elements = carouselRef.current.querySelectorAll('.script-card');
    elements.forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, [selectedCharacter]);

  // Initial scroll to the 3rd item
  useEffect(() => {
    if (carouselRef.current) {
      const selectedEl = carouselRef.current.querySelector(`[data-id="${scripts[2].id}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
      }
    }
  }, []);

  const selectedScript = scripts.find(s => s.id === selectedScriptId) || scripts[2];

  return (
    <div className="swipedeck-container relative min-h-[874px] w-full max-w-[402px] mx-auto bg-zinc-950 text-zinc-100 font-sans overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[300px] bg-indigo-900/10 blur-[100px] pointer-events-none transition-all duration-700" />
      
      <header className="px-6 pt-12 pb-4 flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Copioni</h1>
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mt-1">La tua libreria</p>
        </div>
        <button className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          <Settings2 className="w-5 h-5" />
        </button>
      </header>

      <div className="shrink-0 w-full z-10 relative">
        <div 
          ref={carouselRef}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pl-6 pr-[120px] pb-6 pt-2 gap-4"
        >
          {scripts.map((script, index) => {
            const isSelected = script.id === selectedScriptId;
            return (
              <div 
                key={script.id} 
                data-id={script.id}
                className={`script-card shrink-0 w-[260px] snap-center transition-all duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-90 opacity-40'}`}
              >
                <div className={`aspect-[3/4] rounded-2xl p-6 flex flex-col justify-between border ${isSelected ? 'border-zinc-700/50 shadow-2xl shadow-black/50' : 'border-zinc-800/30'} bg-gradient-to-br ${gradients[index % gradients.length]}`}>
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold tracking-wider text-zinc-300 border border-white/5">
                      <UserCircle2 className="w-3 h-3" />
                      {script.characters.length} PERSONAGGI
                    </span>
                    {script.lastPlayed && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wider border border-indigo-500/20">
                        <Clock className="w-3 h-3" />
                        ULTIMA
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mt-auto">
                    <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">{script.author}</p>
                    <h2 className="text-2xl font-black leading-tight text-white">{script.title}</h2>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-6 z-10 overflow-y-auto pb-40 hide-scrollbar">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Seleziona il ruolo</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {selectedScript.characters.map((char) => (
            <button
              key={char}
              onClick={() => setSelectedCharacter(char)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selectedCharacter === char 
                  ? 'bg-zinc-800 border-zinc-600 shadow-inner' 
                  : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-base font-bold ${selectedCharacter === char ? 'text-white' : 'text-zinc-300'}`}>
                  {char}
                </span>
                {selectedCharacter === char && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2">
                Qualche battuta di esempio per {char.toLowerCase()}...
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/50 p-6 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Contesto prima della battuta</span>
          </div>
          <span className="text-xl font-black text-white">{contextLines} <span className="text-sm font-medium text-zinc-500">battute</span></span>
        </div>
        
        <input 
          type="range" 
          min="0" max="5" 
          value={contextLines} 
          onChange={(e) => setContextLines(parseInt(e.target.value))}
          className="w-full accent-emerald-500 mb-6 swipedeck-slider"
        />

        <button className="w-full h-14 bg-white text-black rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-200 active:scale-[0.98] transition-all">
          <Mic2 className="w-5 h-5" />
          Vai in scena
        </button>
      </div>
    </div>
  );
}
