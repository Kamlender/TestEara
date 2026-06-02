/**
 * TestEra — Dashboard & My Tests
 * Loads stats from Firestore/localStorage, populates dashboard cards,
 * renders test history list, allows reviewing past results.
 */


// ===== LOAD DASHBOARD STATS =====
async function loadDashboardStats() {
  const results = await getAllResults();

  const totalTests = results.length;
  const avgScore = totalTests > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTests)
    : 0;
  const bestScore = totalTests > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0;
  const totalCorrect = results.reduce((sum, r) => sum + (r.correct || 0), 0);
  const totalAttempted = results.reduce((sum, r) => sum + (r.attempted || 0), 0);
  const accuracy = totalAttempted > 0
    ? Math.round((totalCorrect / totalAttempted) * 100)
    : 0;

  // Update stat cards
  const dashTotal = document.getElementById('dashTotalTests');
  const dashAvg = document.getElementById('dashAvgScore');
  const dashBest = document.getElementById('dashBestScore');
  const dashAcc = document.getElementById('dashAccuracy');

  if (dashTotal) dashTotal.textContent = totalTests;
  if (dashAvg) dashAvg.textContent = totalTests > 0 ? `${avgScore}%` : '—';
  if (dashBest) dashBest.textContent = totalTests > 0 ? `${bestScore}%` : '—';
  if (dashAcc) dashAcc.textContent = totalAttempted > 0 ? `${accuracy}%` : '—';

  // Update welcome message
  const welcomeEl = document.querySelector('.dashboard-welcome h2');
  if (welcomeEl && currentUser) {
    const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    welcomeEl.textContent = `Welcome back, ${name}! 👋`;
  }

  // Show/hide quick action card based on whether tests exist
  const quickAction = document.querySelector('.dashboard-welcome + .stats-grid + .card');
  if (quickAction && totalTests > 0) {
    quickAction.style.display = 'none';
  }

  // Load recent tests
  loadRecentTests(results);
}


// ===== LOAD RECENT TESTS =====
function loadRecentTests(results) {
  const container = document.getElementById('recentTestsList');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h4>No tests yet</h4>
        <p>Create your first test to see your history here.</p>
      </div>
    `;
    return;
  }

  // Show last 5 results
  const recent = results.slice(0, 5);

  container.innerHTML = recent.map(r => {
    const grade = getGrade(r.percentage);
    const date = new Date(r.completedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const time = new Date(r.completedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="test-history-card" onclick="viewPastResult('${r.testId}')">
        <div class="test-history-left">
          <div class="test-history-score ${grade.class}">${r.percentage}%</div>
          <div class="test-history-info">
            <div class="test-history-title">${r.examName} — ${r.subject}</div>
            <div class="test-history-meta">
              ${r.correct}/${r.totalQuestions} correct • ${date} at ${time}
            </div>
          </div>
        </div>
        <div class="test-history-right">
          <i class="fas fa-chevron-right" style="color: var(--text-muted);"></i>
        </div>
      </div>
    `;
  }).join('');
}


// ===== LOAD MY TESTS PAGE =====
async function loadMyTests() {
  const container = document.getElementById('myTestsList');
  if (!container) return;

  const results = await getAllResults();

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h4>No tests created yet</h4>
        <p>Your test history will appear here after you create and attempt tests.</p>
        <button class="btn btn-primary" onclick="switchView('create-test', document.querySelector('[data-view=create-test]'))">
          <i class="fas fa-plus-circle"></i>
          Create Your First Test
        </button>
      </div>
    `;
    return;
  }

  // Group by exam type
  const summary = {
    totalTests: results.length,
    totalCorrect: results.reduce((s, r) => s + (r.correct || 0), 0),
    totalWrong: results.reduce((s, r) => s + (r.wrong || 0), 0),
    totalQuestions: results.reduce((s, r) => s + (r.totalQuestions || 0), 0),
    avgPercentage: Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
  };

  container.innerHTML = `
    <!-- Summary Bar -->
    <div class="card" style="padding: var(--space-lg); margin-bottom: var(--space-xl);">
      <div class="my-tests-summary">
        <div class="summary-item">
          <div class="summary-value">${summary.totalTests}</div>
          <div class="summary-label">Tests Taken</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${summary.avgPercentage}%</div>
          <div class="summary-label">Avg Score</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${summary.totalCorrect}</div>
          <div class="summary-label">Correct</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${summary.totalWrong}</div>
          <div class="summary-label">Wrong</div>
        </div>
      </div>
    </div>

    <!-- Test History -->
    <h4 style="margin-bottom: var(--space-lg);">All Tests</h4>
    <div class="test-history-list">
      ${results.map(r => {
        const grade = getGrade(r.percentage);
        const date = new Date(r.completedAt).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
        const mins = Math.floor((r.timeTaken || 0) / 60);
        const secs = (r.timeTaken || 0) % 60;

        return `
          <div class="test-history-card" onclick="viewPastResult('${r.testId}')">
            <div class="test-history-left">
              <div class="test-history-score ${grade.class}">${r.percentage}%</div>
              <div class="test-history-info">
                <div class="test-history-title">${r.examName} — ${r.subject}</div>
                <div class="test-history-meta">
                  ✅ ${r.correct} correct  •  ❌ ${r.wrong} wrong  •  ⬜ ${r.unattempted} skipped
                </div>
                <div class="test-history-meta">
                  ⏱️ ${mins}m ${secs}s  •  📅 ${date}
                </div>
              </div>
            </div>
            <div class="test-history-right">
              <button class="btn btn-ghost btn-sm" title="View Details">
                <i class="fas fa-eye"></i> Review
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}


// ===== VIEW PAST RESULT =====
async function viewPastResult(testId) {
  const results = await getAllResults();
  const result = results.find(r => r.testId === testId);

  if (!result) {
    showToast('Result not found.', 'error');
    return;
  }

  // Rebuild the results view using showResults from test-engine
  if (typeof showResults === 'function') {
    // Need testData for cutoff info
    testData = {
      timeMinutes: Math.ceil((result.timeAllotted || 0) / 60),
      examName: result.examName,
      examKey: result.examKey
    };
    showResults(result, false);
  }
}


// ===== GET ALL RESULTS =====
async function getAllResults() {
  let results = [];

  // Try Firestore first
  if (db && currentUser) {
    try {
      const snapshot = await db.collection('users').doc(currentUser.uid)
        .collection('results')
        .orderBy('completedAt', 'desc')
        .limit(50)
        .get();

      snapshot.forEach(doc => {
        results.push(doc.data());
      });

      if (results.length > 0) return results;
    } catch (e) {
      console.warn('Firestore results fetch error:', e);
    }
  }

  // Fallback to localStorage
  try {
    results = JSON.parse(localStorage.getItem('testera_results') || '[]');
  } catch (e) {
    results = [];
  }

  return results;
}


// ===== INITIALIZE =====
// Called when dashboard view is shown
function initDashboard() {
  loadDashboardStats();
}

// Called when my-tests view is shown
function initMyTests() {
  loadMyTests();
}
