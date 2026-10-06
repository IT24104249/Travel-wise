from __future__ import annotations

import json
import os
from typing import Any

from google import genai
from google.genai import types


def generate_plan(objective: str, agent_names: list[str], destination: str = "", catalog_items: list[dict[str, Any]] | None = None) -> dict[str, Any] | None:
    """Generate a structured plan; deterministic validation remains authoritative."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        if os.getenv("AI_REQUIRE_GEMINI", "false").lower() == "true":
            raise RuntimeError("GEMINI_API_KEY is required but was not configured.")
        return None

    client = genai.Client(api_key=api_key)
    prompt = (
        "You are the TravelWise planning coordinator. "
        "Create a safe, concise plan for this travel objective. "
        "Do not invent bookings, prices, weather, or personal data. "
        "Return JSON only with keys: summary (string), steps (array of strings), "
        "approval_reason (string). Objective: "
        f"{objective}. Destination: {destination}. "
        f"Approved provider catalog (use item IDs when recommending): {json.dumps(catalog_items or [])}. "
        f"Available specialist agents: {', '.join(agent_names)}."
    )
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite"),
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")
    result = json.loads(response.text)
    if not isinstance(result, dict) or not isinstance(result.get("steps"), list):
        raise RuntimeError("Gemini returned an invalid plan schema.")
    return result
