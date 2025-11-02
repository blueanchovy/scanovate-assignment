"use client";
import { useEffect, useState, useRef } from "react";

// Declare global types for PDF.js loaded from CDN
interface PDFPageProxy {
  getViewport: (params: { scale: number }) => {
    height: number;
    width: number;
  };
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { height: number; width: number };
  }) => { promise: Promise<void> };
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

interface PDFJSLib {
  getDocument: (url: string) => { promise: Promise<PDFDocumentProxy> };
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

declare global {
  interface Window {
    pdfjsLib: PDFJSLib;
  }
}

interface PdfViewerProps {
  fileUrl: string;
  onCanvasReady?: (canvases: HTMLCanvasElement[]) => void;
}

export default function PdfViewer({ fileUrl, onCanvasReady }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const onCanvasReadyRef = useRef(onCanvasReady);
  
  // Keep ref updated
  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  }, [onCanvasReady]);

  // Load PDF.js from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.pdfjsLib) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        setScriptLoaded(true);
      }
    };
    script.onerror = () => {
      setError("Failed to load PDF.js library");
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded) return;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError("");

        const loadingTask = window.pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        setError("Failed to load PDF");
        setLoading(false);
        console.error(err);
      }
    };

    loadPdf();
  }, [fileUrl, scriptLoaded]);

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    const renderPages = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRefs.current[pageNum - 1];

        if (!canvas) continue;

        const viewport = page.getViewport({ scale: 1.5 });
        const context = canvas.getContext('2d');

        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
      }
      
      // Notify parent that canvases are ready
      if (onCanvasReadyRef.current) {
        const validCanvases = canvasRefs.current.filter((c): c is HTMLCanvasElement => c !== null);
        onCanvasReadyRef.current(validCanvases);
      }
    };

    renderPages();
  }, [pdfDoc, numPages]);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: "40px",
        color: "#666"
      }}>
        Loading PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: "40px",
        color: "#d32f2f"
      }}>
        {error}
      </div>
    );
  }


  return (
    <div style={{
      width: "100%",
      maxWidth: "1200px",
      margin: "0 auto",
      backgroundColor: "#f5f5f5",
      padding: "10px"
    }}>
      {Array.from({ length: numPages }, (_, index) => (
        <div
          key={index}
          style={{
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "4px",
            overflow: "hidden",
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <canvas
            ref={(el) => {
              canvasRefs.current[index] = el;
            }}
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block"
            }}
          />
          <div style={{
            padding: "8px",
            textAlign: "center",
            fontSize: "12px",
            color: "#666",
            borderTop: "1px solid #eee",
            width: "100%"
          }}>
            Page {index + 1} of {numPages}
          </div>
        </div>
      ))}
    </div>
  );
}
