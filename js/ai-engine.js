/**
 * TestEara — AI Question Generation Engine
 * Uses NVIDIA API (OpenAI-compatible) to generate exam-pattern questions from PDF text.
 */

// ===== NVIDIA API CONFIG =====
const AI_API_KEY = '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';
const AI_MODEL = 'meta/llama-3.3-70b-instruct';
const AI_API_URL = '/api/ai/generate';

// ===== CHECK CONFIG =====
function isAIConfigured() {
  return AI_API_KEY !== 'YOUR_NVIDIA_API_KEY_HERE' && AI_API_KEY.length > 10;
}


// ===== MAIN GENERATION FUNCTION =====
/**
 * Generate test questions from extracted PDF text
 * @param {string} pdfText - Extracted text from PDF
 * @param {string} examKey - Exam type key (e.g., 'ssc_cgl')
 * @param {string} subjectKey - Subject key (e.g., 'history')
 * @param {number} customQuestions - Custom question count (for custom exam type)
 * @param {number} customTime - Custom time limit (for custom exam type)
 * @returns {Promise<Object>} - Generated test object
 */
async function generateTestQuestions(pdfText, examKey, subjectKey, customQuestions, customTime) {
  if (!isAIConfigured()) {
    showToast('AI API key not configured. Add your key in js/ai-engine.js', 'warning');
    throw new Error('AI API not configured');
  }

  if (!pdfText || pdfText.trim().length < 50) {
    throw new Error('Not enough text extracted from PDF to generate questions.');
  }

  const pattern = getExamPattern(examKey);
  const subjectLabel = getSubjectLabel(subjectKey);
  const totalQuestions = (examKey === 'custom' && customQuestions) ? customQuestions : pattern.questions;
  const timeMinutes = (examKey === 'custom' && customTime) ? customTime : pattern.timeMinutes;
  const distribution = getQuestionDistribution(examKey, totalQuestions);

  // Truncate PDF text if too long (Llama 3.3 context window)
  const maxChars = 30000; // ~7.5K tokens — safe for Llama 3.3 70B
  let truncatedText = pdfText;
  if (pdfText.length > maxChars) {
    // Take first 80% from beginning and 20% from end for coverage
    const headSize = Math.floor(maxChars * 0.8);
    const tailSize = maxChars - headSize;
    truncatedText = pdfText.substring(0, headSize) + '\n\n[...content truncated...]\n\n' + pdfText.substring(pdfText.length - tailSize);
    console.warn(`PDF text truncated from ${pdfText.length} to ${maxChars} chars`);
    showToast(`📄 Large PDF detected — using first & last sections for question generation.`, 'info');
  }

  // Build the prompt
  const prompt = buildPrompt(truncatedText, pattern, subjectLabel, totalQuestions, distribution);

  // Show progress
  showExtractionProgress();
  updateExtractionStatus('Generating questions...', 'AI is analyzing your content', 30);

  try {
    // Call NVIDIA API
    const response = await callAIAPI(prompt);

    updateExtractionStatus('Processing response...', 'Parsing generated questions', 80);

    // Parse the response
    const questions = parseAIResponse(response, totalQuestions);

    updateExtractionStatus('Done! ✅', `${questions.length} questions generated`, 100);

    // Build test object
    const test = {
      id: generateTestId(),
      examKey: examKey,
      examName: pattern.name,
      subject: subjectLabel,
      subjectKey: subjectKey,
      totalQuestions: questions.length,
      timeMinutes: timeMinutes,
      difficulty: pattern.difficulty,
      negativeMarking: pattern.negativeMarking,
      marksPerQuestion: pattern.marksPerQuestion,
      questions: questions,
      createdAt: new Date().toISOString(),
      status: 'ready'
    };

    console.log(`🧠 Test generated: ${questions.length} questions for ${pattern.name} — ${subjectLabel}`);

    return test;

  } catch (error) {
    updateExtractionStatus('Error ❌', error.message, 0);
    throw error;
  }
}


// ===== BUILD PROMPT =====
function buildPrompt(pdfText, pattern, subjectLabel, totalQuestions, distribution) {

  // Build question type instructions
  let typeInstructions = '';
  for (const [type, count] of Object.entries(distribution)) {
    if (count <= 0) continue;
    const label = QUESTION_TYPE_LABELS[type] || type;
    typeInstructions += `  - ${count}x ${label}\n`;
  }

  return `You are an expert exam question paper setter for Indian competitive exams.

TASK: Generate exactly ${totalQuestions} questions for the "${pattern.name}" exam pattern on the subject "${subjectLabel}".

RULES:
1. ALL questions MUST be based ONLY on the content provided below. Do NOT use external knowledge.
2. Questions must match the difficulty level: ${pattern.difficulty}
3. Each question must have exactly 4 options (A, B, C, D) with ONE correct answer.
4. Include a brief explanation (1-2 sentences) for each correct answer.
5. Identify the topic/concept each question tests.
6. Questions should cover different parts of the provided text — don't cluster from one section.
7. Avoid trivially obvious or ambiguous questions.

QUESTION TYPE DISTRIBUTION:
${typeInstructions}

QUESTION TYPE FORMATS:
- MCQ: Standard multiple choice with a clear question stem
- Statement Based: "Consider the following statements: 1. ... 2. ... 3. ... Which of the above is/are correct?"
- Match the Following: "Match List-I with List-II" with column A and column B items
- Assertion & Reason: "Assertion (A): ... Reason (R): ..." with options about their relationship
- True/False: A statement followed by options: A) True B) False C) Partially True D) Cannot be determined
- Fill in the Blank: "_____ is the ..." with 4 options
- Conceptual: Application-based or analytical questions testing deeper understanding

RESPONSE FORMAT (STRICT JSON):
Return ONLY a valid JSON array. No markdown code fences, no explanation outside JSON, no extra text.
Each question object must have these exact fields:

[
  {
    "qno": 1,
    "type": "mcq",
    "question": "The question text here?",
    "options": {
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    },
    "correct": "B",
    "explanation": "Brief explanation of why B is correct.",
    "topic": "Topic name"
  }
]

Valid "type" values: mcq, statement_based, match_following, assertion_reason, true_false, fill_blank, conceptual
Valid "correct" values: A, B, C, D

STUDY MATERIAL CONTENT:
---
${pdfText}
---

Generate exactly ${totalQuestions} questions now. Return ONLY the JSON array.`;
}


