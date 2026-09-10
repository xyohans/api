// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer eyJhbGciOi..."

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // strip "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id: 42, iat, exp }
    req.user = decoded; // attach identity to the request for the route to use
    next(); // ✅ token valid — proceed to the actual route handler
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;