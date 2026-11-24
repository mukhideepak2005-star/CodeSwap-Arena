const camera = document.getElementById("camera");
const overlayCanvas = document.getElementById("overlay");
const overlayCtx = overlayCanvas ? overlayCanvas.getContext("2d") : null;
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const toggleBoxesBtn = document.getElementById("toggle-boxes-btn");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const micStatusEl = document.getElementById("mic-status");
const eyeContactEl = document.getElementById("eye-contact");
const postureEl = document.getElementById("posture");
const gesturesEl = document.getElementById("gestures");
const movementEl = document.getElementById("movement");
// const peopleCountEl = document.getElementById("people-count"); // Removed
const toneEl = document.getElementById("tone-modulation");
const confidenceLevelEl = document.getElementById("confidence-level");
const sessionGoalEl = document.getElementById("session-goal");
const liveFeedbackScoreEl = document.getElementById("live-feedback-score");
const liveFeedbackTextEl = document.getElementById("live-feedback-text");
const transcriptEl = document.getElementById("transcript");
const wordCountEl = document.getElementById("word-count");
const transcriptHistoryEl = document.getElementById("transcript-history");
const transcriptHistoryEmptyEl = document.getElementById("transcript-history-empty");
const clearTranscriptHistoryBtn = document.getElementById("clear-transcript-history");
const lastAnalysisEl = document.getElementById("last-analysis");
const resumeQuestionEl = document.getElementById("live-resume-question");
const resumeQuestionStatusEl = document.getElementById("resume-question-status");
const resumeRoleLabelEl = document.getElementById("resume-role-label");
const nextResumeQuestionBtn = document.getElementById("next-resume-question");
const liveTtsToggle = document.getElementById("live-tts-toggle");
const heatmapEl = document.getElementById("confidence-heatmap");
const heatmapLabelEl = document.getElementById("confidence-heatmap-label");

let recognition = null;
let running = false;
let startTime = 0;
let wordCount = 0;
let fillerCount = 0;
const fillers = new Set(["um", "uh", "like", "so", "actually"]);
let lastSentAt = 0;
let lastPose = null;
let lastLeftWrist = null;
let lastRightWrist = null;
let gestureScore = 0;
let movementScore = 0;
let mpCamera = null;
let bodyTrackingReady = false;
let lastHandSeenAt = 0;
let peopleDetectTimer = null;
let showBoxes = true;
let liveTranscript = "";
let pendingInterimText = "";
let interimWordCount = 0;
let interimFillerCount = 0;
let transcriptFinalEl = null;
let transcriptInterimEl = null;
let transcriptNeedsRender = false;
let resumeQuestions = [];
let resumeQuestionIndex = -1;
let heatmapTimer = null;
let confidenceSeries = [];
const detectCanvas = document.createElement("canvas");
const detectCtx = detectCanvas.getContext("2d");
const latestScores = {
    eye: null,
    posture: null,
    gestures: null,
    movement: null,
    wpm: null,
    fillerCount: null,
    tone: null,
    confidence: null
};
const RESUME_API_URL = "http://127.0.0.1:8000/resume-questions";
const HEATMAP_MAX_POINTS = 20;
const TRANSCRIPT_HISTORY_KEY = "hii_transcript_history";
const MAX_TRANSCRIPT_HISTORY = 12;
const defaultResumeQuestions = [
    "Walk me through your resume.",
    "What project are you most proud of and why?",
    "Tell me about a time you faced a challenge and how you handled it.",
    "How do you prioritize tasks when deadlines are tight?",
    "What are you looking for in your next role?",
    "What questions do you have for me?"
];

