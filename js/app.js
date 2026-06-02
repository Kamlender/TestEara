/**
 * TestEra — App.js
 * SPA Navigation, UI interactions, file upload handling
 */

// ===== VIEW MANAGEMENT =====
const viewTitles = {
  'dashboard': 'Dashboard',
  'create-test': 'Create Test',
  'my-tests': 'My Tests',
  'profile': 'Profile',
  'results': 'Results'
};

/**
 * Switch between app views (SPA-style navigation)
 */
function switchView(viewName, linkElement) {
  // Hide all views
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

  // Show target view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (linkElement) {
    linkElement.classList.add('active');
  }

  // Update topbar title
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle && viewTitles[viewName]) {
    topbarTitle.textContent = viewTitles[viewName];
  }

  // Close mobile sidebar
  closeSidebar();

  // Initialize view-specific data
  if (viewName === 'dashboard' && typeof initDashboard === 'function') {
    initDashboard();
  }
  if (viewName === 'my-tests' && typeof initMyTests === 'function') {
    initMyTests();
  }
  if (viewName === 'profile' && typeof initProfile === 'function') {
    initProfile();
  }

  // Prevent default link behavior
  return false;
}


// ===== SIDEBAR TOGGLE (Mobile) =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}


// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}


// ===== MODAL FUNCTIONS =====
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});


// ===== FILE UPLOAD HANDLING =====
let selectedFile = null;

function initFileUpload() {
  const dropzone = document.getElementById('pdfDropzone');
  const fileInput = document.getElementById('pdfFileInput');

  if (!dropzone || !fileInput) return;

  // Drag & drop events
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });
}

async function handleFileSelect(file) {
  // Validate file type
  if (file.type !== 'application/pdf') {
    showToast('Please upload a PDF file only.', 'error');
    return;
  }

  // Validate file size (50MB max)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('File too large. Maximum size is 50MB.', 'error');
    return;
  }

  selectedFile = file;

  // Show file preview
  const dropzone = document.getElementById('pdfDropzone');
  const preview = document.getElementById('filePreview');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');

  if (dropzone) dropzone.classList.add('hidden');
  if (preview) preview.classList.remove('hidden');
  if (fileName) fileName.textContent = file.name;
  if (fileSize) fileSize.textContent = formatFileSize(file.size);

  showToast('PDF uploaded! Extracting text...', 'success');

  // Extract text from PDF
  try {
    const result = await extractTextFromPdf(file);
    // Update file preview with extraction stats
    if (fileSize) {
      fileSize.textContent = `${formatFileSize(file.size)} • ${result.pageCount} pages • ${result.wordCount.toLocaleString()} words`;
    }
    showToast(`✅ Text extracted: ${result.pageCount} pages, ${result.wordCount.toLocaleString()} words`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
    // Remove file on extraction failure
    removeFile();
    return;
  }

  updateGenerateButton();
}

function removeFile() {
  selectedFile = null;
  const dropzone = document.getElementById('pdfDropzone');
  const preview = document.getElementById('filePreview');
  const fileInput = document.getElementById('pdfFileInput');

  if (dropzone) dropzone.classList.remove('hidden');
  if (preview) preview.classList.add('hidden');
  if (fileInput) fileInput.value = '';

  // Clear extracted text
  if (typeof clearExtractedText === 'function') {
    clearExtractedText();
  }

  updateGenerateButton();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


// ===== EXAM TYPE SELECTION =====
const examPatterns = {
  ssc_cgl: { questions: 25, time: 25, difficulty: 'Medium-Hard', name: 'SSC CGL' },
  ssc_chsl: { questions: 25, time: 25, difficulty: 'Medium', name: 'SSC CHSL' },
  rrb_ntpc: { questions: 50, time: 30, difficulty: 'Medium', name: 'RRB NTPC' },
  rrb_group_d: { questions: 25, time: 25, difficulty: 'Easy-Medium', name: 'RRB Group D' },
  banking: { questions: 35, time: 20, difficulty: 'Medium-Hard', name: 'Banking' },
  upsc: { questions: 20, time: 30, difficulty: 'Hard', name: 'UPSC Prelims' },
  custom: { questions: 25, time: 30, difficulty: 'Custom', name: 'Custom' }
};

function initExamSelector() {
  const examSelect = document.getElementById('examType');
  if (!examSelect) return;

  examSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const infoCard = document.getElementById('examInfoCard');
    const customSettings = document.getElementById('customExamSettings');

    if (val && examPatterns[val]) {
      const pattern = examPatterns[val];

      // Show exam info
      if (infoCard) {
        infoCard.classList.remove('hidden');
        document.getElementById('examQuestions').textContent = pattern.questions;
        document.getElementById('examTime').textContent = pattern.time + ' min';
        document.getElementById('examDifficulty').textContent = pattern.difficulty;
      }

      // Show/hide custom settings
      if (customSettings) {
        if (val === 'custom') {
          customSettings.classList.remove('hidden');
        } else {
          customSettings.classList.add('hidden');
        }
      }
    } else {
      if (infoCard) infoCard.classList.add('hidden');
      if (customSettings) customSettings.classList.add('hidden');
    }

    updateGenerateButton();
  });
}


