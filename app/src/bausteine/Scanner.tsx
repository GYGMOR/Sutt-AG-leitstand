/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/bausteine/Scanner.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Kamera-Scanner: BarcodeDetector (QR, EAN, Code 128) mit Fallback      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useRef, useState } from 'react';
import { CameraOff, ScanLine } from 'lucide-react';
import { cx } from '@sl/core/ui/cx';
import styles from './Scanner.module.css';

// ── §1 · Browser-API (nicht in lib.dom) ──────────────────────────

interface BarcodeTreffer {
  rawValue: string;
}

interface BarcodeLeser {
  detect(quelle: HTMLVideoElement): Promise<BarcodeTreffer[]>;
}

type BarcodeLeserKonstruktor = new (optionen: { formats: readonly string[] }) => BarcodeLeser;

function barcodeLeser(): BarcodeLeserKonstruktor | null {
  const fenster = window as unknown as { BarcodeDetector?: BarcodeLeserKonstruktor };
  return fenster.BarcodeDetector ?? null;
}

const FORMATE = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix'] as const;

type ScannerZustand = 'start' | 'laeuft' | 'nicht-unterstuetzt' | 'verweigert';

// ── §2 · Komponente ──────────────────────────────────────────────

interface ScannerProps {
  aktiv: boolean;
  onErgebnis: (text: string) => void;
}

// jh› Scannen ohne Bibliothek: Chrome und Edge auf Android bringen den BarcodeDetector mit, iOS Safari
//     (noch) nicht – dort tippt man den Code ein oder nutzt die Beispiele. Ein Treffer alle 400 ms reicht.
export function Scanner({ aktiv, onErgebnis }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [zustand, setZustand] = useState<ScannerZustand>('start');
  const letzterRef = useRef<string | null>(null);

  useEffect(() => {
    const Konstruktor = barcodeLeser();
    if (!aktiv) return undefined;
    if (!Konstruktor || !navigator.mediaDevices?.getUserMedia) {
      setZustand('nicht-unterstuetzt');
      return undefined;
    }
    let stream: MediaStream | null = null;
    let timer = 0;
    let beendet = false;
    const starten = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        const video = videoRef.current;
        if (!video || beendet) return;
        video.srcObject = stream;
        await video.play();
        setZustand('laeuft');
        const leser = new Konstruktor({ formats: FORMATE });
        timer = window.setInterval(async () => {
          if (beendet || !videoRef.current) return;
          try {
            const treffer = await leser.detect(videoRef.current);
            const wert = treffer[0]?.rawValue;
            if (wert && wert !== letzterRef.current) {
              letzterRef.current = wert;
              onErgebnis(wert);
            }
          } catch {
            // jh› Ein einzelnes Bild ohne Code ist kein Fehler.
          }
        }, 400);
      } catch {
        setZustand('verweigert');
      }
    };
    void starten();
    return () => {
      beendet = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((spur) => spur.stop());
    };
  }, [aktiv, onErgebnis]);

  if (!aktiv) return null;

  return (
    <div className={cx(styles.rahmen, zustand === 'laeuft' && styles.laeuft)}>
      <video ref={videoRef} className={styles.video} muted playsInline aria-label="Kamerabild für den Scanner" />
      {zustand === 'laeuft' && (
        <>
          <span className={cx(styles.ecke, styles.eckeOl)} aria-hidden />
          <span className={cx(styles.ecke, styles.eckeOr)} aria-hidden />
          <span className={cx(styles.ecke, styles.eckeUl)} aria-hidden />
          <span className={cx(styles.ecke, styles.eckeUr)} aria-hidden />
          <span className={styles.linie} aria-hidden />
        </>
      )}
      {zustand !== 'laeuft' && (
        <p className={styles.hinweis} role="status">
          {zustand === 'start' && (
            <>
              <ScanLine size={18} strokeWidth={1.5} aria-hidden /> Kamera wird gestartet …
            </>
          )}
          {zustand === 'nicht-unterstuetzt' && (
            <>
              <CameraOff size={18} strokeWidth={1.5} aria-hidden /> Dieser Browser hat keinen Barcode-Leser – Code unten eintippen oder ein Beispiel antippen.
            </>
          )}
          {zustand === 'verweigert' && (
            <>
              <CameraOff size={18} strokeWidth={1.5} aria-hidden /> Kein Zugriff auf die Kamera – in den Browser-Einstellungen erlauben oder Code eintippen.
            </>
          )}
        </p>
      )}
    </div>
  );
}

/* ◆ jh · eof */
