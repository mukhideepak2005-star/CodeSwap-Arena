const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { executeCode } = require('./judge0Service');

/**
 * Runs automated evaluation against all hidden and public test cases for a debug submission
 */
async function runAutomatedEvaluation({ debugSubmissionId, roundId, eventId, recipientParticipantId, correctedCode, codeBlockId, language }) {
  // 1. Fetch all test cases for this code block
  const testRes = await db.query(
    `SELECT * FROM test_cases WHERE code_block_id = $1 ORDER BY is_hidden ASC, created_at ASC`,
    [codeBlockId]
  );
  const testCases = testRes.rows;

  // 2. Fetch round scoring config
  const roundRes = await db.query(`SELECT scoring_config FROM rounds WHERE id = $1`, [roundId]);
  const scoringConfig = roundRes.rows[0]?.scoring_config || { test_cases: 60, organizer_review: 20, explanation: 20 };
  const maxAutoScore = scoringConfig.test_cases || 60;

  let passedCount = 0;
  const evaluationDetails = [];

  for (const tc of testCases) {
    try {
      const execResult = await executeCode({
        language,
        sourceCode: correctedCode,
        stdin: tc.input_data,
        timeLimitMs: 3000
      });

      const actualTrimmed = (execResult.stdout || '').trim();
      const expectedTrimmed = (tc.expected_output || '').trim();
      const isPassed = actualTrimmed === expectedTrimmed && execResult.status === 'Accepted';

      if (isPassed) passedCount++;

      evaluationDetails.push({
        testCaseId: tc.id,
        isPassed,
        actualOutput: actualTrimmed,
        executionTimeMs: execResult.execution_time_ms,
        errorMessage: isPassed ? null : (execResult.compile_output || execResult.stderr || `Expected "${expectedTrimmed}", received "${actualTrimmed}"`)
      });
    } catch (err) {
      evaluationDetails.push({
        testCaseId: tc.id,
        isPassed: false,
        actualOutput: '',
        executionTimeMs: 0,
        errorMessage: err.message
      });
    }
  }

  // Calculate automatic score proportionally
  const totalTests = testCases.length;
  const autoScore = totalTests > 0 ? ((passedCount / totalTests) * maxAutoScore) : 0;
  const roundedAutoScore = Math.round(autoScore * 100) / 100;

  // 3. Upsert evaluation record
  const evalId = uuidv4();
  const evalRes = await db.query(
    `INSERT INTO evaluations (id, debug_submission_id, round_id, event_id, participant_id, automated_score, organizer_score, explanation_score, total_score, test_cases_passed, total_test_cases, status)
     VALUES ($1, $2, $3, $4, $5, $6, 0.00, 0.00, $7, $8, $9, 'completed')
     ON CONFLICT (round_id, participant_id) 
     DO UPDATE SET 
       automated_score = EXCLUDED.automated_score,
       total_score = EXCLUDED.automated_score + evaluations.organizer_score + evaluations.explanation_score,
       test_cases_passed = EXCLUDED.test_cases_passed,
       total_test_cases = EXCLUDED.total_test_cases,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [evalId, debugSubmissionId, roundId, eventId, recipientParticipantId, roundedAutoScore, roundedAutoScore, passedCount, totalTests]
  );

  const actualEvalId = evalRes.rows[0].id;

  // 4. Save evaluation details
  await db.query(`DELETE FROM evaluation_details WHERE evaluation_id = $1`, [actualEvalId]);
  for (const d of evaluationDetails) {
    await db.query(
      `INSERT INTO evaluation_details (id, evaluation_id, test_case_id, is_passed, actual_output, execution_time_ms, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), actualEvalId, d.testCaseId, d.isPassed, d.actualOutput, d.executionTimeMs, d.errorMessage]
    );
  }

  return {
    evaluationId: actualEvalId,
    automatedScore: roundedAutoScore,
    testCasesPassed: passedCount,
    totalTestCases: totalTests,
    details: evaluationDetails
  };
}

module.exports = {
  runAutomatedEvaluation
};
