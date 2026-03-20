/**
 * @file components/admin/CsvImporter.tsx
 * @description Import CSV — Mode clair, cohérent avec AdminView.
 */

import React, { useState, useRef, useCallback } from 'react';
import useCompetitionStore from '../../store/useCompetitionStore';
import csvService from '../../services/csvService';

type ImportState = 'idle' | 'loading' | 'success' | 'error';

const CsvImporter: React.FC = () => {
  const [importState, setImportState] = useState<ImportState>('idle');
  const [feedback, setFeedback] = useState<{ count: number; errors: string[] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importCsv = useCompetitionStore((s) => s.importCsv);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportState('error');
      setFeedback({ count: 0, errors: ['Le fichier doit être au format .csv'] });
      return;
    }
    setFileName(file.name);
    setImportState('loading');
    const result = await importCsv(file);
    if (result.success) {
      setImportState('success');
      setFeedback({ count: result.wordsImported, errors: result.errors });
    } else {
      setImportState('error');
      setFeedback({ count: 0, errors: result.errors });
    }
  }, [importCsv]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const dropBorder =
    importState === 'success' ? '#bbf7d0' :
    importState === 'error'   ? '#fecaca' :
    isDragging                ? '#111'    :
    '#e0ddd8';

  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{ background: '#fff', border: '1.5px solid #e0ddd8' }}
    >
      <p className="text-xs tracking-widest uppercase font-bold" style={{ color: '#aaa' }}>
        CHARGEMENT DES MOTS
      </p>

      {/* Zone drop */}
      <div
        className="p-3 transition-all"
        style={{ border: `2px dashed ${dropBorder}` }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          <input
            type="text"
            readOnly
            value={fileName || 'Glisser un CSV ou parcourir...'}
            className="flex-1 text-sm bg-transparent outline-none cursor-default"
            style={{ color: fileName ? '#333' : '#bbb' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-1.5 text-xs font-bold tracking-widest transition-all whitespace-nowrap"
            style={{ border: '1.5px solid #111', background: '#111', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#333'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#111'; }}
          >
            PARCOURIR
          </button>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importState === 'loading'}
          className="flex-1 py-2 text-xs font-bold tracking-widest transition-all disabled:opacity-40"
          style={{ border: '1.5px solid #111', background: '#111', color: '#fff' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#333'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#111'; }}
        >
          {importState === 'loading' ? 'CHARGEMENT...' : 'CHARGER LE FICHIER CSV'}
        </button>
        <button
          onClick={() => csvService.downloadExampleCsv()}
          className="px-4 py-2 text-xs font-bold tracking-widest transition-all"
          style={{ border: '1.5px solid #e0ddd8', color: '#999', background: '#fff' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f5f2ed'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
        >
          EXEMPLE
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="text-xs font-semibold" style={{ color: importState === 'success' ? '#16a34a' : '#dc2626' }}>
          {importState === 'success' && <p>✓ {feedback.count} mots importés avec succès</p>}
          {feedback.errors.slice(0, 3).map((err, i) => <p key={i}>⚠ {err}</p>)}
          {feedback.errors.length > 3 && <p>... et {feedback.errors.length - 3} autres erreurs</p>}
        </div>
      )}
    </div>
  );
};

export default CsvImporter;