function loadTranscriptHistory() {
    try {
        const raw = localStorage.getItem(TRANSCRIPT_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function saveTranscriptHistory(entries) {
    localStorage.setItem(TRANSCRIPT_HISTORY_KEY, JSON.stringify(entries));
}

function renderTranscriptHistory() {
    if (!transcriptHistoryEl) return;
    const entries = loadTranscriptHistory();
    if (!entries.length) {
        transcriptHistoryEl.innerHTML = "";
        if (transcriptHistoryEmptyEl) transcriptHistoryEmptyEl.style.display = "block";
        return;
    }

    if (transcriptHistoryEmptyEl) transcriptHistoryEmptyEl.style.display = "none";
    transcriptHistoryEl.innerHTML = entries.map((entry) => {
        const time = entry?.timestamp
            ? new Date(entry.timestamp).toLocaleString()
            : "Saved session";
        const words = Number.isFinite(entry?.words) ? `${entry.words} words` : "Words: N/A";
        const text = entry?.text || "";
        return `
            <div class="transcript-entry">
                <h5>${time} · ${words}</h5>
                <p>${text}</p>
            </div>
        `;
    }).join("");
}

function addTranscriptToHistory(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    const words = trimmed.match(/\S+/g)?.length || 0;
    const entry = {
        timestamp: new Date().toISOString(),
        words,
        text: trimmed
    };

    const entries = loadTranscriptHistory();
    entries.unshift(entry);
    const limited = entries.slice(0, MAX_TRANSCRIPT_HISTORY);
    saveTranscriptHistory(limited);
    renderTranscriptHistory();
}

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    camera.srcObject = stream;
    camera.addEventListener("loadedmetadata", () => {
        resizeOverlay();
    }, { once: true });
    return stream;
}

function updateTimer() {
    if (!running) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    timerEl.textContent = `${mm}:${ss}`;
    requestAnimationFrame(updateTimer);
}

function updateMetrics() {
    const elapsedMin = Math.max((Date.now() - startTime) / 60000, 0.01);
    const liveWordCount = wordCount + interimWordCount;
    const wpm = Math.round(liveWordCount / elapsedMin);
    latestScores.wpm = liveWordCount > 0 ? wpm : null;
    if (Number.isFinite(wpm) && wpm > 0) {
        statusEl.textContent = `Speaking... ${wpm} WPM`;
    }
    maybeUpdateToneConfidenceFallback();
    updateLiveFeedback();
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function average(values) {
    const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
    if (!nums.length) return null;
    return nums.reduce((acc, val) => acc + val, 0) / nums.length;
}

function labelFromScore(score) {
    if (score >= 80) return "Great";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs work";
}

function updateToneConfidenceUI(toneScore, confidenceScore) {
    if (toneEl && typeof toneScore === "number" && Number.isFinite(toneScore)) {
        toneEl.textContent = `${labelFromScore(toneScore)} (${Math.round(toneScore)}%)`;
        latestScores.tone = toneScore;
    }
    if (confidenceLevelEl && typeof confidenceScore === "number" && Number.isFinite(confidenceScore)) {
        confidenceLevelEl.textContent = `${labelFromScore(confidenceScore)} (${Math.round(confidenceScore)}%)`;
        latestScores.confidence = confidenceScore;
    }
    if (typeof confidenceScore === "number" && Number.isFinite(confidenceScore)) {
        updateConfidenceHeatmap(confidenceScore);
    }
}

function maybeUpdateToneConfidenceFallback() {
    if (latestScores.tone !== null && latestScores.confidence !== null) return;
    if (wordCount === 0) return;

    const wpm = Number.isFinite(latestScores.wpm) ? latestScores.wpm : 140;
    const fillers = Number.isFinite(latestScores.fillerCount) ? latestScores.fillerCount : 0;

    const toneScore = clamp(85 - fillers * 7, 0, 100);
    const confidenceScore = clamp(100 - Math.abs(wpm - 140) * 0.7 - fillers * 3, 0, 100);

    if (latestScores.tone === null) {
        updateToneConfidenceUI(toneScore, null);
    }
    if (latestScores.confidence === null) {
        updateToneConfidenceUI(null, confidenceScore);
    }
}

async function initBodyTracking() {
    if (bodyTrackingReady) return;
    if (!window.FaceMesh || !window.Pose || !window.Hands || !window.Camera) {
        statusEl.textContent = "Body tracking not supported in this browser.";
        return;
    }

    const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onFaceResults);

    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    pose.onResults(onPoseResults);

    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    hands.onResults(onHandsResults);

    mpCamera = new Camera(camera, {
        onFrame: async () => {
            await faceMesh.send({ image: camera });
            await pose.send({ image: camera });
            await hands.send({ image: camera });
        },
        width: 640,
        height: 480
    });
    mpCamera.start();
    bodyTrackingReady = true;
}

function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
    const lm = results.multiFaceLandmarks[0];
    const leftCorner = lm[33];
    const rightCorner = lm[133];
    const leftIris = lm[468];
    const rightEyeCorner = lm[362];
    const leftEyeCorner = lm[263];
    const rightIris = lm[473];

    const leftCenterX = (leftCorner.x + rightCorner.x) / 2;
    const rightCenterX = (rightEyeCorner.x + leftEyeCorner.x) / 2;
    const leftWidth = Math.abs(rightCorner.x - leftCorner.x);
    const rightWidth = Math.abs(leftEyeCorner.x - rightEyeCorner.x);

    const leftOffset = leftWidth ? (leftIris.x - leftCenterX) / leftWidth : 0;
    const rightOffset = rightWidth ? (rightIris.x - rightCenterX) / rightWidth : 0;
    const offset = (Math.abs(leftOffset) + Math.abs(rightOffset)) / 2;

    const score = clamp(100 - offset * 250, 0, 100);
    latestScores.eye = score;
    eyeContactEl.textContent = `${Math.round(score)}%`;
    updateCoachingFromScores(score, null, null, null);
}

function onPoseResults(results) {
    if (!results.poseLandmarks) return;
    const lm = results.poseLandmarks;
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftHip = lm[23];
    const rightHip = lm[24];
    const nose = lm[0];

    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipCenterX = (leftHip.x + rightHip.x) / 2;
    const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
    const offset = Math.abs(shoulderCenterX - hipCenterX);

    const postureScore = clamp(100 - (offset * 220 + shoulderSlope * 200), 0, 100);
    latestScores.posture = postureScore;
    postureEl.textContent = `${labelFromScore(postureScore)} (${Math.round(postureScore)}%)`;

    checkAndCapturePosture(postureScore);

    if (lastPose) {
        const dx = nose.x - lastPose.x;
        const dy = nose.y - lastPose.y;
        const motion = Math.sqrt(dx * dx + dy * dy);
        movementScore = movementScore * 0.85 + motion * 500;
        const moveScore = clamp(100 - movementScore, 0, 100);
        latestScores.movement = moveScore;
        movementEl.textContent = `${labelFromScore(moveScore)} (${Math.round(moveScore)}%)`;
        updateCoachingFromScores(null, postureScore, null, moveScore);
    }
    lastPose = { x: nose.x, y: nose.y };
}

let lastCaptureTime = 0;
const CAPTURE_COOLDOWN = 5000; // 5 seconds

function checkAndCapturePosture(score) {
    const now = Date.now();
    if (now - lastCaptureTime < CAPTURE_COOLDOWN) return;

    let status = null;
    if (score < 50) status = "incorrect";
    else if (score > 80) status = "correct";

    if (status) {
        lastCaptureTime = now;
        captureAndSendPosture(status, score);
    }
}

function captureAndSendPosture(status, score) {
    try {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = camera.videoWidth;
        offscreenCanvas.height = camera.videoHeight;
        const ctx = offscreenCanvas.getContext('2d');

        ctx.translate(offscreenCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(camera, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.8);

        fetch("http://127.0.0.1:8000/capture-posture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image: dataUrl,
                status: status,
                score: score
            })
        }).catch(err => console.error("Posture capture failed:", err));
    } catch (e) {
        console.error("Error capturing posture:", e);
    }
}

function onHandsResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        const now = Date.now();
        if (now - lastHandSeenAt > 1500) {
            gesturesEl.textContent = "No hands detected";
        }
        return;
    }
    lastHandSeenAt = Date.now();
    let delta = 0;
    let activeHands = 0;

    const leftHand = results.multiHandLandmarks[0]?.[0];
    const rightHand = results.multiHandLandmarks[1]?.[0];

    if (leftHand) {
        activeHands += 1;
        if (lastLeftWrist) {
            const dx = leftHand.x - lastLeftWrist.x;
            const dy = leftHand.y - lastLeftWrist.y;
            delta += Math.sqrt(dx * dx + dy * dy);
        }
        lastLeftWrist = { x: leftHand.x, y: leftHand.y };
    }

    if (rightHand) {
        activeHands += 1;
        if (lastRightWrist) {
            const dx = rightHand.x - lastRightWrist.x;
            const dy = rightHand.y - lastRightWrist.y;
            delta += Math.sqrt(dx * dx + dy * dy);
        }
        lastRightWrist = { x: rightHand.x, y: rightHand.y };
    }

    if (activeHands > 1) {
        delta = delta / activeHands;
    }

    gestureScore = gestureScore * 0.85 + delta * 600;
    const gestureLevel = clamp(gestureScore, 0, 100);
    latestScores.gestures = gestureLevel;
    gesturesEl.textContent = `${labelFromScore(gestureLevel)} (${Math.round(gestureLevel)}%)`;
    updateCoachingFromScores(null, null, gestureLevel, null);
}

function deriveSpeechScore() {
    const toneConfidence = average([latestScores.tone, latestScores.confidence]);
    if (toneConfidence !== null) return toneConfidence;

    if (latestScores.wpm === null && latestScores.fillerCount === null) return null;
    let score = 90;
    if (typeof latestScores.wpm === "number" && Number.isFinite(latestScores.wpm)) {
        if (latestScores.wpm > 170) {
            score -= Math.min((latestScores.wpm - 170) * 0.6, 20);
        } else if (latestScores.wpm < 110) {
            score -= Math.min((110 - latestScores.wpm) * 0.6, 20);
        }
    }
    if (typeof latestScores.fillerCount === "number" && Number.isFinite(latestScores.fillerCount)) {
        score -= Math.min(latestScores.fillerCount * 4, 30);
    }
    return clamp(score, 0, 100);
}

