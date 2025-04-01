require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000; // Use Render's PORT or 3000 for local

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. File Upload Logic
const configureFileUpload = () => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const fileExt = path.extname(file.originalname);
            cb(null, file.fieldname + "-" + uniqueSuffix + fileExt);
        },
    });

    return multer({ storage });
};

const upload = configureFileUpload();

const handleFileUpload = (req, res, next) => {
    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ message: "Unauthorized: Incorrect password" });
    }

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    console.log("Uploaded file:", req.file.filename);
    // TODO: Store filename in database!

    res.status(200).json({ message: "Resume uploaded successfully!" });
};

app.post("/upload-resume", upload.single("resume"), handleFileUpload, (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: "Multer error: " + err.message });
    } else if (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ message: "Server error during upload" });
    }
    next();
});

// 2. Serve the Uploaded Resume (Placeholder - Database Needed)
let latestResumeFilename = null; // In-memory - REPLACE WITH DATABASE

app.post("/upload-resume", upload.single("resume"), (req, res, next) => {
    if (req.file) {
        latestResumeFilename = req.file.filename; // Store filename (IN-MEMORY)
    }
    next(); // Pass to the next handler (handleFileUpload)
});

app.get("/resume", (req, res) => {
    if (latestResumeFilename) {
        const resumePath = path.join(__dirname, "uploads", latestResumeFilename);
        if (fs.existsSync(resumePath)) {
            res.sendFile(resumePath);
        } else {
            res.status(404).json({ message: "Resume not found" });
        }
    } else {
        res.status(404).json({ message: "No resume uploaded yet" });
    }
});

// 3. Email Sending
const configureEmail = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });
};

const transporter = configureEmail();

const handleSendEmail = async (req, res) => {
    const { name, email, phone, profession, message } = req.body;

    const mailOptions = {
        from: process.env.EMAIL,
        to: "mayakannanc02@gmail.com",
        subject: "New Contact Form Submission",
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nProfession: ${profession}\nMessage: ${message}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Email sent successfully!" });
    } catch (error) {
        console.error("Email error:", error);
        res.status(500).json({ message: "Failed to send email", error });
    }
};

app.post("/send-email", handleSendEmail);

// 4. Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});