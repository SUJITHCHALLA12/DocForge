"use strict";

const els = {
  navItems: [...document.querySelectorAll(".nav-item")],
  screens: [...document.querySelectorAll(".screen")],
  pageTitle: document.getElementById("pageTitle"),
  railCount: document.getElementById("railCount"),
  cameraVideo: document.getElementById("cameraVideo"),
  snapshotCanvas: document.getElementById("snapshotCanvas"),
  cameraPlaceholder: document.getElementById("cameraPlaceholder"),
  startCameraBtn: document.getElementById("startCameraBtn"),
  captureBtn: document.getElementById("captureBtn"),
  sequenceCaptureBtn: document.getElementById("sequenceCaptureBtn"),
  cameraStatus: document.getElementById("cameraStatus"),
  fileInput: document.getElementById("fileInput"),
  libraryFileInput: document.getElementById("libraryFileInput"),
  photoGrid: document.getElementById("photoGrid"),
  libraryEmpty: document.getElementById("libraryEmpty"),
  thumbStrip: document.getElementById("thumbStrip"),
  editCanvas: document.getElementById("editCanvas"),
  editorEmpty: document.getElementById("editorEmpty"),
  mergeBoard: document.getElementById("mergeBoard"),
  mergeEmpty: document.getElementById("mergeEmpty"),
  qualitySelect: document.getElementById("qualitySelect"),
  filterSelect: document.getElementById("filterSelect"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  fitSelect: document.getElementById("fitSelect"),
  autoEnhanceToggle: document.getElementById("autoEnhanceToggle"),
  dateStampToggle: document.getElementById("dateStampToggle"),
  brightnessRange: document.getElementById("brightnessRange"),
  contrastRange: document.getElementById("contrastRange"),
  sharpnessRange: document.getElementById("sharpnessRange"),
  rotateLeftBtn: document.getElementById("rotateLeftBtn"),
  rotateRightBtn: document.getElementById("rotateRightBtn"),
  cropBtn: document.getElementById("cropBtn"),
  removeSelectedBtn: document.getElementById("removeSelectedBtn"),
  applyFormatBtn: document.getElementById("applyFormatBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  quickExportBtn: document.getElementById("quickExportBtn"),
  sortNameBtn: document.getElementById("sortNameBtn"),
  reverseBtn: document.getElementById("reverseBtn"),
  fileNameInput: document.getElementById("fileNameInput"),
  marginSelect: document.getElementById("marginSelect"),
  orientationSelect: document.getElementById("orientationSelect"),
  downloadPdfBtn: document.getElementById("downloadPdfBtn"),
  exportStatus: document.getElementById("exportStatus"),
  converterFileInput: document.getElementById("converterFileInput"),
  converterDropZone: document.getElementById("converterDropZone"),
  converterFileName: document.getElementById("converterFileName"),
  converterFromInput: document.getElementById("converterFromInput"),
  converterToSelect: document.getElementById("converterToSelect"),
  convertFileBtn: document.getElementById("convertFileBtn"),
  sendToScannerBtn: document.getElementById("sendToScannerBtn"),
  converterStatus: document.getElementById("converterStatus"),
  pdfFileInput: document.getElementById("pdfFileInput"),
  pdfDropZone: document.getElementById("pdfDropZone"),
  pdfFileName: document.getElementById("pdfFileName"),
  pdfOutputNameInput: document.getElementById("pdfOutputNameInput"),
  pdfWatermarkInput: document.getElementById("pdfWatermarkInput"),
  pdfQualitySelect: document.getElementById("pdfQualitySelect"),
  pdfRasterScaleSelect: document.getElementById("pdfRasterScaleSelect"),
  pdfPageNumbersToggle: document.getElementById("pdfPageNumbersToggle"),
  pdfExportBtn: document.getElementById("pdfExportBtn"),
  pdfCompressBtn: document.getElementById("pdfCompressBtn"),
  pdfSplitBtn: document.getElementById("pdfSplitBtn"),
  pdfExtractBtn: document.getElementById("pdfExtractBtn"),
  pdfResetBtn: document.getElementById("pdfResetBtn"),
  pdfRotateLeftBtn: document.getElementById("pdfRotateLeftBtn"),
  pdfRotateRightBtn: document.getElementById("pdfRotateRightBtn"),
  pdfPageGrid: document.getElementById("pdfPageGrid"),
  pdfToolsEmpty: document.getElementById("pdfToolsEmpty"),
  pdfToolsStatus: document.getElementById("pdfToolsStatus"),
  summaryPages: document.getElementById("summaryPages"),
  summarySize: document.getElementById("summarySize"),
  summaryMode: document.getElementById("summaryMode"),
  toast: document.getElementById("toast")
};

const titles = {
  capture: "Capture HD document photos",
  library: "Access photos from gallery",
  editor: "Format document scans",
  merge: "Merge pages in order",
  convert: "Convert document formats",
  pdftools: "Edit existing PDFs",
  export: "Download PDF file"
};

const state = {
  pages: [],
  selectedId: null,
  stream: null,
  dragId: null,
  sequenceTimer: null,
  sequenceCount: 0,
  isCapturing: false,
  converterFile: null,
  pdfTools: {
    fileName: "",
    bytes: null,
    pageCount: 0,
    pageItems: [],
    thumbnails: new Map(),
    selectedId: null,
    dragId: null
  }
};

function uid() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("visible"), 2600);
}

function setRoute(route) {
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.route === route));
  els.screens.forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === route));
  els.pageTitle.textContent = titles[route] || titles.capture;
  if (route === "editor") renderEditor();
}

function selectedPage() {
  return state.pages.find((page) => page.id === state.selectedId) || null;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
}

function canvasToJpeg(canvas, quality) {
  return canvas.toDataURL("image/jpeg", Number(quality || els.qualitySelect.value));
}

function getFilterSettings(filterName, page = {}) {
  const brightness = page.brightness ?? Number(els.brightnessRange.value);
  const contrast = page.contrast ?? Number(els.contrastRange.value);
  if (filterName === "doc") {
    return `grayscale(1) brightness(${brightness}%) contrast(${Math.max(contrast, 138)}%)`;
  }
  if (filterName === "gray") {
    return `grayscale(1) brightness(${brightness}%) contrast(${contrast}%)`;
  }
  if (filterName === "sharp") {
    return `saturate(1.16) brightness(${brightness}%) contrast(${contrast}%)`;
  }
  return "none";
}

