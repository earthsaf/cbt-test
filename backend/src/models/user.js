const db = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },
  
  async create(userData) {
    const { email, password, role, name } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, password, role, name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await db.query(query, [email, hashedPassword, role, name]);
    return rows[0];
  },

  async findOne({ where }) {
    const query = 'SELECT * FROM users WHERE username = $1 AND role = $2';
    const { rows } = await db.query(query, [where.username, where.role]);
    return rows[0];
  },

  async findByPk(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
};

module.exports = User;