function updateLiveFeedback() {
    if (!liveFeedbackScoreEl && !liveFeedbackTextEl) return;

    const bodyAvg = average([
        latestScores.eye,
        latestScores.posture,
        latestScores.gestures,
        latestScores.movement
    ]);
    const speechAvg = deriveSpeechScore();

    let combined = null;
    if (bodyAvg !== null && speechAvg !== null) {
        combined = bodyAvg * 0.55 + speechAvg * 0.45;
    } else {
        combined = bodyAvg ?? speechAvg;
    }

    if (liveFeedbackScoreEl) {
        liveFeedbackScoreEl.textContent = combined !== null ? `${Math.round(combined)}%` : "--";
    }

    const issues = [];
    if (latestScores.eye !== null && latestScores.eye < 60) {
        issues.push({ score: latestScores.eye, msg: "Look toward the camera more often." });
    }
    if (latestScores.posture !== null && latestScores.posture < 60) {
        issues.push({ score: latestScores.posture, msg: "Sit up straighter and square your shoulders." });
    }
    if (latestScores.gestures !== null && latestScores.gestures < 60) {
        issues.push({ score: latestScores.gestures, msg: "Use a few more natural hand gestures." });
    }
    if (latestScores.movement !== null && latestScores.movement < 60) {
        issues.push({ score: latestScores.movement, msg: "Reduce fidgeting; keep movements steady." });
    }
    if (typeof latestScores.fillerCount === "number" && latestScores.fillerCount > 5) {
        issues.push({
            score: 100 - Math.min(latestScores.fillerCount * 8, 60),
            msg: "Pause instead of filler words."
        });
    }
    if (typeof latestScores.wpm === "number" && Number.isFinite(latestScores.wpm)) {
        if (latestScores.wpm > 170) {
            issues.push({ score: 55, msg: "Slow down slightly for clarity." });
        } else if (latestScores.wpm < 110) {
            issues.push({ score: 55, msg: "Pick up the pace a bit." });
        }
    }
    if (typeof latestScores.tone === "number" && latestScores.tone < 60) {
        issues.push({ score: latestScores.tone, msg: "Vary your tone to keep energy up." });
    }
    if (typeof latestScores.confidence === "number" && latestScores.confidence < 60) {
        issues.push({ score: latestScores.confidence, msg: "Project confidence with steady volume." });
    }

    let message = "Waiting for input...";
    if (issues.length) {
        issues.sort((a, b) => a.score - b.score);
        message = issues[0].msg;
    } else if (combined !== null) {
        if (combined >= 80) {
            message = "Strong presence. Keep it steady.";
        } else if (combined >= 65) {
            message = "Solid overall - tighten one area.";
        } else {
            message = "Focus on one improvement at a time.";
        }
    }

    if (liveFeedbackTextEl) liveFeedbackTextEl.textContent = message;
}

function updateConfidenceHeatmap(score) {
    if (!heatmapEl) return;
    if (!Number.isFinite(score)) return;

    confidenceSeries.push(Math.max(0, Math.min(score, 100)));
    if (confidenceSeries.length > HEATMAP_MAX_POINTS) {
        confidenceSeries = confidenceSeries.slice(-HEATMAP_MAX_POINTS);
    }

    const cells = [];
    for (let i = 0; i < HEATMAP_MAX_POINTS; i++) {
        const value = confidenceSeries[i];
        const hue = value === undefined ? 220 : Math.round((value / 100) * 120);
        const color = value === undefined
            ? "rgba(36, 48, 71, 0.7)"
            : `hsl(${hue}, 70%, 52%)`;
        cells.push(`<span style="background:${color};"></span>`);
    }
    heatmapEl.innerHTML = cells.join("");

    if (heatmapLabelEl) {
        heatmapLabelEl.textContent = `Latest confidence: ${Math.round(score)}%`;
    }
}

function startHeatmap() {
    if (!heatmapEl) return;
    confidenceSeries = [];
    heatmapEl.innerHTML = new Array(HEATMAP_MAX_POINTS).fill("<span></span>").join("");
    if (heatmapLabelEl) heatmapLabelEl.textContent = "Collecting confidence data...";
    if (heatmapTimer) clearInterval(heatmapTimer);
    heatmapTimer = setInterval(() => {
        if (!running) return;
        const fallback = deriveSpeechScore();
        const score = Number.isFinite(latestScores.confidence) ? latestScores.confidence : fallback;
        if (Number.isFinite(score)) updateConfidenceHeatmap(score);
    }, 3000);
}

function stopHeatmap() {
    if (heatmapTimer) {
        clearInterval(heatmapTimer);
        heatmapTimer = null;
    }
    if (heatmapLabelEl) heatmapLabelEl.textContent = "Session stopped.";
}

function speakResumeQuestion(text) {
    if (!running) return;
    if (!liveTtsToggle?.checked || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function renderResumeQuestion(question, statusText) {
    if (resumeQuestionEl) {
        resumeQuestionEl.textContent = question;
        speakResumeQuestion(question);
    }
    if (resumeQuestionStatusEl && statusText) {
        resumeQuestionStatusEl.textContent = statusText;
    }
}

async function fetchResumeQuestions(resumeText, role) {
    try {
        const res = await fetch(RESUME_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: resumeText, role: role || null, count: 10 })
        });
        if (!res.ok) return null;
        const payload = await res.json();
        return payload?.questions || null;
    } catch (err) {
        return null;
    }
}

