import { convertJsonScriptToText, getAvailableScripts, getScriptContent } from './index';

describe('script library', () => {
  it('includes Scena Frate Lorenzo in the catalog', () => {
    const scripts = getAvailableScripts();

    expect(scripts.some(script => script.id === 'scena-frate-lorenzo')).toBe(true);
  });

  it('includes the Base2 Mercoledi PDF excerpts in the catalog', () => {
    const scripts = getAvailableScripts();
    const expectedIds = [
      'a-porte-chiuse',
      'a-porte-chiuse-terza-scena',
      'finale-di-partita',
      'il-compleanno',
      'il-calapranzi',
      'racconto-dinverno',
      'misura-per-misura',
      'la-signorina-julie',
      'casa-di-bambola',
      'tartuffo'
    ];

    expectedIds.forEach(scriptId => {
      expect(scripts.some(script => script.id === scriptId)).toBe(true);
    });
  });

  it('loads Scena Frate Lorenzo content and converts it to text', () => {
    const script = getScriptContent('scena-frate-lorenzo');
    const text = convertJsonScriptToText(script);

    expect(script.title).toBe('SCENA FRATE LORENZO');
    expect(text).toContain("FRATE LORENZO: Il mattino dagli occhi grigi");
    expect(text).toContain("ROMEO: Buon giorno, padre.");
  });

  it('loads A Porte Chiuse content and converts it to text', () => {
    const script = getScriptContent('a-porte-chiuse');
    const text = convertJsonScriptToText(script);

    expect(script.title).toBe('A PORTE CHIUSE');
    expect(text).toContain('GARCIN: Va bene...');
    expect(text).toContain('IL CAMERIERE: Eccoci.');
  });
});
