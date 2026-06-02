/**
 * TestEra — Timed Test Engine
 * Handles test taking: timer, question navigation, answer selection,
 * mark for review, auto-submit, scoring with negative marking.
 */

// ===== TEST STATE =====
let testData = null;
let currentQuestionIndex = 0;
let userAnswers = {};       // { qno: 'A' | 'B' | 'C' | 'D' }
let markedForReview = {};   // { qno: true }
let visitedQuestions = {};  // { qno: true }
let timerInterval = null;
let remainingSeconds = 0;
let testStartTime = null;
let testSubmitted = false;


// ===== START TEST =====
/**
 * Start a test from generated test data
 * @param {Object} test - Test object from AI engine
 */
function startTest(test) {
  if (!test || !test.questions || test.questions.length === 0) {
    showToast('No questions found. Please generate a test first.', 'error');
    return;
  }

  // Reset state
  testData = test;
  currentQuestionIndex = 0;
  userAnswers = {};
  markedForReview = {};
  visitedQuestions = {};
  testSubmitted = false;
  testStartTime = new Date();

  // Set timer
  remainingSeconds = (test.timeMinutes || 25) * 60;

  // Update header info
  const examNameEl = document.getElementById('testExamName');
  const totalQEl = document.getElementById('testTotalQ');
  if (examNameEl) examNameEl.textContent = `${test.examName} — ${test.subject}`;
  if (totalQEl) totalQEl.textContent = `${test.questions.length} Questions`;

  // Build palette
  buildPalette();

  // Show first question
  visitedQuestions[1] = true;
  renderQuestion(0);

  // Show test view (hide app layout)
  const appLayout = document.querySelector('.app-layout');
  const testContainer = document.getElementById('testViewContainer');
  if (appLayout) appLayout.style.display = 'none';
  if (testContainer) testContainer.style.display = 'flex';

  // Start timer
  startTimer();

  // Wire up buttons
  wireTestButtons();

  console.log(`🕐 Test started: ${test.questions.length} questions, ${test.timeMinutes} minutes`);
}


// ===== TIMER =====
function startTimer() {
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    remainingSeconds--;

    if (remainingSeconds <= 0) {
      // Auto-submit
      clearInterval(timerInterval);
      remainingSeconds = 0;
      updateTimerDisplay();
      showToast('⏰ Time\'s up! Auto-submitting your test...', 'warning');
      setTimeout(() => submitTest(true), 1000);
      return;
    }

    updateTimerDisplay();

    // Warning at 5 minutes
    if (remainingSeconds === 300) {
      showToast('⚠️ 5 minutes remaining!', 'warning');
      document.getElementById('testTimer')?.classList.add('timer-warning');
    }

    // Critical at 1 minute
    if (remainingSeconds === 60) {
      showToast('🔴 1 minute remaining!', 'error');
      document.getElementById('testTimer')?.classList.add('timer-critical');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const timerEl = document.getElementById('timerDisplay');
  if (timerEl) timerEl.textContent = display;
}


// ===== RENDER QUESTION =====
function renderQuestion(index) {
  if (!testData || index < 0 || index >= testData.questions.length) return;

  currentQuestionIndex = index;
  const q = testData.questions[index];

  // Update question number
  const qNumEl = document.getElementById('questionNumber');
  if (qNumEl) {
    const typeLabel = QUESTION_TYPE_LABELS?.[q.type] || 'MCQ';
    qNumEl.innerHTML = `Question ${q.qno} of ${testData.questions.length} <span style="margin-left: var(--space-sm); font-size: var(--font-xs); color: var(--text-muted); font-weight: 400;">• ${typeLabel}</span>`;
  }

  // Update question text
  const qTextEl = document.getElementById('questionText');
  if (qTextEl) qTextEl.textContent = q.question;

  // Render options
  const optionsList = document.getElementById('optionsList');
  if (optionsList) {
    const selectedAnswer = userAnswers[q.qno];

    optionsList.innerHTML = ['A', 'B', 'C', 'D'].map(key => {
      const isSelected = selectedAnswer === key;
      return `
        <div class="option-item ${isSelected ? 'selected' : ''}" 
             data-option="${key}" 
             onclick="selectOption('${key}')">
          <div class="option-letter">${key}</div>
          <div class="option-text">${q.options[key]}</div>
        </div>
      `;
    }).join('');
  }

  // Update navigation buttons
  const prevBtn = document.getElementById('btnPrevQ');
  const nextBtn = document.getElementById('btnNextQ');
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) {
    if (index === testData.questions.length - 1) {
      nextBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Finish';
    } else {
      nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
    }
  }

  // Update mark for review button
  const markBtn = document.getElementById('btnMarkReview');
  if (markBtn) {
    const isMarked = markedForReview[q.qno];
    markBtn.innerHTML = isMarked
      ? '<i class="fas fa-bookmark"></i> Unmark Review'
      : '<i class="far fa-bookmark"></i> Mark for Review';
    markBtn.classList.toggle('btn-warning', isMarked);
  }

  // Update palette
  updatePalette();
}


