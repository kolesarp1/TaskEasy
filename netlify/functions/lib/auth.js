const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getTokenFromCookies(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookie.parse(cookieHeader);
  return cookies.token || null;
}

function createCookieHeader(token) {
  const maxAge = 7 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function createClearCookieHeader() {
  return 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromCookies,
  createCookieHeader,
  createClearCookieHeader,
};
