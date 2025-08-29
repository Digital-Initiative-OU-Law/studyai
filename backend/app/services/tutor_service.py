from __future__ import annotations

from typing import Optional

from anthropic import Anthropic

from ..config import settings
from .vector_service import similarity_search


TUTOR_PROMPT = (
    "You are a Socratic teaching assistant. Answer briefly (2-3 sentences), "
    "stay strictly within the provided context from the week's readings, and end with one probing question. "
    "If the question is off-topic or context is insufficient, say so and redirect to the assigned material."
)


def answer_question(*, week_id: int, question: str) -> str:
    docs = similarity_search(week_id, query=question, k=6)
    context = "\n\n".join([d.page_content for d in docs]) if docs else ""
    answer = _call_claude_tutor(TUTOR_PROMPT, question=question, context=context)
    if not answer:
        return "I can’t generate an answer right now. Please try again later."
    return answer


def _call_claude_tutor(instruction: str, *, question: str, context: str) -> Optional[str]:
    if not settings.ANTHROPIC_API_KEY:
        return None
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        msg = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=400,
            temperature=0.3,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": instruction},
                        {"type": "text", "text": f"Question: {question}"},
                        {"type": "text", "text": f"Context from readings:\n{context}"},
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
        return None

