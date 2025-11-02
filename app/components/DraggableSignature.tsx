"use client";
import { useState, useRef, useEffect, MouseEvent, TouchEvent } from "react";

interface DraggableSignatureProps {
  signatureDataUrl: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPositionChange: (x: number, y: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isMobile: boolean;
  isTablet: boolean;
}

export default function DraggableSignature({
  signatureDataUrl,
  containerRef,
  onPositionChange,
  onDragStart,
  onDragEnd,
  isMobile,
  isTablet,
}: DraggableSignatureProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const signatureRef = useRef<HTMLDivElement>(null);

  // Calculate signature size based on device
  // PDF is rendered at 1.5x scale, so PDF points * 1.5 = screen pixels
  // Desktop: 100pt * 1.5 = 150px, Tablet: 120pt * 1.5 = 180px, Mobile: 150pt * 1.5 = 225px
  const PDF_RENDER_SCALE = 1.5;
  const getSignatureSize = () => {
    if (isMobile) return { width: 150 * PDF_RENDER_SCALE, height: 75 * PDF_RENDER_SCALE }; // 150pt PDF = 225px screen
    if (isTablet) return { width: 120 * PDF_RENDER_SCALE, height: 60 * PDF_RENDER_SCALE }; // 120pt PDF = 180px screen
    return { width: 100 * PDF_RENDER_SCALE, height: 50 * PDF_RENDER_SCALE }; // 100pt PDF = 150px screen
  };

  const signatureSize = getSignatureSize();

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = signatureRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Center the drag point for better UX
    setDragOffset({
      x: rect.width / 2,
      y: rect.height / 2,
    });
    setIsDragging(true);
    onDragStart();
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = signatureRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Center the drag point for better UX
    setDragOffset({
      x: rect.width / 2,
      y: rect.height / 2,
    });
    setIsDragging(true);
    onDragStart();
  };

  // Add global mouse/touch event listeners for smooth dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollTop = containerRef.current.scrollTop;
        const scrollLeft = containerRef.current.scrollLeft;
        
        // Calculate position including scroll offset
        const newX = e.clientX - containerRect.left + scrollLeft - dragOffset.x;
        const newY = e.clientY - containerRect.top + scrollTop - dragOffset.y;

        // Constrain within the entire scrollable content area
        const maxX = containerRef.current.scrollWidth - signatureSize.width;
        const maxY = containerRef.current.scrollHeight - signatureSize.height;

        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));

        setPosition({ x: constrainedX, y: constrainedY });
        onPositionChange(constrainedX, constrainedY);
      };

      const handleGlobalTouchMove = (e: globalThis.TouchEvent) => {
        if (!containerRef.current) return;

        const touch = e.touches[0];
        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollTop = containerRef.current.scrollTop;
        const scrollLeft = containerRef.current.scrollLeft;
        
        // Calculate position including scroll offset
        const newX = touch.clientX - containerRect.left + scrollLeft - dragOffset.x;
        const newY = touch.clientY - containerRect.top + scrollTop - dragOffset.y;

        // Constrain within the entire scrollable content area
        const maxX = containerRef.current.scrollWidth - signatureSize.width;
        const maxY = containerRef.current.scrollHeight - signatureSize.height;

        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));

        setPosition({ x: constrainedX, y: constrainedY });
        onPositionChange(constrainedX, constrainedY);
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        onDragEnd();
      };

      const handleGlobalTouchEnd = () => {
        setIsDragging(false);
        onDragEnd();
      };

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.addEventListener("touchmove", handleGlobalTouchMove);
      document.addEventListener("touchend", handleGlobalTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.removeEventListener("touchmove", handleGlobalTouchMove);
        document.removeEventListener("touchend", handleGlobalTouchEnd);
      };
    }
  }, [isDragging, dragOffset, containerRef, signatureSize, onPositionChange, onDragEnd]);

  return (
    <div
      ref={signatureRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${signatureSize.width}px`,
        height: `${signatureSize.height}px`,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: 1000,
        touchAction: "none",
        userSelect: "none",
        border: "2px dashed #0070f3",
        borderRadius: "4px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        boxShadow: isDragging
          ? "0 8px 16px rgba(0, 0, 0, 0.3)"
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        transition: isDragging ? "none" : "box-shadow 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px",
      }}
    >
      <img
        src={signatureDataUrl}
        alt="Signature"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          pointerEvents: "none",
        }}
        draggable={false}
      />
    </div>
  );
}
