const jwt = require('jsonwebtoken');

// OLD CODE:
// const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-secret-key-12345!!!';

// NEW CODE:
// FIX: JWT_SECRET must come from env. No hardcoded fallback in production.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start safely.');
}

/**
 * FIX (Security): authenticate middleware
 * - Removed ignoreExpiration: true → tokens now expire properly
 * - Removed leaking error.message details to client
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // OLD CODE:
    // // SECURITY BUG: The verification is weak. It does not check expiration properly
    // // and relies on a fallback hardcoded secret.
    // const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }); 
    // req.user = decoded;
    // next();

    // NEW CODE:
    // FIX: Token expiration is now enforced (removed ignoreExpiration: true)
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // OLD CODE:
    // // IMPROPER ERROR HANDLING: Leaks full error details including secret key mismatches to the client
    // return res.status(401).json({ error: 'Invalid token.', details: error.message });

    // NEW CODE:
    // FIX: Return a generic message — do not expose internal JWT error details
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

/**
 * authorize - role-based middleware
 * No changes needed here, logic is correct.
 */
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User context missing.' });
    }

    // OLD CODE:
    // if (roles.length && !roles.includes(req.user.role)) {
    //   return res.status(403).json({ error: `Forbidden. Requires role: ${roles.join(' or ')}` });
    // }

    // NEW CODE:
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires one of these roles: ${roles.join(', ')}` });
    }

    next();
  };
};

// OLD CODE:
// // MISSING AUTHORIZATION CHECK: This middleware is meant for Admin actions but is empty
// // or fails to check the role, allowing any authenticated user (e.g. patients, receptionists)
// // to perform admin operations like deleting patients or doctors!
// const authorizeAdminOnlyLegacy = (req, res, next) => {
//   if (!req.user) {
//     return res.status(401).json({ error: 'Unauthorized.' });
//   }
//   // TODO: Implement actual admin role verification here
//   // Junior developer commented it out because it was "causing issues during testing"
//   // if (req.user.role !== 'ADMIN') {
//   //   return res.status(403).json({ error: 'Access denied. Admin only.' });
//   // }
//   next();
// };

// NEW CODE:
/**
 * FIX (Security - Critical): authorizeAdmin
 * Replaced authorizeAdminOnlyLegacy with properly enforced admin-only check.
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden. This action requires Administrator privileges.' });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeAdmin,
};
