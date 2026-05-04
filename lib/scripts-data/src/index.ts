import aPorteChiuseJson from "../data/a-porte-chiuse.json" with { type: "json" };
import aPorteChiuseTerzaScenaJson from "../data/a-porte-chiuse-terza-scena.json" with { type: "json" };
import finaleDiPartitaJson from "../data/finale-di-partita.json" with { type: "json" };
import ilCompleannoJson from "../data/il-compleanno.json" with { type: "json" };
import ilCalapranziJson from "../data/il-calapranzi.json" with { type: "json" };
import raccontoDInvernoJson from "../data/racconto-dinverno.json" with { type: "json" };
import misuraPerMisuraJson from "../data/misura-per-misura.json" with { type: "json" };
import laSignorinaJulieJson from "../data/la-signorina-julie.json" with { type: "json" };
import casaDiBambolaJson from "../data/casa-di-bambola.json" with { type: "json" };
import scenaFrateLorenzoJson from "../data/scena-frate-lorenzo.json" with { type: "json" };
import tartuffoJson from "../data/tartuffo.json" with { type: "json" };
import processoAlPotereJson from "../data/processo-al-potere.json" with { type: "json" };

export interface ScriptMeta {
  id: string;
  title: string;
  author?: string;
  description: string;
  language: string;
}

export interface JsonScriptLine {
  speaker: string;
  line: string;
}

export interface JsonScript {
  lines: JsonScriptLine[];
  [key: string]: unknown;
}

export const scriptCatalog: ScriptMeta[] = [
  {
    id: "a-porte-chiuse",
    title: "A PORTE CHIUSE",
    author: "Jean-Paul Sartre",
    description: "Excerpt between Garcin and the waiter from No Exit",
    language: "it",
  },
  {
    id: "a-porte-chiuse-terza-scena",
    title: "A PORTE CHIUSE - TERZA SCENA",
    author: "Jean-Paul Sartre",
    description: "Third-scene excerpt featuring Garcin, Ines, and the waiter",
    language: "it",
  },
  {
    id: "finale-di-partita",
    title: "FINALE DI PARTITA",
    author: "Samuel Beckett",
    description: "Excerpt between Hamm and Clov from Endgame",
    language: "it",
  },
  {
    id: "il-compleanno",
    title: "IL COMPLEANNO",
    author: "Harold Pinter",
    description: "Excerpt between Goldberg and McCann from The Birthday Party",
    language: "it",
  },
  {
    id: "il-calapranzi",
    title: "IL CALAPRANZI",
    author: "Harold Pinter",
    description: "Excerpt between Ben and Gus from The Dumb Waiter",
    language: "it",
  },
  {
    id: "racconto-dinverno",
    title: "RACCONTO D'INVERNO",
    author: "William Shakespeare",
    description: "Excerpt between Leonte and Camillo from The Winter's Tale",
    language: "it",
  },
  {
    id: "misura-per-misura",
    title: "MISURA PER MISURA",
    author: "William Shakespeare",
    description: "Excerpt between Angelo and Isabella from Measure for Measure",
    language: "it",
  },
  {
    id: "la-signorina-julie",
    title: "LA SIGNORINA JULIE",
    author: "August Strindberg",
    description: "Excerpt between Jean, Kristina, and Miss Julie",
    language: "it",
  },
  {
    id: "casa-di-bambola",
    title: "CASA DI BAMBOLA",
    author: "Henrik Ibsen",
    description: "Excerpt between Nora and Krogstad from A Doll's House",
    language: "it",
  },
  {
    id: "scena-frate-lorenzo",
    title: "SCENA FRATE LORENZO",
    author: "William Shakespeare",
    description: "Scene between Romeo and Friar Laurence from Romeo and Juliet",
    language: "it",
  },
  {
    id: "tartuffo",
    title: "TARTUFFO",
    author: "Moliere",
    description: "Excerpt between Orgone, Marianna, and Dorina",
    language: "it",
  },
  {
    id: "processo-al-potere",
    title: "PROCESSO AL POTERE",
    description: "Courtroom ensemble text — the trial of power itself",
    language: "it",
  },
];

const scriptContentMap: Record<string, JsonScript> = {
  "a-porte-chiuse": aPorteChiuseJson as JsonScript,
  "a-porte-chiuse-terza-scena": aPorteChiuseTerzaScenaJson as JsonScript,
  "finale-di-partita": finaleDiPartitaJson as JsonScript,
  "il-compleanno": ilCompleannoJson as JsonScript,
  "il-calapranzi": ilCalapranziJson as JsonScript,
  "racconto-dinverno": raccontoDInvernoJson as JsonScript,
  "misura-per-misura": misuraPerMisuraJson as JsonScript,
  "la-signorina-julie": laSignorinaJulieJson as JsonScript,
  "casa-di-bambola": casaDiBambolaJson as JsonScript,
  "scena-frate-lorenzo": scenaFrateLorenzoJson as JsonScript,
  "tartuffo": tartuffoJson as JsonScript,
  "processo-al-potere": processoAlPotereJson as JsonScript,
};

export const getScriptContent = (scriptId: string): JsonScript | string => {
  return scriptContentMap[scriptId] ?? "";
};

export const convertJsonScriptToText = (scriptJson: JsonScript): string => {
  if (!scriptJson || !scriptJson.lines) return "";
  return scriptJson.lines.map((line) => `${line.speaker}: ${line.line}`).join("\n");
};

export const getAvailableScripts = (): ScriptMeta[] => scriptCatalog;

export const getScriptById = (
  scriptId: string,
): { meta: ScriptMeta; content: JsonScript } | null => {
  const meta = scriptCatalog.find((s) => s.id === scriptId);
  const content = scriptContentMap[scriptId];
  if (!meta || !content) return null;
  return { meta, content };
};
