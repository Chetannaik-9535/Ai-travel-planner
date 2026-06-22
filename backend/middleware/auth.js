const jwt = require('jsonwebtoken');

// Middleware to verify JWT token and extract user information
const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied. Missing or malformed Authorization token.',
      });
    }

    // Extract the token part after "Bearer "
    const token = authHeader.substring(7);

    // Verify the token using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded user information to the request object
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed security token.',
    });
  }
};

module.exports = authMiddleware;
