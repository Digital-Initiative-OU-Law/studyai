# Ngrok Integration Guide

## Overview
Ngrok is used in the OU Law Voice Assistant project for creating secure public tunnels to local services. 
This enables external access for testing and development, particularly for the Streamlit test suite.
The integration uses ngrok's Python library (pyngrok) and command-line tool for tunneling.

Key uses:
- Exposing Streamlit test console externally
- Tunneling to backend API (port 8000)
- Tunneling to frontend (port 3001)
- Remote testing and collaboration

## Requirements
### Environment Variables
Add to root `.env`:
```
NGROK_AUTHTOKEN=your_ngrok_token_here  # Required for authentication
USE_NGROK=true  # Enable auto-tunneling in Streamlit
STREAMLIT_PORT=8501  # Default Streamlit port
```

### Python Dependencies
In `test/requirements.txt` (for Streamlit):
```
pyngrok  # For programmatic tunnel creation
```

### Configuration Files
- `ops/ngrok.yml`: Defines tunnel configurations for all services
  ```yaml
  version: "2"
  authtoken: $NGROK_AUTHTOKEN  # Loaded from env
  tunnels:
    streamlit:
      addr: 8501
      proto: http
    backend:
      addr: 8000
      proto: http
    frontend:
      addr: 3001
      proto: http
  ```

## Integration Points
### Streamlit Test Suite (test/app.py)
- Automatic tunnel creation if `USE_NGROK=true`
- Uses pyngrok to create HTTP tunnel on Streamlit port
- Displays tunnel URL in sidebar
- Handles existing tunnels to avoid duplicates

Code snippet:
```python
if os.getenv("USE_NGROK", "").lower() in {"1", "true", "yes"}:
    from pyngrok import ngrok
    ngrok.set_auth_token(os.getenv("NGROK_AUTHTOKEN"))
    tunnel = ngrok.connect(addr=port, proto="http", bind_tls=True)
    _NGROK_TUNNEL_URL = tunnel.public_url
```

### Startup Scripts
- `scripts/ngrok_start.ps1`: Starts all tunnels defined in `ops/ngrok.yml`
  ```powershell
  # Loads .env and starts ngrok with config
  ngrok start --all --config ops/ngrok.yml
  ```

- `scripts/start_streamlit.ps1`: Launches Streamlit with optional headless mode
  ```powershell
  # Example usage
  pwsh ./scripts/start_streamlit.ps1 -Port 8501 -Headless
  ```

### NGROK_SETUP_GUIDE.md
Project-specific guide in `docs/agent-notes/` and `test/`:
- Quick start instructions
- Configuration options (simple vs reserved domains)
- Troubleshooting common errors
- Environment variable setup
- Testing commands

## Best Practices
- Start services before creating tunnels
- Use simple random tunnels for development (avoid reserved domains initially)
- Keep ngrok running in a separate terminal
- Monitor ngrok dashboard for status
- Clean up tunnels on shutdown to avoid conflicts
- Use the project scripts for consistent startup

From ngrok docs:
- Inspect traffic via ngrok's web interface (http://localhost:4040)
- Use CNAME for custom domains if needed
- Reference agent CLI for advanced options

## Troubleshooting
- "No connection could be made": Ensure target service is running on the specified port
- Auth token errors: Verify NGROK_AUTHTOKEN in .env
- Multiple tunnel conflicts: Run `ngrok kill` or restart
- Remove any references to OpenAI; not used in this project
- Tunnel URL not showing: Check if USE_NGROK is set to true

Common commands:
- Get tunnel info: `python get_ngrok_url.py` (in test/)
- Debug: `python debug_ngrok.py`
- Test standalone: `python test_ngrok_standalone.py`

For full ngrok reference:
- Agent CLI: https://ngrok.com/docs/agent/
- Config: https://ngrok.com/docs/agent/config/
- Python SDK: https://ngrok.com/docs/agent/sdks/python/

Refer to project-specific NGROK_SETUP_GUIDE.md for detailed setup.
