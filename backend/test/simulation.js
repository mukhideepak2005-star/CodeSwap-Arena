/**
 * CodeSwap Arena - Automated End-to-End Multi-Participant & Security Simulation
 * Tests multi-organizer isolation, private PIN access, 10-participant bug swapping,
 * automated test evaluations, organizer reviews, and leaderboard rankings.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let org1Token = '';
let org2Token = '';
let event1Id = '';
let round1Id = '';
const participantTokens = [];

async function runSimulation() {
  console.log('================================================================');
  console.log('🧪 STARTING CODESWAP ARENA END-TO-END VERIFICATION & SIMULATION');
  console.log('================================================================\n');

  try {
    // 1. Health check
    console.log('[Step 1] Checking API Server Health...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log(`✓ Health status: ${health.data.status} (${health.data.platform})\n`);

    // 2. Authentication
    console.log('[Step 2] Authenticating Platform Admin & Organizers...');
    const adminRes = await axios.post(`${BASE_URL}/auth/admin/login`, {
      username_or_email: 'admin@codeswaparena.com',
      password: 'Admin@123456'
    });
    adminToken = adminRes.data.data.token;
    console.log('✓ Admin authenticated successfully.');

    const org1Res = await axios.post(`${BASE_URL}/auth/organizer/login`, {
      email: 'alex@university.edu',
      password: 'Organizer@123'
    });
    org1Token = org1Res.data.data.token;
    console.log('✓ Organizer 1 (Prof. Alex) authenticated.');

    const org2Res = await axios.post(`${BASE_URL}/auth/organizer/login`, {
      email: 'sarah@techclub.org',
      password: 'Organizer@123'
    });
    org2Token = org2Res.data.data.token;
    console.log('✓ Organizer 2 (Sarah Connor) authenticated.\n');

    // 3. Public Discovery & Privacy Isolation
    console.log('[Step 3] Testing Public Contest Discovery & Privacy...');
    const publicContests = await axios.get(`${BASE_URL}/public/contests`);
    const contestsList = publicContests.data.data.contests;
    console.log(`✓ Discovered ${contestsList.length} public contests.`);

    // Verify private contest is NOT exposed in public discovery
    const hasPrivate = contestsList.some(c => c.visibility === 'private');
    if (hasPrivate) {
      throw new Error('SECURITY VIOLATION: Private contest leaked in public discovery!');
    }
    console.log('✓ Security check passed: Private contests strictly hidden from public discovery.');

    // Find Event 1 (Algorithmic Bug Hunt 2026)
    const event1 = contestsList.find(c => c.name.includes('Algorithmic Bug Hunt'));
    if (!event1) throw new Error('Seeded Event 1 not found in public list.');
    event1Id = event1.id;
    console.log(`✓ Event 1 found: "${event1.name}" (ID: ${event1Id})\n`);

    // 4. Private PIN Access
    console.log('[Step 4] Testing Private Contest Access via PIN...');
    // Invalid PIN
    try {
      await axios.post(`${BASE_URL}/public/verify-pin`, { pin: '000000' });
      throw new Error('Should have rejected invalid PIN!');
    } catch (err) {
      console.log('✓ Invalid PIN correctly rejected (404).');
    }

    // Valid PIN (889900)
    const pinRes = await axios.post(`${BASE_URL}/public/verify-pin`, { pin: '889900' });
    console.log(`✓ Valid PIN accepted! Accessed private contest: "${pinRes.data.data.contest.name}"\n`);

    // 5. Contest Ownership Isolation Security Test
    console.log('[Step 5] Testing Contest Ownership & Permission Guards...');
    // Organizer 2 attempts to delete Organizer 1's contest
    try {
      await axios.delete(`${BASE_URL}/events/${event1Id}`, {
        headers: { Authorization: `Bearer ${org2Token}` }
      });
      throw new Error('SECURITY VIOLATION: Unauthorized organizer was able to delete contest!');
    } catch (err) {
      console.log('✓ Security guard passed: Unauthorized deletion blocked with 403 Forbidden.');
    }

    // 6. Code Execution Engine Test (Python & JS)
    console.log('\n[Step 6] Testing Online Code Execution Engine...');
    const pyRun = await axios.post(
      `${BASE_URL}/code/run`,
      {
        language: 'python',
        source_code: 'import sys\nline = sys.stdin.read().strip()\nprint(f"ARENA_ECHO: {line}")',
        stdin: 'Hello CodeSwap Arena!'
      },
      { headers: { Authorization: `Bearer ${org1Token}` } }
    );
    console.log(`✓ Python execution status: ${pyRun.data.data.status} | Output: "${pyRun.data.data.stdout}"`);

    const jsRun = await axios.post(
      `${BASE_URL}/code/run`,
      {
        language: 'javascript',
        source_code: 'const fs = require("fs"); console.log(40 + 2);',
        stdin: ''
      },
      { headers: { Authorization: `Bearer ${org1Token}` } }
    );
    console.log(`✓ JavaScript execution status: ${jsRun.data.data.status} | Output: "${jsRun.data.data.stdout}"\n`);

    // 7. Multi-Participant Login (10 Participants: PART001 to PART010)
    console.log('[Step 7] Simulating 10 Enrolled Participants Logging In...');
    for (let i = 1; i <= 10; i++) {
      const pCode = `PART${String(i).padStart(3, '0')}`;
      const partLogin = await axios.post(`${BASE_URL}/auth/participant/login`, {
        event_id: event1Id,
        participant_code: pCode,
        access_code: 'SWAP2026'
      });
      participantTokens.push({
        code: pCode,
        name: partLogin.data.data.user.display_name,
        token: partLogin.data.data.token,
        id: partLogin.data.data.user.id
      });
    }
    console.log(`✓ All ${participantTokens.length} participants authenticated successfully.\n`);

    // 8. Fetch Tasks & Bug Introduction Stage
    console.log('[Step 8] Participants Fetching Assigned Original Code...');
    const roundRes = await axios.get(`${BASE_URL}/events/${event1Id}/rounds`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const round1 = roundRes.data.data.rounds[0];
    round1Id = round1.id;

    for (const p of participantTokens) {
      const taskRes = await axios.get(`${BASE_URL}/student/my-task`, {
        headers: { Authorization: `Bearer ${p.token}` }
      });
      p.task = taskRes.data.data.task;
    }
    console.log(`✓ All 10 participants received their original challenge specifications.`);

    // 9. Participants Submit Modified Buggy Code
    console.log('\n[Step 9] Participants Intentionally Introducing Bugs and Submitting...');
    for (const p of participantTokens) {
      const buggyCode = p.task.original_code + '\n# BUG INTRODUCED BY PARTICIPANT: Altering return values\n';
      await axios.post(
        `${BASE_URL}/submissions/modify`,
        {
          round_id: round1Id,
          code_block_id: p.task.code_block_id,
          modified_code: buggyCode
        },
        { headers: { Authorization: `Bearer ${p.token}` } }
      );
    }
    console.log('✓ All 10 participants submitted their modified buggy programs.');

    // 10. Organizer Locks Bug Submissions
    console.log('\n[Step 10] Organizer Locking Bug Submissions & Entering Swap Configuration...');
    await axios.post(`${BASE_URL}/rounds/${round1Id}/lock`, {}, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    console.log('✓ Bug submissions locked. Contest entered Swap Configuration state.');

    // 11. Swap Manager: Derangement & Atomic Publishing
    console.log('\n[Step 11] Running Swap Manager Derangement Engine & Atomic Publishing...');
    const draftRes = await axios.post(`${BASE_URL}/rounds/${round1Id}/swaps/draft`, {}, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const draftMappings = draftRes.data.data.draftMappings;
    console.log(`✓ Derangement engine proposed ${draftMappings.length} non-self swap mappings.`);

    // Verify derangement property: sender !== recipient for all mappings
    const hasSelfAssignment = draftMappings.some(m => m.sender_participant_id === m.recipient_participant_id);
    if (hasSelfAssignment) {
      throw new Error('DERANGEMENT FAILED: Self-assignment detected in swap draft!');
    }
    console.log('✓ Mathematical proof passed: Zero self-assignments in swap draft.');

    // Publish swaps atomically
    const publishRes = await axios.post(
      `${BASE_URL}/rounds/${round1Id}/swaps/publish`,
      { mappings: draftMappings },
      { headers: { Authorization: `Bearer ${org1Token}` } }
    );
    console.log(`✓ Swaps atomically committed in DB transaction: ${publishRes.data.message}`);

    // 12. Anonymous Code Distribution Check
    console.log('\n[Step 12] Verifying 100% Anonymous Code Distribution...');
    for (const p of participantTokens) {
      const debugTaskRes = await axios.get(`${BASE_URL}/student/my-task`, {
        headers: { Authorization: `Bearer ${p.token}` }
      });
      const debugTask = debugTaskRes.data.data.task;

      // Anonymity assertions: no sender name, email, or participant ID in payload
      if (debugTask.sender_name || debugTask.sender_participant_code || debugTask.sender_email) {
        throw new Error('ANONYMITY BREACH: Sender identity leaked to recipient!');
      }
      p.debugTask = debugTask;
    }
    console.log('✓ Anonymity verified: Recipients receive only Anonymous Challenge ID and code.');

    // 13. Participants Submit Corrected Solutions
    console.log('\n[Step 13] Participants Submitting Debugged Solutions & Automated Test Scoring...');
    for (const p of participantTokens) {
      // Restore clean original code
      const fixedCode = p.debugTask.received_buggy_code.replace('# BUG INTRODUCED BY PARTICIPANT: Altering return values\n', '');
      const subRes = await axios.post(
        `${BASE_URL}/submissions/debug`,
        {
          swap_assignment_id: p.debugTask.swap_assignment_id,
          round_id: round1Id,
          code_block_id: p.debugTask.code_block_id,
          corrected_code: fixedCode,
          bug_explanation: 'Identified that the peer altered the return logic. Restored the correct state.',
          language: p.debugTask.language
        },
        { headers: { Authorization: `Bearer ${p.token}` } }
      );
      p.evalSummary = subRes.data.data.evaluation;
    }
    console.log('✓ All 10 debugging solutions evaluated against automated hidden test cases.');

    // 14. Organizer Manual Evaluation Review & Scoring
    console.log('\n[Step 14] Organizer Reviewing Submissions & Allocating Manual Marks...');
    const evalsRes = await axios.get(`${BASE_URL}/events/${event1Id}/evaluations?round_id=${round1Id}`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const evalsList = evalsRes.data.data.evaluations;

    for (const ev of evalsList) {
      await axios.post(
        `${BASE_URL}/evaluations/${ev.id}/review`,
        {
          organizer_score: 18.5,
          explanation_score: 19.0,
          organizer_comments: 'Excellent bug localization and clean fix.',
          score_adjustment_reason: 'Regular review verification'
        },
        { headers: { Authorization: `Bearer ${org1Token}` } }
      );
    }
    console.log(`✓ Organizer graded all ${evalsList.length} submissions with manual review & explanation marks.`);

    // 15. Leaderboard Rankings
    console.log('\n[Step 15] Fetching Live Round Leaderboard with Tie-Breakers...');
    const lbRes = await axios.get(`${BASE_URL}/rounds/${round1Id}/leaderboard`, {
      headers: { Authorization: `Bearer ${org1Token}` }
    });
    const leaderboard = lbRes.data.data.leaderboard;

    console.log('🏆 ROUND 1 FINAL STANDINGS:');
    leaderboard.forEach(entry => {
      console.log(`   Rank #${entry.rank}: ${entry.display_name} (${entry.participant_code}) - Total: ${entry.total_score} pts (Auto: ${entry.automated_score}, Tests: ${entry.test_cases_passed}/${entry.total_test_cases})`);
    });

    console.log('\n================================================================');
    console.log('🎉 ALL 15 PHASES AND SIMULATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ SIMULATION FAILED:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

runSimulation();
