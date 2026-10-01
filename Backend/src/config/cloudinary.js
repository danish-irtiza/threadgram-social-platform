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

        if (fsSync.existsSync(file)) {
            await fs.unlink(file);
        }

        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        if (file && fsSync.existsSync(file)) {
            await fs.unlink(file);
        }
        return null;
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

        if (fsSync.existsSync(file)) {
            await fs.unlink(file);
        }

        return {
            url: result.secure_url,
            duration: result.duration,
            public_id: result.public_id,
        };
    } catch (error) {
        console.error("Cloudinary video upload error:", error);
        if (file && fsSync.existsSync(file)) {
            await fs.unlink(file);
        }
        return null;
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