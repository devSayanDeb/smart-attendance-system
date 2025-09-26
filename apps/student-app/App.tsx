// Minimal React Native app for students

import React, { useState } from "react";
import { View, Text, TextInput, Button, SafeAreaView } from "react-native";

export default function App() {
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");

  async function handleAttendance() {
    // For MVP, static studentId/deviceId
    const res = await fetch("http://localhost:5000/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        studentId: "student1",
        deviceId: "deviceABC",
        otp,
        ip: "127.0.0.1",
        browserFingerprint: "mvp-fingerprint",
      }),
    });
    const data = await res.json();
    setMessage(data.status || data.error);
  }

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Student Attendance</Text>
      <TextInput placeholder="Session ID" value={sessionId} onChangeText={setSessionId} style={{ borderWidth: 1, width: 200, margin: 8 }} />
      <TextInput placeholder="OTP" value={otp} onChangeText={setOtp} style={{ borderWidth: 1, width: 200, margin: 8 }} />
      <Button title="Mark Attendance" onPress={handleAttendance} />
      <Text style={{ margin: 12 }}>{message}</Text>
    </SafeAreaView>
  );
}