// ===== UPDATE GENERATE BUTTON STATE =====
function updateGenerateButton() {
  const btn = document.getElementById('btnGenerateTest');
  if (!btn) return;

  const examType = document.getElementById('examType')?.value;
  const subject = document.getElementById('subject')?.value;

  const isReady = selectedFile && examType && subject && 
    (typeof hasExtractedText === 'function' ? hasExtractedText() : true);

  btn.disabled = !isReady;

  if (isReady) {
    btn.style.opacity = '1';
  } else {
    btn.style.opacity = '0.5';
  }
}

// Listen for subject change too
function initSubjectSelector() {
  const subjectSelect = document.getElementById('subject');
  if (subjectSelect) {
    subjectSelect.addEventListener('change', updateGenerateButton);
  }
}


// ===== USER INFO DISPLAY =====
function updateUserInfo(user) {
  if (!user) return;

  const name = user.displayName || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const initial = name.charAt(0).toUpperCase();

  // Sidebar
  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarEmail = document.getElementById('sidebarUserEmail');
  const sidebarAvatar = document.getElementById('sidebarAvatar');

  if (sidebarName) sidebarName.textContent = name;
  if (sidebarEmail) sidebarEmail.textContent = email;
  if (sidebarAvatar) sidebarAvatar.textContent = initial;

  // Profile
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileDisplayName = document.getElementById('profileDisplayName');

  if (profileName) profileName.textContent = name;
  if (profileEmail) profileEmail.textContent = email;
  if (profileAvatar) profileAvatar.textContent = initial;
  if (profileDisplayName) profileDisplayName.value = name;

  // Dashboard welcome
  const dashWelcome = document.querySelector('.dashboard-welcome h2');
  if (dashWelcome) {
    dashWelcome.textContent = `Welcome back, ${name.split(' ')[0]}! 👋`;
  }
}


// ===== RENDER TEST HISTORY CARD =====
function renderTestCard(test) {
  const scorePercent = Math.round((test.score / test.totalQuestions) * 100);
  const scoreColor = scorePercent >= 70 ? 'var(--success)' :
                     scorePercent >= 40 ? 'var(--warning)' : 'var(--error)';

  return `
    <div class="card test-history-card">
      <div class="test-history-left">
        <div class="icon-box icon-box-primary">
          <i class="fas fa-file-alt"></i>
        </div>
        <div class="test-history-info">
          <h5>${test.examName} — ${test.subject}</h5>
          <div class="test-history-meta">
            <span><i class="fas fa-calendar-alt"></i> ${test.date}</span>
            <span><i class="fas fa-clock"></i> ${test.timeTaken}</span>
            <span><i class="fas fa-question-circle"></i> ${test.totalQuestions} Qs</span>
          </div>
        </div>
      </div>
      <div class="test-history-score" style="color: ${scoreColor}">
        ${test.score}/${test.totalQuestions}
      </div>
    </div>
  `;
}


