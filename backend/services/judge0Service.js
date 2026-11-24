const axios = require('axios');
const config = require('../config/config');
const { runInSandbox } = require('./sandboxRunner');

// Default Judge0 language mapping fallback
const DEFAULT_LANGUAGE_MAP = {
  python: 71,      // Python (3.8.1)
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  cpp: 54,         // C++ (GCC 9.2.0)
  c: 50,           // C (GCC 9.2.0)
  java: 62         // Java (OpenJDK 13.0.1)
};

let cachedLanguageMap = null;

// Fetch dynamic language IDs from configured Judge0 instance
async function getLanguageId(language) {
  const normLang = language.toLowerCase();

  if (cachedLanguageMap && cachedLanguageMap[normLang]) {
    return cachedLanguageMap[normLang];
  }

  // If Judge0 API key is set, try fetching languages
  if (config.judge0.apiKey) {
    try {
      const response = await axios.get(`${config.judge0.apiUrl}/languages`, {
        headers: {
          'x-rapidapi-key': config.judge0.apiKey,
          'x-rapidapi-host': config.judge0.apiHost
        },
        timeout: 4000
      });

      if (Array.isArray(response.data)) {
        cachedLanguageMap = {};
        for (const item of response.data) {
          const name = item.name.toLowerCase();
          if (name.includes('python (3') && !cachedLanguageMap.python) cachedLanguageMap.python = item.id;
          if (name.includes('javascript') && !cachedLanguageMap.javascript) cachedLanguageMap.javascript = item.id;
          if (name.includes('c++ (gcc') && !cachedLanguageMap.cpp) cachedLanguageMap.cpp = item.id;
          if (name.includes('c (gcc') && !cachedLanguageMap.c) cachedLanguageMap.c = item.id;
          if (name.includes('java (openjdk') && !cachedLanguageMap.java) cachedLanguageMap.java = item.id;
        }
        if (cachedLanguageMap[normLang]) return cachedLanguageMap[normLang];
      }
    } catch (err) {
      console.warn('[Judge0] Unable to fetch remote language IDs, using standard mapping.');
    }
  }

  return DEFAULT_LANGUAGE_MAP[normLang] || 71;
}

/**
 * Execute code with Judge0, with automatic fallback to isolated sandbox
 */
async function executeCode({ language, sourceCode, stdin = '', timeLimitMs = 2000, memoryLimitKb = 128000 }) {
  // If Judge0 is configured with API key or self-hosted endpoint
  if (config.judge0.apiKey && config.judge0.apiUrl) {
    try {
      const langId = await getLanguageId(language);
      const submitResponse = await axios.post(
        `${config.judge0.apiUrl}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: sourceCode,
          language_id: langId,
          stdin: stdin || '',
          cpu_time_limit: Math.max(1, Math.round(timeLimitMs / 1000)),
          memory_limit: memoryLimitKb
        },
        {
          headers: {
            'content-type': 'application/json',
            'x-rapidapi-key': config.judge0.apiKey,
            'x-rapidapi-host': config.judge0.apiHost
          },
          timeout: timeLimitMs + 5000
        }
      );

      const data = submitResponse.data;
      return {
        status: data.status ? data.status.description : 'Unknown',
        stdout: (data.stdout || '').trim(),
        stderr: (data.stderr || '').trim(),
        compile_output: (data.compile_output || '').trim(),
        execution_time_ms: data.time ? Math.round(parseFloat(data.time) * 1000) : 0,
        memory_kb: data.memory || 0,
        judge_used: 'judge0'
      };
    } catch (err) {
      console.warn('[Judge0] API execution request failed, falling back to local sandbox runner:', err.message);
    }
  }

  // Fallback to local isolated sandbox runner
  const sandboxResult = await runInSandbox({ language, sourceCode, stdin, timeLimitMs });
  return {
    ...sandboxResult,
    judge_used: 'sandbox_fallback'
  };
}

module.exports = {
  executeCode,
  getLanguageId
};
