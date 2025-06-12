const authController = require('../src/controllers/authController');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../src/models', () => ({ User: { findOne: jest.fn() } }));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

test('login fails with invalid credentials', async () => {
  const req = { body: { username: 'x', password: 'y', role: 'student' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const { User } = require('../src/models');
  User.findOne.mockResolvedValue(null);
  await authController.login(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
}); 