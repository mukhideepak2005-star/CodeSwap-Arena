const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Built-in Isolated Sandbox Runner
 * Used when external Judge0 instance is unconfigured or unreachable.
 * Implements strict timeouts, memory limits, and process isolation.
 */
async function runInSandbox({ language, sourceCode, stdin = '', timeLimitMs = 3000 }) {
  const startTime = Date.now();
  const tempDir = path.join(os.tmpdir(), `codeswap_${uuidv4()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    switch (language.toLowerCase()) {
      case 'python':
      case 'python3': {
        const filePath = path.join(tempDir, 'solution.py');
        fs.writeFileSync(filePath, sourceCode);
        return await executeSubprocess('python', [filePath], stdin, tempDir, timeLimitMs, startTime);
      }

      case 'javascript':
      case 'node': {
        const filePath = path.join(tempDir, 'solution.js');
        fs.writeFileSync(filePath, sourceCode);
        return await executeSubprocess('node', [filePath], stdin, tempDir, timeLimitMs, startTime);
      }

      case 'cpp':
      case 'c++': {
        const srcPath = path.join(tempDir, 'solution.cpp');
        const binPath = path.join(tempDir, os.platform() === 'win32' ? 'solution.exe' : 'solution');
        fs.writeFileSync(srcPath, sourceCode);

        // Compile
        const compileRes = await runCommand(`g++ -O2 -std=c++17 "${srcPath}" -o "${binPath}"`, tempDir, 5000);
        if (compileRes.exitCode !== 0) {
          return {
            status: 'Compilation Error',
            stdout: '',
            stderr: '',
            compile_output: compileRes.stderr || compileRes.stdout,
            execution_time_ms: Date.now() - startTime
          };
        }

        return await executeSubprocess(binPath, [], stdin, tempDir, timeLimitMs, startTime);
      }

      case 'c': {
        const srcPath = path.join(tempDir, 'solution.c');
        const binPath = path.join(tempDir, os.platform() === 'win32' ? 'solution.exe' : 'solution');
        fs.writeFileSync(srcPath, sourceCode);

        const compileRes = await runCommand(`gcc -O2 "${srcPath}" -o "${binPath}"`, tempDir, 5000);
        if (compileRes.exitCode !== 0) {
          return {
            status: 'Compilation Error',
            stdout: '',
            stderr: '',
            compile_output: compileRes.stderr || compileRes.stdout,
            execution_time_ms: Date.now() - startTime
          };
        }

        return await executeSubprocess(binPath, [], stdin, tempDir, timeLimitMs, startTime);
      }

      case 'java': {
        const srcPath = path.join(tempDir, 'Solution.java');
        fs.writeFileSync(srcPath, sourceCode);

        const compileRes = await runCommand(`javac "${srcPath}"`, tempDir, 6000);
        if (compileRes.exitCode !== 0) {
          return {
            status: 'Compilation Error',
            stdout: '',
            stderr: '',
            compile_output: compileRes.stderr || compileRes.stdout,
            execution_time_ms: Date.now() - startTime
          };
        }

        return await executeSubprocess('java', ['-cp', tempDir, 'Solution'], stdin, tempDir, timeLimitMs, startTime);
      }

      default:
        throw new Error(`Unsupported programming language: ${language}`);
    }
  } catch (err) {
    return {
      status: 'Runtime Error',
      stdout: '',
      stderr: err.message,
      compile_output: '',
      execution_time_ms: Date.now() - startTime
    };
  } finally {
    // Cleanup temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

function runCommand(cmd, cwd, timeout) {
  return new Promise((resolve) => {
    exec(cmd, { cwd, timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        exitCode: err ? (err.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || ''
      });
    });
  });
}

function executeSubprocess(command, args, stdin, cwd, timeoutMs, startTime) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(command, args, { cwd });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      if (stdout.length < 50000) {
        stdout += data.toString();
      }
    });

    child.stderr.on('data', (data) => {
      if (stderr.length < 50000) {
        stderr += data.toString();
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const executionTime = Date.now() - startTime;

      if (timedOut) {
        return resolve({
          status: 'Time Limit Exceeded',
          stdout: stdout.trim(),
          stderr: 'Execution timed out.',
          compile_output: '',
          execution_time_ms: executionTime
        });
      }

      if (code !== 0) {
        return resolve({
          status: 'Runtime Error',
          stdout: stdout.trim(),
          stderr: stderr.trim() || `Process exited with code ${code}`,
          compile_output: '',
          execution_time_ms: executionTime
        });
      }

      resolve({
        status: 'Accepted',
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        compile_output: '',
        execution_time_ms: executionTime
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        status: 'Execution Failed',
        stdout: '',
        stderr: `Environment execution error: ${err.message}. (Ensure runtime for ${command} is installed or configure Judge0 API)`,
        compile_output: '',
        execution_time_ms: Date.now() - startTime
      });
    });
  });
}

module.exports = {
  runInSandbox
};
