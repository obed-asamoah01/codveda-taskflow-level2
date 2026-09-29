# TaskFlow — Level 2 (Intermediate)

Full-Stack Development Internship @ Codveda Technologies

## Overview

Level 2 extends the Level 1 TaskFlow app with user accounts. Users can
register and log in, every task belongs to the user who created it, and
all task routes are protected with JWT authentication.

## Tasks Completed

- **Task 2: Authentication and Authorization**
  Signup and login with bcrypt password hashing and JWT. Task routes are
  protected by middleware, with role support (`user` / `admin`).

- **Task 3: Database Integration**
  MongoDB with Mongoose. Tasks reference their owner through a `User`
  relationship, indexes on lookup fields, and validation before saving.

## Tech Stack

| Layer    | Technology                        |
|----------|------------------------------------|
| Backend  | Node.js, Express.js                |
| Database | MongoDB Atlas, Mongoose            |
| Auth     | bcrypt, JSON Web Tokens (JWT)      |
| Frontend | HTML5, CSS3, Vanilla JavaScript    |

## Project Structure

```
LEVEL 2/
├── backend/
│   ├── middleware/auth.js
│   ├── models/User.js
│   ├── models/Task.js
│   ├── routes/auth.js
│   ├── routes/tasks.js
│   ├── server.js
│   ├── .env
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

## API Endpoints

| Method | Endpoint             | Auth Required | Description                 |
|--------|-----------------------|----------------|------------------------------|
| POST   | `/api/auth/register`  | No             | Create an account            |
| POST   | `/api/auth/login`     | No             | Log in and receive a JWT     |
| GET    | `/api/tasks`          | Yes            | List the user's own tasks    |
| GET    | `/api/tasks/:id`      | Yes            | Get one of the user's tasks  |
| POST   | `/api/tasks`          | Yes            | Create a task                |
| PUT    | `/api/tasks/:id`      | Yes            | Update a task                |
| DELETE | `/api/tasks/:id`      | Yes            | Delete a task                |

Protected routes require the header `Authorization: Bearer <token>`.

## How It Works

- Passwords are hashed with bcrypt before being saved and are never
  returned in any API response.
- Login returns a signed JWT (7-day expiry). A `protect` middleware
  verifies this token on every task-related request.
- Each task stores the `user` who created it. Ownership is taken from
  the verified token, never trusted from the request body — users can
  only read, update, or delete their own tasks.
- The frontend stores the token in `localStorage`, attaches it to every
  API call, and redirects back to the login screen on a 401 response.

## Getting Started

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_long_random_secret
```

Start the server:

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

### Frontend

With the backend running, open `frontend/index.html` in a browser
(or use a tool like Live Server). Register a new account or log in
to access the task manager.

## Key Concepts Demonstrated

- Password hashing with bcrypt
- Stateless authentication with JSON Web Tokens
- Route protection via Express middleware
- Ownership-based authorization (users can only access their own data)
- Data relationships in MongoDB via Mongoose `ref`
- Token persistence and session handling on the frontend
