// Entry point for backend server (Express.js)

import express from "express";
import cors from "cors";
import { createSession, markAttendance } from "./routes";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.post("/session", createSession);
app.post("/attendance", markAttendance);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});