FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# HF Spaces expect port 7860; Render injects its own $PORT at runtime.
# Default to 7860 so this Dockerfile still works unmodified on HF Spaces.
EXPOSE 7860
ENV PORT=7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