// ===== SELECT OPTION =====
function selectOption(optionKey) {
  if (testSubmitted) return;

  const q = testData.questions[currentQuestionIndex];
  const currentAnswer = userAnswers[q.qno];

  // Toggle — if same option clicked again, deselect
  if (currentAnswer === optionKey) {
    delete userAnswers[q.qno];
  } else {
    userAnswers[q.qno] = optionKey;
  }

  // Re-render to update selection state
  renderQuestion(currentQuestionIndex);
}


// ===== NAVIGATION =====
function goToQuestion(index) {
  if (index < 0 || index >= testData.questions.length) return;

  // Mark as visited
  visitedQuestions[testData.questions[index].qno] = true;

  renderQuestion(index);
}

function nextQuestion() {
  if (currentQuestionIndex < testData.questions.length - 1) {
    goToQuestion(currentQuestionIndex + 1);
  } else {
    // Last question — show submit confirmation
    openSubmitModal();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    goToQuestion(currentQuestionIndex - 1);
  }
}


// ===== MARK FOR REVIEW =====
function toggleMarkForReview() {
  const q = testData.questions[currentQuestionIndex];

  if (markedForReview[q.qno]) {
    delete markedForReview[q.qno];
    showToast('Bookmark removed', 'info');
  } else {
    markedForReview[q.qno] = true;
    showToast('Marked for review 🔖', 'info');
  }

  renderQuestion(currentQuestionIndex);
}


// ===== QUESTION PALETTE =====
function buildPalette() {
  const grid = document.getElementById('paletteGrid');
  if (!grid || !testData) return;

  grid.innerHTML = testData.questions.map((q, index) => {
    return `<button class="palette-btn unattempted" data-qno="${q.qno}" onclick="goToQuestion(${index})">${q.qno}</button>`;
  }).join('');
}

function updatePalette() {
  if (!testData) return;

  testData.questions.forEach((q, index) => {
    const btn = document.querySelector(`.palette-btn[data-qno="${q.qno}"]`);
    if (!btn) return;

    // Remove all state classes
    btn.className = 'palette-btn';

    // Set state
    if (index === currentQuestionIndex) {
      btn.classList.add('current');
    } else if (markedForReview[q.qno] && userAnswers[q.qno]) {
      btn.classList.add('marked', 'answered');
    } else if (markedForReview[q.qno]) {
      btn.classList.add('marked');
    } else if (userAnswers[q.qno]) {
      btn.classList.add('answered');
    } else if (visitedQuestions[q.qno]) {
      btn.classList.add('visited');
    } else {
      btn.classList.add('unattempted');
    }
  });
}


