const camera = document.getElementById("camera");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const micStatusEl = document.getElementById("mic-status");
const eyeContactEl = document.getElementById("eye-contact");
const postureEl = document.getElementById("posture");
const gesturesEl = document.getElementById("gestures");
const movementEl = document.getElementById("movement");
const sessionGoalEl = document.getElementById("session-goal");
const transcriptEl = document.getElementById("transcript");
const lastAnalysisEl = document.getElementById("last-analysis");

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

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    camera.srcObject = stream;
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
    const wpm = Math.round(wordCount / elapsedMin);
    if (Number.isFinite(wpm) && wpm > 0) {
        statusEl.textContent = `Speaking... ${wpm} WPM`;
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function labelFromScore(score) {
    if (score >= 80) return "Great";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs work";
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
    postureEl.textContent = `${labelFromScore(postureScore)} (${Math.round(postureScore)}%)`;

    // Auto-capture posture
    checkAndCapturePosture(postureScore);

    if (lastPose) {
        const dx = nose.x - lastPose.x;
        const dy = nose.y - lastPose.y;
        const motion = Math.sqrt(dx * dx + dy * dy);
        movementScore = movementScore * 0.85 + motion * 500;
        const moveScore = clamp(100 - movementScore, 0, 100);
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

        // Draw the current video frame
        // Mirror it to match the view
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
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;
    const wrist = results.multiHandLandmarks[0][0];
    let delta = 0;
    if (lastLeftWrist) {
        const dx = wrist.x - lastLeftWrist.x;
        const dy = wrist.y - lastLeftWrist.y;
        delta = Math.sqrt(dx * dx + dy * dy);
    }
    lastLeftWrist = { x: wrist.x, y: wrist.y };
    gestureScore = gestureScore * 0.85 + delta * 600;
    const gestureLevel = clamp(gestureScore, 0, 100);
    gesturesEl.textContent = `${labelFromScore(gestureLevel)} (${Math.round(gestureLevel)}%)`;
    updateCoachingFromScores(null, null, gestureLevel, null);
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

    recognition.onstart = () => {
        micStatusEl.textContent = "Mic: On";
        statusEl.textContent = "Listening...";
    };

    recognition.onerror = () => {
        statusEl.textContent = "Mic error. Check permissions.";
    };

    recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
            } else {
                interimTranscript += transcript;
            }
        }

        // Combine accumulated final text with current interim
        // Note: For a simple continuous session without storing 'finalTranscript' globally 
        // across start/stops in this scope, this relies on the SpeechRecognition 
        // engine keeping the session alive. 
        // If 'continuous' is true, event.results accumulates the session.

        const currentText = finalTranscript + interimTranscript;
        transcriptEl.textContent = currentText;

        const words = currentText.trim().toLowerCase().split(/\s+/).filter(Boolean);
        wordCount = words.length;
        fillerCount = words.filter(w => fillers.has(w)).length;
        updateMetrics();
        const now = Date.now();
        if (now - lastSentAt > 2000) {
            lastSentAt = now;
            sendToBackend(currentText);
        }
    };

    recognition.start();
}

function stopSpeech() {
    if (recognition) recognition.stop();
    micStatusEl.textContent = "Mic: Off";
}

startBtn.addEventListener("click", async () => {
    if (running) return;
    running = true;
    startTime = Date.now();
    timerEl.textContent = "00:00";
    transcriptEl.textContent = "";
    wordCount = 0;
    fillerCount = 0;
    sessionGoalEl.textContent = "Start speaking to get guidance";
    updateMetrics();
    await initCamera();
    await initBodyTracking();
    startSpeech();
    updateTimer();
    statusEl.textContent = "Live session started.";
    startBtn.disabled = true;
    stopBtn.disabled = false;
});

stopBtn.addEventListener("click", () => {
    running = false;
    stopSpeech();
    statusEl.textContent = "Session ended.";
    sessionGoalEl.textContent = "Session stopped";
    if (mpCamera) mpCamera.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
});

function loadLastAnalysis() {
    try {
        const raw = localStorage.getItem("hii_last_analysis");
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
        if (payload.coach_advice) statusEl.textContent = payload.coach_advice;
    } catch (err) {
        statusEl.textContent = "Backend unreachable. Is FastAPI running?";
    }
}

window.addEventListener("storage", (e) => {
    if (e.key === "hii_last_analysis") loadLastAnalysis();
});

loadLastAnalysis();
