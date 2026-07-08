# DocForge Scanner

DocForge Scanner is a browser-based document scanner, PDF builder, converter, and PDF tools workspace.

## Features

- Capture HD document photos with the camera
- Continuous sequence capture for scanning many pages
- Import multiple photos from the gallery
- Edit scanned pages with rotate, auto-crop, brightness, contrast, sharpness, and tone controls
- Reorder and merge pages into a PDF
- Convert common browser-supported formats such as images, text, Markdown, HTML, CSV, JSON, RTF, DOC-compatible HTML, and XLS-compatible HTML
- Load existing PDFs for page organization, rotation, removal, extraction, splitting, watermarking, page numbering, and raster compression

## Run Locally

Camera access works best from `localhost`, not by opening `index.html` directly.

```powershell
cd C:\Users\user\Downloads\TOOLS\pdfmaker
python -m http.server 5173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173/
```

## Files

- `index.html` - app screens and controls
- `styles.css` - responsive UI styling
- `app.js` - scanner, converter, PDF export, and PDF tools logic

## Notes

Most features run fully in the browser. The PDF Tools screen uses PDF.js and pdf-lib from CDN, so it needs internet access unless those libraries are vendored locally.

Some advanced conversions need a backend engine, including PDF to Word, PDF to PowerPoint, PDF to Excel, OCR, AI summarization, translation, PDF/A, protect/unlock, and exact Office document conversion.

Supabase or Firebase is optional. Add one only if you want user accounts, cloud storage, saved documents, sharing links, conversion history, or backend job tracking.
