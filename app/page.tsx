"use client";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import SignatureDialog from "./components/SignatureDialog";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    // Automatically open signature dialog when PDF is uploaded
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
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (signedUrl) URL.revokeObjectURL(signedUrl);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign PDF");
    } finally {
      setLoading(false);
    }
  }
  return (
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

      {file && (
        <div>
          <p>Selected File: {file.name}</p>
          <div>{(file.size / 1024).toFixed(1)} KB</div>
          <button onClick={removeFile}>Remove</button>
        </div>
      )}

      {loading && (
        <div style={{ margin: "10px 0" }}>
          Signing PDF...
        </div>
      )}

      {signedUrl ? (
        <div>
          <h3>Signed PDF</h3>
          <iframe
            src={signedUrl}
            title="Signed PDF Preview"
            width="100%"
            height="600px"
          />
        </div>
      ) : fileUrl && (
        <div>
          <h3>Original PDF</h3>
          <iframe
            src={fileUrl}
            title="PDF Preview"
            width="100%"
            height="600px"
          />
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
