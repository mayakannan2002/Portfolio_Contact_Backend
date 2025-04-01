require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000; // Use Render's PORT or 5000 for local

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File Upload Configuration
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
        cb(null, "resume-" + uniqueSuffix + fileExt);
    },
});

const upload = multer({ storage });

// Store latest uploaded resume filename
let latestResumeFilename = null;

// Handle Resume Upload and Delete Old File
const handleFileUpload = (req, res) => {
    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ message: "Unauthorized: Incorrect password" });
    }

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    // Delete old resume if it exists
    if (latestResumeFilename) {
        const oldResumePath = path.join(__dirname, "uploads", latestResumeFilename);
        if (fs.existsSync(oldResumePath)) {
            fs.unlinkSync(oldResumePath);
        }
    }

    // Store the new filename
    latestResumeFilename = req.file.filename;
    console.log("Uploaded new resume:", latestResumeFilename);

    res.status(200).json({ message: "Resume uploaded successfully!" });
};

app.post("/upload-resume", upload.single("resume"), handleFileUpload);

// Serve the Latest Resume
app.get("/resume", (req, res) => {
    if (latestResumeFilename) {
        const resumePath = path.join(__dirname, "uploads", latestResumeFilename);
        if (fs.existsSync(resumePath)) {
            return res.sendFile(resumePath);
        }
    }
    res.status(404).json({ message: "No resume uploaded yet" });
});

// Email Configuration
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});

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

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
