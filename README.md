# Professional Chat Application

A full-stack, real-time chat application built with modern technologies including MySQL, Sequelize ORM, Kafka message queue, Redis caching, JWT authentication, Node.js backend, and Next.js frontend.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using Socket.io
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **User Search**: Find users by email or username with Redis caching
- **One-to-One Chat**: Private conversations between users
- **Online Status**: Real-time online/offline status indicators
- **Caching**: Redis caching for improved performance
- **Professional UI**: Modern, business-class design with glassmorphism and smooth animations
- **TypeScript**: Fully typed codebase for better developer experience

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express** - Server framework
- **TypeScript** - Type safety
- **MySQL** - Relational database
- **Sequelize** - ORM with TypeScript support

- **Redis** (ioredis) - Caching layer
- **Socket.io** - Real-time WebSocket communication
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **Next.js 14** - React framework with Pages Router
- **TypeScript** - Type safety
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **CSS Modules** - Component-scoped styling

## 📋 Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose** (for infrastructure services)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
cd /home/saro/Downloads/Chat-app
```

### 2. Start Infrastructure Services

Start MySQL, Kafka, and Redis using Docker Compose:

```bash
docker-compose up -d
```

Verify all services are running:

```bash
docker-compose ps
```

### 3. Set Up Backend

```bash
cd backend
npm install
```

The `.env` file is already configured for development. Start the backend server:

```bash
npm run dev
```

The backend will start on `http://localhost:5000`

### 4. Set Up Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`

### 5. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## 📁 Project Structure

```
Chat-app/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── models/          # Sequelize models
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   ├── services/        # Kafka, Redis, Socket.io
│   │   ├── utils/           # JWT utilities
│   │   └── server.ts        # Main server file
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── components/          # React components
│   ├── context/             # React context providers
│   ├── lib/                 # API client, Socket.io
│   ├── pages/               # Next.js pages
│   ├── styles/              # CSS modules
│   ├── types/               # TypeScript types
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml       # Infrastructure services
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Users
- `GET /api/users/search?query=...` - Search users (protected)
- `GET /api/users/:id` - Get user profile (protected)

### Conversations
- `GET /api/conversations` - Get all conversations (protected)
- `GET /api/conversations/:userId` - Get or create conversation (protected)

### Messages
- `POST /api/messages/send` - Send message (protected)
- `GET /api/messages/:conversationId` - Get message history (protected)
- `PUT /api/messages/:messageId/read` - Mark message as read (protected)

## 🎨 Design Features

- **Dark Mode Theme**: Professional dark color scheme
- **Glassmorphism**: Modern frosted glass effects
- **Smooth Animations**: Micro-interactions and transitions
- **Responsive Design**: Works on desktop and mobile
- **Premium Color Palette**: HSL-based gradient colors
- **Inter Font**: Modern, professional typography

## 🔧 Development

### Backend Development

```bash
cd backend
npm run dev  # Start with nodemon hot-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Start Next.js dev server
```

### Build for Production

Backend:
```bash
cd backend
npm run build
npm start
```

Frontend:
```bash
cd frontend
npm run build
npm start
```

## 🐳 Docker Services

The application uses the following Docker services:

- **MySQL** (port 3306) - Database
- **Redis** (port 6380) - Cache

To stop services:
```bash
docker-compose down
```

To view logs:
```bash
docker-compose logs -f
```

## 📝 Environment Variables

Backend `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chatapp
DB_USER=chatuser
DB_PASSWORD=chatpassword

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=chat-app
KAFKA_TOPIC_MESSAGES=chat-messages

REDIS_HOST=localhost
REDIS_PORT=6379

BACKEND_PORT=5000
CORS_ORIGIN=http://localhost:3000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Built with latest 2024 documentation for all technologies
- Inspired by modern chat applications like Slack and Discord
- Professional business-class UI design principles
