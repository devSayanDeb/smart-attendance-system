// Minimal React Native app for teachers

import React, { useState } from "react";
import { View, Text, Button, SafeAreaView } from "react-native";

export default function App() {
  const [session, setSession] = useState<any>(null);

  async function startSession() {
    const res = await fetch("http://localhost:5000/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: "teacher1",
        startTime: Date.now(),
        endTime: Date.now() + 1000 * 60 * 10, // 10 min session
      }),
    });
    const data = await res.json();
    setSession(data.session);
  }

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Teacher Panel</Text>
      <Button title="Start New Attendance Session" onPress={startSession} />
      {session && (
        <View style={{ marginTop: 20 }}>
          <Text>Session ID: {session.id}</Text>
          <Text>OTP: {session.otp}</Text>
          <Text>Beacon ID: {session.bluetoothBeaconId}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}