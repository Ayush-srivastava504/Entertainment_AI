"""
Minimal FastAPI Space that serves one small quantized instruct model via
llama-cpp-python — same pattern as RepoSense's neural-generator service,
just deployed as a Hugging Face Space instead of a self-hosted Docker
container.

Deploy:
  1. Create a Space on huggingface.co, SDK = Docker.
  2. Drop this file + requirements.txt + Dockerfile in the Space repo.
  3. The GGUF model is downloaded at container build/start (see download_model
     below) so nothing large needs to be committed to the Space repo.
  4. Your Next.js app calls this Space's /generate endpoint (set HF_SPACE_URL).

Swap MODEL_REPO / MODEL_FILE for any GGUF you like on the Hub.
"""

import os
import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
from pydantic import BaseModel

MODEL_REPO = os.environ.get("MODEL_REPO", "Qwen/Qwen2.5-1.5B-Instruct-GGUF")
MODEL_FILE = os.environ.get("MODEL_FILE", "qwen2.5-1.5b-instruct-q4_k_m.gguf")
MODEL_DIR = Path("/data/models") if Path("/data").exists() else Path("./models")
N_THREADS = int(os.environ.get("LLM_N_THREADS", "2"))
N_CTX = int(os.environ.get("LLM_N_CTX", "4096"))

app = FastAPI(title="entertainment-ai neural generator")

# Allow your frontend domain(s) to call this Space directly if you ever do
# client-side calls; the recommended setup keeps calls server-to-server
# (Next.js API route -> this Space), in which case CORS doesn't matter, but
# it's harmless to leave open here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

llm: Llama | None = None
load_lock = threading.Lock()


def load_model() -> None:
    global llm
    with load_lock:
        if llm is not None:
            return
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        model_path = hf_hub_download(
            repo_id=MODEL_REPO, filename=MODEL_FILE, local_dir=str(MODEL_DIR)
        )
        llm = Llama(
            model_path=model_path,
            n_threads=N_THREADS,
            n_ctx=N_CTX,
            n_gpu_layers=0,
            verbose=False,
        )


@app.on_event("startup")
def startup() -> None:
    # Load in a background thread so the health check responds immediately
    # even during the (one-time) model download on cold start.
    threading.Thread(target=load_model, daemon=True).start()


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 400
    temperature: float = 0.7


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": llm is not None}


@app.post("/generate")
def generate(req: GenerateRequest):
    if llm is None:
        raise HTTPException(
            status_code=503, detail="Model still loading, try again shortly."
        )
    out = llm.create_chat_completion(
        messages=[{"role": "user", "content": req.prompt}],
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        top_p=0.92,
        top_k=50,
        repeat_penalty=1.2,
    )
    text = out["choices"][0]["message"]["content"]
    return {"text": text.strip()}
