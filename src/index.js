require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const getUserFromToken = require('./utils/getUserFromToken');

// Import GraphQL type definitions and resolvers
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Log file details for debugging
        console.log('Processing file:', {
            originalname: file.originalname,
            mimetype: file.mimetype
        });

        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            console.log('File rejected:', file.originalname, 'Mime type:', file.mimetype);
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

const startServer = async () => {
    const app = express();

    // Enable CORS for all routes
    app.use(cors());
    
    // Parse JSON bodies
    app.use(express.json());

    // Serve uploaded files
    app.use('/uploads', express.static(uploadsDir));

    // Add file upload endpoint
    app.post('/upload', (req, res, next) => {
        console.log('Upload request received');
        next();
    }, upload.fields([
        { name: 'cover', maxCount: 1 },
        { name: 'images', maxCount: 5 }
    ]), (req, res) => {
        console.log('Processing upload request');
        console.log('Files:', req.files);
        console.log('Headers:', req.headers);

        try {
            if (!req.files) {
                console.log('No files in request');
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const files = req.files;
            console.log('Processing files:', files);

            const result = {
                cover: files.cover ? `/uploads/${files.cover[0].filename}` : null,
                images: files.images ? files.images.map(file => `/uploads/${file.filename}`) : []
            };

            console.log('Files uploaded successfully:', result);
            res.json(result);
        } catch (error) {
            console.error('Error uploading files:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({ error: 'Error uploading files: ' + error.message });
        }
    });

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        formatError: (error) => {
            if (process.env.NODE_ENV === 'production') {
                delete error.extensions?.stacktrace;
            }
            return error;
        },
        introspection: true
    });

    await server.start();

    // Mount Apollo middleware with context
    app.use(
        '/graphql',
        expressMiddleware(server, {
            context: async ({ req }) => {
                const token = req.headers.authorization;        
                const user = await getUserFromToken(token);
                return { user, req };
            }
        })
    );

    const PORT = process.env.PORT || 4000;
    const MONGODB_URI = process.env.MONGODB_URI;

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`GraphQL Playground available at http://localhost:${PORT}/graphql`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

startServer().catch((error) => {
    console.error('Error starting server:', error);
    process.exit(1);
}); 