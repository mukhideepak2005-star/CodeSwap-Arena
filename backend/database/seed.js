require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('[Seeder] Starting CodeSwap Arena database seeding...');
  await db.initDb();

  // Ensure the schema exists before resetting data (idempotent on fresh DBs)
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);

  // Reset tables to a clean, deterministic baseline so re-running the seed
  // (e.g. after a simulation) always starts from the same state. Deletes are
  // ordered child-first to respect FK constraints.
  console.log('[Seeder] Resetting existing data for a clean seed...');
  await db.query('DELETE FROM evaluation_details');
  await db.query('DELETE FROM evaluations');
  await db.query('DELETE FROM debug_submissions');
  await db.query('DELETE FROM swap_assignments');
  await db.query('DELETE FROM modification_submissions');
  await db.query('DELETE FROM code_assignments');
  await db.query('DELETE FROM test_cases');
  await db.query('DELETE FROM code_blocks');
  await db.query('DELETE FROM organizer_members');
  await db.query('DELETE FROM participants');
  await db.query('DELETE FROM rounds');
  await db.query('DELETE FROM execution_runs');
  await db.query('DELETE FROM audit_logs');
  await db.query('DELETE FROM abuse_reports');
  await db.query('DELETE FROM events');
  await db.query('DELETE FROM organizers');
  await db.query('DELETE FROM platform_admins');
  await db.query('DELETE FROM platform_settings');

  try {
    // 1. Platform Admin
    const adminId = uuidv4();
    const adminPassHash = await bcrypt.hash('Admin@123456', 10);
    await db.query(
      `INSERT INTO platform_admins (id, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'admin', 'admin@codeswaparena.com', adminPassHash]
    );
    console.log('✓ Admin seeded: admin@codeswaparena.com / Admin@123456');

    // 2. Organizers
    const org1Id = uuidv4();
    const org2Id = uuidv4();
    const orgPassHash = await bcrypt.hash('Organizer@123', 10);

    await db.query(
      `INSERT INTO organizers (id, full_name, email, password_hash, bio, organization)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [org1Id, 'Prof. Alex Rivera', 'alex@university.edu', orgPassHash, 'Computer Science Professor & Competitive Programming Coach', 'Metro State University']
    );

    await db.query(
      `INSERT INTO organizers (id, full_name, email, password_hash, bio, organization)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [org2Id, 'Sarah Connor', 'sarah@techclub.org', orgPassHash, 'Lead Hackathon Coordinator', 'Tech Club Global']
    );
    console.log('✓ Organizers seeded: alex@university.edu, sarah@techclub.org / Organizer@123');

    // Fetch actual organizer IDs in case they already existed
    const org1Res = await db.query(`SELECT id FROM organizers WHERE email = $1`, ['alex@university.edu']);
    const actualOrg1Id = org1Res.rows[0].id;
    const org2Res = await db.query(`SELECT id FROM organizers WHERE email = $1`, ['sarah@techclub.org']);
    const actualOrg2Id = org2Res.rows[0].id;

    // 3. Events (Contests)
    const event1Id = uuidv4();
    const event2Id = uuidv4();
    const event3Id = uuidv4();

    const privatePinHash = await bcrypt.hash('889900', 10);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Event 1: Public Live Contest
    await db.query(
      `INSERT INTO events (id, organizer_id, name, description, banner_url, visibility, allowed_languages, max_participants, start_time, end_time, total_rounds, rules, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT DO NOTHING`,
      [
        event1Id,
        actualOrg1Id,
        'Algorithmic Bug Hunt 2026',
        'Receive battle-tested algorithms, introduce clever bugs, swap anonymously, and debug your opponent’s code to climb the arena leaderboard!',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
        'public',
        ['python', 'javascript', 'cpp', 'java', 'c'],
        50,
        now,
        nextWeek,
        2,
        '1. Maintain core function signatures.\n2. Do not delete entire files; introduce subtle logical or boundary bugs.\n3. Automated tests evaluate correctness after swap.',
        'live'
      ]
    );

    // Event 2: Private Upcoming Contest with PIN
    await db.query(
      `INSERT INTO events (id, organizer_id, name, description, banner_url, visibility, pin_hash, allowed_languages, max_participants, start_time, end_time, total_rounds, rules, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT DO NOTHING`,
      [
        event2Id,
        actualOrg1Id,
        'Elite Systems Debugging Derby',
        'Exclusive invitational debugging tournament for advanced systems developers. PIN required for entry.',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
        'private',
        privatePinHash,
        ['cpp', 'c', 'java'],
        20,
        tomorrow,
        nextWeek,
        1,
        'Private tournament rules apply. No external AI assistance.',
        'upcoming'
      ]
    );

    // Event 3: Organizer 2's Public Contest
    await db.query(
      `INSERT INTO events (id, organizer_id, name, description, banner_url, visibility, allowed_languages, max_participants, start_time, end_time, total_rounds, rules, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT DO NOTHING`,
      [
        event3Id,
        actualOrg2Id,
        'Web Stack CodeSwap Battle',
        'Fast-paced JavaScript & Python debugging showdown. Test your bug-spotting reflexes!',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
        'public',
        ['javascript', 'python'],
        40,
        now,
        tomorrow,
        1,
        'JavaScript ES6+ and Python 3. Standard library only.',
        'live'
      ]
    );
    console.log('✓ Sample events seeded (Public Live, Private with PIN 889900, Organizer 2 Contest)');

    // 4. Co-Organizer Member
    await db.query(
      `INSERT INTO organizer_members (id, event_id, organizer_id, invited_email, permissions, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        uuidv4(),
        event1Id,
        actualOrg2Id,
        'sarah@techclub.org',
        JSON.stringify({
          view_contest: true,
          manage_participants: true,
          manage_code_blocks: true,
          manage_rounds: false,
          configure_assignments: true,
          configure_swaps: true,
          view_submissions: true,
          evaluate_submissions: true,
          manage_leaderboard: true,
          publish_results: false
        }),
        'accepted'
      ]
    );
    console.log('✓ Co-organizer membership seeded (Sarah invited to Algorithmic Bug Hunt)');

    // 5. Code Challenges (5 Languages)
    const challenges = [
      {
        title: 'Python: Two Sum Target Finder',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. Output space-separated indices sorted in ascending order.',
        language: 'python',
        difficulty: 'easy',
        original_code: `import sys

def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return sorted([lookup[complement], i])
        lookup[num] = i
    return []

if __name__ == "__main__":
    lines = sys.stdin.read().strip().splitlines()
    if not lines:
        sys.exit(0)
    nums = list(map(int, lines[0].strip().replace(',', ' ').split()))
    target = int(lines[1].strip())
    result = two_sum(nums, target)
    print(f"{result[0]} {result[1]}")
`,
        input_format: 'Line 1: Space or comma-separated integers\nLine 2: Target integer',
        expected_output: 'Indices of the two numbers separated by a space',
        tests: [
          { is_hidden: false, input: '2 7 11 15\n9', expected: '0 1', marks: 10 },
          { is_hidden: true, input: '3 2 4\n6', expected: '1 2', marks: 25 },
          { is_hidden: true, input: '3 3\n6', expected: '0 1', marks: 25 }
        ]
      },
      {
        title: 'JavaScript: Bracket Sequence Validator',
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. Open brackets must be closed by the same type of brackets in the correct order. Print `true` or `false`.',
        language: 'javascript',
        difficulty: 'easy',
        original_code: `const fs = require('fs');

function isValid(s) {
    const stack = [];
    const map = {
        ')': '(',
        '}': '{',
        ']': '['
    };

    for (let char of s.trim()) {
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else if (map[char]) {
            if (stack.length === 0 || stack.pop() !== map[char]) {
                return false;
            }
        }
    }
    return stack.length === 0;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isValid(input) ? 'true' : 'false');
`,
        input_format: 'Single line with string of brackets',
        expected_output: 'true or false',
        tests: [
          { is_hidden: false, input: '()[]{}', expected: 'true', marks: 10 },
          { is_hidden: true, input: '([)]', expected: 'false', marks: 25 },
          { is_hidden: true, input: '{[]}', expected: 'true', marks: 25 }
        ]
      },
      {
        title: 'C++: Maximum Subarray Sum (Kadane)',
        description: 'Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and print its sum.',
        language: 'cpp',
        difficulty: 'medium',
        original_code: `#include <iostream>
#include <vector>
#include <algorithm>
#include <climits>

using namespace std;

int maxSubArray(const vector<int>& nums) {
    int max_so_far = nums[0];
    int curr_max = nums[0];

    for (size_t i = 1; i < nums.size(); i++) {
        curr_max = max(nums[i], curr_max + nums[i]);
        max_so_far = max(max_so_far, curr_max);
    }
    return max_so_far;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    cout << maxSubArray(nums) << endl;
    return 0;
}
`,
        input_format: 'Line 1: N (number of elements)\nLine 2: N space-separated integers',
        expected_output: 'Maximum contiguous subarray sum',
        tests: [
          { is_hidden: false, input: '9\n-2 1 -3 4 -1 2 1 -5 4', expected: '6', marks: 10 },
          { is_hidden: true, input: '5\n5 4 -1 7 8', expected: '23', marks: 25 },
          { is_hidden: true, input: '3\n-5 -2 -9', expected: '-2', marks: 25 }
        ]
      },
      {
        title: 'Java: Palindrome Number Checker',
        description: 'Given an integer `x`, print `true` if `x` is a palindrome, and `false` otherwise. An integer is a palindrome when it reads the same forward and backward.',
        language: 'java',
        difficulty: 'easy',
        original_code: `import java.util.Scanner;

public class Solution {
    public static boolean isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) {
            return false;
        }

        int revertedNumber = 0;
        while (x > revertedNumber) {
            revertedNumber = revertedNumber * 10 + x % 10;
            x /= 10;
        }

        return x == revertedNumber || x == revertedNumber / 10;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int x = scanner.nextInt();
            System.out.println(isPalindrome(x) ? "true" : "false");
        }
        scanner.close();
    }
}
`,
        input_format: 'Single integer x',
        expected_output: 'true or false',
        tests: [
          { is_hidden: false, input: '121', expected: 'true', marks: 10 },
          { is_hidden: true, input: '-121', expected: 'false', marks: 25 },
          { is_hidden: true, input: '10', expected: 'false', marks: 25 }
        ]
      },
      {
        title: 'C: Prime Number Factor Count',
        description: 'Given a positive integer N, determine the count of unique prime factors of N.',
        language: 'c',
        difficulty: 'medium',
        original_code: `#include <stdio.h>

int countUniquePrimeFactors(long long n) {
    int count = 0;
    if (n % 2 == 0) {
        count++;
        while (n % 2 == 0) n /= 2;
    }
    for (long long i = 3; i * i <= n; i += 2) {
        if (n % i == 0) {
            count++;
            while (n % i == 0) n /= i;
        }
    }
    if (n > 2) {
        count++;
    }
    return count;
}

int main() {
    long long n;
    if (scanf("%lld", &n) == 1) {
        printf("%d\\n", countUniquePrimeFactors(n));
    }
    return 0;
}
`,
        input_format: 'Single integer N',
        expected_output: 'Count of unique prime factors',
        tests: [
          { is_hidden: false, input: '60', expected: '3', marks: 10 },
          { is_hidden: true, input: '13', expected: '1', marks: 25 },
          { is_hidden: true, input: '315', expected: '3', marks: 25 }
        ]
      }
    ];

    const seededBlockIds = [];
    for (const ch of challenges) {
      const blockId = uuidv4();
      seededBlockIds.push({ id: blockId, lang: ch.language });
      await db.query(
        `INSERT INTO code_blocks (id, event_id, organizer_id, title, description, language, difficulty, original_code, input_format, expected_output)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [blockId, event1Id, actualOrg1Id, ch.title, ch.description, ch.language, ch.difficulty, ch.original_code, ch.input_format, ch.expected_output]
      );

      for (const t of ch.tests) {
        await db.query(
          `INSERT INTO test_cases (id, code_block_id, is_hidden, input_data, expected_output, marks)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), blockId, t.is_hidden, t.input, t.expected, t.marks]
        );
      }
    }
    console.log(`✓ Seeded ${challenges.length} code challenges across all 5 languages with public and hidden test cases`);

    // 6. Participants for Event 1 (10 simulated participants)
    const accessCodePlain = 'SWAP2026';
    const accessCodeHash = await bcrypt.hash(accessCodePlain, 10);
    const participantIds = [];

    const participantNames = [
      'Alex Mercer', 'Bianca Vance', 'Charlie Zhao', 'Daria Vance', 'Ethan Hunt',
      'Farah Khan', 'Gabriel Roy', 'Hanna Abbott', 'Ian Malcolm', 'Julia Roberts'
    ];

    for (let i = 0; i < participantNames.length; i++) {
      const pId = uuidv4();
      const pCode = `PART${String(i + 1).padStart(3, '0')}`;
      participantIds.push({ id: pId, code: pCode, name: participantNames[i] });

      await db.query(
        `INSERT INTO participants (id, event_id, participant_code, display_name, email, access_code_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pId, event1Id, pCode, participantNames[i], `student${i + 1}@arena.local`, accessCodeHash]
      );
    }
    console.log(`✓ Seeded 10 participants (PART001 to PART010, Access Code: ${accessCodePlain})`);

    // 7. Seed Round 1 for Event 1
    const round1Id = uuidv4();
    await db.query(
      `INSERT INTO rounds (id, event_id, round_number, round_name, description, bug_intro_duration_minutes, debug_duration_minutes, status, time_remaining_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [round1Id, event1Id, 1, 'Round 1: Core Logic & Edge Cases', 'Introduce bugs in your assigned code challenge, then debug your peer’s code!', 20, 30, 'bug_introduction', 1200]
    );

    // Assign challenges to participants for Round 1
    for (let i = 0; i < participantIds.length; i++) {
      const assignedBlock = seededBlockIds[i % seededBlockIds.length];
      await db.query(
        `INSERT INTO code_assignments (id, round_id, participant_id, code_block_id)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), round1Id, participantIds[i].id, assignedBlock.id]
      );
    }
    console.log('✓ Round 1 created and code challenges assigned to all 10 participants');

    // 8. Platform Settings
    await db.query(
      `INSERT INTO platform_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['general', JSON.stringify({
        platform_name: 'CodeSwap Arena',
        tagline: 'Create. Swap. Debug. Win.',
        allow_registrations: true,
        max_contests_per_organizer: 20,
        default_execution_engine: 'judge0',
        maintenance_mode: false
      })]
    );
    console.log('✓ Platform settings initialized');

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Platform Admin:  admin@codeswaparena.com / Admin@123456');
    console.log('Organizer 1:     alex@university.edu / Organizer@123');
    console.log('Organizer 2:     sarah@techclub.org / Organizer@123');
    console.log('Student Login:   Participant Code: PART001 | Access Code: SWAP2026');
    console.log('Private Contest: PIN: 889900');
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('[Seeder Error]:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
