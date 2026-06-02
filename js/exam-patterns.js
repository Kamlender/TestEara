/**
 * TestEara — Exam Patterns Configuration
 * Defines question counts, time limits, difficulty, marking scheme,
 * and question type distribution for each supported exam.
 */

const EXAM_PATTERNS = {

  ssc_cgl: {
    name: 'SSC CGL',
    fullName: 'Staff Selection Commission — Combined Graduate Level',
    questions: 25,
    timeMinutes: 25,
    difficulty: 'Medium-Hard',
    negativeMarking: 0.50, // per wrong answer
    marksPerQuestion: 2,
    questionTypes: {
      mcq: 10,
      statement_based: 4,
      match_following: 2,
      assertion_reason: 3,
      true_false: 2,
      fill_blank: 2,
      conceptual: 2
    },
    cutoffs: {
      general: { min: 32, max: 38 },
      obc: { min: 28, max: 34 },
      sc: { min: 22, max: 28 },
      st: { min: 20, max: 26 },
      ews: { min: 28, max: 34 }
    }
  },

  ssc_chsl: {
    name: 'SSC CHSL',
    fullName: 'Staff Selection Commission — Combined Higher Secondary Level',
    questions: 25,
    timeMinutes: 25,
    difficulty: 'Medium',
    negativeMarking: 0.50,
    marksPerQuestion: 2,
    questionTypes: {
      mcq: 12,
      statement_based: 3,
      match_following: 2,
      assertion_reason: 2,
      true_false: 3,
      fill_blank: 2,
      conceptual: 1
    },
    cutoffs: {
      general: { min: 30, max: 36 },
      obc: { min: 26, max: 32 },
      sc: { min: 20, max: 26 },
      st: { min: 18, max: 24 },
      ews: { min: 26, max: 32 }
    }
  },

  rrb_ntpc: {
    name: 'RRB NTPC',
    fullName: 'Railway Recruitment Board — Non-Technical Popular Categories',
    questions: 50,
    timeMinutes: 30,
    difficulty: 'Medium',
    negativeMarking: 0.33,
    marksPerQuestion: 1,
    questionTypes: {
      mcq: 22,
      statement_based: 7,
      match_following: 4,
      assertion_reason: 5,
      true_false: 5,
      fill_blank: 4,
      conceptual: 3
    },
    cutoffs: {
      general: { min: 32, max: 40 },
      obc: { min: 28, max: 36 },
      sc: { min: 22, max: 30 },
      st: { min: 20, max: 28 },
      ews: { min: 28, max: 36 }
    }
  },

  rrb_group_d: {
    name: 'RRB Group D',
    fullName: 'Railway Recruitment Board — Group D (Level 1)',
    questions: 25,
    timeMinutes: 25,
    difficulty: 'Easy-Medium',
    negativeMarking: 0.33,
    marksPerQuestion: 1,
    questionTypes: {
      mcq: 12,
      statement_based: 3,
      true_false: 4,
      fill_blank: 3,
      assertion_reason: 2,
      conceptual: 1,
      match_following: 0
    },
    cutoffs: {
      general: { min: 15, max: 18 },
      obc: { min: 13, max: 16 },
      sc: { min: 10, max: 13 },
      st: { min: 8, max: 11 },
      ews: { min: 13, max: 16 }
    }
  },

  banking: {
    name: 'Banking',
    fullName: 'Banking Exams (IBPS PO / SBI PO / Clerk)',
    questions: 35,
    timeMinutes: 20,
    difficulty: 'Medium-Hard',
    negativeMarking: 0.25,
    marksPerQuestion: 1,
    questionTypes: {
      mcq: 15,
      statement_based: 5,
      match_following: 3,
      assertion_reason: 4,
      true_false: 3,
      fill_blank: 3,
      conceptual: 2
    },
    cutoffs: {
      general: { min: 22, max: 28 },
      obc: { min: 18, max: 24 },
      sc: { min: 14, max: 20 },
      st: { min: 12, max: 18 },
      ews: { min: 18, max: 24 }
    }
  },

  upsc: {
    name: 'UPSC Prelims',
    fullName: 'Union Public Service Commission — Civil Services Preliminary',
    questions: 20,
    timeMinutes: 30,
    difficulty: 'Hard',
    negativeMarking: 0.66,
    marksPerQuestion: 2,
    questionTypes: {
      mcq: 6,
      statement_based: 4,
      match_following: 2,
      assertion_reason: 3,
      conceptual: 3,
      true_false: 1,
      fill_blank: 1
    },
    cutoffs: {
      general: { min: 22, max: 28 },
      obc: { min: 20, max: 26 },
      sc: { min: 16, max: 22 },
      st: { min: 14, max: 20 },
      ews: { min: 20, max: 26 }
    }
  },

  custom: {
    name: 'Custom',
    fullName: 'Custom Exam Pattern',
    questions: 25,
    timeMinutes: 30,
    difficulty: 'Medium',
    negativeMarking: 0,
    marksPerQuestion: 1,
    questionTypes: {
      mcq: 10,
      statement_based: 4,
      match_following: 2,
      assertion_reason: 3,
      true_false: 3,
      fill_blank: 2,
      conceptual: 1
    },
    cutoffs: {
      general: { min: 15, max: 20 },
      obc: { min: 13, max: 18 },
      sc: { min: 10, max: 15 },
      st: { min: 8, max: 13 },
      ews: { min: 13, max: 18 }
    }
  }
};

