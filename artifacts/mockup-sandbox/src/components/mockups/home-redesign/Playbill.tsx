import React, { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import './Playbill.css';

const scripts = [
  { id: "a-porte-chiuse", title: "A PORTE CHIUSE", author: "Jean-Paul Sartre", characters: ["GARCIN","CAMERIERE"] },
  { id: "a-porte-chiuse-terza-scena", title: "A PORTE CHIUSE - TERZA SCENA", author: "Jean-Paul Sartre", characters: ["GARCIN","INES","CAMERIERE"] },
  { id: "finale-di-partita", title: "FINALE DI PARTITA", author: "Samuel Beckett", characters: ["HAMM","CLOV"] },
  { id: "il-compleanno", title: "IL COMPLEANNO", author: "Harold Pinter", characters: ["GOLDBERG","MCCANN"] },
  { id: "il-calapranzi", title: "IL CALAPRANZI", author: "Harold Pinter", characters: ["BEN","GUS"] },
  { id: "racconto-dinverno", title: "RACCONTO D'INVERNO", author: "William Shakespeare", characters: ["LEONTE","CAMILLO"] },
  { id: "misura-per-misura", title: "MISURA PER MISURA", author: "William Shakespeare", characters: ["ANGELO","ISABELLA"] },
  { id: "la-signorina-julie", title: "LA SIGNORINA JULIE", author: "August Strindberg", characters: ["JEAN","KRISTINA","JULIE"] },
  { id: "casa-di-bambola", title: "CASA DI BAMBOLA", author: "Henrik Ibsen", characters: ["NORA","KROGSTAD"] },
  { id: "scena-frate-lorenzo", title: "SCENA FRATE LORENZO", author: "William Shakespeare", characters: ["ROMEO","FRATE LORENZO"] },
  { id: "tartuffo", title: "TARTUFFO", author: "Moliere", characters: ["ORGONE","MARIANNA","DORINA"] },
  { id: "processo-al-potere", title: "PROCESSO AL POTERE", author: undefined, characters: ["GIUDICE","IMPUTATO","TESTIMONE"] },
];

export function Playbill() {
  const [selectedScriptId, setSelectedScriptId] = useState(scripts[2].id);
  const [selectedCharacter, setSelectedCharacter] = useState(scripts[2].characters[0]);
  const [contextLevel, setContextLevel] = useState<1 | 3 | 5>(3);

  const selectedScript = scripts.find(s => s.id === selectedScriptId)!;

  const handleScriptChange = (id: string) => {
    setSelectedScriptId(id);
    const newScript = scripts.find(s => s.id === id)!;
    setSelectedCharacter(newScript.characters[0]);
  };

  return (
    <div className="min-h-[874px] w-full max-w-[402px] mx-auto playbill-bg flex flex-col relative overflow-hidden pb-24 font-sans">
      {/* Scroll strip for plays */}
      <div className="w-full overflow-x-auto no-scrollbar border-b border-black/10 py-3 px-4 flex gap-6 items-center snap-x whitespace-nowrap z-10 sticky top-0 bg-[#Fdfbf7]/90 backdrop-blur-sm">
        {scripts.map(script => (
          <button
            key={script.id}
            onClick={() => handleScriptChange(script.id)}
            className={`text-xs uppercase tracking-widest font-semibold transition-all snap-start shrink-0 ${
              selectedScriptId === script.id ? 'text-black' : 'text-black/30 hover:text-black/60'
            }`}
          >
            {script.title}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col px-8 pt-12 pb-8">
        <div className="text-center mb-16">
          <p className="text-[10px] uppercase tracking-[0.3em] text-red-800 font-bold mb-6">
            In Scena Oggi
          </p>
          <h1 className="font-playfair text-[2.75rem] font-black uppercase leading-[0.95] tracking-tight mb-6 text-black break-words">
            {selectedScript.title}
          </h1>
          {selectedScript.author && (
            <p className="font-playfair italic text-xl text-black/70">
              di {selectedScript.author}
            </p>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-black/50 mb-4 border-b border-black/10 pb-2 font-semibold">
            Il Cast
          </h2>
          <div className="flex flex-col">
            {selectedScript.characters.map((char) => (
              <button
                key={char}
                onClick={() => setSelectedCharacter(char)}
                className="cast-row py-4 flex items-center justify-between text-left group"
              >
                <span className={`font-playfair text-2xl transition-colors ${
                  selectedCharacter === char ? 'text-black font-bold' : 'text-black/60'
                }`}>
                  {char}
                </span>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                  selectedCharacter === char ? 'bg-red-800 border-red-800 text-white' : 'border-black/20'
                }`}>
                  {selectedCharacter === char && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <h2 className="text-xs uppercase tracking-widest text-black/50 mb-4 text-center font-semibold">
            Contesto (Battute)
          </h2>
          <div className="flex bg-black/5 p-1 rounded-full relative">
            <div 
              className="absolute top-1 bottom-1 w-[calc(33.333%-4px)] bg-white rounded-full shadow-sm transition-all duration-300 ease-out"
              style={{
                left: contextLevel === 1 ? '4px' : contextLevel === 3 ? 'calc(33.333% + 2px)' : 'calc(66.666% + 0px)'
              }}
            />
            {[
              { label: 'Pochi', val: 1 },
              { label: 'Medio', val: 3 },
              { label: 'Tanti', val: 5 }
            ].map(lvl => (
              <button
                key={lvl.val}
                onClick={() => setContextLevel(lvl.val as 1 | 3 | 5)}
                className={`flex-1 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold z-10 transition-colors ${
                  contextLevel === lvl.val ? 'text-black' : 'text-black/50 hover:text-black/80'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#Fdfbf7] via-[#Fdfbf7] to-transparent pt-12">
        <button className="w-full bg-[#5c1313] hover:bg-[#400d0d] text-[#Fdfbf7] py-5 px-6 rounded-none flex items-center justify-between group transition-colors shadow-2xl">
          <span className="font-playfair italic text-2xl tracking-wide">Sali sul palco</span>
          <ChevronRight className="transform group-hover:translate-x-1 transition-transform w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
