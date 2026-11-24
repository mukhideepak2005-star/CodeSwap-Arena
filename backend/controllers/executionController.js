const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { executeCode } = require('../services/judge0Service');
const { success, error } = require('../utils/response');

// POST /api/code/run
async function runCode(req, res) {
  try {
    const { language, source_code, stdin = '', code_block_id, event_id } = req.body;

    if (!language || !source_code) {
      return error(res, 'Language and source code are required.', 400);
    }

    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : 'anonymous';

    // Execute through Judge0 / sandboxed runner
    const result = await executeCode({
      language,
      sourceCode: source_code,
      stdin,
      timeLimitMs: 3000
    });

    // Record execution run in database
    const runId = uuidv4();
    await db.query(
      `INSERT INTO execution_runs (id, event_id, user_id, user_role, code_block_id, language, source_code, stdin, stdout, stderr, compile_output, status, execution_time_ms, memory_kb)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        runId,
        event_id || (req.user?.eventId || null),
        userId,
        userRole,
        code_block_id || null,
        language,
        source_code.slice(0, 5000), // cap stored length
        (stdin || '').slice(0, 1000),
        result.stdout,
        result.stderr,
        result.compile_output,
        result.status,
        result.execution_time_ms,
        result.memory_kb || 0
      ]
    );

    return success(res, {
      run_id: runId,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      execution_time_ms: result.execution_time_ms,
      memory_kb: result.memory_kb,
      engine: result.judge_used
    }, 'Code executed successfully.');
  } catch (err) {
    console.error('[Code Run Error]:', err);
    return error(res, 'Code execution failed.', 500, err.message);
  }
}

module.exports = {
  runCode
};
