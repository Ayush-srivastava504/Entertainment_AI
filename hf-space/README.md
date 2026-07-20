---
title: Entertainment AI Neural Generator
emoji: 🎬
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
---

# Neural Generator Space

One small quantized instruct model (default: Qwen2.5-1.5B-Instruct GGUF),
served over `/generate`. This is the same "one model, many prompts" pattern
as RepoSense's `neural-generator` service — just running on a free HF Space
instead of a self-hosted Docker container.

## Endpoints

- `GET /health` → `{ status, model_loaded }`
- `POST /generate` → body `{ prompt, max_tokens?, temperature? }` → `{ text }`

## Using this from the Next.js app

In the frontend's environment variables, set:

```
HF_SPACE_URL=https://<your-username>-<your-space-name>.hf.space/generate
```

If you make the Space private, also set `HF_TOKEN` on the frontend and this
Space will need to check the `Authorization` header itself (add that check
to `app.py` if so — omitted here for a public Space by default).