// ===== CALL NVIDIA API =====
async function callAIAPI(prompt) {
  const requestBody = {
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert exam question generator. You MUST respond with ONLY a valid JSON array. No extra text, no markdown fences, no explanation before or after the JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 16384
  };

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `API error: ${response.status}`;

      if (response.status === 401) {
        throw new Error('API key invalid. Check your NVIDIA API key.');
      }
      if (response.status === 402) {
        throw new Error('API credits exhausted. Please add credits to your NVIDIA account.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit reached. Please wait a minute and try again.');
      }
      if (response.status === 500 || response.status === 503) {
        throw new Error('AI server error. Please try again in a moment.');
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();

    // Extract text from OpenAI-compatible response
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response from AI. Please try again.');
    }

    return text;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Check your internet connection and try again.');
    }
    throw error;
  }
}


// ===== PARSE AI RESPONSE =====
function parseAIResponse(responseText, expectedCount) {
  let questions;

  try {
    // Clean response — remove markdown fences if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    questions = JSON.parse(cleaned);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Raw response:', responseText.substring(0, 500));

    // Try to extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        questions = JSON.parse(jsonMatch[0]);
      } catch (e) {
        throw new Error('AI returned invalid format. Please try generating again.');
      }
    } else {
      throw new Error('AI returned invalid format. Please try generating again.');
    }
  }

  if (!Array.isArray(questions)) {
    throw new Error('AI did not return a question array. Please try again.');
  }

  // Validate and clean each question
  const validQuestions = questions
    .filter(q => q && q.question && q.options && q.correct)
    .map((q, index) => ({
      qno: index + 1,
      type: validateQuestionType(q.type),
      question: String(q.question).trim(),
      options: {
        A: String(q.options.A || q.options.a || '').trim(),
        B: String(q.options.B || q.options.b || '').trim(),
        C: String(q.options.C || q.options.c || '').trim(),
        D: String(q.options.D || q.options.d || '').trim()
      },
      correct: String(q.correct).toUpperCase().trim(),
      explanation: String(q.explanation || 'No explanation provided.').trim(),
      topic: String(q.topic || 'General').trim()
    }))
    .filter(q => {
      // Ensure all options exist and correct answer is valid
      return q.options.A && q.options.B && q.options.C && q.options.D &&
             ['A', 'B', 'C', 'D'].includes(q.correct);
    });

  if (validQuestions.length === 0) {
    throw new Error('No valid questions generated. Please try again with different content.');
  }

  // Warn if fewer questions than expected
  if (validQuestions.length < expectedCount) {
    console.warn(`Expected ${expectedCount} questions but got ${validQuestions.length}`);
    showToast(`Generated ${validQuestions.length} of ${expectedCount} questions. Some were invalid.`, 'warning');
  }

  return validQuestions;
}


// ===== VALIDATE QUESTION TYPE =====
function validateQuestionType(type) {
  const validTypes = ['mcq', 'statement_based', 'match_following', 'assertion_reason', 'true_false', 'fill_blank', 'conceptual'];
  const cleaned = String(type || 'mcq').toLowerCase().trim().replace(/\s+/g, '_');
  return validTypes.includes(cleaned) ? cleaned : 'mcq';
}


// ===== GENERATE TEST ID =====
function generateTestId() {
  return 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}


// ===== SAVE TEST TO FIRESTORE =====
async function saveTestToFirestore(test) {
  if (!db || !currentUser) {
    console.warn('Firestore or user not available. Saving locally.');
    saveTestLocally(test);
    return test.id;
  }

  try {
    await db.collection('users').doc(currentUser.uid)
      .collection('tests').doc(test.id).set(test);

    // Update user stats
    await db.collection('users').doc(currentUser.uid).set({
      testsCreated: firebase.firestore.FieldValue.increment(1),
      lastTestAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('💾 Test saved to Firestore:', test.id);
    return test.id;
  } catch (error) {
    console.error('Firestore save error:', error);
    saveTestLocally(test);
    return test.id;
  }
}

// ===== LOCAL STORAGE FALLBACK =====
function saveTestLocally(test) {
  try {
    const tests = JSON.parse(localStorage.getItem('TestEara_tests') || '[]');
    tests.unshift(test);
    // Keep max 20 tests locally
    if (tests.length > 20) tests.pop();
    localStorage.setItem('TestEara_tests', JSON.stringify(tests));
    console.log('💾 Test saved locally:', test.id);
  } catch (e) {
    console.error('Local save error:', e);
  }
}

function getLocalTests() {
  try {
    return JSON.parse(localStorage.getItem('TestEara_tests') || '[]');
  } catch (e) {
    return [];
  }
}
