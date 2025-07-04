const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get upload type from request (articles, products, etc.)
        const uploadType = req.uploadType || 'default';
        const uploadDir = `uploads/${uploadType}`;
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Create multer instance
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    }
});

// Middleware factory for different upload types
const createUploadMiddleware = (uploadType, fieldName = 'cover', maxFiles = 1) => {
    return (req, res, next) => {
        req.uploadType = uploadType;
        if (maxFiles > 1) {
            upload.array(fieldName, maxFiles)(req, res, (err) => {
                if (err) {
                    return res.status(400).json({ error: err.message });
                }
                next();
            });
        } else {
            upload.single(fieldName)(req, res, (err) => {
                if (err) {
                    return res.status(400).json({ error: err.message });
                }
                next();
            });
        }
    };
};

// Function to delete file
const deleteFile = (filePath) => {
    if (filePath) {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
};

// Function to delete multiple files
const deleteFiles = (filePaths) => {
    if (Array.isArray(filePaths)) {
        filePaths.forEach(filePath => deleteFile(filePath));
    }
};

// Function to get file URL
const getFileUrl = (file) => {
    if (!file) return null;
    return `/${file.path}`;
};

// Function to get multiple file URLs
const getFileUrls = (files) => {
    if (!files) return { cover: null, images: [] };
    if (Array.isArray(files)) {
        const urls = files.map(file => getFileUrl(file));
        return {
            cover: urls[0] || null,
            images: urls.slice(1)
        };
    }
    return {
        cover: getFileUrl(files),
        images: []
    };
};

module.exports = {
    createUploadMiddleware,
    deleteFile,
    deleteFiles,
    getFileUrl,
    getFileUrls
}; 