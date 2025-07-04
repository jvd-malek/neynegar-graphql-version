const multer = require("multer")
const path = require("path")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/imgs")
    },

    filename: (req, file, cb) => {
        const name = file.originalname.split(".")[0] + String(Date.now())
        const ext = path.extname(file.originalname)
        cb(null, name + ext)
    }
})

const uploader = multer({ storage })

module.exports = uploader