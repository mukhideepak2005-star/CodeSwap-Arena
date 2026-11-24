const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

/**
 * Validates a complete swap mapping configuration
 */
function validateSwapMappings(mappings, eligibleParticipantIds, submittedParticipantIds) {
  const errors = [];

  if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
    errors.push('No swap mappings provided.');
    return { isValid: false, errors };
  }

  const senders = new Set();
  const recipients = new Set();

  for (const m of mappings) {
    const { sender_participant_id, recipient_participant_id } = m;

    if (!sender_participant_id || !recipient_participant_id) {
      errors.push('Every mapping must specify both sender and recipient.');
      continue;
    }

    // 1. No self-assignment rule
    if (sender_participant_id === recipient_participant_id) {
      errors.push(`Self-assignment detected: Participant cannot receive their own buggy code.`);
    }

    // 2. One outgoing per sender
    if (senders.has(sender_participant_id)) {
      errors.push(`Duplicate sender detected: Participant ${sender_participant_id} mapped more than once.`);
    }
    senders.add(sender_participant_id);

    // 3. One incoming per recipient
    if (recipients.has(recipient_participant_id)) {
      errors.push(`Duplicate recipient detected: Recipient ${recipient_participant_id} receives multiple submissions.`);
    }
    recipients.add(recipient_participant_id);

    // 4. Recipient eligibility
    if (!eligibleParticipantIds.includes(recipient_participant_id)) {
      errors.push(`Recipient ${recipient_participant_id} is not an active participant in this contest.`);
    }

    // 5. Sender must have submitted code
    if (!submittedParticipantIds.includes(sender_participant_id)) {
      errors.push(`Sender ${sender_participant_id} has not submitted any code modification.`);
    }
  }

  // Completeness check
  if (submittedParticipantIds.length > 0 && senders.size !== submittedParticipantIds.length) {
    errors.push(`Incomplete mappings: ${senders.size} mapped out of ${submittedParticipantIds.length} submitted.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper to generate a valid derangement draft (random permutation where derangement[i] !== i)
 * Allows organizer to start with a valid candidate and adjust manually.
 */
function generateDerangementDraft(participantsWithSubmissions) {
  const n = participantsWithSubmissions.length;
  if (n < 2) return [];

  const senders = [...participantsWithSubmissions];
  let recipients = [...participantsWithSubmissions];
  let isValidDerangement = false;
  let attempts = 0;

  while (!isValidDerangement && attempts < 100) {
    attempts++;
    // Shuffle recipients (Fisher-Yates)
    for (let i = recipients.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [recipients[i], recipients[j]] = [recipients[j], recipients[i]];
    }

    // Check if any sender == recipient
    isValidDerangement = senders.every((s, idx) => s.participant_id !== recipients[idx].participant_id);
  }

  // Deterministic cyclic shift if random derangement didn't converge
  if (!isValidDerangement) {
    recipients = senders.map((_, idx) => senders[(idx + 1) % n]);
  }

  return senders.map((s, idx) => ({
    round_id: s.round_id,
    event_id: s.event_id,
    modification_submission_id: s.modification_submission_id,
    sender_participant_id: s.participant_id,
    sender_display_name: s.display_name,
    sender_participant_code: s.participant_code,
    language: s.language,
    challenge_title: s.challenge_title,
    recipient_participant_id: recipients[idx].participant_id,
    recipient_display_name: recipients[idx].display_name,
    recipient_participant_code: recipients[idx].participant_code
  }));
}

/**
 * Atomic publication of swap mappings using database transaction
 */
async function publishSwaps({ roundId, eventId, mappings, organizerId }) {
  const client = await db.getClient();

  try {
    // 1. Delete previous unpublished draft mappings for this round
    await client.query(
      `DELETE FROM swap_assignments WHERE round_id = $1 AND is_published = FALSE`,
      [roundId]
    );

    const now = new Date();

    // 2. Insert new published mappings
    for (const m of mappings) {
      const swapId = uuidv4();
      await client.query(
        `INSERT INTO swap_assignments (id, round_id, event_id, modification_submission_id, sender_participant_id, recipient_participant_id, is_published, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
        [swapId, roundId, eventId, m.modification_submission_id, m.sender_participant_id, m.recipient_participant_id, now]
      );
    }

    // 3. Advance round state to 'debugging' and set debug_start_time
    const roundRes = await client.query(`SELECT debug_duration_minutes FROM rounds WHERE id = $1`, [roundId]);
    const durationMinutes = roundRes.rows[0]?.debug_duration_minutes || 30;

    await client.query(
      `UPDATE rounds 
       SET status = 'debugging', 
           debug_start_time = $1, 
           time_remaining_seconds = $2,
           updated_at = $3
       WHERE id = $4`,
      [now, durationMinutes * 60, now, roundId]
    );

    // 4. Audit log
    await client.query(
      `INSERT INTO audit_logs (id, event_id, actor_id, actor_role, action, details)
       VALUES ($1, $2, $3, 'organizer', 'SWAPS_PUBLISHED', $4)`,
      [
        uuidv4(),
        eventId,
        organizerId,
        JSON.stringify({ roundId, count: mappings.length, timestamp: now })
      ]
    );

    await client.commit();
    return { success: true, count: mappings.length, publishedAt: now };
  } catch (err) {
    await client.rollback();
    throw err;
  }
}

module.exports = {
  validateSwapMappings,
  generateDerangementDraft,
  publishSwaps
};
