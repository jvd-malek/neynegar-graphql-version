const jwt = require("jsonwebtoken");
const userModel = require("../models/User");
const { isValidObjectId } = require("mongoose");

const getUserFromToken = async (token) => {
    try {
        if (!token) {
            console.log('No token provided');
            return null;
        }
        console.log('Token received:', token);
        
        const jwtPayload = jwt.verify(token, process.env.JWT_KEY);
        console.log('JWT Payload:', jwtPayload);
        
        if (isValidObjectId(jwtPayload.id)) {
            const user = await userModel.findById(jwtPayload.id);
            console.log('User found:', user ? 'Yes' : 'No');
            return user;
        }
        console.log('Invalid ObjectId in token');
        return null;
    } catch (error) {
        console.error('Error in getUserFromToken:', error.message);
        return null;
    }
};

module.exports = getUserFromToken;