# ElevenLabs Integration Guide

## Overview
ElevenLabs is integrated into the OU Law Voice Assistant for text-to-speech (TTS) synthesis. 
It enables generating audio responses from text, used in voice features and testing.
The integration uses the ElevenLabs Python SDK for API interactions.

Key uses:
- Voice synthesis for assistant responses
- Testing TTS in the Streamlit test suite
- Potential for conversational AI agents

## Requirements
### Environment Variables
Add to root `.env`:
```
ELEVENLABS_API_KEY=your_api_key_here  # Required for all ElevenLabs features
ELEVENLABS_DEFAULT_VOICE_ID=optional_default_voice_id  # Fallback voice
```

### Python Dependencies
In `test/requirements.txt` or `backend/requirements.txt`:
```
elevenlabs==0.2.26  # Or latest version
```

## Integration in Test Suite (test/app.py)
The test suite (`test/app.py`) provides comprehensive ElevenLabs testing:

### Client Initialization
```python
from elevenlabs import ElevenLabs
self.elevenlabs_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
```

### Connection Testing
- Fetches available voices
- Verifies API connectivity
- Displays voice count and sample voices

### Voice Selection
- Lists all available voices
- Allows selecting voice via dropdown
- Stores selection in session state

### Speech Synthesis
- Generates MP3 audio from text
- Uses VoiceSettings for stability and similarity
- Supports model: eleven_multilingual_v2
- Provides audio playback and download

### Round-trip Testing
- Combines STT (Whisper) + LLM + TTS (ElevenLabs)
- Tests full voice pipeline with uploaded audio

## Prompts for ElevenLabs (test/prompts.py)
Specialized prompts for ElevenLabs conversational AI:

### Socratic Teaching Prompt
```python
ELEVENLABS_SOCRATIC_PROMPT = """You are a Socratic teaching assistant for the University of Oklahoma Law course {{course}}.

Core behaviors:
- Guide students using the Socratic method, asking probing questions
- Stay strictly within the assigned readings for week {{week}}
- Keep responses brief (2-3 sentences) and conversational
- Always end with one thoughtful question to deepen understanding
- If students drift off-topic, gently redirect to the course materials

Session rules:
- Maximum session length: 5 minutes
- Focus: {{sections}} from the assigned readings
- Teaching style: Guide discovery, don't lecture
- Voice: Professional but approachable

Context will be provided from the course materials. Use it to ground all responses."""
```

### Usage
Format with course details:
```python
prompt = ELEVENLABS_SOCRATIC_PROMPT.replace("{{course}}", course)
    .replace("{{week}}", week)
    .replace("{{sections}}", sections)
```

## Best Practices
- Always check client initialization before use
- Handle API errors gracefully (e.g., invalid voice ID)
- Use environment variables for configuration
- Test with small text snippets first
- Monitor API usage limits

## Troubleshooting
- "Client not initialized": Check ELEVENLABS_API_KEY in .env
- "No voices available": Verify API key and internet connection
- Audio generation fails: Check voice ID and model availability
- For full diagnostics, use the test suite's Voice tab

For production usage, refer to backend routers (voice.py) and services for implementation details.
