const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        // Check for token in Authorization header first
        const authHeader = req.headers.authorization;
        let token = authHeader?.split(' ')[1];

        // If no token in header, check cookies
        if (!token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        
        // Store both userId and full user object for compatibility
        req.userId = decoded.userId;
        req.user = decoded;
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid token" });
        }
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = authMiddleware;