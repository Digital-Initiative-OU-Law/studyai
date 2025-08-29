# OU Law Voice Assistant - Master Plan & Roadmap
*Version 2.0 - Simplified Architecture with SQLite & Langchain*

## Executive Summary

Build a streamlined browser-based voice assistant for OU Law courses that allows professors to upload weekly PDFs and students to engage in Socratic dialogue about the readings. This version simplifies the architecture using SQLite for local storage, Langchain for intelligent document processing and conversation management, and Claude API for reasoning with ElevenLabs for voice interactions.

## Core Architecture Decisions

### 1. Database: SQLite
- **Why**: Zero-configuration, serverless, single-file database perfect for development and moderate-scale deployment
- **Benefits**: No Docker/PostgreSQL setup, portable, excellent for embedding vectors with sqlite-vss extension
- **Trade-offs**: Limited concurrent writes, but acceptable for educational use case

### 2. AI Stack: Langchain + Claude
- **Document Processing**: Langchain's document loaders, text splitters, and embedding pipeline
- **Vector Store**: Langchain's SQLite vector store or Chroma (local persistence)
- **Conversation**: Langchain's conversation chains with Claude as the LLM
- **Benefits**: Unified framework, extensive tooling, better prompt management

### 3. Voice: ElevenLabs WebRTC
- **Unchanged**: Keep low-latency WebRTC for real-time voice
- **5 Voice Options**: Including custom Sean voice
- **5-Minute Sessions**: Hard cutoff with graceful ending

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Login/    │  │   Student    │  │  Professor   │  │
│  │    Roles    │  │  Dashboard   │  │  Dashboard   │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Voice Session Interface               │  │
│  │  • WebRTC to ElevenLabs                         │  │
│  │  • Pulsing Orb Visualization (VoiceOrb)         │  │
│  │  • Live Transcript                              │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────┐
│                  FastAPI Backend                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Core Services                        │  │
│  │  • Auth (JWT)        • Session Management        │  │
│  │  • File Upload       • Voice Token Minting       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Langchain Pipeline                     │  │
│  │  • Document Loading (PyPDF)                      │  │
│  │  • Text Splitting & Chunking                     │  │
│  │  • Embedding (Local SentenceTransformers)        │  │
│  │  • Vector Storage (FAISS/Chroma local)           │  │
│  │  • RAG Retrieval                                 │  │
│  │  • Conversation Chains                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              External APIs                        │  │
│  │  • Claude API (Reasoning only)                   │  │
│  │  • ElevenLabs (Voice Synthesis & Recognition)    │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   SQLite Database                        │
│  • users.db       - User accounts & roles               │
│  • courses.db     - Course/week structure               │
│  • documents.db   - PDF metadata & chunks               │
│  • vectors.db     - Embeddings (or Chroma)              │
│  • sessions.db    - Conversation history                │
└──────────────────────────────────────────────────────────┘
```

## Feature Set

### Student Features
1. **Authentication**: Email/password login with role selection
2. **Course Selection**: Choose professor (Sean A. Harrington or Kenton Brice)
3. **Week Selection**: Pick specific week (1-16)
4. **Voice Selection**: Choose from 5 voice options
5. **Voice Session**: 
   - 5-minute Socratic dialogue
   - Real-time WebRTC audio
   - Live transcript display
   - Pulsing orb visualization
   - Automatic session recording

### Professor Features
1. **Content Management**: Upload PDFs per week
2. **Processing Pipeline**: Automatic text extraction and indexing
3. **Theme Generation**: AI-generated discussion topics
4. **Analytics**: View student engagement metrics

### Admin Features
1. **User Management**: Assign roles (Student/Professor/Admin)
2. **System Monitoring**: View service health and usage
3. **Content Moderation**: Review flagged conversations

## Technical Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + shadcn/ui
- **Voice**: WebRTC with ElevenLabs SDK
- **Visualization**: Web Audio API for orb pulsing
- **State**: React hooks + Context API

### Backend
- **Framework**: FastAPI with async support
- **Database**: SQLite with sqlite-vss for vectors
- **Auth**: JWT with python-jose
- **Document Processing**: Langchain
- **LLM**: Anthropic Claude API
- **Voice**: ElevenLabs API
- **File Storage**: Local filesystem

### AI/ML Pipeline
- **Document Loading**: Langchain PyPDFLoader
- **Text Splitting**: RecursiveCharacterTextSplitter
- **Embeddings**: sentence-transformers (local); no remote embedding APIs
- **Vector Store**: FAISS (default) or Chroma (local persistence)
- **Retrieval**: Langchain VectorStoreRetriever
- **Conversation**: ConversationChain with Claude
- **Moderation**: Claude-based content filtering

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Project structure and repository setup
- [x] SQLite database schema design
- [x] Basic FastAPI skeleton with health checks
- [x] Next.js project scaffolded
- [x] Environment configuration
- [x] Single root `requirements.txt` and single root `.env`

### Phase 2: Authentication & Core (Week 1)
- [x] User authentication with JWT
- [ ] Role-based access control
- [ ] User dashboards (Student/Professor/Admin)
- [ ] Basic navigation flow

### Phase 3: Document Pipeline (Week 2)
- [x] PDF upload endpoint
- [x] Langchain document processing pipeline
- [x] Text extraction and chunking
- [x] Embedding generation with SentenceTransformers (local)
- [x] Vector storage in FAISS/Chroma (local)

### Phase 4: RAG System (Week 2)
- [x] Retrieval pipeline setup
- [x] Context-aware search
- [x] Theme generation for weeks (summaries endpoint)
- [ ] Testing with sample documents

### Phase 5: Voice Integration (Week 3)
- [x] ElevenLabs WebRTC token minting
- [x] Voice session UI with pulsing orb (demo + scaffolded page)
- [ ] Live transcript display
- [x] 5-minute timer implementation (server + UI)
- [ ] Session recording and storage

### Phase 6: Conversation Engine (Week 3)
- [ ] Langchain conversation chains
- [x] Socratic dialogue prompts (tutor endpoint)
- [x] Context injection from RAG
- [ ] Moderation and guardrails

### Phase 7: Polish & Testing (Week 4)
- [ ] UI/UX refinements
- [ ] Accessibility features
- [ ] Error handling and recovery
- [ ] Performance optimization
- [ ] Integration testing

### Phase 8: Deployment (Week 4)
- [ ] Production configuration
- [ ] Security hardening
- [ ] Monitoring setup
- [ ] Documentation
- [ ] User training materials

## Key Design Principles

### 1. Simplicity First
- Minimize external dependencies
- Use SQLite for everything possible
- Single repository, easy setup

### 2. Educational Focus
- Socratic method at the core
- Stay on course materials
- No distractions or off-topic discussions

### 3. User Experience
- Modern, responsive interface
- Low-latency voice interaction
- Clear visual feedback

### 4. Developer Experience
- Clear code organization
- Comprehensive documentation
- Easy local development

## Conversation Policies

### Allowed
- Discussion of course materials
- Conceptual exploration
- Critical thinking questions
- Regulatory/legal tech topics
- Academic discourse

### Prohibited
- Sexual content
- Partisan politics (except regulatory context)
- Celebrity gossip
- Off-topic tangents
- "Repeat after me" exploits

## Security Considerations

1. **Authentication**: Argon2 password hashing, short-lived JWT tokens
2. **Authorization**: Role-based access control at API level
3. **Input Validation**: Pydantic models for all inputs
4. **File Security**: Type validation, size limits, virus scanning
5. **Content Moderation**: Pre and post-turn moderation with Claude
6. **Rate Limiting**: 3 conversations per week for students
7. **Data Privacy**: FERPA compliance, audit logging

## Performance Targets

- **Voice Latency**: < 500ms round-trip
- **Document Processing**: < 30s for 50-page PDF
- **Search Response**: < 200ms for vector similarity
- **Session Start**: < 3s to first audio
- **UI Response**: < 100ms for all interactions

## Success Criteria

1. **Functional**
   - All user flows work end-to-end
   - Voice sessions maintain natural conversation
   - Documents process and index correctly

2. **Performance**
   - Meets latency targets
   - Handles 50 concurrent users
   - Scales to 10,000 documents

3. **Quality**
   - Socratic dialogue stays on topic
   - Accurate retrieval from documents
   - Clear audio without artifacts

4. **User Satisfaction**
   - Intuitive interface
   - Reliable voice interaction
   - Valuable educational experience

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite write locks | High | Queue writes, use WAL mode |
| Voice API failures | High | Fallback to text chat |
| Large PDF processing | Medium | Background jobs, chunking |
| Claude API limits | Medium | Rate limiting, caching |
| Network latency | Medium | Edge deployment, CDN |

## Development Workflow

1. **Local Development**
   ```bash
   # Install Python deps from repo root (single requirements.txt)
   pip install -r requirements.txt

   # Backend
   uvicorn backend.app.main:app --reload --port 8000
   
   # Frontend
   cd frontend && npm install && npm run dev -p 3001
   
   # Test Suite
   cd test
   streamlit run app.py
   ```

2. **Testing**
   - Unit tests for core functions
   - Integration tests for API endpoints
   - E2E tests with Puppeteer
   - Manual testing checklist

3. **Deployment**
   - Single server deployment initially
   - Docker containers for portability
   - Nginx reverse proxy
   - SSL with Let's Encrypt

## Budget Considerations

### API Costs (Monthly Estimate)
- Claude API: ~$100 for conversations only (no embeddings)
- ElevenLabs: ~$50 for voice synthesis
- Total: ~$150/month for moderate usage

### Infrastructure
- Single VPS: $20-40/month
- Domain & SSL: $15/year
- Backup storage: $5/month

## Timeline

- **Week 1**: Foundation & Authentication
- **Week 2**: Document Pipeline & RAG
- **Week 3**: Voice & Conversation
- **Week 4**: Polish & Deploy

Total: 4 weeks to production

## Next Steps

1. Set up development environment
2. Create project structure
3. Implement Phase 1 foundation
4. Begin iterative development
5. Regular testing and feedback

## Appendix: Technology Choices Rationale

### Why SQLite?
- No server setup required
- Excellent for read-heavy workloads
- Built-in full-text search
- Extensions for vector similarity
- Single file backup/restore

### Why Langchain?
- Unified document processing pipeline
- Built-in vector stores
- Conversation management
- Extensive integrations
- Active community

### Why Claude?
- Superior reasoning capabilities
- Better context understanding
- More reliable Socratic dialogue
- Cleaner API interface
- Competitive pricing

### Why Keep ElevenLabs?
- Best-in-class voice quality
- Low latency WebRTC support
- Multiple voice options
- Reliable service
- Good documentation

## Conclusion

This simplified architecture maintains all the educational value while dramatically reducing operational complexity. By using SQLite and Langchain, we eliminate database management overhead and gain a powerful, unified AI pipeline. The focus remains on delivering an exceptional Socratic learning experience for OU Law students.