function sharpenCanvas(canvas, amount) {
  if (!amount) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const src = ctx.getImageData(0, 0, width, height);
  const out = ctx.createImageData(width, height);
  const data = src.data;
  const dest = out.data;
  const strength = Math.min(0.8, amount / 50);
  const center = 1 + 4 * strength;
  const edge = -strength;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const top = y > 0 ? i - width * 4 + c : i + c;
        const bottom = y < height - 1 ? i + width * 4 + c : i + c;
        const left = x > 0 ? i - 4 + c : i + c;
        const right = x < width - 1 ? i + 4 + c : i + c;
        dest[i + c] = Math.max(0, Math.min(255, data[i + c] * center + (data[top] + data[bottom] + data[left] + data[right]) * edge));
      }
      dest[i + 3] = data[i + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
}

function cropFromImage(image, crop) {
  if (!crop) {
    return { sx: 0, sy: 0, sw: image.naturalWidth, sh: image.naturalHeight };
  }
  return {
    sx: Math.round(crop.x * image.naturalWidth),
    sy: Math.round(crop.y * image.naturalHeight),
    sw: Math.round(crop.w * image.naturalWidth),
    sh: Math.round(crop.h * image.naturalHeight)
  };
}

async function renderPage(page, options = {}) {
  const image = await loadImage(page.originalSrc);
  const rotation = ((page.rotation || 0) % 360 + 360) % 360;
  const crop = cropFromImage(image, page.crop);
  const swap = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? crop.sh : crop.sw;
  canvas.height = swap ? crop.sw : crop.sh;

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.filter = getFilterSettings(page.filter || els.filterSelect.value, page);
  if (rotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (rotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate((Math.PI * 3) / 2);
  }
  ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
  ctx.restore();

  sharpenCanvas(canvas, page.sharpness ?? Number(els.sharpnessRange.value));

  if (options.stamp) {
    const stamp = new Date(page.createdAt).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    const fontSize = Math.max(18, Math.round(canvas.width * 0.024));
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillRect(0, canvas.height - fontSize * 2.2, canvas.width, fontSize * 2.2);
    ctx.fillStyle = "#172026";
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    ctx.fillText(stamp, fontSize, canvas.height - fontSize * 0.78);
  }

  return {
    dataUrl: canvasToJpeg(canvas, options.quality),
    width: canvas.width,
    height: canvas.height
  };
}

async function makePageFromSource(src, name, createdAt = Date.now()) {
  const image = await loadImage(src);
  const page = {
    id: uid(),
    name,
    originalSrc: src,
    processedSrc: src,
    width: image.naturalWidth,
    height: image.naturalHeight,
    createdAt,
    rotation: 0,
    filter: els.autoEnhanceToggle.checked ? els.filterSelect.value : "none",
    brightness: Number(els.brightnessRange.value),
    contrast: Number(els.contrastRange.value),
    sharpness: Number(els.sharpnessRange.value),
    crop: null,
    size: Math.round((src.length * 3) / 4)
  };
  const rendered = await renderPage(page, { quality: els.qualitySelect.value });
  page.processedSrc = rendered.dataUrl;
  page.width = rendered.width;
  page.height = rendered.height;
  page.size = Math.round((rendered.dataUrl.length * 3) / 4);
  return page;
}

async function addFiles(files) {
  const list = [...files].filter((file) => file.type.startsWith("image/"));
  if (!list.length) return;
  showToast(`Importing ${list.length} photo${list.length === 1 ? "" : "s"}...`);
  for (const file of list) {
    const src = await fileToDataUrl(file);
    const page = await makePageFromSource(src, file.name || `Gallery ${state.pages.length + 1}`);
    state.pages.push(page);
    state.selectedId = page.id;
    renderAll();
  }
  showToast("Photos added to the document.");
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    els.cameraStatus.textContent = "Camera is not available in this browser.";
    showToast("Use a browser with camera support.");
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 2560 },
        height: { ideal: 1440 }
      }
    });
    els.cameraVideo.srcObject = state.stream;
    els.captureBtn.disabled = false;
    els.sequenceCaptureBtn.disabled = false;
    els.cameraPlaceholder.classList.add("hidden");
    els.cameraStatus.textContent = "Camera ready. Align the document inside the frame.";
  } catch (error) {
    els.cameraStatus.textContent = "Camera permission was blocked or no camera was found.";
    showToast("Camera could not be started.");
  }
}

async function capturePhoto(options = {}) {
  if (state.isCapturing) return null;
  const video = els.cameraVideo;
  if (!video.videoWidth || !video.videoHeight) return null;
  state.isCapturing = true;
  const canvas = els.snapshotCanvas;
  try {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const src = canvasToJpeg(canvas, els.qualitySelect.value);
    const name = `Camera scan ${state.pages.length + 1}.jpg`;
    const page = await makePageFromSource(src, name);
    state.pages.push(page);
    state.selectedId = page.id;
    renderAll();
    els.cameraStatus.textContent = `${name} captured in ${page.width} x ${page.height}.`;
    if (!options.silent) showToast("HD document photo captured.");
    return page;
  } finally {
    state.isCapturing = false;
  }
}

function stopSequenceCapture(message = "Sequence capture stopped.") {
  if (!state.sequenceTimer) return;
  clearInterval(state.sequenceTimer);
  state.sequenceTimer = null;
  els.sequenceCaptureBtn.classList.remove("active");
  els.sequenceCaptureBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8v14H8z"/><path d="M4 8h3v8H4z"/><path d="M17 8h3v8h-3z"/></svg>Sequence';
  els.captureBtn.disabled = !state.stream;
  els.cameraStatus.textContent = message;
}

async function toggleSequenceCapture() {
  if (state.sequenceTimer) {
    stopSequenceCapture(`Sequence capture stopped after ${state.sequenceCount} photo${state.sequenceCount === 1 ? "" : "s"}.`);
    return;
  }
  if (!state.stream) {
    await startCamera();
  }
  if (!state.stream || !els.cameraVideo.videoWidth) {
    els.cameraStatus.textContent = "Start the camera before sequence capture.";
    return;
  }
  state.sequenceCount = 0;
  els.sequenceCaptureBtn.classList.add("active");
  els.sequenceCaptureBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6z"/><path d="M14 5h4v14h-4z"/></svg>Stop';
  els.captureBtn.disabled = true;
  els.cameraStatus.textContent = "Sequence capture running. Keep turning pages; press Stop when done.";

  const takeNext = async () => {
    const page = await capturePhoto({ silent: true });
    if (!page) return;
    state.sequenceCount += 1;
    els.cameraStatus.textContent = `Sequence capture running. ${state.sequenceCount} photo${state.sequenceCount === 1 ? "" : "s"} captured.`;
  };

  await takeNext();
  state.sequenceTimer = setInterval(takeNext, 1800);
}

function removePage(id) {
  const index = state.pages.findIndex((page) => page.id === id);
  if (index === -1) return;
  state.pages.splice(index, 1);
  if (state.selectedId === id) {
    state.selectedId = state.pages[index]?.id || state.pages[index - 1]?.id || null;
  }
  renderAll();
}

