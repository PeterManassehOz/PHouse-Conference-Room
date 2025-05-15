const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Hashes password and generates a JWT token.
 * @param {Object} user - The user object (must have _id and isAdmin)
 * @param {string} password - Plain text password
 * @returns {Promise<{hashedPassword: string, token: string}>}
 */
const generateTokenPassword = async (user, password) => {
    try {
        // Hash password with 10 salt rounds
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return { hashedPassword, token };
    } catch (error) {
        throw new Error('Error creating user: ' + error.message);
    }
};

/**
 * Verifies user password and generates a JWT token.
 * @param {Object} user - The user object from the database.
 * @param {string} password - Plain text password entered by the user.
 * @returns {Promise<{token: string}>}
 */
const verifyPasswordAndGenerateToken = async (user, password) => {
    try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return { token };
    } catch (error) {
        throw new Error('Error logging in: ' + error.message);
    }
};


module.exports = { generateTokenPassword, verifyPasswordAndGenerateToken };
