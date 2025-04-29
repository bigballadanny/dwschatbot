"""
FastAPI app for admin document ingestion (transcripts, etc) into mem0 via SSE.
"""
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
from mem0_sse_client import Mem0SSEClient

MEM0_URL = os.getenv("MEM0_URL", "http://localhost:8050")

app = FastAPI(title="LightRAG Admin API")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    text: str
    title: Optional[str] = None
    tags: Optional[list[str]] = None

@app.post("/admin/ingest-doc")
def ingest_doc(request: IngestRequest):
    """
    Ingest a document (e.g., transcript) into mem0 via SSE.
    """
    client = Mem0SSEClient(MEM0_URL)
    text = request.text
    # Optionally, prepend title/tags to the text for richer context
    if request.title:
        text = f"Title: {request.title}\n{text}"
    if request.tags:
        text = f"Tags: {', '.join(request.tags)}\n{text}"
    result = client.save_memory(text)
    return JSONResponse({"result": result})

@app.post("/admin/ingest-file")
def ingest_file(file: UploadFile = File(...), title: str = Form(None), tags: str = Form(None)):
    """
    Ingest a transcript file into mem0 via SSE.
    """
    content = file.file.read().decode("utf-8")
    tag_list = [t.strip() for t in tags.split(",") if tags] if tags else None
    client = Mem0SSEClient(MEM0_URL)
    text = content
    if title:
        text = f"Title: {title}\n{text}"
    if tag_list:
        text = f"Tags: {', '.join(tag_list)}\n{text}"
    result = client.save_memory(text)
    return JSONResponse({"result": result})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
