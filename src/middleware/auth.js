const jwt = require("jsonwebtoken")
const userModel = require("../model/userModel")
const { isValidObjectId } = require("mongoose")

module.exports = async (req, res, next) => {
    try {
        const token = req.header("authorization")
        if (!token) {
            return res.status(403).json({ msg: "this api is protected", state: false })
        }
        const jwtPayload = jwt.verify(token, process.env.JWT_KEY)
        if (isValidObjectId(jwtPayload.id)) {
            const user = await userModel.findById(jwtPayload.id)
                
            req.user = user
            return next()
        } else {
            return res.status(403).json({ msg: "this api is protected", state: false })
        }
    } catch (error) {
        return res.status(403).json({ msg: error, state: false })
    }
}