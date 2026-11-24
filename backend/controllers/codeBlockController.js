const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { success, error } = require('../utils/response');

// GET /api/code-blocks (List challenges for contest or organizer library)
async function getCodeBlocks(req, res) {
  try {
    const { event_id } = req.query;
    let queryStr = `
      SELECT 
        cb.*,
        (SELECT COUNT(*) FROM test_cases WHERE code_block_id = cb.id)::int as total_test_cases,
        (SELECT COUNT(*) FROM test_cases WHERE code_block_id = cb.id AND is_hidden = FALSE)::int as public_test_cases,
        (SELECT COUNT(*) FROM test_cases WHERE code_block_id = cb.id AND is_hidden = TRUE)::int as hidden_test_cases
      FROM code_blocks cb
    `;
    const params = [];

    if (event_id) {
      params.push(event_id);
      queryStr += ` WHERE cb.event_id = $1`;
    } else {
      params.push(req.user.id);
      queryStr += ` WHERE cb.organizer_id = $1`;
    }

    queryStr += ` ORDER BY cb.created_at DESC`;
    const result = await db.query(queryStr, params);

    return success(res, { codeBlocks: result.rows });
  } catch (err) {
    console.error('[Get Code Blocks Error]:', err);
    return error(res, 'Failed to fetch code blocks.', 500, err.message);
  }
}

// GET /api/code-blocks/:id (Details with test cases)
async function getCodeBlockById(req, res) {
  try {
    const { id } = req.params;

    const blockRes = await db.query(`SELECT * FROM code_blocks WHERE id = $1`, [id]);
    if (blockRes.rows.length === 0) {
      return error(res, 'Code challenge not found.', 404);
    }

    const codeBlock = blockRes.rows[0];

    // Fetch test cases
    // Security check: if participant, NEVER return hidden test cases
    const isParticipant = req.user.role === 'participant';
    let testRes;

    if (isParticipant) {
      testRes = await db.query(
        `SELECT id, is_hidden, input_data, expected_output, marks FROM test_cases WHERE code_block_id = $1 AND is_hidden = FALSE ORDER BY created_at ASC`,
        [id]
      );
    } else {
      testRes = await db.query(
        `SELECT * FROM test_cases WHERE code_block_id = $1 ORDER BY is_hidden ASC, created_at ASC`,
        [id]
      );
    }

    return success(res, {
      codeBlock,
      testCases: testRes.rows
    });
  } catch (err) {
    console.error('[Get Code Block Details Error]:', err);
    return error(res, 'Failed to fetch challenge details.', 500, err.message);
  }
}

// POST /api/code-blocks (Create Challenge with Test Cases)
async function createCodeBlock(req, res) {
  try {
    const {
      event_id,
      title,
      description,
      language,
      difficulty = 'easy',
      original_code,
      input_format,
      expected_output,
      time_limit_ms = 2000,
      memory_limit_kb = 128000,
      marks = 100,
      test_cases = []
    } = req.body;

    if (!title || !description || !language || !original_code) {
      return error(res, 'Title, description, language, and original source code are required.', 400);
    }

    const blockId = uuidv4();
    await db.query(
      `INSERT INTO code_blocks (id, event_id, organizer_id, title, description, language, difficulty, original_code, input_format, expected_output, time_limit_ms, memory_limit_kb, marks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        blockId,
        event_id || null,
        req.user.id,
        title.trim(),
        description.trim(),
        language.toLowerCase(),
        difficulty.toLowerCase(),
        original_code,
        input_format || null,
        expected_output || null,
        parseInt(time_limit_ms, 10) || 2000,
        parseInt(memory_limit_kb, 10) || 128000,
        parseInt(marks, 10) || 100
      ]
    );

    // Insert test cases
    if (Array.isArray(test_cases)) {
      for (const tc of test_cases) {
        if (!tc.input_data || !tc.expected_output) continue;
        await db.query(
          `INSERT INTO test_cases (id, code_block_id, is_hidden, input_data, expected_output, marks)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), blockId, Boolean(tc.is_hidden), tc.input_data, tc.expected_output, parseInt(tc.marks, 10) || 10]
        );
      }
    }

    return success(res, { id: blockId, title, language }, 'Challenge created successfully.', 201);
  } catch (err) {
    console.error('[Create Code Block Error]:', err);
    return error(res, 'Failed to create code challenge.', 500, err.message);
  }
}

// PATCH /api/code-blocks/:id (Edit Challenge)
async function updateCodeBlock(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      language,
      difficulty,
      original_code,
      input_format,
      expected_output,
      time_limit_ms,
      memory_limit_kb,
      marks,
      test_cases
    } = req.body;

    await db.query(
      `UPDATE code_blocks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        language = COALESCE($3, language),
        difficulty = COALESCE($4, difficulty),
        original_code = COALESCE($5, original_code),
        input_format = COALESCE($6, input_format),
        expected_output = COALESCE($7, expected_output),
        time_limit_ms = COALESCE($8, time_limit_ms),
        memory_limit_kb = COALESCE($9, memory_limit_kb),
        marks = COALESCE($10, marks),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [
        title,
        description,
        language,
        difficulty,
        original_code,
        input_format,
        expected_output,
        time_limit_ms,
        memory_limit_kb,
        marks,
        id
      ]
    );

    // If test cases provided, replace them
    if (Array.isArray(test_cases)) {
      await db.query(`DELETE FROM test_cases WHERE code_block_id = $1`, [id]);
      for (const tc of test_cases) {
        if (!tc.input_data || !tc.expected_output) continue;
        await db.query(
          `INSERT INTO test_cases (id, code_block_id, is_hidden, input_data, expected_output, marks)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), id, Boolean(tc.is_hidden), tc.input_data, tc.expected_output, parseInt(tc.marks, 10) || 10]
        );
      }
    }

    return success(res, { id }, 'Challenge updated successfully.');
  } catch (err) {
    console.error('[Update Code Block Error]:', err);
    return error(res, 'Failed to update code challenge.', 500, err.message);
  }
}

// DELETE /api/code-blocks/:id
async function deleteCodeBlock(req, res) {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM code_blocks WHERE id = $1`, [id]);
    return success(res, null, 'Challenge deleted successfully.');
  } catch (err) {
    console.error('[Delete Code Block Error]:', err);
    return error(res, 'Failed to delete challenge.', 500, err.message);
  }
}

module.exports = {
  getCodeBlocks,
  getCodeBlockById,
  createCodeBlock,
  updateCodeBlock,
  deleteCodeBlock
};