// ===== SUBMIT TEST =====
function openSubmitModal() {
  const answeredCount = Object.keys(userAnswers).length;
  const totalCount = testData.questions.length;
  const unanswered = totalCount - answeredCount;

  const answeredEl = document.getElementById('submitAnswered');
  const totalEl = document.getElementById('submitTotal');
  const unansweredText = document.getElementById('submitUnansweredText');

  if (answeredEl) answeredEl.textContent = answeredCount;
  if (totalEl) totalEl.textContent = totalCount;
  if (unansweredText) {
    unansweredText.textContent = unanswered > 0
      ? `${unanswered} question${unanswered > 1 ? 's' : ''} unanswered.`
      : 'All questions answered! ✅';
  }

  openModal('submitModal');
}

function submitTest(autoSubmit = false) {
  if (testSubmitted) return;
  testSubmitted = true;

  // Stop timer
  clearInterval(timerInterval);

  // Close modal
  closeModal('submitModal');

  // Calculate results
  const results = calculateResults();

  // Hide test view, show app layout
  const appLayout = document.querySelector('.app-layout');
  const testContainer = document.getElementById('testViewContainer');
  if (testContainer) testContainer.style.display = 'none';
  if (appLayout) appLayout.style.display = 'flex';

  // Remove timer warning classes
  const timerEl = document.getElementById('testTimer');
  if (timerEl) {
    timerEl.classList.remove('timer-warning', 'timer-critical');
  }

  // Show results
  showResults(results, autoSubmit);

  // Save results
  saveResults(results);

  console.log('📊 Test submitted:', results);
}


// ===== CALCULATE RESULTS =====
function calculateResults() {
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  const marksPerQ = testData.marksPerQuestion || 1;
  const negativeMarks = testData.negativeMarking || 0;
  const questionResults = [];

  testData.questions.forEach(q => {
    const userAnswer = userAnswers[q.qno] || null;
    let status;

    if (!userAnswer) {
      unattempted++;
      status = 'unattempted';
    } else if (userAnswer === q.correct) {
      correct++;
      status = 'correct';
    } else {
      wrong++;
      status = 'wrong';
    }

    questionResults.push({
      qno: q.qno,
      question: q.question,
      type: q.type,
      options: q.options,
      correctAnswer: q.correct,
      userAnswer: userAnswer,
      status: status,
      explanation: q.explanation,
      topic: q.topic
    });
  });

  const totalMarks = testData.questions.length * marksPerQ;
  const obtainedMarks = (correct * marksPerQ) - (wrong * negativeMarks);
  const percentage = Math.round((Math.max(0, obtainedMarks) / totalMarks) * 100);
  const timeTaken = Math.round((new Date() - testStartTime) / 1000);

  return {
    testId: testData.id,
    examName: testData.examName,
    examKey: testData.examKey,
    subject: testData.subject,
    totalQuestions: testData.questions.length,
    attempted: correct + wrong,
    correct,
    wrong,
    unattempted,
    marksPerQuestion: marksPerQ,
    negativeMarking: negativeMarks,
    totalMarks,
    obtainedMarks: Math.max(0, obtainedMarks),
    rawScore: obtainedMarks,
    percentage,
    timeTaken,
    timeAllotted: testData.timeMinutes * 60,
    questionResults,
    completedAt: new Date().toISOString()
  };
}


