## 🚀 The Problem
Students today face "Context Switching" fatigue and digital distractions. Switching between a PDF reader, a Pomodoro timer, and a browser to clear doubts kills focus. Current tools are either too sterile (corporate) or too simple.

## 💡 Our Solution
**FunTaskIt** creates an all-in-one immersive environment. It features:
- **Immersive Bookshelf:** Automatically triggers a Pomodoro session when you open a file.
- **In-File AI Tutor:** Highlight any text or image to get instant crystal-clear explanations.
- **Anti-Trespassing Gamification:** A point-based system that rewards deep work but penalizes you if you "trespass" (leave the focus mode).
- **Group Study Tables:** Real-time collaborative rooms with shared materials and AI-generated multiplayer quizzes.

## 🛠️ Tech Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion
- **Backend/Real-time:** Supabase (Auth, PostgreSQL, Real-time Channels)
- **AI Engine:** Google Gemini API (for doubt clearing & quiz generation)
- **File Handling:** React-PDF & Fabric.js (for non-destructive annotations)

## 🏗️ Project Structure
```text
├── components/          # Reusable UI components (Pomodoro, AI Sidebar)
├── lib/                 # API clients and utility functions
├── public/              # Static assets (Pop-culture theme icons)
├── supabase/            # Database schema and migrations
└── app/                 # Next.js pages (Bookshelf, Group Study, Dashboard)
```

## ⚙️ Setup & Installation
Clone the repo:
git clone https://github.com/bbsarada07/cozy-study-hub.git

Install dependencies:
npm install

Environment Variables:
Create a .env.local file and add:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

GEMINI_API_KEY

Run the development server:
npm run dev

### 2. The .gitignore
Crucial for security. **Never** upload your API keys. Create a file named `.gitignore` in your root folder:

```text
# Dependencies
node_modules
.pnp
.pnp.js

# Env Files (Sensitive Info)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build
.next/
out/
build/

# IDEs
.vscode/
.idea/
.DS_Store
```

##MIT License
