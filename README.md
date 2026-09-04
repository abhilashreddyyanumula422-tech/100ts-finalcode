# 100 Transcripts (100TS)

Welcome to the **100 Transcripts** platform! This is a comprehensive, production-ready full-stack application designed to streamline the process of applying for, tracking, and retrieving university transcripts and certificates.

The platform provides a seamless experience for **Students** to track their applications, **Agents** to handle on-ground university visits and document collection, and **Admins** to oversee the entire operation, manage payments, and resolve issues.

---

## 🌟 Key Features

### 🎓 For Students
- **Streamlined Application:** Easy-to-use application forms with Digilocker integration for secure document uploads.
- **Real-Time Tracking:** A beautiful, visual tracking timeline to see exactly where their application is in the process.
- **Action Required Dashboard:** Clear, immediate alerts if documents are missing or rejected, with a one-click "Edit Application" flow to submit corrections.
- **Secure Payments:** Track payment status (Partially Paid, Fully Paid) directly from the dashboard.

### 🕵️ For Agents
- **Field Assignments:** View assigned transcript applications and update statuses directly from the field.
- **Document Collection:** Upload collected documents (e.g., transcripts) which are automatically categorized by application.
- **University Visit Records:** Log GPS coordinates, timestamps, and visit photos as proof of university visits.

### 👑 For Admins
- **Comprehensive Dashboard:** Manage all student requests, agent assignments, and application statuses from a single, centralized hub.
- **Agent Communication:** Built-in WebSocket/Redis-powered chat to communicate securely with agents on the field.
- **Status & Payment Management:** Approve/reject applications, request changes, and manage service fees and balances.
- **Direct Notification System:** Automatically generate and send WhatsApp and Email notifications to students regarding issues or approvals.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (via Vite)
- **Styling:** Tailwind CSS (with custom gradients, glassmorphism, and modern UI tokens)
- **Animations:** Framer Motion
- **Icons:** Lucide React & React Icons
- **State & Routing:** React Router DOM

### Backend
- **Framework:** Django & Django REST Framework (DRF)
- **Real-Time Communication:** Django Channels, Redis (for WebSocket Chat)
- **Database:** SQLite (Development) / MySQL/PostgreSQL (Production ready via `dj-database-url`)
- **Storage:** Configured for local structured media storage, ready for S3 migration.
- **Environment Management:** `python-dotenv` for secure secret management.

---

## 📂 Project Structure

```text
100TS/
├── backend/                  # Django Backend
│   ├── Transcripts/          # Main Django Project
│   │   ├── App/              # Core App (Models, Views, Serializers)
│   │   ├── media/            # Structured File Uploads (by Application ID)
│   │   ├── redis_chat.py     # WebSocket/Redis chat logic
│   │   └── manage.py
│   └── .env                  # Backend Secrets (Database, Secret Key, etc.)
│
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── Admin/            # Admin Dashboards & Management UI
│   │   ├── agent/            # Agent Mobile-First UI
│   │   ├── user/             # Student Application & Tracking UI
│   │   ├── components/       # Reusable UI Components
│   │   └── services/         # API & Axios Configurations
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Redis Server (Required for WebSocket chat)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend/Transcripts

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies (ensure you have a requirements.txt, or install manually)
pip install django djangorestframework django-cors-headers redis channels python-dotenv

# Set up your environment variables
# Copy .env.example to .env and fill in your details (in the backend root)

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start the Django development server
python manage.py runserver
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

---

## 🔐 Environment Variables

Ensure you create a `.env` file in your `backend/` directory with the following variables for production readiness:

```ini
DEBUG=False
SECRET_KEY=your_super_secret_key_here
ALLOWED_HOSTS=localhost,127.0.0.1,.yourdomain.com
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Database (Optional: falls back to SQLite if not provided)
DATABASE_URL=mysql://user:password@localhost:3306/100ts_db

# Redis URL for WebSockets
REDIS_URL=redis://127.0.0.1:6379/1
```

---

## 🛡️ Production Readiness Features
During the latest hardening phase, the following production-ready features were implemented:
- **Structured File Storage:** All uploads (student docs, agent docs, visit photos, chat media) are strictly organized into dynamic `application_<id>` folders to prevent root media clutter and ensure easy cleanup.
- **Environment Isolation:** Hardcoded secrets and database credentials were removed from `settings.py` and moved to a secure `.env` file.
- **UI/UX Polish:** The UI was heavily refined with a modern, clear, and responsive design, including robust form validation and error handling.
