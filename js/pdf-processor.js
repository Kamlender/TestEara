/**
 * TestEara — PDF Processor
 * Handles PDF text extraction using PDF.js (client-side)
 * No server needed — everything runs in the browser.
 */

// ===== PDF.js WORKER SETUP =====
// Worker source is set inside extractTextFromPdf() when pdfjsLib is guaranteed loaded

// ===== EXTRACTED TEXT STORAGE =====
let extractedPdfText = '';
let extractedPageCount = 0;

// ===== MAIN EXTRACTION FUNCTION =====
/**
 * Extract text from a PDF file
 * @param {File} file - The PDF file to extract text from
 * @param {Function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<{text: string, pageCount: number, charCount: number}>}
 */
async function extractTextFromPdf(file) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('Invalid file. Please upload a PDF.');
  }

  // Check if PDF.js is loaded
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js library not loaded. Please check your internet connection and refresh.');
  }

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // Show progress UI
  showExtractionProgress();
  updateExtractionStatus('Reading PDF file...', 'Loading your document', 5);

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    updateExtractionStatus('Reading PDF file...', 'File loaded, initializing PDF parser', 10);

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages;
    updateExtractionStatus('Extracting text...', `Found ${totalPages} page${totalPages > 1 ? 's' : ''}`, 15);

    // Validate page count
    if (totalPages > 1000) {
      throw new Error(`PDF has ${totalPages} pages. Maximum supported is 1000 pages. Please split the PDF.`);
    }

    // Extract text from each page
    let fullText = '';
    let emptyPages = 0;

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Combine text items for this page
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText.length < 10) {
        emptyPages++;
      }

      if (pageText) {
        fullText += `\n--- Page ${i} ---\n${pageText}\n`;
      }

      // Update progress (15% to 90% range for extraction)
      const progress = 15 + Math.round((i / totalPages) * 75);
      updateExtractionStatus(
        'Extracting text...',
        `Processing page ${i} of ${totalPages}`,
        progress
      );
    }

    // Clean up the text
    fullText = cleanExtractedText(fullText);

    updateExtractionStatus('Analyzing content...', 'Validating extracted text', 92);

    // Validate extraction quality
    const charCount = fullText.length;
    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;

    // Check if PDF is likely scanned (mostly images, very little text)
    if (emptyPages > totalPages * 0.7 || charCount < 100) {
      hideExtractionProgress();
      throw new Error(
        'This PDF appears to be scanned or image-based. TestEara needs text-based PDFs. ' +
        'Try using a PDF with selectable text, or convert your scanned PDF using an OCR tool first.'
      );
    }

    // Warn if text is very short
    if (wordCount < 50) {
      showToast('⚠️ Very little text found. The generated test may have limited questions.', 'warning');
    }

    // Store extracted text
    extractedPdfText = fullText;
    extractedPageCount = totalPages;

    updateExtractionStatus('Done! ✅', `${totalPages} pages, ${wordCount.toLocaleString()} words extracted`, 100);

    // Show success state briefly, then hide
    setTimeout(() => {
      hideExtractionProgress();
    }, 1500);

    console.log(`📄 PDF extracted: ${totalPages} pages, ${wordCount} words, ${charCount} chars`);

    return {
      text: fullText,
      pageCount: totalPages,
      charCount: charCount,
      wordCount: wordCount
    };

  } catch (error) {
    hideExtractionProgress();

    // Handle specific PDF.js errors
    if (error.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }
    if (error.name === 'InvalidPDFException') {
      throw new Error('This file appears to be corrupted or not a valid PDF. Please try another file.');
    }

    throw error;
  }
}


// ===== TEXT CLEANING =====
function cleanExtractedText(text) {
  return text
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove excessive newlines (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove common PDF artifacts
    .replace(/\f/g, '\n') // Form feeds
    .replace(/\r\n/g, '\n') // Windows line endings
    .replace(/\r/g, '\n') // Old Mac line endings
    // Remove null characters
    .replace(/\0/g, '')
    // Trim
    .trim();
}


// ===== FILE READER UTILITY =====
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file. Please try again.'));
    reader.readAsArrayBuffer(file);
  });
}


// ===== PROGRESS UI =====
function showExtractionProgress() {
  const progressCard = document.getElementById('generationProgress');
  if (progressCard) {
    progressCard.classList.remove('hidden');
    // Scroll to progress
    progressCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function hideExtractionProgress() {
  const progressCard = document.getElementById('generationProgress');
  if (progressCard) {
    progressCard.classList.add('hidden');
  }
}

function updateExtractionStatus(status, subStatus, progress) {
  const statusEl = document.getElementById('generationStatus');
  const subStatusEl = document.getElementById('generationSubStatus');
  const progressBar = document.getElementById('generationProgressBar');

  if (statusEl) statusEl.textContent = status;
  if (subStatusEl) subStatusEl.textContent = subStatus;
  if (progressBar) progressBar.style.width = `${progress}%`;
}


// ===== GET EXTRACTED TEXT =====
/**
 * Get the extracted text (called by AI engine in Phase 4)
 */
function getExtractedText() {
  return extractedPdfText;
}

function getExtractedPageCount() {
  return extractedPageCount;
}

function hasExtractedText() {
  return extractedPdfText.length > 0;
}

/**
 * Clear extracted text (when user removes file)
 */
function clearExtractedText() {
  extractedPdfText = '';
  extractedPageCount = 0;
}
