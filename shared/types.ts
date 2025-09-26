// Shared TypeScript types used across backend and apps

export type UserRole = "student" | "teacher" | "admin";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  deviceId: string;
}

export interface AttendanceSession {
  id: string;
  teacherId: string;
  startTime: number;
  endTime: number;
  bluetoothBeaconId: string;
  otp: string;
  active: boolean;
}

export interface AttendanceRecord {
  sessionId: string;
  studentId: string;
  timestamp: number;
  deviceVerified: boolean;
  ip: string;
  browserFingerprint: string;
}