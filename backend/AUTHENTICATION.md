# Authentication System

This document describes the authentication system for the CBT (Computer-Based Testing) application.

## Overview

The authentication system uses JWT (JSON Web Tokens) for stateless authentication. Tokens are stored in HTTP-only cookies for enhanced security.

## Features

- User registration with email and password
- Secure password hashing with bcrypt
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting on login attempts
- Password strength validation
- Secure cookie settings
- CORS protection
- Input validation and sanitization

## API Endpoints

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "student"
}
```

**Roles:** `student`, `teacher`, `admin`

### POST /api/auth/login
Authenticate a user and get a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "student"
}
```

### POST /api/auth/logout
Logout the current user (clears the authentication cookie).

### GET /api/auth/me
Get the currently authenticated user's information.

### GET /api/auth/password-requirements
Get the password requirements for registration.

## Security Measures

1. **Password Hashing**: Uses bcrypt with a work factor of 10
2. **JWT Tokens**: Signed with a secret key and set to expire after 8 hours
3. **HTTP-only Cookies**: Tokens are stored in HTTP-only cookies to prevent XSS attacks
4. **Rate Limiting**: 5 login attempts per 15 minutes per IP address
5. **CORS**: Only allows requests from trusted origins
6. **Input Validation**: All user input is validated and sanitized
7. **Secure Headers**: Security headers are set for all responses
8. **Error Handling**: Generic error messages to prevent information leakage

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/cbt_system

# JWT
JWT_SECRET=your_jwt_secret_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    // Additional error details (if any)
  }
}
```

## Rate Limiting

- 5 login attempts per 15 minutes per IP address
- Successful logins don't count against the limit
- After 5 failed attempts, the client must wait 15 minutes before trying again

## Session Management

- Tokens are valid for 8 hours
- Tokens are automatically refreshed with each request
- Logout clears the authentication cookie

## Testing

To test the authentication system, you can use the following test accounts:

```
Admin: admin@example.com / Admin@123
Teacher: teacher@example.com / Teacher@123
Student: student@example.com / Student@123
```

## Security Best Practices

1. Always use HTTPS in production
2. Keep your JWT secret secure and never commit it to version control
3. Regularly rotate your JWT secret
4. Implement account lockout after too many failed attempts
5. Use secure, random passwords
6. Keep all dependencies up to date
7. Monitor and log authentication attempts
8. Implement proper session timeout