// ===== SHOW RESULTS =====
function showResults(results, autoSubmit) {
  const resultsView = document.getElementById('view-results');
  if (!resultsView) return;

  // Determine grade
  const grade = getGrade(results.percentage);

  // Get cutoff info
  const pattern = getExamPattern?.(results.examKey);
  const cutoffs = pattern?.cutoffs || {};

  // Format time taken
  const mins = Math.floor(results.timeTaken / 60);
  const secs = results.timeTaken % 60;
  const timeStr = `${mins}m ${secs}s`;
  const totalTimeStr = `${testData.timeMinutes}m`;

  resultsView.innerHTML = `
    <div style="margin-bottom: var(--space-2xl);">
      <h2 style="margin-bottom: var(--space-sm);">Test Results</h2>
      <p>${results.examName} — ${results.subject} ${autoSubmit ? '<span class="badge badge-warning">Auto-submitted</span>' : ''}</p>
    </div>

    <!-- Score Overview -->
    <div class="results-grid">
      <div class="card results-score-card" style="text-align: center; padding: var(--space-2xl);">
        <div class="score-circle ${grade.class}">
          <div class="score-value">${results.percentage}%</div>
          <div class="score-label">${grade.label}</div>
        </div>
        <div style="margin-top: var(--space-lg);">
          <div style="font-size: var(--font-2xl); font-weight: 800;">${results.obtainedMarks} / ${results.totalMarks}</div>
          <div style="color: var(--text-muted); font-size: var(--font-sm);">Marks Obtained</div>
        </div>
      </div>

      <div class="card" style="padding: var(--space-xl);">
        <h5 style="margin-bottom: var(--space-lg);">Performance Breakdown</h5>
        <div class="stats-list">
          <div class="stat-row">
            <span>✅ Correct</span>
            <span class="stat-value correct">${results.correct}</span>
          </div>
          <div class="stat-row">
            <span>❌ Wrong</span>
            <span class="stat-value wrong">${results.wrong}</span>
          </div>
          <div class="stat-row">
            <span>⬜ Unattempted</span>
            <span class="stat-value">${results.unattempted}</span>
          </div>
          <div class="stat-row">
            <span>📝 Attempted</span>
            <span class="stat-value">${results.attempted} / ${results.totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span>⏱️ Time Taken</span>
            <span class="stat-value">${timeStr} / ${totalTimeStr}</span>
          </div>
          ${results.negativeMarking > 0 ? `
          <div class="stat-row">
            <span>➖ Negative Marks</span>
            <span class="stat-value wrong">-${(results.wrong * results.negativeMarking).toFixed(2)}</span>
          </div>` : ''}
          <div class="stat-row" style="border-top: 1px solid var(--border); padding-top: var(--space-sm); margin-top: var(--space-sm);">
            <span style="font-weight: 700;">Raw Score</span>
            <span class="stat-value" style="font-weight: 700;">${results.rawScore.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    ${Object.keys(cutoffs).length > 0 ? `
    <!-- Cutoff Analysis -->
    <div class="card" style="margin-top: var(--space-xl); padding: var(--space-xl);">
      <h5 style="margin-bottom: var(--space-lg);">📊 Cutoff Analysis (${results.examName})</h5>
      <div class="cutoff-grid">
        ${Object.entries(cutoffs).map(([cat, range]) => {
          const avg = Math.round((range.min + range.max) / 2);
          const passed = results.obtainedMarks >= range.min;
          return `
            <div class="cutoff-item ${passed ? 'passed' : 'failed'}">
              <div class="cutoff-category">${cat.toUpperCase()}</div>
              <div class="cutoff-range">${range.min}-${range.max}</div>
              <div class="cutoff-status">${passed ? '✅ Clear' : '❌ Below'}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>` : ''}

    <!-- Question-wise Review -->
    <div class="card" style="margin-top: var(--space-xl); padding: var(--space-xl);">
      <h5 style="margin-bottom: var(--space-lg);">📋 Question-wise Review</h5>
      <div class="review-list">
        ${results.questionResults.map(qr => `
          <div class="review-item ${qr.status}">
            <div class="review-header">
              <span class="review-qno">Q${qr.qno}</span>
              <span class="review-status-badge ${qr.status}">${
                qr.status === 'correct' ? '✅ Correct' : 
                qr.status === 'wrong' ? '❌ Wrong' : '⬜ Skipped'
              }</span>
              <span class="review-topic">${qr.topic}</span>
            </div>
            <div class="review-question">${qr.question}</div>
            <div class="review-options">
              ${['A', 'B', 'C', 'D'].map(key => {
                let optClass = '';
                if (key === qr.correctAnswer) optClass = 'correct-option';
                if (key === qr.userAnswer && qr.status === 'wrong') optClass = 'wrong-option';
                return `<div class="review-option ${optClass}">
                  <span class="review-option-key">${key}</span> ${qr.options[key]}
                  ${key === qr.correctAnswer ? ' ✅' : ''}
                  ${key === qr.userAnswer && qr.status === 'wrong' ? ' ❌' : ''}
                </div>`;
              }).join('')}
            </div>
            <div class="review-explanation">
              <strong>Explanation:</strong> ${qr.explanation}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

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


// ===== GRADE CALCULATION =====
function getGrade(percentage) {
  if (percentage >= 90) return { label: 'Excellent!', class: 'grade-excellent' };
  if (percentage >= 75) return { label: 'Great!', class: 'grade-great' };
  if (percentage >= 60) return { label: 'Good', class: 'grade-good' };
  if (percentage >= 40) return { label: 'Average', class: 'grade-average' };
  return { label: 'Needs Work', class: 'grade-poor' };
}


// ===== SAVE RESULTS =====
async function saveResults(results) {
  // Save to Firestore
  if (db && currentUser) {
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('results').doc(results.testId).set(results);

      // Update user stats
      await db.collection('users').doc(currentUser.uid).set({
        testsAttempted: firebase.firestore.FieldValue.increment(1),
        lastTestAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Save results error:', e);
    }
  }

  // Also save locally
  try {
    const allResults = JSON.parse(localStorage.getItem('testera_results') || '[]');
    allResults.unshift(results);
    if (allResults.length > 50) allResults.pop();
    localStorage.setItem('testera_results', JSON.stringify(allResults));
  } catch (e) {
    console.error('Local save error:', e);
  }
}


// ===== WIRE TEST BUTTONS =====
function wireTestButtons() {
  const btnNext = document.getElementById('btnNextQ');
  const btnPrev = document.getElementById('btnPrevQ');
  const btnMark = document.getElementById('btnMarkReview');
  const btnSubmit = document.getElementById('btnSubmitTest');
  const btnConfirm = document.getElementById('btnConfirmSubmit');

  // Remove existing listeners by cloning
  if (btnNext) {
    const newNext = btnNext.cloneNode(true);
    btnNext.parentNode.replaceChild(newNext, btnNext);
    newNext.addEventListener('click', nextQuestion);
  }

  if (btnPrev) {
    const newPrev = btnPrev.cloneNode(true);
    btnPrev.parentNode.replaceChild(newPrev, btnPrev);
    newPrev.addEventListener('click', prevQuestion);
  }

  if (btnMark) {
    const newMark = btnMark.cloneNode(true);
    btnMark.parentNode.replaceChild(newMark, btnMark);
    newMark.addEventListener('click', toggleMarkForReview);
  }

  if (btnSubmit) {
    const newSubmit = btnSubmit.cloneNode(true);
    btnSubmit.parentNode.replaceChild(newSubmit, btnSubmit);
    newSubmit.addEventListener('click', openSubmitModal);
  }

  if (btnConfirm) {
    const newConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);
    newConfirm.addEventListener('click', () => submitTest(false));
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', handleTestKeyboard);
}


// ===== KEYBOARD SHORTCUTS =====
function handleTestKeyboard(e) {
  if (!testData || testSubmitted) return;

  // Only when test view is visible
  const testContainer = document.getElementById('testViewContainer');
  if (!testContainer || testContainer.style.display === 'none') return;

  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      nextQuestion();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevQuestion();
      break;
    case 'a': case 'A':
      if (!e.ctrlKey && !e.metaKey) selectOption('A');
      break;
    case 'b': case 'B':
      if (!e.ctrlKey && !e.metaKey) selectOption('B');
      break;
    case 'c': case 'C':
      if (!e.ctrlKey && !e.metaKey) selectOption('C');
      break;
    case 'd': case 'D':
      if (!e.ctrlKey && !e.metaKey) selectOption('D');
      break;
    case 'm': case 'M':
      if (!e.ctrlKey && !e.metaKey) toggleMarkForReview();
      break;
  }
}
