"use client";
import { ChangeEvent, DragEvent, useRef, useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import SignatureDialog from "./components/SignatureDialog";
import PdfViewer from "./components/PdfViewer";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    if (!file) return;

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

      // If API returns OK, add signature to PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Get the last page
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width } = lastPage.getSize();

      // Embed the signature image
      const signatureImage = await pdfDoc.embedPng(signatureDataUrl);
      const signatureDims = signatureImage.scale(0.3);

      // Add signature to bottom right of last page
      lastPage.drawImage(signatureImage, {
        x: width - signatureDims.width - 50,
        y: 50,
        width: signatureDims.width,
        height: signatureDims.height,
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Clean up old signed URL if exists
      if (signedUrl) URL.revokeObjectURL(signedUrl);

      setSignedUrl(url);
      setShowSignatureDialog(false);
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
        <div>
          <h2 className="page-subheading">Upload a PDF</h2>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <div className="flex-shrink-0">
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={onFileChange}
                id="pdf-file"
              />
            </div>
          </div>

          {error && (
            <div style={{ color: "red", margin: "10px 0" }}>
              {error}
            </div>
          )}
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
                gap: "8px"
              }}
            >
              ← Back
            </button>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                {signedUrl ? "✓ " : ""}{truncateFileName(file?.name || "PDF Document")}
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
                {signedUrl ? "Signed" : "Original"} • {file ? (file.size / 1024).toFixed(1) : "0"} KB
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href={signedUrl || fileUrl}
                download={signedUrl ? file?.name?.replace('.pdf', '-signed.pdf') : file?.name}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#0070f3",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontWeight: "500",
                  fontSize: "14px"
                }}
              >
                Download
              </a>
            </div>

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
          <div style={{
            flex: 1,
            overflow: "auto",
            padding: isMobile ? "10px" : "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start"
          }}>
            <PdfViewer fileUrl={signedUrl || fileUrl} />
          </div>
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