// ===== RENDER RESULTS VIEW =====
function renderResults(result) {
  const resultsView = document.getElementById('view-results');
  if (!resultsView) return;

  const scorePercent = Math.round((result.score / result.totalQuestions) * 100);
  const accuracy = result.attempted > 0 
    ? Math.round((result.correct / result.attempted) * 100) 
    : 0;

  const circumference = 2 * Math.PI * 52; // radius = 52
  const offset = circumference - (scorePercent / 100) * circumference;

  resultsView.innerHTML = `
    <div class="results-header">
      <h2 style="margin-bottom: var(--space-lg);">Test Complete! 🎉</h2>
      
      <!-- Score Circle -->
      <div class="circular-progress results-score-circle">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#6366f1"/>
              <stop offset="100%" style="stop-color:#a855f7"/>
            </linearGradient>
          </defs>
          <circle class="track" cx="60" cy="60" r="52"/>
          <circle class="fill" cx="60" cy="60" r="52" 
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${offset}"/>
        </svg>
        <div class="value">
          <div class="value-num">${scorePercent}%</div>
          <div class="value-label">Score</div>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="results-stats">
      <div class="card-stat">
        <div class="stat-value">${result.score}/${result.totalQuestions}</div>
        <div class="stat-label">Score</div>
      </div>
      <div class="card-stat">
        <div class="stat-value">${accuracy}%</div>
        <div class="stat-label">Accuracy</div>
      </div>
      <div class="card-stat">
        <div class="stat-value">${result.timeTaken}</div>
        <div class="stat-label">Time Used</div>
      </div>
      <div class="card-stat">
        <div class="stat-value">${result.correct}/${result.attempted}</div>
        <div class="stat-label">Correct/Attempted</div>
      </div>
    </div>

    <!-- Weak Topics -->
    ${result.weakTopics && result.weakTopics.length > 0 ? `
      <div class="card" style="margin-bottom: var(--space-2xl); padding: var(--space-xl);">
        <h4 style="margin-bottom: var(--space-md);"><i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i> Weak Topics</h4>
        <div class="flex flex-wrap gap-sm" style="gap: var(--space-sm); flex-wrap: wrap;">
          ${result.weakTopics.map(t => `<span class="badge badge-warning badge-lg">${t}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Question Review -->
    <h4 style="margin-bottom: var(--space-lg);">Question Review</h4>
    <div class="results-breakdown">
      ${result.questions.map((q, i) => {
        const isCorrect = q.userAnswer === q.correctAnswer;
        const statusClass = !q.userAnswer ? 'badge-info' : isCorrect ? 'badge-success' : 'badge-danger';
        const statusText = !q.userAnswer ? 'Skipped' : isCorrect ? 'Correct' : 'Wrong';
        const statusIcon = !q.userAnswer ? '⏭️' : isCorrect ? '✅' : '❌';

        return `
          <div class="result-question-card">
            <div class="result-question-status">
              <span class="badge ${statusClass}">${statusIcon} ${statusText}</span>
              <span style="font-size: var(--font-xs); color: var(--text-muted);">Q${i + 1}</span>
            </div>
            <div class="question-text" style="font-size: var(--font-base); margin-bottom: var(--space-md);">
              ${q.question}
            </div>
            <div style="font-size: var(--font-sm); display: flex; flex-direction: column; gap: var(--space-xs);">
              ${q.userAnswer ? `<div>Your Answer: <strong style="color: ${isCorrect ? 'var(--success)' : 'var(--error)'};">${q.userAnswer}</strong></div>` : ''}
              <div>Correct Answer: <strong style="color: var(--success);">${q.correctAnswer}</strong></div>
            </div>
            ${q.explanation ? `
              <div class="result-explanation">
                <strong>Explanation:</strong> ${q.explanation}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>

    <!-- Cutoff Section -->
    ${result.cutoff ? `
      <div class="card cutoff-card" style="margin-top: var(--space-2xl); padding: var(--space-xl);">
        <h4 style="margin-bottom: var(--space-lg); text-align: center;">
          <i class="fas fa-crosshairs"></i> Cutoff Analysis
        </h4>
        <div style="text-align: center; margin-bottom: var(--space-lg);">
          <div style="font-size: var(--font-sm); color: var(--text-muted);">Expected Cutoff (${result.cutoff.category})</div>
          <div style="font-size: var(--font-3xl); font-weight: 800;">${result.cutoff.expected}</div>
        </div>
        <div class="cutoff-bar-container">
          <div class="cutoff-bar-fill ${result.score >= result.cutoff.expected ? 'above' : 'below'}" 
               style="width: ${Math.min((result.score / result.totalQuestions) * 100, 100)}%;">
          </div>
          <div class="cutoff-marker" style="left: ${(result.cutoff.expected / result.totalQuestions) * 100}%;">
            <div class="cutoff-marker-label">Cutoff: ${result.cutoff.expected}</div>
          </div>
        </div>
        <div style="text-align: center; margin-top: var(--space-2xl);">
          <div style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-sm);">
            ${result.score >= result.cutoff.expected 
              ? `${result.score - result.cutoff.expected} marks above cutoff` 
              : `${result.cutoff.expected - result.score} marks behind cutoff`}
          </div>
          <div class="probability-badge ${result.cutoff.probability}">
            ${result.cutoff.probability === 'high' ? '🟢' : result.cutoff.probability === 'medium' ? '🟡' : '🔴'}
            Selection: ${result.cutoff.probability.charAt(0).toUpperCase() + result.cutoff.probability.slice(1)}
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Actions -->
    <div class="flex justify-center gap-md" style="margin-top: var(--space-2xl); gap: var(--space-md); justify-content: center;">
      <button class="btn btn-secondary" onclick="switchView('dashboard', document.querySelector('[data-view=dashboard]'))">
        <i class="fas fa-home"></i> Dashboard
      </button>
      <button class="btn btn-primary" onclick="switchView('create-test', document.querySelector('[data-view=create-test]'))">
        <i class="fas fa-plus-circle"></i> Create New Test
      </button>
    </div>
  `;

  // Switch to results view
  switchView('results');
}


// ===== CURRENT TEST STATE =====
let currentTest = null;


// ===== GENERATE TEST HANDLER =====
function initGenerateButton() {
  const btn = document.getElementById('btnGenerateTest');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const pdfText = typeof getExtractedText === 'function' ? getExtractedText() : '';
    const examKey = document.getElementById('examType')?.value;
    const subjectKey = document.getElementById('subject')?.value;
    const customQuestions = parseInt(document.getElementById('customQuestions')?.value) || null;
    const customTime = parseInt(document.getElementById('customTime')?.value) || null;

    if (!pdfText) {
      showToast('Please upload a PDF first.', 'error');
      return;
    }
    if (!examKey) {
      showToast('Please select an exam type.', 'error');
      return;
    }
    if (!subjectKey) {
      showToast('Please select a subject.', 'error');
      return;
    }

    // Disable button during generation
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Generating...';

    // Show progress card
    const progressCard = document.getElementById('generationProgress');
    if (progressCard) {
      progressCard.classList.remove('hidden');
      progressCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    try {
      // Generate test using AI
      const test = await generateTestQuestions(pdfText, examKey, subjectKey, customQuestions, customTime);

      // Save test
      currentTest = test;
      await saveTestToFirestore(test);

      showToast(`✅ Test generated: ${test.totalQuestions} questions ready!`, 'success');

      // Hide progress after a brief delay
      setTimeout(() => {
        if (progressCard) progressCard.classList.add('hidden');

        // Start the test automatically
        if (typeof startTest === 'function') {
          startTest(test);
        } else {
          // If test engine not yet built, show a message
          showToast('Test engine coming in next phase! Questions saved.', 'info');
          switchView('my-tests', document.querySelector('[data-view=my-tests]'));
        }
      }, 1500);

    } catch (error) {
      console.error('Test generation error:', error);
      showToast(error.message || 'Failed to generate test. Please try again.', 'error');
      if (progressCard) progressCard.classList.add('hidden');
    } finally {
      // Reset button
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-magic"></i> Generate Test with AI';
      updateGenerateButton();
    }
  });
}


// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initFileUpload();
  initExamSelector();
  initSubjectSelector();
  initGenerateButton();

  // Load dashboard stats after auth is ready
  setTimeout(() => {
    if (typeof initDashboard === 'function') initDashboard();
  }, 1500);

  console.log('🚀 TestEra App initialized');
});
