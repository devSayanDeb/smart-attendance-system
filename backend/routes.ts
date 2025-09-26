// Route handlers for backend (simplified for MVP)

import { Request, Response } from "express";
import { AttendanceSession, AttendanceRecord } from "../shared/types";

// In-memory storage for demo (replace with DB in production)
const sessions: AttendanceSession[] = [];
const attendance: AttendanceRecord[] = [];

export function createSession(req: Request, res: Response) {
  // Teacher starts session, generates OTP and beacon ID
  const { teacherId, startTime, endTime } = req.body;
  const session: AttendanceSession = {
    id: `${Date.now()}`,
    teacherId,
    startTime,
    endTime,
    bluetoothBeaconId: Math.random().toString(36).slice(2, 8),
    otp: Math.floor(100000 + Math.random() * 900000).toString(),
    active: true,
  };
  sessions.push(session);
  res.json({ session });
}

export function markAttendance(req: Request, res: Response) {
  // Student marks attendance, backend verifies device, OTP, etc.
  const { sessionId, studentId, deviceId, otp, ip, browserFingerprint } = req.body;
  const session = sessions.find((s) => s.id === sessionId && s.active);

  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.otp !== otp) return res.status(403).json({ error: "Invalid OTP" });

  attendance.push({
    sessionId,
    studentId,
    timestamp: Date.now(),
    deviceVerified: true, // In MVP, always true
    ip,
    browserFingerprint,
  });
  res.json({ status: "Attendance marked" });
}