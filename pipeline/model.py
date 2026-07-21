"""
Loads the same quantized Qwen model used in hf-space/app.py, but for a
one-shot batch run instead of an always-on HTTP server: load once, answer
every queued prompt, then let the process exit.

Default model is Qwen2.5-0.5B-Instruct (not the 1.5B) -- on a t2.micro's
single burstable vCPU the 0.5B generates noticeably faster, which matters
here because generate_content.py now also runs in the same batch window
as process_queue.py. Quality is a step down from the 1.5B; if you want it
back, set MODEL_REPO=Qwen/Qwen2.5-1.5B-Instruct-GGUF and
MODEL_FILE=qwen2.5-1.5b-instruct-q4_k_m.gguf in pipeline/.env.
"""
import os
from pathlib import Path

from huggingface_hub import hf_hub_download
from llama_cpp import Llama

MODEL_REPO = os.environ.get("MODEL_REPO", "Qwen/Qwen2.5-0.5B-Instruct-GGUF")
MODEL_FILE = os.environ.get("MODEL_FILE", "qwen2.5-0.5b-instruct-q4_k_m.gguf")
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "./models"))

# t2.micro = 1 vCPU (burstable) / 1GB RAM. Keep context small and threads
# conservative so the model actually fits and doesn't get OOM-killed.
N_THREADS = int(os.environ.get("LLM_N_THREADS", "1"))
N_CTX = int(os.environ.get("LLM_N_CTX", "2048"))


def load_model() -> Llama:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = hf_hub_download(
        repo_id=MODEL_REPO, filename=MODEL_FILE, local_dir=str(MODEL_DIR)
    )
    return Llama(
        model_path=model_path,
        n_threads=N_THREADS,
        n_ctx=N_CTX,
        n_gpu_layers=0,
        verbose=False,
    )


def generate(llm: Llama, prompt: str, max_tokens: int, temperature: float) -> str:
    out = llm.create_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
        top_p=0.92,
        top_k=50,
        repeat_penalty=1.2,
    )
    return out["choices"][0]["message"]["content"].strip()
