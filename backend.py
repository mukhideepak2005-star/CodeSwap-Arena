import assemblyai as aai
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from ultralytics import YOLO
from textblob import TextBlob
import base64
import cv2
import numpy as np
import os
import random
import json

app = FastAPI()

# Allow local frontend to call the API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves static files (HTML, CSS, JS) from the current directory
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def read_root():
    return FileResponse('index.html')

@app.get("/index.html")
async def read_index():
    return FileResponse('index.html')

@app.get("/live.html")
async def read_live():
    return FileResponse('live.html')

@app.get("/ra.html")
async def read_ra():
    return FileResponse('ra.html')

# Replace with your actual API key from assemblyai.com
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY", "YOUR_ASSEMBLYAI_API_KEY")

yolo_model = None

def get_yolo_model():
    global yolo_model
    if yolo_model is None:
        yolo_model = YOLO("yolov8s.pt")
    return yolo_model

def get_mock_analysis(text_content=""):
    """Returns simulated analysis data when API key is missing."""
    wpm = random.uniform(130, 160)
    filler_count = random.randint(2, 8)
    fillers = ["um", "uh", "like"]
    found_fillers = [random.choice(fillers) for _ in range(filler_count)]
    
    tone_modulation, confidence_level = score_tone_confidence([], wpm, filler_count)
    
    return {
        "text": text_content if text_content else "Simulated transcript: The API key is missing, so this is mock data. Your delivery looks great though!",
        "wpm": round(wpm, 2),
        "filler_count": filler_count,
        "filler_list": list(set(found_fillers)),
        "sentiment": "Positive",
        "Tone": tone_modulation,
        "Confidence Level": confidence_level
    }

def analyze_delivery(transcript):
    """Extracts actionable metrics from the transcript."""
    # Calculating Filler Words
    fillers = ["um", "uh", "like", "so", "actually"]
    words = transcript.text.lower().split()
    found_fillers = [w for w in words if w in fillers]
    
    # Simple WPM calculation (Assumes audio duration is available)
    duration_minutes = (transcript.audio_duration / 60) if transcript.audio_duration else 0.1
    wpm = len(words) / duration_minutes
    
    tone_modulation, confidence_level = score_tone_confidence(words, wpm, len(found_fillers))
    return {
        "text": transcript.text,
        "wpm": round(wpm, 2),
        "filler_count": len(found_fillers),
        "filler_list": list(set(found_fillers)),
        "sentiment": transcript.sentiment_analysis[0].sentiment if transcript.sentiment_analysis else "Neutral",
        "Tone": tone_modulation,
        "Confidence Level": confidence_level
    }

@app.post("/analyze-interview")
async def upload_video(file: UploadFile = File(...)):
    # 1. Save the uploaded video locally
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        if "YOUR_ASSEMBLYAI_API_KEY" in aai.settings.api_key:
            raise ValueError("Missing API Key")

        # 2. Transcribe with Sentiment and Filler word detection
        config = aai.TranscriptionConfig(
            sentiment_analysis=True,
            disfluencies=True # This automatically detects 'um' and 'uh'
        )
        
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(file_path, config=config)
    
        # 3. Process the results
        results = analyze_delivery(transcript)
    except Exception as e:
        print(f"Transcription failed: {e}. Using mock data.")
        results = get_mock_analysis()

    # Cleanup
    if os.path.exists(file_path):
        os.remove(file_path)
    
    return {
        "status": "Success",
        "data": results,
        "coach_advice": generate_advice(results)
    }

def generate_advice(stats):
    if stats['wpm'] > 160:
        return "You're speaking a bit fast. Try to take a breath between sentences."
    if stats['filler_count'] > 5:
        # Check if list is not empty before accessing index 0
        filler_word = stats['filler_list'][0] if stats['filler_list'] else 'fillers'
        return f"You used '{filler_word}' frequently. Try pausing instead."
    return "Great delivery! Your pace and clarity are professional."


class LiveAnalyzeRequest(BaseModel):
    text: str
    duration_seconds: float


class DetectPeopleRequest(BaseModel):
    image: str

 