async function loadResumeQuestions() {
    const storedQuestions = localStorage.getItem("hii_resume_questions");
    const storedRole = localStorage.getItem("hii_resume_role") || "";
    if (resumeRoleLabelEl) {
        resumeRoleLabelEl.textContent = storedRole ? `Role pack: ${storedRole}` : "Role pack: General";
    }
    if (storedQuestions) {
        try {
            const parsed = JSON.parse(storedQuestions);
            if (Array.isArray(parsed) && parsed.length) {
                resumeQuestions = parsed;
                renderResumeQuestion("Questions ready. Click Ask Next Question.", "Loaded from Resume Analysis.");
                return;
            }
        } catch (err) {
            // ignore parsing errors
        }
    }

    const resumeText = localStorage.getItem("hii_resume_text") || "";
    if (resumeText.trim().length > 0) {
        renderResumeQuestion("Generating questions from your resume...", "Contacting the API...");
        const apiQuestions = await fetchResumeQuestions(resumeText, storedRole);
        if (apiQuestions && apiQuestions.length) {
            resumeQuestions = apiQuestions;
            localStorage.setItem("hii_resume_questions", JSON.stringify(apiQuestions));
            renderResumeQuestion("Questions ready. Click Ask Next Question.", "Generated by the API.");
            return;
        }
    }

    resumeQuestions = defaultResumeQuestions;
    renderResumeQuestion("Upload your resume in Resume Analysis for tailored questions.", "Using default questions.");
}

function nextResumeQuestion() {
    if (!resumeQuestions.length) {
        renderResumeQuestion("Upload your resume in Resume Analysis to generate questions.", "No questions available.");
        return;
    }
    resumeQuestionIndex += 1;
    if (resumeQuestionIndex >= resumeQuestions.length) {
        resumeQuestionIndex = resumeQuestions.length - 1;
        renderResumeQuestion("Session complete. Great job!", "All questions asked.");
        return;
    }
    renderResumeQuestion(resumeQuestions[resumeQuestionIndex], "Live interview question");
}

function startResumeQuestionSession() {
    resumeQuestionIndex = -1;
    renderResumeQuestion("Questions ready. Click Ask Next Question when you want to begin.", "Ready when you are.");
}

function updateCoachingFromScores(eye, posture, gestures, movement) {
    const scores = [
        eye !== null ? { name: "Eye contact", score: eye } : null,
        posture !== null ? { name: "Posture", score: posture } : null,
        gestures !== null ? { name: "Gestures", score: gestures } : null,
        movement !== null ? { name: "Movement", score: movement } : null
    ].filter(Boolean);
    if (scores.length === 0) return;
    scores.sort((a, b) => a.score - b.score);
    const weakest = scores[0];
    if (weakest.score < 50) {
        sessionGoalEl.textContent = `Improve ${weakest.name.toLowerCase()}`;
    } else if (weakest.score < 70) {
        sessionGoalEl.textContent = `Stabilize ${weakest.name.toLowerCase()}`;
    } else {
        sessionGoalEl.textContent = "Strong presence. Keep it steady.";
    }
    updateLiveFeedback();
}

function startSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        statusEl.textContent = "Speech Recognition not supported in this browser.";
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        micStatusEl.textContent = "Mic: On";
        statusEl.textContent = "Listening...";
    };

    recognition.onerror = (event) => {
        const msg = event?.error ? `Mic error: ${event.error}` : "Mic error. Check permissions.";
        statusEl.textContent = msg;
    };

    recognition.onresult = (event) => {
        const finalChunks = [];
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalChunks.push(chunk);
            } else {
                interim += chunk;
            }
        }

        if (finalChunks.length) {
            const finalText = finalChunks.join(" ").replace(/\s+/g, " ").trim();
            if (finalText) {
                liveTranscript = liveTranscript ? `${liveTranscript} ${finalText}` : finalText;
                const words = finalText.toLowerCase().match(/\S+/g) || [];
                wordCount += words.length;
                for (const word of words) {
                    if (fillers.has(word)) fillerCount += 1;
                }
                latestScores.fillerCount = fillerCount + interimFillerCount;
            }
        }

        pendingInterimText = interim.trim();
        const interimWords = pendingInterimText ? (pendingInterimText.toLowerCase().match(/\S+/g) || []) : [];
        interimWordCount = interimWords.length;
        interimFillerCount = 0;
        for (const word of interimWords) {
            if (fillers.has(word)) interimFillerCount += 1;
        }
        latestScores.fillerCount = fillerCount + interimFillerCount;

        scheduleTranscriptRender();
        updateMetrics();

        const now = Date.now();
        if (now - lastSentAt > 2000) {
            lastSentAt = now;
            const combined = [liveTranscript, pendingInterimText].filter(Boolean).join(" ").trim();
            sendToBackend(combined);
        }
    };

    recognition.onend = () => {
        if (running) {
            recognition.start();
        }
    };

    recognition.start();
}

