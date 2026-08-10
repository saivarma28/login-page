# Geonixa - Authentication Portal

A modern, full-stack authentication web application built with **Node.js, Express, Sequelize (SQLite), and Vanilla HTML5/CSS3/JavaScript**. Featuring a sleek **Light Orange & Warm White** design system with Firebase SMS Phone Authentication, Email/Password login, OTP verification, and Password Reset.

---

## ✨ Features

- 🎨 **Light Orange & White Design System**: Responsive, glassmorphic UI with floating focus rings and toast notifications.
- 🔑 **Dual Email & Phone Authentication**: Single input field supporting both Email Address and Mobile Phone Number input.
- 📱 **Real Firebase SMS OTP**: Integrated with Firebase Web SDK v10 for sending real 6-digit OTP codes directly to mobile handsets.
- 🔒 **Secure Password Management**: Hashed password storage with `bcryptjs` and JWT HTTP-Only cookie session management.
- 🔄 **Password Reset Wizard**: 2-step OTP password reset flow.
- 📊 **User Profile Dashboard**: Animated dashboard displaying user avatar, name, verification status, and provider badges.

---

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, Sequelize ORM, SQLite3, BcryptJS, JSONWebToken, Nodemailer.
- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables), ES6 Modules, FontAwesome Icons, Firebase Web SDK v10.

---

## 🚀 Getting Started

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/saivarma28/login-page.git
cd login-page
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
DB_DIALECT=sqlite

FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
```

### 3. Run Locally

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to:
👉 `http://localhost:5000/`

---

## 📄 License

This project is licensed under the MIT License.
