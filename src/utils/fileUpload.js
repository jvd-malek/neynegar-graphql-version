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

// Function to explore directory structure in cPanel
const exploreDirectory = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            console.log(`Directory does not exist: ${dirPath}`);
            return;
        }
        
        const items = fs.readdirSync(dirPath);
        console.log(`Contents of ${dirPath}:`);
        items.forEach(item => {
            const fullPath = path.join(dirPath, item);
            const stats = fs.statSync(fullPath);
            const type = stats.isDirectory() ? 'DIR' : 'FILE';
            const size = stats.isFile() ? `${(stats.size / 1024).toFixed(2)} KB` : '-';
            console.log(`  ${type} - ${item} ${size}`);
        });
    } catch (error) {
        console.error(`Error exploring directory ${dirPath}:`, error.message);
    }
};

// Helper function to get the actual file path in cPanel
const getActualFilePath = (filePath) => {
    if (!filePath) return null;
    
    console.log('=== getActualFilePath Debug ===');
    console.log('Input filePath:', filePath);
    console.log('Current working directory:', process.cwd());
    
    // Remove leading slash and 'uploads/' prefix if exists
    let cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    cleanPath = cleanPath.replace('uploads/', '');
    
    // Get just the filename
    const filename = path.basename(cleanPath);
    console.log('Cleaned filename:', filename);
    
    // Try to find the file in different possible locations for cPanel
    const possiblePaths = [
        // Current directory + uploads
        path.join(process.cwd(), 'uploads', filename),
        // Current directory + uploads + subdirectories
        path.join(process.cwd(), 'uploads', 'products', filename),
        path.join(process.cwd(), 'uploads', 'articles', filename),
        path.join(process.cwd(), 'uploads', 'default', filename),
        // Going up one level
        path.join(process.cwd(), '..', 'uploads', filename),
        path.join(process.cwd(), '..', 'backend', 'uploads', filename),
        // Going up two levels (in case we're in a subdirectory)
        path.join(process.cwd(), '..', '..', 'uploads', filename),
        path.join(process.cwd(), '..', '..', 'backend', 'uploads', filename),
        // Absolute paths for cPanel
        `/home/neynegar/uploads/${filename}`,
        `/home/neynegar/backend/uploads/${filename}`,
        `/home/neynegar/public_html/uploads/${filename}`,
        `/home/neynegar/public_html/backend/uploads/${filename}`,
        // Try with different upload types
        `/home/neynegar/backend/uploads/products/${filename}`,
        `/home/neynegar/backend/uploads/articles/${filename}`,
        `/home/neynegar/backend/uploads/default/${filename}`
    ];
    
    console.log('Checking possible paths:');
    for (let i = 0; i < possiblePaths.length; i++) {
        const fullPath = possiblePaths[i];
        const exists = fs.existsSync(fullPath);
        console.log(`${i + 1}. ${fullPath} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
        
        if (exists) {
            console.log(`File found at: ${fullPath}`);
            console.log('=== End Debug ===');
            return fullPath;
        }
    }
    
    console.log('No file found in any of the possible paths');
    console.log('=== End Debug ===');
    return null;
};

// Function to delete file
const deleteFile = (filePath) => {
    if (!filePath) return;
    
    try {
        // Get the actual file path in cPanel
        const actualPath = getActualFilePath(filePath);
        
        if (actualPath) {
            try {
                fs.unlinkSync(actualPath);
                console.log(`File deleted successfully: ${actualPath}`);
            } catch (err) {
                console.error(`Failed to delete file: ${actualPath}`, err.message);
            }
        } else {
            console.log(`Could not find file to delete: ${filePath}`);
            console.log('Current working directory:', process.cwd());
            
            // Fallback: try the old method
            const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            const possiblePaths = [
                path.join(process.cwd(), cleanPath),
                path.join(process.cwd(), 'uploads', cleanPath.replace('uploads/', '')),
                path.join(process.cwd(), '..', 'uploads', cleanPath.replace('uploads/', '')),
                path.join(process.cwd(), '..', 'backend', 'uploads', cleanPath.replace('uploads/', '')),
                path.join(process.cwd(), 'uploads', path.basename(cleanPath)),
                path.join(process.cwd(), '..', 'backend', 'uploads', path.basename(cleanPath))
            ];

            let deleted = false;
            for (const fullPath of possiblePaths) {
                try {
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        console.log(`File deleted successfully (fallback): ${fullPath}`);
                        deleted = true;
                        break;
                    }
                } catch (err) {
                    console.log(`Failed to delete from path: ${fullPath}`, err.message);
                    continue;
                }
            }

            if (!deleted) {
                console.log('All fallback paths failed. Tried:', possiblePaths);
            }
        }
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error.message);
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
    getFileUrls,
    getActualFilePath,
    exploreDirectory
}; 