function initTranscriptUI() {
    if (!transcriptEl) return;
    if (transcriptFinalEl && transcriptInterimEl) return;
    transcriptEl.innerHTML = "";
    transcriptFinalEl = document.createElement("span");
    transcriptFinalEl.className = "transcript-final";
    transcriptInterimEl = document.createElement("span");
    transcriptInterimEl.className = "transcript-interim";
    transcriptEl.append(transcriptFinalEl, transcriptInterimEl);
}

function renderTranscript() {
    initTranscriptUI();
    if (!transcriptFinalEl || !transcriptInterimEl) return;
    transcriptFinalEl.textContent = liveTranscript ? `${liveTranscript} ` : "";
    transcriptInterimEl.textContent = pendingInterimText;
    if (wordCountEl) wordCountEl.textContent = String(wordCount + interimWordCount);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function scheduleTranscriptRender() {
    if (transcriptNeedsRender) return;
    transcriptNeedsRender = true;
    requestAnimationFrame(() => {
        transcriptNeedsRender = false;
        renderTranscript();
    });
}

function stopSpeech() {
    if (recognition) recognition.stop();
    micStatusEl.textContent = "Mic: Off";
}

function resetLiveCards(message = "Session stopped.") {
    if (timerEl) timerEl.textContent = "00:00";
    if (micStatusEl) micStatusEl.textContent = "Mic: Off";
    if (eyeContactEl) eyeContactEl.textContent = "--";
    if (postureEl) postureEl.textContent = "--";
    if (gesturesEl) gesturesEl.textContent = "--";
    if (movementEl) movementEl.textContent = "--";
    if (toneEl) toneEl.textContent = "--";
    if (confidenceLevelEl) confidenceLevelEl.textContent = "--";
    if (sessionGoalEl) sessionGoalEl.textContent = message;
    if (liveFeedbackScoreEl) liveFeedbackScoreEl.textContent = "--";
    if (liveFeedbackTextEl) liveFeedbackTextEl.textContent = message;
    if (wordCountEl) wordCountEl.textContent = "0";
    if (transcriptFinalEl) transcriptFinalEl.textContent = "";
    if (transcriptInterimEl) transcriptInterimEl.textContent = "";
    if (transcriptEl) transcriptEl.textContent = "";
    if (resumeQuestionEl) resumeQuestionEl.textContent = "Session stopped.";
    if (resumeQuestionStatusEl) resumeQuestionStatusEl.textContent = message;
    if (resumeRoleLabelEl) resumeRoleLabelEl.textContent = "";
    if (heatmapEl) {
        heatmapEl.innerHTML = new Array(HEATMAP_MAX_POINTS).fill("<span></span>").join("");
    }
    if (heatmapLabelEl) heatmapLabelEl.textContent = message;
    if (overlayCtx && overlayCanvas) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    latestScores.eye = null;
    latestScores.posture = null;
    latestScores.gestures = null;
    latestScores.movement = null;
    latestScores.wpm = null;
    latestScores.fillerCount = null;
    latestScores.tone = null;
    latestScores.confidence = null;
}

async function detectPeople() {
    if (!camera.videoWidth || !camera.videoHeight) return;

    // PERFORMANCE: Resize to max 640px while maintaining aspect ratio
    const MAX_DIM = 640;
    let targetW = camera.videoWidth;
    let targetH = camera.videoHeight;

    if (targetW > MAX_DIM || targetH > MAX_DIM) {
        if (targetW > targetH) {
            targetH = (MAX_DIM / targetW) * targetH;
            targetW = MAX_DIM;
        } else {
            targetW = (MAX_DIM / targetH) * targetW;
            targetH = MAX_DIM;
        }
    }

    detectCanvas.width = targetW;
    detectCanvas.height = targetH;
    detectCtx.drawImage(camera, 0, 0, targetW, targetH);
    const dataUrl = detectCanvas.toDataURL("image/jpeg", 0.75);

    try {
        const res = await fetch("http://127.0.0.1:8000/detect-people", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: dataUrl })
        });
        if (!res.ok) return;
        const payload = await res.json();

        const count = payload?.boxes?.length || 0;
        if (count > 0) {
            console.log(`Detection: Found ${count} person(s)`);
        }

        drawDetections(payload);
    } catch (err) {
        console.warn("People detection failed:", err);
    }
}

function startPeopleDetection() {
    if (peopleDetectTimer) clearInterval(peopleDetectTimer);
    peopleDetectTimer = setInterval(detectPeople, 2000);
}

function stopPeopleDetection() {
    if (peopleDetectTimer) {
        clearInterval(peopleDetectTimer);
        peopleDetectTimer = null;
    }
}


