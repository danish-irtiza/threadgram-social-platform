const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../public/uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        cb(null, safeName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = /^(image|video)\//;
    if (allowed.test(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed'), false);
    }
};

// 500 MB limit for video uploads before Cloudinary transcoding
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
});

const handleMulterError = (err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            status: 'fail',
            message: 'File too large. Maximum upload size is 500 MB.',
        });
    }
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            status: 'fail',
            message: 'Unexpected file field in request.',
        });
    }
    if (err) {
        return res.status(400).json({
            status: 'fail',
            message: err.message || 'File upload error.',
        });
    }
    next();
};

module.exports = upload;
module.exports.upload = upload;
module.exports.handleMulterError = handleMulterError;