// ===== SUBJECT LABELS =====
const SUBJECT_LABELS = {
  gk: 'General Knowledge',
  history: 'History',
  geography: 'Geography',
  polity: 'Polity & Governance',
  science: 'Science',
  mathematics: 'Mathematics',
  reasoning: 'Reasoning & Logic',
  english: 'English Language',
  computer: 'Computer Awareness'
};

// ===== QUESTION TYPE LABELS =====
const QUESTION_TYPE_LABELS = {
  mcq: 'Multiple Choice (MCQ)',
  statement_based: 'Statement Based',
  match_following: 'Match the Following',
  assertion_reason: 'Assertion & Reason',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  conceptual: 'Conceptual / Short Answer'
};


// ===== HELPER FUNCTIONS =====

/**
 * Get exam pattern by key
 */
function getExamPattern(examKey) {
  return EXAM_PATTERNS[examKey] || EXAM_PATTERNS.custom;
}

/**
 * Get subject label
 */
function getSubjectLabel(subjectKey) {
  return SUBJECT_LABELS[subjectKey] || subjectKey;
}

/**
 * Get cutoff for a specific exam and category
 */
function getExamCutoff(examKey, category = 'general') {
  const pattern = getExamPattern(examKey);
  const cutoff = pattern.cutoffs[category] || pattern.cutoffs.general;
  // Return average of min and max
  return Math.round((cutoff.min + cutoff.max) / 2);
}

/**
 * Build question type distribution for the prompt
 * Adjusts counts if custom question count differs from default
 */
function getQuestionDistribution(examKey, totalQuestions) {
  const pattern = getExamPattern(examKey);
  const defaultTotal = pattern.questions;
  const types = { ...pattern.questionTypes };

  // If custom question count, scale proportionally
  if (totalQuestions && totalQuestions !== defaultTotal) {
    const ratio = totalQuestions / defaultTotal;
    let adjusted = {};
    let sum = 0;

    for (const [type, count] of Object.entries(types)) {
      adjusted[type] = Math.max(0, Math.round(count * ratio));
      sum += adjusted[type];
    }

    // Adjust MCQ count to match total exactly
    const diff = totalQuestions - sum;
    adjusted.mcq = Math.max(1, adjusted.mcq + diff);

    return adjusted;
  }

  return types;
}