function resizeOverlay() {
    if (!overlayCanvas) return;
    const rect = camera.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    overlayCanvas.width = Math.round(rect.width);
    overlayCanvas.height = Math.round(rect.height);
}

function drawDetections(payload) {
    if (!overlayCanvas || !overlayCtx) return;
    resizeOverlay();
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (!showBoxes) return;
    const boxes = payload?.boxes || [];
    if (!boxes.length) return;
    overlayCtx.lineWidth = 3;
    overlayCtx.strokeStyle = "#00ff00"; // Bright neon green
    overlayCtx.fillStyle = "rgba(0, 255, 0, 0.15)";
    overlayCtx.font = "bold 14px sans-serif";

    const imgW = payload?.image_width || camera.videoWidth;
    const imgH = payload?.image_height || camera.videoHeight;
    const viewW = overlayCanvas.width;
    const viewH = overlayCanvas.height;
    const imgAspect = imgW && imgH ? imgW / imgH : 1;
    const viewAspect = viewW && viewH ? viewW / viewH : 1;

    // Match CSS object-fit: contain behavior
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    if (viewAspect > imgAspect) {
        scale = viewH / imgH;
        const renderW = imgW * scale;
        offsetX = (viewW - renderW) / 2;
    } else {
        scale = viewW / imgW;
        const renderH = imgH * scale;
        offsetY = (viewH - renderH) / 2;
    }

    boxes.forEach((b) => {
        let x = b.x1 * scale + offsetX;
        const y = b.y1 * scale + offsetY;
        let w = (b.x2 - b.x1) * scale;
        const h = (b.y2 - b.y1) * scale;

        // Flip X coordinates for mirrored video
        x = viewW - (x + w);
        overlayCtx.fillRect(x, y, w, h);
        overlayCtx.strokeRect(x, y, w, h);
        if (b.conf !== null && b.conf !== undefined) {
            const label = `person ${(b.conf * 100).toFixed(0)}%`;
            overlayCtx.fillStyle = "rgba(0,0,0,0.6)";
            overlayCtx.fillRect(x, Math.max(y - 16, 0), overlayCtx.measureText(label).width + 8, 16);
            overlayCtx.fillStyle = "#fff";
            overlayCtx.fillText(label, x + 4, Math.max(y - 4, 12));
        }
    });
}

startBtn.addEventListener("click", async () => {
    if (running) return;
    running = true;
    startTime = Date.now();
    timerEl.textContent = "00:00";
    initTranscriptUI();
    liveTranscript = "";
    pendingInterimText = "";
    interimWordCount = 0;
    interimFillerCount = 0;
    if (transcriptFinalEl) transcriptFinalEl.textContent = "";
    if (transcriptInterimEl) transcriptInterimEl.textContent = "";
    wordCount = 0;
    if (wordCountEl) wordCountEl.textContent = "0";
    fillerCount = 0;
    latestScores.eye = null;
    latestScores.posture = null;
    latestScores.gestures = null;
    latestScores.movement = null;
    latestScores.wpm = null;
    latestScores.fillerCount = null;
    latestScores.tone = null;
    latestScores.confidence = null;
    if (toneEl) toneEl.textContent = "--";
    if (confidenceLevelEl) confidenceLevelEl.textContent = "--";
    sessionGoalEl.textContent = "Start speaking to get guidance";
    if (liveFeedbackScoreEl) liveFeedbackScoreEl.textContent = "--";
    if (liveFeedbackTextEl) liveFeedbackTextEl.textContent = "Waiting for input...";
    updateMetrics();
    await initCamera();
    startPeopleDetection();
    await initBodyTracking();
    startSpeech();
    await loadResumeQuestions();
    startResumeQuestionSession();
    startHeatmap();
    updateTimer();
    statusEl.textContent = "Live session started.";
    startBtn.disabled = true;
    stopBtn.disabled = false;
});

stopBtn.addEventListener("click", () => {
    running = false;
    stopSpeech();
    statusEl.textContent = "Session ended.";
    const finalTranscript = [liveTranscript, pendingInterimText].filter(Boolean).join(" ").trim();
    addTranscriptToHistory(finalTranscript);
    resetLiveCards("Session stopped.");
    if (mpCamera) mpCamera.stop();
    stopPeopleDetection();
    stopHeatmap();
    startBtn.disabled = false;
    stopBtn.disabled = true;
});

