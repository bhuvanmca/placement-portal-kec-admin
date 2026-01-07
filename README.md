# Placement Portal - Full Stack Application

A complete placement portal application with React frontend and Express.js backend, featuring secure authentication with JWT tokens.

## 📁 Project Structure

```
web/
├── frontend/          # React application (Vite)
│   ├── src/          # React components and source code
│   ├── public/       # Static assets
│   ├── index.html    # Main HTML file
│   ├── package.json  # Frontend dependencies
│   └── vite.config.js # Vite configuration
├── backend/          # Express.js API server
│   ├── routes/       # API routes
│   ├── server.js     # Main server file
│   └── package.json  # Backend dependencies
├── package.json      # Root package.json with scripts
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

### Development

#### Start both frontend and backend simultaneously:
```bash
npm run dev
```

#### Start services individually:
```bash
# Frontend only (React + Vite)
npm run dev:frontend

# Backend only (Express.js API)
npm run dev:backend
```

## 🏗️ Architecture

### Frontend (React + Vite)
- Modern interface with responsive design
- Sidebar navigation with form sections
- JWT-based authentication
- Protected routes and user management

### Backend (Express.js)
- RESTful API with JWT authentication
- Password hashing with bcrypt
- CORS and security middleware
- In-memory user storage (production-ready for database integration)

## Features

- **Modern Interface**: Clean, professional design with a blue theme
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Sidebar Navigation**: Collapsible sidebar with sections for different form categories
- **Form Management**: Comprehensive form handling with validation
- **State Management**: Centralized form state using React Context
- **Form Validation**: Real-time validation with error messaging

## Sections

1. **Company Information** - Company details, industry, and location
2. **Drive Information** - Drive type, date, and process details
3. **Profile & Salary Information** - Job profiles, packages, and bond information
4. **Placement Information** - Eligibility criteria and required skills
5. **Optional Form** - Additional information and document requirements

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in terminal)

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.jsx      # Main header with navigation
│   ├── Sidebar.jsx     # Collapsible sidebar navigation
│   └── MainContent.jsx # Main content area with forms
├── context/            # React context for state management
│   └── FormContext.jsx # Form state and validation logic
├── App.jsx            # Main application component
├── App.css           # Global styles
└── main.jsx          # Application entry point
```

## Technologies Used

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **CSS3** - Custom styling with flexbox and grid
- **Context API** - State management for forms
- **ESLint** - Code linting and formatting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
# placement-portal-kec-admin
