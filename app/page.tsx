"use client";
import { ChangeEvent, DragEvent, useRef, useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import SignatureDialog from "./components/SignatureDialog";
import PdfViewer from "./components/PdfViewer";
import DraggableSignature from "./components/DraggableSignature";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isTablet, setIsTablet] = useState<boolean>(false);
  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [signaturePosition, setSignaturePosition] = useState({ x: 50, y: 50 });
  const [isDraggingSignature, setIsDraggingSignature] = useState<boolean>(false);
  const [showDraggableSignature, setShowDraggableSignature] = useState<boolean>(false);
  const [pdfCanvases, setPdfCanvases] = useState<HTMLCanvasElement[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  // Detect mobile and tablet devices
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(
        /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        width < 768
      );
      setIsTablet(width >= 768 && width < 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const checkAndSetFile = (file: File | undefined) => {
    setError("");
    setSignedUrl(""); // Reset signed URL when new file is uploaded
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setFile(file);
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    // Show PDF viewer and open signature dialog
    setShowPdfViewer(true);
    setShowSignatureDialog(true);
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    checkAndSetFile(selectedFile);
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    checkAndSetFile(droppedFile);
  }


  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }

  const removeFile = () => {
    setFile(null);
    setFileUrl("");
    setSignedUrl("");
    setError("");
    setShowSignatureDialog(false);
    setShowPdfViewer(false);
    setShowDraggableSignature(false);
    setSignatureDataUrl("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (signedUrl) URL.revokeObjectURL(signedUrl);
  }

  const handleBackToPdfList = () => {
    setShowPdfViewer(false);
    removeFile();
  }

  const truncateFileName = (name: string, maxLength: number = 30) => {
    if (name.length <= maxLength) return name;
    const extension = name.slice(name.lastIndexOf('.'));
    const nameWithoutExt = name.slice(0, name.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 3);
    return `${truncatedName}...${extension}`;
  }

  const handleSignature = async (signatureDataUrl: string) => {
    // Store signature and show draggable version
    setSignatureDataUrl(signatureDataUrl);
    setShowSignatureDialog(false);
    setShowDraggableSignature(true);
  }

  const handleApplySignature = async () => {
    if (!file || !signatureDataUrl) {
      setError("Missing file or signature data");
      return;
    }

    if (pdfCanvases.length === 0) {
      setError("PDF not loaded yet. Please wait a moment and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/sign-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hasPdf: !!file }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to validate PDF");
      }

      // Determine which page the signature is on
      const containerRect = pdfContainerRef.current?.getBoundingClientRect();
      if (!containerRect) {
        throw new Error("Container not found");
      }

      // Find which canvas/page the signature is positioned on based on absolute position
      let targetPageIndex = 0;
      let targetCanvas = pdfCanvases[0];
      let found = false;

      for (let i = 0; i < pdfCanvases.length; i++) {
        const canvas = pdfCanvases[i];
        const parent = canvas.parentElement; // The wrapper div with margins
        if (!parent) continue;

        const parentRect = parent.getBoundingClientRect();
        const scrollTop = pdfContainerRef.current?.scrollTop || 0;

        // Calculate the top position of this page wrapper in the scrollable content
        const pageTopInContent = parentRect.top - containerRect.top + scrollTop;
        const pageBottomInContent = pageTopInContent + parentRect.height;

        // Check if signature Y position falls within this page wrapper
        if (signaturePosition.y >= pageTopInContent && signaturePosition.y < pageBottomInContent) {
          targetPageIndex = i;
          targetCanvas = canvas;
          found = true;
          break;
        }
      }

      // If not found in any page, default to last page
      if (!found) {
        targetPageIndex = pdfCanvases.length - 1;
        targetCanvas = pdfCanvases[targetPageIndex];
      }

      const canvasRect = targetCanvas.getBoundingClientRect();

      // If API returns OK, add signature to PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Get the target page
      const pages = pdfDoc.getPages();
      const targetPage = pages[targetPageIndex];
      const { width: pageWidth, height: pageHeight } = targetPage.getSize();

      // Embed the signature image
      const signatureImage = await pdfDoc.embedPng(signatureDataUrl);

      // Use fixed signature widths in PDF points for consistent sizing
      // Desktop: 100pt, Tablet: 120pt, Mobile: 150pt
      const targetWidth = isMobile ? 150 : isTablet ? 120 : 100;

      // Calculate height maintaining aspect ratio
      const aspectRatio = signatureImage.height / signatureImage.width;
      const targetHeight = targetWidth * aspectRatio;

      const signatureDims = { width: targetWidth, height: targetHeight };

      // Calculate position relative to the target canvas
      // Account for the canvas position within its parent wrapper
      const scrollTop = pdfContainerRef.current?.scrollTop || 0;
      const canvasTopAbsolute = canvasRect.top - containerRect.top + scrollTop;

      const relativeX = signaturePosition.x;
      const relativeY = signaturePosition.y - canvasTopAbsolute;

      // Convert to PDF coordinates using ratios (coordinate system flip: PDF is bottom-left origin)
      const xRatio = relativeX / canvasRect.width;
      const yRatio = relativeY / canvasRect.height;

      const pdfX = xRatio * pageWidth;
      const pdfY = pageHeight - (yRatio * pageHeight) - signatureDims.height;

      // Ensure signature is within bounds
      const finalX = Math.max(0, Math.min(pdfX, pageWidth - signatureDims.width));
      const finalY = Math.max(0, Math.min(pdfY, pageHeight - signatureDims.height));

      console.log('Applying signature:', {
        targetPageIndex,
        pageWidth,
        pageHeight,
        signatureDims: { width: signatureDims.width, height: signatureDims.height },
        position: { x: finalX, y: finalY },
        targetWidth
      });

      // Add signature at the dragged position on the correct page
      targetPage.drawImage(signatureImage, {
        x: finalX,
        y: finalY,
        width: signatureDims.width,
        height: signatureDims.height,
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      console.log('PDF saved successfully, size:', pdfBytes.length, 'bytes');

      // Clean up old signed URL if exists
      if (signedUrl) URL.revokeObjectURL(signedUrl);

      // Clear canvases before setting new URL to force refresh
      setPdfCanvases([]);
      setSignedUrl(url);
      setShowDraggableSignature(false);
      // Keep PDF viewer open to show signed PDF
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign PDF");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      {!showPdfViewer ? (
        // Upload View
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#f5f5f5",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Header */}
          <header style={{
            backgroundColor: "#2d2d2d",
            padding: "16px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "white",
              fontSize: "24px",
              fontWeight: "bold"
            }}>
              <div style={{
                backgroundColor: "#ff5722",
                padding: "4px 8px",
                borderRadius: "4px"
              }}>
                📄
              </div>
              PDF-Signer
            </div>
            <nav style={{
              display: "flex",
              gap: "32px",
              alignItems: "center"
            }}>



            </nav>
          </header>

          {/* Hero Section */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            textAlign: "center"
          }}>
            <h1 style={{
              fontSize: "48px",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              color: "#2d2d2d"
            }}>
              Online PDF Signer
            </h1>
            <p style={{
              fontSize: "16px",
              color: "#666",
              margin: "0 0 48px 0",
              maxWidth: "600px"
            }}>
              Sign your PDFs effortlessly from any device.
            </p>

            {/* Upload Area */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                padding: "60px 80px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                maxWidth: "600px",
                width: "100%",
                cursor: "pointer"
              }}
            >
              {/* PDF Icon */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "24px"
              }}>
                <div style={{
                  width: "80px",
                  height: "100px",
                  border: "2px solid #333",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#333",
                  position: "relative"
                }}>
                  <div style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: "20px",
                    height: "20px",
                    borderLeft: "2px solid #333",
                    borderBottom: "2px solid #333",
                    backgroundColor: "white"
                  }} />
                  PDF
                </div>
              </div>

              <h2 style={{
                fontSize: "24px",
                color: "#ff5722",
                margin: "0 0 16px 0",
                fontWeight: "normal"
              }}>
                Drop your PDF file
              </h2>

              <p style={{
                fontSize: "14px",
                color: "#666",
                margin: "0 0 24px 0"
              }}>
                or
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={onFileChange}
                id="pdf-file"
                style={{ display: "none" }}
              />
              <label htmlFor="pdf-file">
                <button
                  onClick={() => inputRef.current?.click()}
                  style={{
                    padding: "12px 32px",
                    backgroundColor: "#2d2d2d",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px"
                  }}
                >
                  Upload PDF to Sign
                </button>
              </label>


            </div>

            {error && (
              <div style={{
                marginTop: "20px",
                padding: "12px 24px",
                backgroundColor: "#ffebee",
                color: "#c62828",
                borderRadius: "4px",
                fontSize: "14px"
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        // PDF Viewer Dialog
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#f5f5f5",
          zIndex: 999,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: "white",
            padding: "16px 20px",
            borderBottom: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <button
              onClick={handleBackToPdfList}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#333"
              }}
            >
              ← Back
            </button>
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: "18px", 
                fontWeight: "600",
                wordBreak: "break-word",
                overflowWrap: "break-word"
              }}>
                {isMobile || isTablet 
                  ? file?.name?.replace(/\.pdf$/, `${signedUrl ? "-signed" : ""}.pdf`) || "document.pdf"
                  : truncateFileName(file?.name?.replace(/\.pdf$/, `${signedUrl ? "-signed" : ""}.pdf`) || "document.pdf")}
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: signedUrl ? "#28a745" : "#666" }}>
                {signedUrl ? "Signed" : "Original"} • {file ? (file.size / 1024).toFixed(1) : "0"} KB
              </p>
            </div>

            {/* Desktop: Show buttons in header */}
            {!isMobile && !isTablet && (
              <div style={{ display: "flex", gap: "8px" }}>
                {/* Show Add Signature button if no signature exists */}
                {!signatureDataUrl && !showDraggableSignature && (
                  <button
                    onClick={() => setShowSignatureDialog(true)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#0070f3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "14px"
                    }}
                  >
                    Add Signature
                  </button>
                )}
                {showDraggableSignature && (
                  <>
                    <button
                      onClick={() => setShowSignatureDialog(true)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#f5f5f5",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "500",
                        fontSize: "14px",
                        color: "#333"
                      }}
                    >
                      Edit Signature
                    </button>
                    <button
                      onClick={handleApplySignature}
                      disabled={loading}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: loading ? "#ccc" : "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "14px"
                      }}
                    >
                      Apply Signature
                    </button>
                  </>
                )}
                {signedUrl && signatureDataUrl && !showDraggableSignature && (
                  <button
                    onClick={() => {
                      // Reset to original PDF and show draggable signature
                      if (signedUrl) URL.revokeObjectURL(signedUrl);
                      setSignedUrl("");
                      // Clear canvases temporarily to force refresh
                      setPdfCanvases([]);
                      // Show draggable signature after a brief delay to ensure PDF reloads
                      setTimeout(() => {
                        setShowDraggableSignature(true);
                      }, 100);
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "14px"
                    }}
                  >
                    Reposition Signature
                  </button>
                )}
                <a
                  href={signedUrl || fileUrl}
                  download={signedUrl ? file?.name?.replace('.pdf', '-signed.pdf') : file?.name}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: (isDraggingSignature || !signedUrl) ? "#ccc" : "#0070f3",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "4px",
                    fontWeight: "500",
                    fontSize: "14px",
                    pointerEvents: (isDraggingSignature || !signedUrl) ? "none" : "auto",
                    opacity: (isDraggingSignature || !signedUrl) ? 0.5 : 1,
                    cursor: (isDraggingSignature || !signedUrl) ? "not-allowed" : "pointer"
                  }}
                >
                  Download
                </a>
              </div>
            )}

          </div>

          {/* Loading State */}
          {loading && (
            <div style={{
              padding: "16px",
              backgroundColor: "#fff3cd",
              borderBottom: "1px solid #ffc107",
              textAlign: "center",
              fontWeight: "500"
            }}>
              Signing PDF...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{
              padding: "16px",
              backgroundColor: "#f8d7da",
              borderBottom: "1px solid #f5c6cb",
              color: "#721c24",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          {/* PDF Content */}
          <div
            ref={pdfContainerRef}
            style={{
              flex: 1,
              overflow: isDraggingSignature ? "hidden" : "auto",
              padding: isMobile ? "10px" : "20px",
              paddingBottom: (isMobile || isTablet) ? "80px" : "20px", // Extra padding for bottom bar
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              position: "relative"
            }}>
            <PdfViewer
              fileUrl={signedUrl || fileUrl}
              onCanvasReady={(canvases) => setPdfCanvases(canvases)}
            />
            {showDraggableSignature && signatureDataUrl && (
              <DraggableSignature
                signatureDataUrl={signatureDataUrl}
                containerRef={pdfContainerRef}
                onPositionChange={(x, y) => setSignaturePosition({ x, y })}
                onDragStart={() => setIsDraggingSignature(true)}
                onDragEnd={() => setIsDraggingSignature(false)}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            )}
          </div>

          {/* Mobile/Tablet: Bottom Action Bar */}
          {(isMobile || isTablet) && (
            <div style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "white",
              borderTop: "1px solid #ddd",
              padding: "12px 16px",
              display: "flex",
              gap: "8px",
              justifyContent: "center",
              flexWrap: "wrap",
              boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
              zIndex: 1001
            }}>
              {/* Show Add Signature button if no signature exists */}
              {!signatureDataUrl && !showDraggableSignature && (
                <button
                  onClick={() => setShowSignatureDialog(true)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#0070f3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    flex: isMobile ? "1 1 auto" : "0 1 auto"
                  }}
                >
                  Add Signature
                </button>
              )}
              {showDraggableSignature && (
                <>
                  <button
                    onClick={() => setShowSignatureDialog(true)}
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "#f5f5f5",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "14px",
                      color: "#333",
                      flex: isMobile ? "1 1 auto" : "0 1 auto"
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleApplySignature}
                    disabled={loading}
                    style={{
                      padding: "10px 16px",
                      backgroundColor: loading ? "#ccc" : "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      fontSize: "14px",
                      flex: isMobile ? "1 1 auto" : "0 1 auto"
                    }}
                  >
                    Apply
                  </button>
                </>
              )}
              {signedUrl && signatureDataUrl && !showDraggableSignature && (
                <button
                  onClick={() => {
                    // Reset to original PDF and show draggable signature
                    if (signedUrl) URL.revokeObjectURL(signedUrl);
                    setSignedUrl("");
                    // Clear canvases temporarily to force refresh
                    setPdfCanvases([]);
                    // Show draggable signature after a brief delay to ensure PDF reloads
                    setTimeout(() => {
                      setShowDraggableSignature(true);
                    }, 100);
                  }}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#ff9800",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    flex: isMobile ? "1 1 auto" : "0 1 auto"
                  }}
                >
                  Reposition
                </button>
              )}
              <a
                href={signedUrl || fileUrl}
                download={signedUrl ? file?.name?.replace('.pdf', '-signed.pdf') : file?.name}
                style={{
                  padding: "10px 16px",
                  backgroundColor: (isDraggingSignature || !signedUrl) ? "#ccc" : "#0070f3",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontWeight: "500",
                  fontSize: "14px",
                  pointerEvents: (isDraggingSignature || !signedUrl) ? "none" : "auto",
                  opacity: (isDraggingSignature || !signedUrl) ? 0.5 : 1,
                  flex: isMobile ? "1 1 auto" : "0 1 auto",
                  textAlign: "center",
                  cursor: (isDraggingSignature || !signedUrl) ? "not-allowed" : "pointer"
                }}
              >
                Download
              </a>
            </div>
          )}
        </div>
      )}

      <SignatureDialog
        isOpen={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        onSign={handleSignature}
      />
    </div>
  );
}