@app.post("/analyze-live")
async def analyze_live(payload: LiveAnalyzeRequest):
    """Lightweight live analysis from browser transcript."""
    words = payload.text.lower().split()
    fillers = ["um", "uh", "like", "so", "actually"]
    found_fillers = [w for w in words if w in fillers]
    duration_minutes = max(payload.duration_seconds / 60, 0.01)
    wpm = len(words) / duration_minutes

    # Sentiment Analysis with TextBlob
    blob = TextBlob(payload.text)
    sentiment_polarity = blob.sentiment.polarity  # -1.0 to 1.0
    sentiment_subjectivity = blob.sentiment.subjectivity # 0.0 to 1.0

    # Map sentiment to "Tone" score (0-100)
    # Neutral (0) -> 50, Positive (1) -> 100, Negative (-1) -> 0
    tone_score = clamp(50 + (sentiment_polarity * 50), 0, 100)
    
    # Adjust confidence slightly based on subjectivity (more opinionated = often more confident)
    base_confidence = clamp(100 - abs(wpm - 140) * 0.7 - len(found_fillers) * 3, 0, 100)
    confidence_score = clamp(base_confidence + (sentiment_subjectivity * 10), 0, 100)

    # Determine sentiment label
    if sentiment_polarity > 0.1:
        sentiment_label = "Positive"
    elif sentiment_polarity < -0.1:
        sentiment_label = "Negative"
    else:
        sentiment_label = "Neutral"

    stats = {
        "text": payload.text,
        "wpm": round(wpm, 2),
        "filler_count": len(found_fillers),
        "filler_list": list(set(found_fillers)),
        "sentiment": sentiment_label,
        "Tone": round(tone_score, 2),
        "Confidence Level": round(confidence_score, 2),
        "improvement_tips": get_communication_tips(payload.text)
    }

    return {
        "status": "Success",
        "data": stats,
        "coach_advice": generate_advice(stats)
    }


class ResumeQuestionsRequest(BaseModel):
    text: Optional[str] = ""
    role: Optional[str] = None
    count: Optional[int] = 8


@app.post("/resume-questions")
async def resume_questions(payload: ResumeQuestionsRequest):
    resume_text = payload.text or ""
    count = payload.count or 8
    questions = (
        generate_resume_questions_gemini(resume_text, payload.role, count)
        or build_resume_questions(resume_text, payload.role, count)
    )
    return {
        "status": "Success",
        "questions": questions
    }


@app.post("/detect-people")
async def detect_people(payload: DetectPeopleRequest):
    try:
        data = payload.image.split(",", 1)[1] if "," in payload.image else payload.image
        img_bytes = base64.b64decode(data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            return {"count": 0, "label": "person"}

        model = get_yolo_model()
        results = model(img, classes=[0], verbose=False)
        boxes = results[0].boxes
        count = int(boxes.shape[0]) if boxes is not None else 0

        payload_boxes = []
        if boxes is not None and boxes.xyxy is not None:
            xyxy = boxes.xyxy.cpu().tolist()
            confs = boxes.conf.cpu().tolist() if boxes.conf is not None else [None] * len(xyxy)
            for (x1, y1, x2, y2), conf in zip(xyxy, confs):
                payload_boxes.append({
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2),
                    "conf": float(conf) if conf is not None else None
                })

        return {
            "count": count,
            "label": "person",
            "boxes": payload_boxes,
            "image_width": int(img.shape[1]),
            "image_height": int(img.shape[0])
        }
    except Exception as e:
        print(f"DEBUG: detect_people failed: {e}")
        import traceback
        traceback.print_exc()
        return {"count": 0, "label": "person", "boxes": []}


class PostureCaptureRequest(BaseModel):
    image: str
    status: str
    score: float

@app.post("/capture-posture")
async def capture_posture(payload: PostureCaptureRequest):
    try:
        # Create directories if they don't exist
        base_dir = "captured_postures"
        target_dir = os.path.join(base_dir, payload.status)
        os.makedirs(target_dir, exist_ok=True)
        
        # Decode image
        data = payload.image.split(",", 1)[1] if "," in payload.image else payload.image
        img_bytes = base64.b64decode(data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"status": "Error", "message": "Invalid image data"}
            
        # Generate filename with timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{timestamp}_score_{int(payload.score)}.jpg"
        filepath = os.path.join(target_dir, filename)
        
        cv2.imwrite(filepath, img)
        
        return {"status": "Success", "path": filepath}
    except Exception as e:
        print(f"Error saving posture: {e}")
        return {"status": "Error", "message": str(e)}

def clamp(value, min_value, max_value):
    return max(min_value, min(value, max_value))


