# StudyAI

**AI-Powered Voice Learning Assistant for Legal Education**

A modern, browser-based voice assistant that enables Socratic dialogue between law students and AI tutors based on weekly course readings. Built for the University of Oklahoma College of Law to enhance student engagement through intelligent conversation about course materials.

## 🎯 Overview

StudyAI transforms traditional legal education by providing students with an interactive, voice-based learning experience. Students can engage in 5-minute Socratic dialogues with an AI tutor that has deep knowledge of their weekly readings, helping them develop critical thinking skills and better understand complex legal concepts.

### Key Features

- **🎤 Voice-First Interaction**: Real-time WebRTC voice sessions with ElevenLabs AI voices
- **📚 Intelligent Document Processing**: LangChain-powered PDF ingestion, chunking, and vector indexing
- **🧠 Claude-Powered Reasoning**: Anthropic Claude handles tutoring prompts and Socratic dialogue
- **🎨 Modern Web Interface**: Next.js frontend with responsive design and OU Law branding
- **🔒 Secure & Private**: Local SQLite storage, JWT authentication, and FERPA-compliant design

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                     │
│  • Student/Professor Dashboards                         │
│  • Voice Session Interface                              │
│  • Real-time WebRTC Audio                              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────┐
│                  FastAPI Backend                         │
│  • Authentication & Authorization                       │
│  • LangChain Document Pipeline                         │
│  • Vector Storage (FAISS/Chroma)                       │
│  • Claude API Integration                              │
│  • ElevenLabs Voice Management                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   SQLite Database                        │
│  • Users, Courses, Weeks                               │
│  • Document Metadata & Chunks                          │
│  • Vector Embeddings                                   │
│  • Session History                                     │
└──────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Anthropic API key
- ElevenLabs API key

### 1. Clone & Setup

```bash
git clone https://github.com/Digital-Initiative-OU-Law/studyai.git
cd studyai

# Copy environment template
cp .env.example .env
# Edit .env with your API keys
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3001` to access the application.

## 📚 Usage

### For Students

1. **Login** with your email and password
2. **Select Role** → Student
3. **Choose Course** (Professor Harrington or Professor Brice)
4. **Pick Week** (1-16)
5. **Select Voice** from 5 AI voice options
6. **Start Session** for a 5-minute Socratic dialogue

### For Professors

1. **Login** with professor credentials
2. **Select Role** → Professor
3. **Choose Week** for content upload
4. **Drag & Drop** weekly PDF readings
5. **Monitor Processing** status (extract → chunk → embed → index)
6. **View Analytics** on student engagement

## 🛠️ Technology Stack

### Backend
- **FastAPI**: High-performance async web framework
- **SQLite**: Zero-configuration local database
- **LangChain**: Document processing and AI orchestration
- **FAISS/Chroma**: Local vector storage for embeddings
- **SentenceTransformers**: Local embedding generation

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible component library
- **WebRTC**: Real-time voice communication

### AI & Voice
- **Anthropic Claude**: LLM for reasoning and tutoring
- **ElevenLabs**: AI voice synthesis and WebRTC
- **Local Embeddings**: Privacy-focused vector generation

## 🔧 Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=your_claude_api_key
ELEVEN_API_KEY=your_elevenlabs_api_key
JWT_SECRET=your_jwt_secret

# Optional
SESSION_MAX_SECONDS=300
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_VOICE_IDS=voice1,voice2,voice3,voice4,voice5
```

### Database Schema

The system uses SQLite with the following core tables:
- `users`: Authentication and role management
- `courses`: Course structure and professor assignments
- `weeks`: Weekly content organization
- `readings`: PDF metadata and file paths
- `chunks`: Text chunks for vector search
- `summaries`: AI-generated weekly summaries
- `conversations`: Session transcripts and metadata
- `audio_blobs`: Voice session recordings

## 📁 Project Structure

```
studyai/
├── backend/                 # FastAPI application
│   ├── app/                # Core application code
│   ├── data/               # Local storage
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js application
│   ├── app/                # App Router pages
│   ├── components/         # React components
│   └── package.json        # Node dependencies
├── docs/                   # Project documentation
│   ├── Plan.md            # Architecture overview
│   ├── Backend.md         # Backend implementation
│   ├── Frontend.md        # Frontend implementation
│   └── Progress.md        # Development progress
└── .env                    # Environment configuration
```

## 🔒 Security & Privacy

- **FERPA Compliance**: Student data protection and privacy
- **Local Storage**: All data stored locally, no cloud dependencies
- **JWT Authentication**: Secure, short-lived tokens
- **Role-Based Access**: Student/Professor/Admin permissions
- **Content Moderation**: AI-powered conversation filtering
- **Session Limits**: 5-minute maximum voice sessions

## 🧪 Development

### Local Development

```bash
# Backend (Port 8000)
cd backend
python -m uvicorn app.main:app --reload

# Frontend (Port 3001)
cd frontend
npm run dev
```

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Database Management

```bash
# Reset database
cd backend
rm data/databases/*.db
python -m alembic upgrade head

# View data
sqlite3 data/databases/main.db
```

## 📊 Performance Targets

- **Voice Latency**: < 500ms round-trip
- **Document Processing**: < 30s for 50-page PDF
- **Search Response**: < 200ms for vector similarity
- **Session Start**: < 3s to first audio
- **UI Response**: < 100ms for all interactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript strict mode for frontend
- Maintain comprehensive documentation
- Write clear commit messages
- Test thoroughly before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍🏫 Team

**Principal Investigators**: Sean A. Harrington & Kenton Brice 

**Institution**: University of Oklahoma College of Law  
**Project**: Digital Initiative for Legal Education

## 🙏 Acknowledgments

- **Anthropic**: Claude AI models for intelligent tutoring
- **ElevenLabs**: High-quality voice synthesis
- **LangChain**: Document processing and AI orchestration
- **OU Law Faculty**: Domain expertise and guidance

## 📞 Support

For technical support or questions about the project:
- **Issues**: [GitHub Issues](https://github.com/Digital-Initiative-OU-Law/studyai/issues)
- **Documentation**: See the `/docs` folder for detailed guides
- **Contact**: Reach out to the OU Law Digital Initiative team

---

**StudyAI** - Transforming legal education through intelligent voice interaction.
