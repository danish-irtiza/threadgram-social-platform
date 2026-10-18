const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const fs = require("fs").promises;
const fsSync = require("fs");

dotenv.config();

const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
} = process.env;

/**
 * Safely removes a local temporary file from /public/uploads if it exists on disk.
 */
const deleteTempFile = async (filePath) => {
    if (!filePath) return;
    try {
        const targetPath = typeof filePath === "string" ? filePath : filePath?.path;
        if (targetPath && fsSync.existsSync(targetPath)) {
            await fs.unlink(targetPath);
        }
    } catch (err) {
        // Safe silent cleanup — ignore if file is missing or already removed
    }
};

const uploadOnCloudinary = async (file) => {
    if (!file) return null;
    try {
        cloudinary.config({
            cloud_name: (CLOUDINARY_CLOUD_NAME || "").trim(),
            api_key: (CLOUDINARY_API_KEY || "").trim(),
            api_secret: (CLOUDINARY_API_SECRET || "").trim(),
        });

        const result = await cloudinary.uploader.upload(file, {
            resource_type: "auto",
        });

        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return null;
    } finally {
        // Always delete local temporary file after Cloudinary upload attempt
        await deleteTempFile(file);
    }
};

const uploadVideoOnCloudinary = async (file) => {
    if (!file) return null;
    try {
        cloudinary.config({
            cloud_name: (CLOUDINARY_CLOUD_NAME || "").trim(),
            api_key: (CLOUDINARY_API_KEY || "").trim(),
            api_secret: (CLOUDINARY_API_SECRET || "").trim(),
        });

        const result = await cloudinary.uploader.upload(file, {
            resource_type: "video",
            chunk_size: 6 * 1024 * 1024,
        });

        return {
            url: result.secure_url,
            duration: result.duration,
            public_id: result.public_id,
        };
    } catch (error) {
        console.error("Cloudinary video upload error:", error);
        return null;
    } finally {
        // Always delete local temporary file after Cloudinary upload attempt
        await deleteTempFile(file);
    }
};

const deleteFromCloudinary = async (publicId, resourceType = "video") => {
    try {
        cloudinary.config({
            cloud_name: (CLOUDINARY_CLOUD_NAME || "").trim(),
            api_key: (CLOUDINARY_API_KEY || "").trim(),
            api_secret: (CLOUDINARY_API_SECRET || "").trim(),
        });
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error("Cloudinary delete error:", err);
    }
};

module.exports = uploadOnCloudinary;
module.exports.uploadVideoOnCloudinary = uploadVideoOnCloudinary;
module.exports.deleteFromCloudinary = deleteFromCloudinary;
module.exports.deleteTempFile = deleteTempFile;