async function updateSelected(mutator) {
  const page = selectedPage();
  if (!page) return;
  mutator(page);
  const rendered = await renderPage(page, { quality: els.qualitySelect.value });
  page.processedSrc = rendered.dataUrl;
  page.width = rendered.width;
  page.height = rendered.height;
  page.size = Math.round((rendered.dataUrl.length * 3) / 4);
  renderAll();
}

function estimateCrop(page) {
  return loadImage(page.originalSrc).then((image) => {
    const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hits = 0;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (brightness > 145 && spread < 90) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          hits += 1;
        }
      }
    }

    const area = ((maxX - minX) * (maxY - minY)) / (width * height);
    if (hits < 400 || area < 0.22 || area > 0.98) {
      return { x: 0.04, y: 0.04, w: 0.92, h: 0.92 };
    }
    const pad = 0.018;
    return {
      x: Math.max(0, minX / width - pad),
      y: Math.max(0, minY / height - pad),
      w: Math.min(1, (maxX - minX) / width + pad * 2),
      h: Math.min(1, (maxY - minY) / height + pad * 2)
    };
  });
}

function renderLibrary() {
  els.photoGrid.innerHTML = "";
  els.libraryEmpty.classList.toggle("visible", state.pages.length === 0);
  state.pages.forEach((page, index) => {
    const card = document.createElement("article");
    card.className = "photo-card";
    card.innerHTML = `
      <img src="${page.processedSrc}" alt="Page ${index + 1}">
      <div class="photo-meta">
        <strong title="${page.name}">${index + 1}. ${page.name}</strong>
        <div class="photo-actions">
          <button class="mini-button" data-edit="${page.id}" type="button">Edit</button>
          <button class="mini-button danger" data-remove="${page.id}" type="button">Delete</button>
        </div>
      </div>
    `;
    els.photoGrid.appendChild(card);
  });
}

function renderEditor() {
  els.thumbStrip.innerHTML = "";
  els.editorEmpty.classList.toggle("visible", state.pages.length === 0);
  els.editCanvas.style.display = state.pages.length ? "block" : "none";

  state.pages.forEach((page, index) => {
    const thumb = document.createElement("button");
    thumb.className = `thumb-card${page.id === state.selectedId ? " active" : ""}`;
    thumb.type = "button";
    thumb.dataset.select = page.id;
    thumb.innerHTML = `<img src="${page.processedSrc}" alt=""><span>Page ${index + 1}</span>`;
    els.thumbStrip.appendChild(thumb);
  });

  const page = selectedPage();
  if (!page) return;
  els.brightnessRange.value = page.brightness;
  els.contrastRange.value = page.contrast;
  els.sharpnessRange.value = page.sharpness;
  document.querySelectorAll("[data-filter-choice]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filterChoice === page.filter);
  });
  loadImage(page.processedSrc).then((image) => {
    const max = 1500;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    els.editCanvas.width = Math.round(image.naturalWidth * scale);
    els.editCanvas.height = Math.round(image.naturalHeight * scale);
    const ctx = els.editCanvas.getContext("2d");
    ctx.clearRect(0, 0, els.editCanvas.width, els.editCanvas.height);
    ctx.drawImage(image, 0, 0, els.editCanvas.width, els.editCanvas.height);
  });
}

function renderMerge() {
  els.mergeBoard.innerHTML = "";
  els.mergeEmpty.classList.toggle("visible", state.pages.length === 0);
  state.pages.forEach((page, index) => {
    const card = document.createElement("article");
    card.className = "merge-card";
    card.draggable = true;
    card.dataset.id = page.id;
    card.innerHTML = `
      <img src="${page.processedSrc}" alt="Page ${index + 1}">
      <div class="merge-meta">
        <strong>${index + 1}. ${page.name}</strong>
        <small>${page.width} x ${page.height}</small>
        <div class="merge-actions">
          <button class="mini-button" data-up="${page.id}" type="button">Up</button>
          <button class="mini-button" data-down="${page.id}" type="button">Down</button>
        </div>
      </div>
    `;
    els.mergeBoard.appendChild(card);
  });
}

function renderSummary() {
  const bytes = state.pages.reduce((total, page) => total + (page.size || 0), 0);
  els.railCount.textContent = String(state.pages.length);
  els.summaryPages.textContent = String(state.pages.length);
  els.summarySize.textContent = `${(bytes / 1024 / 1024).toFixed(bytes ? 1 : 0)} MB`;
  els.summaryMode.textContent = els.filterSelect.options[els.filterSelect.selectedIndex].text;
  els.exportStatus.textContent = state.pages.length
    ? `${state.pages.length} page${state.pages.length === 1 ? "" : "s"} ready for PDF export.`
    : "Ready to create a PDF when pages are added.";
}

function renderAll() {
  renderLibrary();
  renderEditor();
  renderMerge();
  renderSummary();
}

function movePage(id, direction) {
  const index = state.pages.findIndex((page) => page.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.pages.length) return;
  const [page] = state.pages.splice(index, 1);
  state.pages.splice(target, 0, page);
  renderAll();
}

function pageDimensions(page, imgWidth, imgHeight) {
  const size = els.pageSizeSelect.value;
  const orientation = els.orientationSelect.value;
  if (size === "image") {
    return { width: Math.max(144, imgWidth * 0.5), height: Math.max(144, imgHeight * 0.5) };
  }
  const base = size === "letter" ? { width: 612, height: 792 } : { width: 595.28, height: 841.89 };
  const imageLandscape = imgWidth > imgHeight;
  const shouldLandscape = orientation === "landscape" || (orientation === "auto" && imageLandscape);
  const shouldPortrait = orientation === "portrait" || (orientation === "auto" && !imageLandscape);
  if (shouldLandscape && base.width < base.height) return { width: base.height, height: base.width };
  if (shouldPortrait && base.width > base.height) return { width: base.height, height: base.width };
  return base;
}

function bytesFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pdfText(text) {
  return new TextEncoder().encode(text);
}

