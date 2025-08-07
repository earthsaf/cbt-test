const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock the dependencies
jest.mock('../src/models/user');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Authentication System', () => {
  // Test data
  const testUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password_hash: '$2a$10$XFDq3yZ2JQ9z9JtJ9tJ9tO', // Hashed 'Test@1234'
    name: 'Test User',
    role: 'student',
    created_at: new Date(),
    updated_at: new Date()
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        created_at: testUser.created_at,
        updated_at: testUser.updated_at
      });
      bcrypt.hash.mockResolvedValue(testUser.password_hash);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
          name: 'Test User',
          role: 'student'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test@1234',
          name: 'Test User',
          role: 'student'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      User.findOne.mockResolvedValue(testUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('test-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
          role: 'student'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      User.findOne.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
          role: 'student'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET || 'your-secret-key'
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the authentication cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', ['token=test-token']);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie'][0]).toContain('token=;');
    });
  });

  describe('GET /api/auth/password-requirements', () => {
    it('should return password requirements', async () => {
      const response = await request(app)
        .get('/api/auth/password-requirements');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.requirements).toBeDefined();
      expect(response.body.requirements.minLength).toBeDefined();
    });
  });
});