if (toggleBoxesBtn) {
    toggleBoxesBtn.addEventListener("click", () => {
        showBoxes = !showBoxes;
        toggleBoxesBtn.textContent = showBoxes ? "Hide Boxes" : "Show Boxes";
        if (!showBoxes && overlayCtx && overlayCanvas) {
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
    });
}

if (clearTranscriptHistoryBtn) {
    clearTranscriptHistoryBtn.addEventListener("click", () => {
        localStorage.removeItem(TRANSCRIPT_HISTORY_KEY);
        renderTranscriptHistory();
    });
}

if (nextResumeQuestionBtn) {
    nextResumeQuestionBtn.addEventListener("click", () => {
        nextResumeQuestion();
    });
}

function loadLastAnalysis() {
    if (!lastAnalysisEl) return;
    try {
        const raw = localStorage.getItem("h.i.i_last_analysis");
        if (!raw) return;
        const saved = JSON.parse(raw);
        const data = saved.data || {};
        const time = saved.timestamp ? new Date(saved.timestamp).toLocaleString() : "Unknown time";
        const parts = [
            `<p class="status">Saved: ${time}</p>`,
            `<p><strong>WPM:</strong> ${data.wpm ?? "N/A"}</p>`,
            `<p><strong>Fillers:</strong> ${data.filler_count ?? "N/A"}</p>`,
            `<p><strong>Sentiment:</strong> ${data.sentiment ?? "Neutral"}</p>`,
            `<p><strong>Advice:</strong> ${saved.coach_advice || "N/A"}</p>`,
            `<p><strong>Transcript:</strong> ${(data.text || "").slice(0, 220)}${(data.text || "").length > 220 ? "..." : ""}</p>`
        ];
        lastAnalysisEl.innerHTML = parts.join("");

        const toneValue = data["Tone"];
        if (toneEl && toneValue !== undefined && toneValue !== null) {
            const toneScore = Number(toneValue);
            toneEl.textContent = Number.isFinite(toneScore)
                ? `${labelFromScore(toneScore)} (${Math.round(toneScore)}%)`
                : String(toneValue);
        }

        const confidenceValue = data["Confidence Level"];
        if (confidenceLevelEl && confidenceValue !== undefined && confidenceValue !== null) {
            const confScore = Number(confidenceValue);
            confidenceLevelEl.textContent = Number.isFinite(confScore)
                ? `${labelFromScore(confScore)} (${Math.round(confScore)}%)`
                : String(confidenceValue);
        }
    } catch (err) {
        lastAnalysisEl.innerHTML = "<p class=\"status\">Could not load saved analysis.</p>";
    }
}

async function sendToBackend(text) {
    try {
        const durationSeconds = Math.max((Date.now() - startTime) / 1000, 1);
        const res = await fetch("http://127.0.0.1:8000/analyze-live", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, duration_seconds: durationSeconds })
        });

        if (!res.ok) return;
        const payload = await res.json();
        const data = payload?.data || {};
        const toneValue =
            data["Tone"] ??
            data["tone"] ??
            data["tone_modulation"] ??
            data["Tone Modulation"] ??
            payload?.Tone ??
            payload?.tone ??
            payload?.tone_modulation;
        const confidenceValue =
            data["Confidence Level"] ??
            data["confidence_level"] ??
            data["confidence"] ??
            data["Confidence"] ??
            payload?.["Confidence Level"] ??
            payload?.confidence ??
            payload?.confidence_level;

        if (toneValue !== undefined && toneValue !== null) {
            const toneScore = Number(toneValue);
            if (Number.isFinite(toneScore)) {
                updateToneConfidenceUI(toneScore, null);
            } else if (toneEl) {
                toneEl.textContent = String(toneValue);
            }
        }
        if (confidenceValue !== undefined && confidenceValue !== null) {
            const confScore = Number(confidenceValue);
            if (Number.isFinite(confScore)) {
                updateToneConfidenceUI(null, confScore);
            } else if (confidenceLevelEl) {
                confidenceLevelEl.textContent = String(confidenceValue);
            }
        }

        if (payload.coach_advice) statusEl.textContent = payload.coach_advice;

        const tipsEl = document.getElementById("communication-tips");
        if (tipsEl && payload.data && payload.data.improvement_tips) {
            const tips = payload.data.improvement_tips;
            if (tips.length > 0) {
                tipsEl.innerHTML = tips.map(t => `<p style="margin: 4px 0;">• ${t}</p>`).join("");
            } else {
                // Keep the old tip if new one is just "clear", or show a default message?
                // The backend returns ["Your sentence structure..."] if good.
                // So we can just show whatever is returned.
                tipsEl.innerHTML = '<p style="margin: 4px 0;">Great clarity! Keep it up.</p>';
            }
        }

        updateLiveFeedback();
    } catch (err) {
        statusEl.textContent = "Backend unreachable. Is FastAPI running?";
    }
}

window.addEventListener("storage", (e) => {
    if (e.key === "hii_last_analysis") loadLastAnalysis();
    if (e.key === "hii_resume_questions" || e.key === "hii_resume_text") {
        loadResumeQuestions();
    }
    if (e.key === TRANSCRIPT_HISTORY_KEY) {
        renderTranscriptHistory();
    }
});

loadLastAnalysis();
loadResumeQuestions();
renderTranscriptHistory();
