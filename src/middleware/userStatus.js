// const userModel = require("../model/userModel")

module.exports.isAdmin = async (req, res, next ) => {
    
    if (req.user.status === "admin") {
        return next()
    }

    return res.json({ msg: "access denide" })
}

module.exports.isOwner = async (req, res, next ) => {
    
    if (req.user.status === "owner") {
        return next()
    }

    return res.json({ msg: "access denide" })
}

module.exports.isOwnerOrAdmin = async (req, res, next ) => {
    
    if (req.user.status === "owner" || req.user.status === "admin") {
        return next()
    }
    
    return res.json({ msg: "access denide" })
}

module.exports.banUser = async (req, res, next ) => {
    
    if (req.user.status !== "ban-user") {
        return next()
    }

    return res.json({ msg: "access denide" })
}

module.exports.notifUser = async (req, res, next ) => {
    
    if (req.user.status === "notif-user") {
        return next()
    }

    return res.json({ msg: "access denide" })
}