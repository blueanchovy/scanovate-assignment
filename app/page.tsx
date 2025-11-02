"use client";
import { ChangeEvent, DragEvent, useRef, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const checkAndSetFile = (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setFile(file);
    const url = URL.createObjectURL(file);
    setFileUrl(url);
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
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
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
      {file && (
        <div>
          <p>Selected File: {file.name}</p>
          <div>{(file.size / 1024).toFixed(1)} KB</div>
          <button onClick={removeFile}>Remove</button>
        </div>
      )}
      {fileUrl && (
        <div>
          <iframe
            src={fileUrl}
            title="PDF Preview"
            width="100%"
            height="600px"
          />
        </div>
      )}
    </div>
  );
}
