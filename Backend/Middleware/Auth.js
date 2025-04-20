const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        console.log('Auth middleware running for path:', req.path);
        
        // Check for token in Authorization header first
        const authHeader = req.headers.authorization;
        let token = authHeader?.split(' ')[1];
        console.log('Token from Authorization header:', token ? 'Found' : 'Not found');

        // If no token in header, check cookies
        if (!token) {
            token = req.cookies?.token;
            console.log('Token from cookies:', token ? 'Found' : 'Not found');
        }

        if (!token) {
            console.log('No token found in request for path:', req.path);
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        try {
            // Get JWT secret from environment or use fallback
            const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
            console.log('Using JWT secret with length:', jwtSecret.length);
            
            // Verify the token
            const decoded = jwt.verify(token, jwtSecret);
            console.log('Token decoded successfully:', decoded ? 'Success' : 'Failed');
            
            // Store both userId and full user object for compatibility
            if (decoded.user && decoded.user.id) {
                req.userId = decoded.user.id;
            } else if (decoded.id) {
                req.userId = decoded.id;
                // Create compatible structure
                decoded.user = { id: decoded.id };
            } else {
                console.log('Could not find user ID in token');
            }
            
            req.user = decoded;
            
            console.log('Token verified successfully for user:', req.userId);
            next();
        } catch (tokenError) {
            console.error('Token verification error:', tokenError.message);
            if (tokenError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Token has expired" });
            }
            return res.status(401).json({ message: "Invalid token" });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid token" });
        }
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = authMiddleware;
