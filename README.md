# PDF Signer

A modern, responsive web application for signing PDF documents online. Built with Next.js, this application allows users to upload PDFs, draw signatures, position them anywhere on the document, and download the signed PDF.

## Features

- **📄 PDF Upload**: Drag-and-drop or browse to upload PDF files
- **✍️ Digital Signature**: Draw your signature using mouse or touch input
- **🎯 Drag & Position**: Precisely position your signature anywhere on the PDF
- **📱 Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- **📑 Multi-page Support**: Works seamlessly with multi-page PDF documents
- **⬇️ Download**: Download the signed PDF with your signature embedded
- **🔄 Reposition**: Ability to reposition signature after applying it

## Tech Stack

- **Framework**: [Next.js 15.5.6](https://nextjs.org/) (React 19.1.0)
- **PDF Manipulation**: [pdf-lib](https://pdf-lib.js.org/) - For embedding signatures into PDFs
- **PDF Rendering**: [PDF.js](https://mozilla.github.io/pdf.js/) - For rendering PDF pages
- **Language**: TypeScript
- **Styling**: Inline styles with responsive design patterns

## Project Structure

```
scanovate-assignment/
├── app/
│   ├── api/
│   │   └── sign-pdf/
│   │       └── route.ts          # API endpoint for PDF validation
│   ├── components/
│   │   ├── DraggableSignature.tsx # Draggable signature component
│   │   ├── PdfViewer.tsx          # PDF rendering component
│   │   └── SignatureDialog.tsx    # Signature drawing dialog
│   ├── page.tsx                   # Main application page
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── public/                        # Static assets
├── package.json                   # Dependencies
└── README.md                      # This file
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scanovate-assignment
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

The application will be accessible on your local network at `http://0.0.0.0:3000` for testing on mobile devices.

## Usage

1. **Upload PDF**: 
   - Drag and drop a PDF file onto the upload area, or
   - Click "Upload PDF to Sign" to browse and select a file

2. **Draw Signature**:
   - A signature dialog will automatically open
   - Draw your signature using mouse or touch
   - Click "Sign PDF" to confirm

3. **Position Signature**:
   - Drag the signature to your desired position on the PDF
   - The signature can be placed on any page of a multi-page document
   - Scroll through pages while dragging to position on different pages

4. **Apply Signature**:
   - Click "Apply Signature" to embed the signature into the PDF
   - The signature will be permanently added at the chosen position

5. **Download**:
   - Click "Download" to save the signed PDF
   - The file will be named with "-signed" suffix

6. **Reposition** (Optional):
   - After applying, click "Reposition Signature" to adjust placement
   - This reverts to the original PDF with the draggable signature

## Key Components

### PdfViewer
Renders PDF pages using PDF.js loaded from CDN. Supports multi-page documents with individual canvas elements for each page.

### SignatureDialog
Modal dialog for drawing signatures with:
- Canvas-based drawing
- Touch and mouse support
- Clear and confirm actions
- Responsive sizing

### DraggableSignature
Draggable signature overlay with:
- Smooth drag-and-drop functionality
- Touch support for mobile devices
- Position constraints within PDF bounds
- Visual feedback during dragging
- Device-specific sizing (desktop: 100pt, tablet: 120pt, mobile: 150pt)

### API Route
`/api/sign-pdf` - Validates PDF presence before signature application

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Device-specific features:
- Adaptive signature sizes
- Bottom action bar for mobile/tablet
- Header action buttons for desktop
- Touch-optimized controls

## Build for Production

```bash
npm run build
npm start
```

## Linting

```bash
npm run lint
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

### Core Dependencies
- `next`: 15.5.6 - React framework
- `react`: 19.1.0 - UI library
- `react-dom`: 19.1.0 - React DOM renderer
- `pdf-lib`: 1.17.1 - PDF manipulation
- `pdfjs-dist`: 5.4.394 - PDF rendering

### Dev Dependencies
- `typescript`: 5.x - Type safety
- `eslint`: 9.x - Code linting
- `prettier`: 3.6.2 - Code formatting