function makePdfBlob(images) {
  const chunks = [];
  const offsets = [0];
  let position = 0;

  function add(chunk) {
    const bytes = typeof chunk === "string" ? pdfText(chunk) : chunk;
    chunks.push(bytes);
    position += bytes.length;
  }

  function objectStart(id) {
    offsets[id] = position;
    add(`${id} 0 obj\n`);
  }

  function objectEnd() {
    add("\nendobj\n");
  }

  add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  objectStart(1);
  add("<< /Type /Catalog /Pages 2 0 R >>");
  objectEnd();

  const kids = images.map((_, index) => `${3 + index * 3} 0 R`).join(" ");
  objectStart(2);
  add(`<< /Type /Pages /Kids [${kids}] /Count ${images.length} >>`);
  objectEnd();

  images.forEach((item, index) => {
    const pageObj = 3 + index * 3;
    const contentObj = pageObj + 1;
    const imageObj = pageObj + 2;
    const imageName = `Im${index}`;
    const margin = Number(els.marginSelect.value);
    const boxWidth = item.page.width - margin * 2;
    const boxHeight = item.page.height - margin * 2;
    const scale = els.fitSelect.value === "cover"
      ? Math.max(boxWidth / item.width, boxHeight / item.height)
      : Math.min(boxWidth / item.width, boxHeight / item.height);
    const drawW = item.width * scale;
    const drawH = item.height * scale;
    const x = (item.page.width - drawW) / 2;
    const y = (item.page.height - drawH) / 2;
    const content = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/${imageName} Do\nQ`;

    objectStart(pageObj);
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${item.page.width.toFixed(2)} ${item.page.height.toFixed(2)}] /Resources << /XObject << /${imageName} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    objectEnd();

    objectStart(contentObj);
    add(`<< /Length ${pdfText(content).length} >>\nstream\n${content}\nendstream`);
    objectEnd();

    objectStart(imageObj);
    add(`<< /Type /XObject /Subtype /Image /Width ${item.width} /Height ${item.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${item.bytes.length} >>\nstream\n`);
    add(item.bytes);
    add("\nendstream");
    objectEnd();
  });

  const xrefAt = position;
  const totalObjects = 2 + images.length * 3;
  add(`xref\n0 ${totalObjects + 1}\n`);
  add("0000000000 65535 f \n");
  for (let i = 1; i <= totalObjects; i += 1) {
    add(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  add(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}

async function downloadPdf() {
  if (!state.pages.length) {
    showToast("Add at least one photo before creating a PDF.");
    return;
  }
  els.exportStatus.textContent = "Rendering pages and building PDF...";
  const images = [];
  for (const page of state.pages) {
    const rendered = await renderPage(page, {
      quality: els.qualitySelect.value,
      stamp: els.dateStampToggle.checked
    });
    const base64 = rendered.dataUrl.split(",")[1];
    images.push({
      bytes: bytesFromBase64(base64),
      width: rendered.width,
      height: rendered.height,
      page: pageDimensions(page, rendered.width, rendered.height)
    });
  }
  const blob = makePdfBlob(images);
  const name = (els.fileNameInput.value.trim() || "docforge-scan.pdf").replace(/[\\/:*?"<>|]+/g, "-");
  const finalName = name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  els.exportStatus.textContent = `Downloaded ${finalName}.`;
  showToast("PDF downloaded.");
}

const serverOnlyOutputs = new Set(["docx", "xlsx", "pptx", "odt", "ods", "odp", "epub"]);
const serverOnlyInputs = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "epub", "pages", "numbers", "key"]);
const imageInputs = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"]);
const textInputs = new Set(["txt", "md", "markdown", "html", "htm", "csv", "json", "xml", "svg", "rtf"]);

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function fileExt(name) {
  const part = String(name || "").split(".").pop();
  return part ? part.toLowerCase() : "";
}

function baseFileName(name) {
  return String(name || "converted").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-") || "converted";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value) {
  const doc = new DOMParser().parseFromString(String(value), "text/html");
  return doc.body.textContent || "";
}

function markdownToHtml(value) {
  return escapeHtml(value)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function htmlDocument(body, title = "Converted document") {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #172026; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #d7dee5; padding: 6px 8px; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function csvToRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((item) => item !== "") || rows.length) rows.push(row);
  return rows;
}

function rowsToCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const value = String(cell ?? "");
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(",")).join("\n");
}

function jsonToRows(data) {
  const list = Array.isArray(data) ? data : [data];
  const keys = [...new Set(list.flatMap((item) => item && typeof item === "object" && !Array.isArray(item) ? Object.keys(item) : ["value"]))];
  return [
    keys,
    ...list.map((item) => keys.map((key) => {
      const value = item && typeof item === "object" && !Array.isArray(item) ? item[key] : item;
      return typeof value === "object" && value !== null ? JSON.stringify(value) : value ?? "";
    }))
  ];
}

function rowsToHtmlTable(rows) {
  return `<table>${rows.map((row, index) => {
    const tag = index === 0 ? "th" : "td";
    return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("")}</tr>`;
  }).join("")}</table>`;
}

function rtfFromText(text) {
  const escaped = String(text)
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\n/g, "\\par\n");
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 ${escaped}}`;
}

function blobForText(content, type) {
  return new Blob([content], { type });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function textToPdfBlob(text) {
  const pageWidth = 1240;
  const pageHeight = 1754;
  const margin = 96;
  const fontSize = 34;
  const lineHeight = 48;
  const maxWidth = pageWidth - margin * 2;
  const words = String(text || " ").replace(/\t/g, "    ").split(/\s+/);
  const canvases = [];
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  let y = margin;

  function setupPage() {
    canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageWidth, pageHeight);
    ctx.fillStyle = "#172026";
    ctx.font = `${fontSize}px Arial, sans-serif`;
    y = margin;
  }

  function pushPage() {
    canvases.push(canvas);
  }

  setupPage();
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      ctx.fillText(line, margin, y);
      y += lineHeight;
      line = word;
      if (y > pageHeight - margin) {
        pushPage();
        setupPage();
      }
    } else {
      line = trial;
    }
  }
  if (line) ctx.fillText(line, margin, y);
  pushPage();

  const images = canvases.map((pageCanvas) => {
    const dataUrl = pageCanvas.toDataURL("image/jpeg", 0.92);
    return {
      bytes: bytesFromBase64(dataUrl.split(",")[1]),
      width: pageCanvas.width,
      height: pageCanvas.height,
      page: { width: 595.28, height: 841.89 }
    };
  });
  return makePdfBlob(images);
}

async function imageToCanvas(file) {
  const src = await fileToDataUrl(file);
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return { canvas, image, src };
}

async function convertImageFile(file, target) {
  const { canvas, image, src } = await imageToCanvas(file);
  const name = baseFileName(file.name);
  if (target === "pdf") {
    const dataUrl = canvas.toDataURL("image/jpeg", Number(els.qualitySelect.value));
    return {
      blob: makePdfBlob([{
        bytes: bytesFromBase64(dataUrl.split(",")[1]),
        width: image.naturalWidth,
        height: image.naturalHeight,
        page: pageDimensions(null, image.naturalWidth, image.naturalHeight)
      }]),
      filename: `${name}.pdf`
    };
  }
  if (target === "html" || target === "doc") {
    const html = htmlDocument(`<h1>${escapeHtml(name)}</h1><p><img src="${src}" alt="${escapeHtml(name)}" style="max-width:100%;height:auto"></p>`, name);
    return {
      blob: blobForText(html, target === "doc" ? "application/msword" : "text/html"),
      filename: `${name}.${target}`
    };
  }
  if (target === "png" || target === "jpg" || target === "webp") {
    const mime = target === "jpg" ? "image/jpeg" : `image/${target}`;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, Number(els.qualitySelect.value)));
    return { blob, filename: `${name}.${target}` };
  }
  if (target === "txt" || target === "md" || target === "rtf") {
    const text = `Image file: ${file.name}\nWidth: ${image.naturalWidth}\nHeight: ${image.naturalHeight}`;
    return textOutputResult(text, target, name);
  }
  throw new Error("This image conversion needs a server conversion engine.");
}

function textOutputResult(text, target, name) {
  if (target === "pdf") {
    return textToPdfBlob(text).then((blob) => ({ blob, filename: `${name}.pdf` }));
  }
  if (target === "txt") {
    return { blob: blobForText(text, "text/plain"), filename: `${name}.txt` };
  }
  if (target === "md") {
    return { blob: blobForText(text, "text/markdown"), filename: `${name}.md` };
  }
  if (target === "html") {
    return { blob: blobForText(htmlDocument(`<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`, name), "text/html"), filename: `${name}.html` };
  }
  if (target === "rtf") {
    return { blob: blobForText(rtfFromText(text), "application/rtf"), filename: `${name}.rtf` };
  }
  if (target === "doc") {
    return { blob: blobForText(htmlDocument(`<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`, name), "application/msword"), filename: `${name}.doc` };
  }
  throw new Error("This text conversion is not available for the selected output.");
}

async function convertTextFile(file, target, ext) {
  const name = baseFileName(file.name);
  const raw = await readFileAsText(file);
  const plain = ext === "html" || ext === "htm" ? stripHtml(raw) : raw;

  if (ext === "md" || ext === "markdown") {
    if (target === "html" || target === "doc") {
      const html = htmlDocument(`<p>${markdownToHtml(raw)}</p>`, name);
      return { blob: blobForText(html, target === "doc" ? "application/msword" : "text/html"), filename: `${name}.${target}` };
    }
  }

  if (ext === "html" || ext === "htm") {
    if (target === "html") return { blob: blobForText(raw, "text/html"), filename: `${name}.html` };
    if (target === "doc") return { blob: blobForText(raw, "application/msword"), filename: `${name}.doc` };
  }

  if (ext === "csv") {
    const rows = csvToRows(raw);
    if (target === "json") {
      const headers = rows[0] || [];
      const data = rows.slice(1).map((row) => Object.fromEntries(headers.map((key, index) => [key || `column_${index + 1}`, row[index] ?? ""])));
      return { blob: blobForText(JSON.stringify(data, null, 2), "application/json"), filename: `${name}.json` };
    }
    if (target === "html" || target === "doc" || target === "xls") {
      const html = htmlDocument(rowsToHtmlTable(rows), name);
      const mime = target === "xls" ? "application/vnd.ms-excel" : target === "doc" ? "application/msword" : "text/html";
      return { blob: blobForText(html, mime), filename: `${name}.${target}` };
    }
  }

  if (ext === "json") {
    const data = JSON.parse(raw);
    if (target === "csv") {
      return { blob: blobForText(rowsToCsv(jsonToRows(data)), "text/csv"), filename: `${name}.csv` };
    }
    if (target === "html" || target === "doc" || target === "xls") {
      const html = htmlDocument(rowsToHtmlTable(jsonToRows(data)), name);
      const mime = target === "xls" ? "application/vnd.ms-excel" : target === "doc" ? "application/msword" : "text/html";
      return { blob: blobForText(html, mime), filename: `${name}.${target}` };
    }
  }

  if (target === "json") {
    return { blob: blobForText(JSON.stringify({ text: plain }, null, 2), "application/json"), filename: `${name}.json` };
  }
  if (target === "csv") {
    const rows = plain.split(/\r?\n/).map((line, index) => [index + 1, line]);
    return { blob: blobForText(rowsToCsv([["line", "text"], ...rows]), "text/csv"), filename: `${name}.csv` };
  }
  return await textOutputResult(plain, target, name);
}

function setConverterFile(file) {
  state.converterFile = file || null;
  if (!file) {
    els.converterFileName.textContent = "Choose a file";
    els.converterFromInput.value = "No file selected";
    els.converterStatus.textContent = "Select a file to see available conversion options.";
    return;
  }
  const ext = fileExt(file.name);
  els.converterFileName.textContent = file.name;
  els.converterFromInput.value = `${ext ? ext.toUpperCase() : "Unknown"} (${file.type || "unknown type"})`;
  if (serverOnlyInputs.has(ext) && ext !== "pdf") {
    els.converterStatus.textContent = "This input can be stored here, but exact conversion needs a server engine such as LibreOffice, Pandoc, or a PDF/OCR service.";
  } else {
    els.converterStatus.textContent = "Ready to convert with browser-local tools where supported.";
  }
}

async function convertSelectedFile() {
  const file = state.converterFile;
  if (!file) {
    showToast("Choose a file to convert.");
    return;
  }
  const target = els.converterToSelect.value;
  const ext = fileExt(file.name);
  if (serverOnlyOutputs.has(target)) {
    els.converterStatus.textContent = `${target.toUpperCase()} output needs a backend conversion engine. Use Supabase/Firebase only for storage and job metadata; the converter itself should run on a server function or separate worker.`;
    showToast("Server engine required for this output.");
    return;
  }
  if (serverOnlyInputs.has(ext) && ext !== "pdf" && !textInputs.has(ext)) {
    els.converterStatus.textContent = `${ext.toUpperCase()} input needs a backend parser for reliable conversion.`;
    showToast("Server engine required for this input.");
    return;
  }
  if (ext === "pdf" && target !== "pdf") {
    els.converterStatus.textContent = "PDF-to-document conversion needs a backend PDF parser or OCR engine.";
    showToast("PDF extraction needs a server engine.");
    return;
  }
  els.converterStatus.textContent = "Converting...";
  try {
    let result;
    if (imageInputs.has(ext) || file.type.startsWith("image/")) {
      result = await convertImageFile(file, target);
    } else if (textInputs.has(ext) || file.type.startsWith("text/")) {
      result = await convertTextFile(file, target, ext);
    } else if (ext === "pdf" && target === "pdf") {
      result = { blob: file, filename: `${baseFileName(file.name)}.pdf` };
    } else {
      throw new Error("This conversion needs a backend engine.");
    }
    downloadBlob(result.blob, result.filename);
    els.converterStatus.textContent = `Downloaded ${result.filename}.`;
    showToast("Converted file downloaded.");
  } catch (error) {
    els.converterStatus.textContent = error.message || "Conversion failed.";
    showToast("Conversion failed.");
  }
}

async function sendConverterImageToScanner() {
  const file = state.converterFile;
  if (!file) {
    showToast("Choose an image first.");
    return;
  }
  const ext = fileExt(file.name);
  if (!imageInputs.has(ext) && !file.type.startsWith("image/")) {
    showToast("Only image files can be added to the scanner.");
    return;
  }
  await addFiles([file]);
  setRoute("library");
}

function initPdfLibraries() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
}

function pdfLibrariesReady() {
  return Boolean(window.PDFLib && window.pdfjsLib);
}

function pdfToolName() {
  const raw = els.pdfOutputNameInput.value.trim() || "edited-document.pdf";
  const cleaned = raw.replace(/[\\/:*?"<>|]+/g, "-");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function pdfItemById(id) {
  return state.pdfTools.pageItems.find((item) => item.id === id) || null;
}

function setPdfStatus(message) {
  els.pdfToolsStatus.textContent = message;
}

async function loadPdfFile(file) {
  if (!file) return;
  if (!pdfLibrariesReady()) {
    setPdfStatus("PDF tools need PDF.js and pdf-lib. Check your internet connection for the CDN scripts.");
    showToast("PDF tools libraries are unavailable.");
    return;
  }
  if (file.type && file.type !== "application/pdf" && fileExt(file.name) !== "pdf") {
    showToast("Choose a PDF file.");
    return;
  }
  setPdfStatus("Loading PDF...");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfDoc = await PDFLib.PDFDocument.load(bytes);
  const count = pdfDoc.getPageCount();
  state.pdfTools.fileName = file.name;
  state.pdfTools.bytes = bytes;
  state.pdfTools.pageCount = count;
  state.pdfTools.thumbnails = new Map();
  state.pdfTools.pageItems = Array.from({ length: count }, (_, index) => ({
    id: uid(),
    sourceIndex: index,
    rotation: 0
  }));
  state.pdfTools.selectedId = state.pdfTools.pageItems[0]?.id || null;
  els.pdfFileName.textContent = file.name;
  els.pdfOutputNameInput.value = `${baseFileName(file.name)}-edited.pdf`;
  renderPdfTools();
  await renderPdfThumbnails();
  setPdfStatus(`${count} page${count === 1 ? "" : "s"} loaded. Drag pages to reorder or use the action buttons.`);
}

function renderPdfTools() {
  els.pdfPageGrid.innerHTML = "";
  const hasPages = state.pdfTools.pageItems.length > 0;
  els.pdfToolsEmpty.classList.toggle("visible", !hasPages);
  state.pdfTools.pageItems.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = `pdf-page-card${item.id === state.pdfTools.selectedId ? " active" : ""}`;
    card.draggable = true;
    card.dataset.pdfId = item.id;
    const thumb = state.pdfTools.thumbnails.get(item.sourceIndex);
    card.innerHTML = `
      <div class="pdf-page-preview">
        ${thumb ? `<img src="${thumb}" alt="PDF page ${item.sourceIndex + 1}" style="transform: rotate(${item.rotation}deg)">` : "<span>Rendering...</span>"}
      </div>
      <div class="pdf-page-meta">
        <strong>Page ${index + 1} <small>(source ${item.sourceIndex + 1})</small></strong>
        <div class="pdf-card-actions">
          <button class="mini-button" data-pdf-up="${item.id}" type="button">Up</button>
          <button class="mini-button" data-pdf-down="${item.id}" type="button">Down</button>
          <button class="mini-button danger" data-pdf-remove="${item.id}" type="button">Del</button>
        </div>
      </div>
    `;
    els.pdfPageGrid.appendChild(card);
  });
}

async function renderPdfThumbnails() {
  if (!state.pdfTools.bytes || !window.pdfjsLib) return;
  const pdf = await pdfjsLib.getDocument({ data: state.pdfTools.bytes.slice() }).promise;
  const sourceIndexes = [...new Set(state.pdfTools.pageItems.map((item) => item.sourceIndex))];
  for (const sourceIndex of sourceIndexes) {
    if (state.pdfTools.thumbnails.has(sourceIndex)) continue;
    const page = await pdf.getPage(sourceIndex + 1);
    const viewport = page.getViewport({ scale: 0.28 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    state.pdfTools.thumbnails.set(sourceIndex, canvas.toDataURL("image/jpeg", 0.78));
    renderPdfTools();
  }
}

function selectPdfPage(id) {
  if (!pdfItemById(id)) return;
  state.pdfTools.selectedId = id;
  renderPdfTools();
}

function movePdfPage(id, direction) {
  const index = state.pdfTools.pageItems.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.pdfTools.pageItems.length) return;
  const [item] = state.pdfTools.pageItems.splice(index, 1);
  state.pdfTools.pageItems.splice(target, 0, item);
  renderPdfTools();
}

function rotatePdfSelected(degrees) {
  const item = pdfItemById(state.pdfTools.selectedId);
  if (!item) {
    showToast("Select a PDF page first.");
    return;
  }
  item.rotation = ((item.rotation + degrees) % 360 + 360) % 360;
  renderPdfTools();
}

function removePdfPage(id) {
  const index = state.pdfTools.pageItems.findIndex((item) => item.id === id);
  if (index === -1) return;
  state.pdfTools.pageItems.splice(index, 1);
  if (state.pdfTools.selectedId === id) {
    state.pdfTools.selectedId = state.pdfTools.pageItems[index]?.id || state.pdfTools.pageItems[index - 1]?.id || null;
  }
  renderPdfTools();
  setPdfStatus(`${state.pdfTools.pageItems.length} page${state.pdfTools.pageItems.length === 1 ? "" : "s"} remain.`);
}

function resetPdfTools() {
  if (!state.pdfTools.bytes) return;
  state.pdfTools.pageItems = Array.from({ length: state.pdfTools.pageCount }, (_, index) => ({
    id: uid(),
    sourceIndex: index,
    rotation: 0
  }));
  state.pdfTools.selectedId = state.pdfTools.pageItems[0]?.id || null;
  renderPdfTools();
  setPdfStatus("Page order and rotations reset.");
}

function addPdfOverlays(page, index, total) {
  const { width, height } = page.getSize();
  const watermark = els.pdfWatermarkInput.value.trim();
  if (watermark) {
    page.drawText(watermark, {
      x: width * 0.16,
      y: height * 0.48,
      size: Math.max(28, Math.min(width, height) * 0.08),
      rotate: PDFLib.degrees(-35),
      color: PDFLib.rgb(0.09, 0.16, 0.19),
      opacity: 0.16
    });
  }
  if (els.pdfPageNumbersToggle.checked) {
    const label = `${index + 1} / ${total}`;
    page.drawText(label, {
      x: width / 2 - label.length * 3.2,
      y: 22,
      size: 10,
      color: PDFLib.rgb(0.25, 0.3, 0.34),
      opacity: 0.86
    });
  }
}

async function buildPdfFromItems(items) {
  if (!state.pdfTools.bytes || !items.length) {
    throw new Error("Load a PDF and keep at least one page.");
  }
  const sourceDoc = await PDFLib.PDFDocument.load(state.pdfTools.bytes);
  const output = await PDFLib.PDFDocument.create();
  const copiedPages = await output.copyPages(sourceDoc, items.map((item) => item.sourceIndex));
  copiedPages.forEach((page, index) => {
    const existing = page.getRotation().angle || 0;
    page.setRotation(PDFLib.degrees((existing + items[index].rotation) % 360));
    output.addPage(page);
  });
  output.getPages().forEach((page, index) => addPdfOverlays(page, index, output.getPageCount()));
  const bytes = await output.save();
  return new Blob([bytes], { type: "application/pdf" });
}

async function exportPdfTools() {
  try {
    setPdfStatus("Exporting PDF...");
    const blob = await buildPdfFromItems(state.pdfTools.pageItems);
    const filename = pdfToolName();
    downloadBlob(blob, filename);
    setPdfStatus(`Downloaded ${filename}.`);
    showToast("PDF exported.");
  } catch (error) {
    setPdfStatus(error.message || "PDF export failed.");
    showToast("PDF export failed.");
  }
}

async function extractSelectedPdfPage() {
  const selected = pdfItemById(state.pdfTools.selectedId);
  if (!selected) {
    showToast("Select a page to extract.");
    return;
  }
  try {
    setPdfStatus("Extracting selected page...");
    const blob = await buildPdfFromItems([selected]);
    const filename = `${baseFileName(state.pdfTools.fileName || "pdf")}-page-${selected.sourceIndex + 1}.pdf`;
    downloadBlob(blob, filename);
    setPdfStatus(`Downloaded ${filename}.`);
  } catch (error) {
    setPdfStatus(error.message || "Extract failed.");
  }
}

async function splitPdfPages() {
  if (!state.pdfTools.pageItems.length) {
    showToast("Load a PDF first.");
    return;
  }
  setPdfStatus("Splitting pages into individual PDFs...");
  for (let index = 0; index < state.pdfTools.pageItems.length; index += 1) {
    const item = state.pdfTools.pageItems[index];
    const blob = await buildPdfFromItems([item]);
    downloadBlob(blob, `${baseFileName(state.pdfTools.fileName || "pdf")}-split-${index + 1}.pdf`);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  setPdfStatus(`Downloaded ${state.pdfTools.pageItems.length} split PDF file${state.pdfTools.pageItems.length === 1 ? "" : "s"}.`);
}

function drawCanvasOverlays(ctx, canvas, index, total) {
  const watermark = els.pdfWatermarkInput.value.trim();
  if (watermark) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#172026";
    ctx.font = `700 ${Math.max(34, Math.round(canvas.width * 0.08))}px Arial, sans-serif`;
    ctx.translate(canvas.width * 0.16, canvas.height * 0.56);
    ctx.rotate(-Math.PI / 5);
    ctx.fillText(watermark, 0, 0);
    ctx.restore();
  }
  if (els.pdfPageNumbersToggle.checked) {
    const label = `${index + 1} / ${total}`;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillRect(0, canvas.height - 42, canvas.width, 42);
    ctx.fillStyle = "#3f4a53";
    ctx.font = "700 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, canvas.width / 2, canvas.height - 15);
    ctx.restore();
  }
}

async function compressPdfTools() {
  if (!state.pdfTools.bytes || !state.pdfTools.pageItems.length) {
    showToast("Load a PDF first.");
    return;
  }
  if (!pdfLibrariesReady()) {
    setPdfStatus("PDF tools need PDF.js and pdf-lib.");
    return;
  }
  try {
    setPdfStatus("Raster-compressing PDF pages...");
    const pdf = await pdfjsLib.getDocument({ data: state.pdfTools.bytes.slice() }).promise;
    const output = await PDFLib.PDFDocument.create();
    const scale = Number(els.pdfRasterScaleSelect.value);
    const quality = Number(els.pdfQualitySelect.value);
    for (let index = 0; index < state.pdfTools.pageItems.length; index += 1) {
      const item = state.pdfTools.pageItems[index];
      const sourcePage = await pdf.getPage(item.sourceIndex + 1);
      const baseViewport = sourcePage.getViewport({ scale: 1, rotation: (sourcePage.rotate + item.rotation) % 360 });
      const renderViewport = sourcePage.getViewport({ scale, rotation: (sourcePage.rotate + item.rotation) % 360 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      const ctx = canvas.getContext("2d");
      await sourcePage.render({ canvasContext: ctx, viewport: renderViewport }).promise;
      drawCanvasOverlays(ctx, canvas, index, state.pdfTools.pageItems.length);
      const jpg = await output.embedJpg(bytesFromBase64(canvas.toDataURL("image/jpeg", quality).split(",")[1]));
      const page = output.addPage([baseViewport.width, baseViewport.height]);
      page.drawImage(jpg, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
      setPdfStatus(`Raster-compressing page ${index + 1} of ${state.pdfTools.pageItems.length}...`);
    }
    const bytes = await output.save();
    const filename = `${baseFileName(pdfToolName())}-compressed.pdf`;
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), filename);
    setPdfStatus(`Downloaded ${filename}.`);
    showToast("Compressed PDF downloaded.");
  } catch (error) {
    setPdfStatus(error.message || "Compression failed.");
    showToast("Compression failed.");
  }
}

els.navItems.forEach((item) => item.addEventListener("click", () => setRoute(item.dataset.route)));
els.startCameraBtn.addEventListener("click", startCamera);
els.captureBtn.addEventListener("click", capturePhoto);
els.sequenceCaptureBtn.addEventListener("click", toggleSequenceCapture);
els.fileInput.addEventListener("change", (event) => addFiles(event.target.files).then(() => { event.target.value = ""; }));
els.libraryFileInput.addEventListener("change", (event) => addFiles(event.target.files).then(() => { event.target.value = ""; }));
els.converterFileInput.addEventListener("change", (event) => {
  setConverterFile(event.target.files[0]);
});
els.converterDropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  els.converterDropZone.classList.add("dragging");
});
els.converterDropZone.addEventListener("dragleave", () => {
  els.converterDropZone.classList.remove("dragging");
});
els.converterDropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  els.converterDropZone.classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (file) setConverterFile(file);
});
els.converterToSelect.addEventListener("change", () => {
  if (serverOnlyOutputs.has(els.converterToSelect.value)) {
    els.converterStatus.textContent = "This output needs a backend conversion engine. Database storage is optional.";
  } else if (state.converterFile) {
    els.converterStatus.textContent = "Ready to convert with browser-local tools where supported.";
  }
});
els.convertFileBtn.addEventListener("click", convertSelectedFile);
els.sendToScannerBtn.addEventListener("click", sendConverterImageToScanner);
els.pdfFileInput.addEventListener("change", (event) => {
  loadPdfFile(event.target.files[0]);
});
els.pdfDropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  els.pdfDropZone.classList.add("dragging");
});
els.pdfDropZone.addEventListener("dragleave", () => {
  els.pdfDropZone.classList.remove("dragging");
});
els.pdfDropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  els.pdfDropZone.classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (file) loadPdfFile(file);
});
els.pdfPageGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".pdf-page-card");
  const upId = event.target.closest("[data-pdf-up]")?.dataset.pdfUp;
  const downId = event.target.closest("[data-pdf-down]")?.dataset.pdfDown;
  const removeId = event.target.closest("[data-pdf-remove]")?.dataset.pdfRemove;
  if (upId) {
    movePdfPage(upId, -1);
    return;
  }
  if (downId) {
    movePdfPage(downId, 1);
    return;
  }
  if (removeId) {
    removePdfPage(removeId);
    return;
  }
  if (card) selectPdfPage(card.dataset.pdfId);
});
els.pdfPageGrid.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".pdf-page-card");
  if (!card) return;
  state.pdfTools.dragId = card.dataset.pdfId;
  card.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});
els.pdfPageGrid.addEventListener("dragend", (event) => {
  event.target.closest(".pdf-page-card")?.classList.remove("dragging");
  state.pdfTools.dragId = null;
});
els.pdfPageGrid.addEventListener("dragover", (event) => {
  event.preventDefault();
  const over = event.target.closest(".pdf-page-card");
  if (!over || !state.pdfTools.dragId || over.dataset.pdfId === state.pdfTools.dragId) return;
  const from = state.pdfTools.pageItems.findIndex((item) => item.id === state.pdfTools.dragId);
  const to = state.pdfTools.pageItems.findIndex((item) => item.id === over.dataset.pdfId);
  if (from < 0 || to < 0) return;
  const [item] = state.pdfTools.pageItems.splice(from, 1);
  state.pdfTools.pageItems.splice(to, 0, item);
  renderPdfTools();
});
els.pdfRotateLeftBtn.addEventListener("click", () => rotatePdfSelected(-90));
els.pdfRotateRightBtn.addEventListener("click", () => rotatePdfSelected(90));
els.pdfExportBtn.addEventListener("click", exportPdfTools);
els.pdfCompressBtn.addEventListener("click", compressPdfTools);
els.pdfSplitBtn.addEventListener("click", splitPdfPages);
els.pdfExtractBtn.addEventListener("click", extractSelectedPdfPage);
els.pdfResetBtn.addEventListener("click", resetPdfTools);
els.quickExportBtn.addEventListener("click", () => {
  setRoute("export");
  downloadPdf();
});
els.downloadPdfBtn.addEventListener("click", downloadPdf);
els.clearAllBtn.addEventListener("click", () => {
  if (!state.pages.length) return;
  stopSequenceCapture("Sequence capture stopped and session cleared.");
  state.pages = [];
  state.selectedId = null;
  renderAll();
  showToast("Session cleared.");
});

els.photoGrid.addEventListener("click", (event) => {
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const removeId = event.target.closest("[data-remove]")?.dataset.remove;
  if (editId) {
    state.selectedId = editId;
    setRoute("editor");
    renderAll();
  }
  if (removeId) removePage(removeId);
});

els.thumbStrip.addEventListener("click", (event) => {
  const id = event.target.closest("[data-select]")?.dataset.select;
  if (!id) return;
  state.selectedId = id;
  renderEditor();
});

document.querySelectorAll("[data-filter-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter-choice]").forEach((node) => node.classList.remove("active"));
    button.classList.add("active");
    const page = selectedPage();
    if (page) page.filter = button.dataset.filterChoice;
  });
});

els.rotateLeftBtn.addEventListener("click", () => updateSelected((page) => { page.rotation = (page.rotation - 90) % 360; }));
els.rotateRightBtn.addEventListener("click", () => updateSelected((page) => { page.rotation = (page.rotation + 90) % 360; }));
els.cropBtn.addEventListener("click", async () => {
  const page = selectedPage();
  if (!page) return;
  showToast("Detecting document edges...");
  const crop = await estimateCrop(page);
  await updateSelected((current) => { current.crop = crop; });
});
els.removeSelectedBtn.addEventListener("click", () => {
  const page = selectedPage();
  if (page) removePage(page.id);
});
els.applyFormatBtn.addEventListener("click", () => updateSelected((page) => {
  page.brightness = Number(els.brightnessRange.value);
  page.contrast = Number(els.contrastRange.value);
  page.sharpness = Number(els.sharpnessRange.value);
  page.filter = document.querySelector("[data-filter-choice].active")?.dataset.filterChoice || page.filter;
}));

els.mergeBoard.addEventListener("click", (event) => {
  const upId = event.target.closest("[data-up]")?.dataset.up;
  const downId = event.target.closest("[data-down]")?.dataset.down;
  if (upId) movePage(upId, -1);
  if (downId) movePage(downId, 1);
});

els.mergeBoard.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".merge-card");
  if (!card) return;
  state.dragId = card.dataset.id;
  card.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});

els.mergeBoard.addEventListener("dragend", (event) => {
  event.target.closest(".merge-card")?.classList.remove("dragging");
  state.dragId = null;
});

els.mergeBoard.addEventListener("dragover", (event) => {
  event.preventDefault();
  const over = event.target.closest(".merge-card");
  if (!over || !state.dragId || over.dataset.id === state.dragId) return;
  const from = state.pages.findIndex((page) => page.id === state.dragId);
  const to = state.pages.findIndex((page) => page.id === over.dataset.id);
  if (from < 0 || to < 0) return;
  const [page] = state.pages.splice(from, 1);
  state.pages.splice(to, 0, page);
  renderMerge();
});

els.sortNameBtn.addEventListener("click", () => {
  state.pages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  renderAll();
});

els.reverseBtn.addEventListener("click", () => {
  state.pages.reverse();
  renderAll();
});

[els.filterSelect, els.pageSizeSelect, els.fitSelect, els.qualitySelect].forEach((input) => {
  input.addEventListener("change", renderSummary);
});

window.addEventListener("beforeunload", () => {
  stopSequenceCapture();
  state.stream?.getTracks().forEach((track) => track.stop());
});

initPdfLibraries();
renderAll();
