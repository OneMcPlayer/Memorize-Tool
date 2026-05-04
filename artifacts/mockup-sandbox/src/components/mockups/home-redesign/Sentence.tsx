import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { id: "processo-al-potere", title: "PROCESSO AL POTERE", author: "Ignoto", characters: ["GIUDICE","IMPUTATO","TESTIMONE"] },
];

const contextOptions = [
  { id: "0", label: "nessun", lines: 0 },
  { id: "1", label: "poco", lines: 1 },
  { id: "3", label: "medio", lines: 3 },
  { id: "5", label: "molto", lines: 5 },
];

type Step = "script" | "character" | "context" | null;

export function Sentence() {
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  const [activeDrawer, setActiveDrawer] = useState<Step>(null);

  const selectedScript = scripts.find(s => s.id === selectedScriptId);
  const selectedContextOption = contextOptions.find(c => c.id === selectedContext);

  const isComplete = selectedScriptId && selectedCharacter && selectedContext;

  const openDrawer = (step: Step) => {
    if (step === "character" && !selectedScriptId) return;
    setActiveDrawer(step);
  };

  const handleScriptSelect = (id: string) => {
    setSelectedScriptId(id);
    setSelectedCharacter(null); // reset character if script changes
    setActiveDrawer(null);
    
    // Automatically open character drawer next
    setTimeout(() => setActiveDrawer("character"), 300);
  };

  const handleCharacterSelect = (char: string) => {
    setSelectedCharacter(char);
    setActiveDrawer(null);
    
    if (!selectedContext) {
      setTimeout(() => setActiveDrawer("context"), 300);
    }
  };

  const handleContextSelect = (id: string) => {
    setSelectedContext(id);
    setActiveDrawer(null);
  };

  return (
    <div className="min-h-[874px] w-full max-w-[402px] mx-auto bg-[#faf9f7] font-sans relative overflow-hidden flex flex-col items-center pt-24 px-6 text-[#1a1a1a]">
      {/* Decorative top fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#f2efea] to-transparent pointer-events-none opacity-50" />

      <div className="w-full max-w-sm flex flex-col relative z-10">
        <p className="text-sm font-medium tracking-wider text-neutral-500 uppercase mb-12">
          Cosa vuoi provare oggi?
        </p>

        <div className="text-[32px] leading-[1.3] font-medium tracking-tight">
          Voglio recitare il ruolo di{" "}
          <button
            onClick={() => openDrawer("character")}
            disabled={!selectedScriptId}
            className={cn(
              "inline-flex items-center gap-1.5 align-baseline px-3 py-1 -my-1 rounded-full text-[26px] transition-all active:scale-95 duration-200 shadow-sm border",
              selectedCharacter 
                ? "bg-[#e34234] text-white border-[#e34234] font-semibold" 
                : selectedScriptId 
                  ? "bg-white text-neutral-400 border-neutral-200 border-dashed hover:bg-neutral-50 hover:text-neutral-600" 
                  : "bg-neutral-100 text-neutral-300 border-transparent cursor-not-allowed opacity-60"
            )}
          >
            {selectedCharacter ? (
              selectedCharacter
            ) : (
              <span className="flex items-center gap-1">
                scegli personaggio <ChevronRight className="w-5 h-5 opacity-50" />
              </span>
            )}
          </button>
          {" "}nello spettacolo{" "}
          <button
            onClick={() => openDrawer("script")}
            className={cn(
              "inline-flex items-center gap-1.5 align-baseline px-3 py-1 -my-1 rounded-full text-[26px] transition-all active:scale-95 duration-200 shadow-sm border",
              selectedScriptId 
                ? "bg-[#e34234] text-white border-[#e34234] font-semibold" 
                : "bg-white text-neutral-400 border-neutral-200 border-dashed hover:bg-neutral-50 hover:text-neutral-600"
            )}
          >
            {selectedScript ? (
              selectedScript.title
            ) : (
              <span className="flex items-center gap-1">
                scegli copione <ChevronRight className="w-5 h-5 opacity-50" />
              </span>
            )}
          </button>
          {" "}con{" "}
          <button
            onClick={() => openDrawer("context")}
            className={cn(
              "inline-flex items-center gap-1.5 align-baseline px-3 py-1 -my-1 rounded-full text-[26px] transition-all active:scale-95 duration-200 shadow-sm border",
              selectedContext 
                ? "bg-[#e34234] text-white border-[#e34234] font-semibold" 
                : "bg-white text-neutral-400 border-neutral-200 border-dashed hover:bg-neutral-50 hover:text-neutral-600"
            )}
          >
            {selectedContextOption ? (
              selectedContextOption.label
            ) : (
              <span className="flex items-center gap-1">
                scegli <ChevronRight className="w-5 h-5 opacity-50" />
              </span>
            )}
          </button>
          {" "}contesto.
        </div>
      </div>

      {/* Primary CTA */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#faf9f7] via-[#faf9f7] to-transparent pt-12 transition-all duration-500 ease-out transform",
          isComplete ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <Button 
          className="w-full h-14 text-lg font-medium rounded-2xl bg-[#1a1a1a] hover:bg-black text-white shadow-xl shadow-black/10 active:scale-[0.98] transition-all"
        >
          Inizia esercitazione
        </Button>
      </div>

      {/* Script Drawer */}
      <Drawer open={activeDrawer === "script"} onOpenChange={(o) => !o && setActiveDrawer(null)}>
        <DrawerContent className="max-h-[80vh] bg-white rounded-t-3xl pb-6">
          <DrawerHeader className="text-left pb-2 pt-6 px-6">
            <DrawerTitle className="text-2xl font-bold">Scegli Copione</DrawerTitle>
            <p className="text-neutral-500">I classici tradotti in italiano</p>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <div className="flex flex-col gap-2 pt-4">
              {scripts.map((script) => (
                <button
                  key={script.id}
                  onClick={() => handleScriptSelect(script.id)}
                  className={cn(
                    "flex flex-col items-start px-5 py-4 rounded-2xl transition-all border text-left",
                    selectedScriptId === script.id 
                      ? "bg-[#fdf2f1] border-[#f8c6c2]" 
                      : "bg-white border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100"
                  )}
                >
                  <div className="flex w-full justify-between items-center mb-1">
                    <span className={cn(
                      "font-bold text-lg",
                      selectedScriptId === script.id ? "text-[#e34234]" : "text-neutral-900"
                    )}>
                      {script.title}
                    </span>
                    {selectedScriptId === script.id && <Check className="w-5 h-5 text-[#e34234]" />}
                  </div>
                  <span className="text-sm text-neutral-500">{script.author}</span>
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Character Drawer */}
      <Drawer open={activeDrawer === "character"} onOpenChange={(o) => !o && setActiveDrawer(null)}>
        <DrawerContent className="max-h-[80vh] bg-white rounded-t-3xl pb-6">
          <DrawerHeader className="text-left pb-2 pt-6 px-6">
            <DrawerTitle className="text-2xl font-bold">Chi interpreti?</DrawerTitle>
            <p className="text-neutral-500">{selectedScript?.title}</p>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <div className="flex flex-col gap-2 pt-4">
              {selectedScript?.characters.map((char) => (
                <button
                  key={char}
                  onClick={() => handleCharacterSelect(char)}
                  className={cn(
                    "flex justify-between items-center px-5 py-4 rounded-2xl transition-all border text-left",
                    selectedCharacter === char 
                      ? "bg-[#fdf2f1] border-[#f8c6c2]" 
                      : "bg-white border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100"
                  )}
                >
                  <span className={cn(
                    "font-bold text-lg",
                    selectedCharacter === char ? "text-[#e34234]" : "text-neutral-900"
                  )}>
                    {char}
                  </span>
                  {selectedCharacter === char && <Check className="w-5 h-5 text-[#e34234]" />}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Context Drawer */}
      <Drawer open={activeDrawer === "context"} onOpenChange={(o) => !o && setActiveDrawer(null)}>
        <DrawerContent className="bg-white rounded-t-3xl pb-6">
          <DrawerHeader className="text-left pb-2 pt-6 px-6">
            <DrawerTitle className="text-2xl font-bold">Quanto contesto?</DrawerTitle>
            <p className="text-neutral-500">Battute precedenti prima della tua</p>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <div className="flex flex-col gap-2 pt-4">
              {contextOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleContextSelect(opt.id)}
                  className={cn(
                    "flex justify-between items-center px-5 py-4 rounded-2xl transition-all border text-left",
                    selectedContext === opt.id 
                      ? "bg-[#fdf2f1] border-[#f8c6c2]" 
                      : "bg-white border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100"
                  )}
                >
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-bold text-lg capitalize",
                      selectedContext === opt.id ? "text-[#e34234]" : "text-neutral-900"
                    )}>
                      {opt.label}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {opt.lines === 0 ? "Solo la tua battuta" : `${opt.lines} battute precedenti`}
                    </span>
                  </div>
                  {selectedContext === opt.id && <Check className="w-5 h-5 text-[#e34234]" />}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
