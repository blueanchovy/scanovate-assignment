"use client";
import { useRef, useState, useEffect, MouseEvent, TouchEvent } from "react";

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureDataUrl: string) => void;
}

export default function SignatureDialog({ isOpen, onClose, onSign }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container size dynamically
    const isMobileDevice = window.innerWidth < 768;

    // Calculate available width (90vw - padding)
    const dialogWidth = Math.min(window.innerWidth * 0.9, 1000); // max 1000px
    const containerWidth = dialogWidth - 48; // subtract padding (24px * 2)
    const containerHeight = isMobileDevice ? 200 : 300;

    canvas.width = containerWidth;
    canvas.height = containerHeight;
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';

    //drawing styles
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  const startDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSignPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signatureDataUrl = canvas.toDataURL("image/png");
    onSign(signatureDataUrl);
  };

  if (!isOpen) return null;

  return (
    <dialog open className="signature-dialog">
      <div className="signature-dialog-content">
        <h2>Draw Your Signature</h2>
        <div className="signature-canvas-container">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="signature-canvas"
          />
        </div>
        <div className="signature-dialog-actions">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button onClick={clearSignature} className="btn-secondary">
            Clear
          </button>
          <button
            onClick={handleSignPdf}
            className="btn-primary"
            disabled={!hasSignature}
          >
            Sign PDF
          </button>
        </div>
      </div>
      <style jsx>{`
        .signature-dialog {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: none;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          max-width: 1000px;
          width: 90vw;
        }

        @media (max-width: 768px) {
          .signature-dialog {
            max-width: 95vw;
            max-height: 90vh;
            overflow-y: auto;
          }
        }

        .signature-dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.5);
        }

        .signature-dialog-content {
          padding: 24px;
          background: white;
          border-radius: 8px;
        }

        .signature-dialog-content h2 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 600;
          color: #333;
        }

        .signature-canvas-container {
          border: 2px solid #ddd;
          border-radius: 4px;
          margin-bottom: 16px;
          background: white;
        }

        .signature-canvas {
          display: block;
          cursor: crosshair;
          touch-action: none;
        }

        @media (max-width: 768px) {
          .signature-canvas {
            width: 100%;
          }
          
          .signature-dialog-content {
            padding: 16px;
          }
          
          .signature-dialog-content h2 {
            font-size: 20px;
          }
          
          .signature-dialog-actions {
            flex-wrap: wrap;
          }
          
          .btn-primary,
          .btn-secondary {
            padding: 8px 16px;
            font-size: 13px;
          }
        }

        .signature-dialog-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background-color: #0070f3;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0051cc;
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #f5f5f5;
          color: #333;
        }

        .btn-secondary:hover {
          background-color: #e5e5e5;
        }
      `}</style>
    </dialog>
  );
}
