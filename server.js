require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure "uploads" folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, "resume.pdf"); // Overwrite existing resume
  },
});

const upload = multer({ storage });

// Resume Upload Route (Protected with Password)
app.post("/upload-resume", upload.single("resume"), (req, res) => {
  const { password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ message: "Unauthorized: Incorrect password" });
  }

  res.status(200).json({ message: "Resume uploaded successfully!" });
});

// Serve the Uploaded Resume
app.get("/resume", (req, res) => {
  const resumePath = path.join(__dirname, "uploads", "resume.pdf");
  if (fs.existsSync(resumePath)) {
    res.sendFile(resumePath);
  } else {
    res.status(404).json({ message: "Resume not found" });
  }
});

// Email Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Send Email Route
app.post("/send-email", async (req, res) => {
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
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
