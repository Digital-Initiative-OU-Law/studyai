from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session
from anthropic import Anthropic

from ..config import settings
from ..models import Summary
from .vector_service import similarity_search

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = (
    "You are a helpful teaching assistant. Based on the provided context chunks, "
    "produce a concise, well-structured summary of the week's readings in 5-8 bullet points. "
    "Keep the language clear and grounded in the source. If context seems insufficient, say so."
)


def get_or_generate_summary(db: Session, *, week_id: int) -> Summary:
    existing = db.query(Summary).filter(Summary.week_id == week_id).first()
    if existing:
        return existing

    # Retrieve top chunks for week as context
    docs = similarity_search(week_id, query="key points and themes", k=12)
    context = "\n\n".join([d.page_content for d in docs]) if docs else ""

    content = _call_claude_with_context(SUMMARY_PROMPT, context=context)
    if not content:
        # For missing API key, store a placeholder to avoid repeated attempts
        content = "Summary unavailable: LLM not configured."
    
    summary = Summary(
        week_id=week_id,
        content=content,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


def _call_claude_with_context(instruction: str, *, context: str) -> Optional[str]:
    if not settings.ANTHROPIC_API_KEY:
        return None
    
    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=800,
            temperature=0.2,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": instruction},
                        {"type": "text", "text": f"Context:\n{context}"},
                    ],
                }
            ],
        )
        parts = []
        for block in msg.content:
            if block.type == "text":
                parts.append(block.text)
        return "\n".join(parts).strip()
    except Exception:
        logger.exception("Failed to generate summary with Claude API")
        return None