def get_communication_tips(text):
    """Provides actionable sentence improvements based on weak phrases."""
    tips = []
    text_lower = text.lower()
    
    # Rule-based improvements
    weak_phrases = {
        "i think": "Consider saying 'I believe' or 'I am confident' for more authority.",
        "maybe": "Avoid 'maybe'. Use specific conditions or say 'It is possible that'.",
        "sort of": "Avoid 'sort of'. Be precise.",
        "kind of": "Avoid 'kind of'. State clearly what you mean.",
        "just": "Remove 'just' to make your statement stronger (e.g., 'I just want to' -> 'I want to').",
        "actually": "Remove 'actually' unless correcting a misconception.",
        "basically": "Remove 'basically' to sound more professional.",
        "obviously": "Avoid 'obviously', as it can sound condescending.",
        "honestly": "Avoid 'honestly', implying you weren't honest before.",
        "stuff": "Use a more specific word than 'stuff'.",
        "things": "Be specific. Instead of 'things', describe the items or concepts.",
        "um": "Pause instead of using 'um'.",
        "uh": "Take a breath to replace 'uh'.",
        "like": "Avoid using 'like' as a filler."
    }

    for phrase, suggestion in weak_phrases.items():
        if f" {phrase} " in f" {text_lower} " or text_lower.startswith(f"{phrase} ") or text_lower.endswith(f" {phrase}"):
            tips.append(suggestion)
            if len(tips) >= 2: # Limit to 2 tips per response to avoid overwhelming
                break
    
    if not tips and len(text.split()) > 3:
        return ["Your sentence structure is clear and direct. Great job!"]
        
    return tips

def score_tone_confidence(words, wpm, filler_count):
    """Heuristic scores (0-100) until real audio prosody analysis is added."""
    tone_modulation = clamp(85 - filler_count * 7, 0, 100)
    confidence_level = clamp(100 - abs(wpm - 140) * 0.7 - filler_count * 3, 0, 100)
    return round(tone_modulation, 2), round(confidence_level, 2)


def build_resume_questions(text, role=None, count=8):
    base_questions = [
        "Walk me through your resume.",
        "What project are you most proud of and why?",
        "Tell me about a time you faced a challenge and how you handled it.",
        "How do you prioritize tasks when deadlines are tight?",
        "What are you looking for in your next role?"
    ]

    if role:
        base_questions.insert(1, f"Why are you interested in this {role} role?")

    skill_keywords = [
        "python", "java", "javascript", "react", "node", "aws", "azure", "gcp",
        "sql", "postgres", "mongodb", "docker", "kubernetes", "ml", "ai",
        "data", "analytics", "flask", "django", "fastapi", "tensorflow", "pytorch"
    ]

    normalized = (text or "").lower()
    skills = [k.upper() for k in skill_keywords if k in normalized]

    questions = list(base_questions)
    if skills:
        for skill in skills[:5]:
            questions.append(f"Tell me about a project where you used {skill}.")
            questions.append(f"What tradeoffs did you consider when working with {skill}?")
    elif len(normalized) > 40:
        questions.append("Which achievement on your resume had the biggest impact?")
        questions.append("What did you learn from your most recent role?")
    else:
        questions.append("Share a recent accomplishment that highlights your strengths.")

    questions.append("What questions do you have for me?")

    # Deduplicate and limit to count
    seen = set()
    final_questions = []
    for q in questions:
        key = q.strip().lower()
        if key and key not in seen:
            seen.add(key)
            final_questions.append(q)
        if len(final_questions) >= max(3, count):
            break

    return final_questions


def generate_resume_questions_gemini(text, role=None, count=8):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        from google import genai
    except Exception:
        return None

    try:
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        client = genai.Client()
        role_line = role if role else "Not specified"
        prompt = (
            "You are an interview coach. Generate a list of interview questions that "
            "match the candidate's resume. Return ONLY a JSON array of strings.\n\n"
            f"Target role: {role_line}\n"
            f"Number of questions: {max(3, count)}\n\n"
            "Resume:\n"
            f"{text}\n"
        )
        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        raw = (response.text or "").strip()
        if not raw:
            return None

        questions = None
        try:
            questions = json.loads(raw)
        except json.JSONDecodeError:
            # Fallback: attempt to parse lines if JSON isn't returned
            lines = [line.strip("-• \t") for line in raw.splitlines() if line.strip()]
            questions = [line for line in lines if len(line.split()) >= 3]

        return questions[:max(3, count)] if questions else None
    except Exception:
        return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)

