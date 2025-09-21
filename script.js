// Configuration
const CONFIG = {
    n8nWebhookUrl: 'https://your-n8n-instance.app/webhook/attendance', // Replace with your actual n8n webhook URL
    serviceUUID: '12345678-1234-1234-1234-123456789abc', // Custom service UUID for attendance system
    otpCharacteristicUUID: '87654321-4321-4321-4321-210987654321', // Custom characteristic UUID for OTP
    sessionTimeout: 120000, // 2 minutes in milliseconds
    otpValidityTime: 30, // 30 seconds in seconds
    simulationMode: true // Set to false when you have a real backend
};

// Global variables
let bluetoothDevice = null;
let bluetoothServer = null;
let otpCharacteristic = null;
let currentSession = null;
let sessionTimer = null;
let otpTimer = null;
let sessionStartTime = null;

// Utility functions
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function updateElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    }
}

function showAlert(message, type = 'info') {
    // Create alert if it doesn't exist
    let alertElement = document.getElementById('alertMessage');
    if (!alertElement) {
        alertElement = document.createElement('div');
        alertElement.id = 'alertMessage';
        alertElement.className = 'alert hidden';
        alertElement.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-info-circle alert-icon"></i>
                <span class="alert-text" id="alertText"></span>
            </div>
            <button class="alert-close" onclick="this.parentElement.classList.add('hidden')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Insert at the top of dashboard container
        const container = document.querySelector('.dashboard-container') || document.querySelector('.container') || document.body;
        container.insertBefore(alertElement, container.firstChild);
    }
    
    const alertText = document.getElementById('alertText');
    const alertIcon = alertElement.querySelector('.alert-icon');
    
    if (alertElement && alertText) {
        alertText.textContent = message;
        alertElement.className = `alert ${type}`;
        alertElement.classList.remove('hidden');
        
        // Update icon based on type
        if (alertIcon) {
            switch (type) {
                case 'success':
                    alertIcon.className = 'fas fa-check-circle alert-icon';
                    break;
                case 'error':
                    alertIcon.className = 'fas fa-exclamation-circle alert-icon';
                    break;
                case 'warning':
                    alertIcon.className = 'fas fa-exclamation-triangle alert-icon';
                    break;
                default:
                    alertIcon.className = 'fas fa-info-circle alert-icon';
            }
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (alertElement) {
                alertElement.classList.add('hidden');
            }
        }, 5000);
    }
}

// Enhanced connection indicator function with dot color changes
function updateConnectionIndicator(status, text) {
    const indicator = document.getElementById('connectionIndicator');
    const dot = indicator?.querySelector('.indicator-dot');
    const span = indicator?.querySelector('span');
    
    if (dot && span) {
        // Remove all existing status classes
        dot.className = 'indicator-dot';
        
        // Add the appropriate status class
        if (status) {
            dot.classList.add(status);
        } else {
            dot.classList.add('ready'); // Default state
        }
        
        span.textContent = text;
        
        // Log the status change for debugging
        console.log(`Connection status changed to: ${status} - ${text}`);
    }
}

function logActivity(message, type = 'info') {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    
    const logContainer = document.getElementById('activityLog');
    if (logContainer) {
        const logEntry = document.createElement('div');
        logEntry.className = 'activity-item';
        
        logEntry.innerHTML = `
            <div class="activity-time">${new Date().toLocaleTimeString()}</div>
            <div class="activity-message">${message}</div>
            <div class="activity-status ${type}">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
            </div>
        `;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

// Check Web Bluetooth support
function checkBluetoothSupport() {
    if (!navigator.bluetooth) {
        showAlert('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.', 'error');
        updateConnectionIndicator('error', 'Bluetooth Not Supported');
        return false;
    }
    return true;
}

// Generate unique session ID
function generateSessionId() {
    return 'ATT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get device fingerprint for security
async function getDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('SmartAttend Device ID', 2, 2);
    
    const canvasData = canvas.toDataURL().slice(-50);
    const userAgent = navigator.userAgent.slice(-20);
    const timestamp = Date.now().toString().slice(-8);
    
    return `${canvasData}${userAgent}${timestamp}`;
}

// Format duration from milliseconds
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update session duration display
function updateSessionDuration() {
    if (sessionStartTime) {
        const duration = Date.now() - sessionStartTime;
        updateElementText('sessionDuration', formatDuration(duration));
    }
}

// Start OTP countdown timer
function startOTPTimer(duration) {
    let timeLeft = duration;
    updateElementText('timerCount', timeLeft);
    
    otpTimer = setInterval(() => {
        timeLeft--;
        updateElementText('timerCount', timeLeft);
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            updateElementValue('receivedOTP', '');
            showAlert('OTP expired. Please reconnect to get a new OTP.', 'warning');
            updateConnectionIndicator('disconnected', 'OTP Expired');
        }
    }, 1000);
}

// Enhanced Teacher Functions with Simulation
async function startTeacherSession(teacherName, className, period, roomNumber) {
    try {
        console.log('Starting teacher session...');
        showAlert('Starting session...', 'info');
        logActivity('Initializing session...', 'info');
        
        const sessionData = {
            action: 'start_session',
            teacher: teacherName,
            class: className,
            period: period,
            room: roomNumber,
            timestamp: new Date().toISOString(),
            date: new Date().toDateString(),
            sessionId: generateSessionId()
        };

        let result;
        
        if (CONFIG.simulationMode) {
            // Simulate backend response
            console.log('Running in simulation mode');
            showAlert('Running in simulation mode (no backend required)', 'info');
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            result = {
                success: true,
                sessionId: sessionData.sessionId,
                message: 'Session started successfully (simulated)'
            };
        } else {
            // Real backend call
            const response = await fetch(CONFIG.n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            result = await response.json();
        }
        
        // Create session object
        currentSession = {
            id: result.sessionId || sessionData.sessionId,
            teacher: teacherName,
            class: className,
            period: period,
            room: roomNumber,
            startTime: new Date(),
            students: new Set(),
            connectedDevices: 0
        };

        sessionStartTime = Date.now();

        // Update UI
        updateElementText('sessionId', currentSession.id);
        showElement('activeSession');
        hideElement('sessionSetup');

        logActivity(`Session started: ${className} with ${teacherName}`, 'success');
        showAlert(`Session started successfully! Session ID: ${currentSession.id}`, 'success');
        
        // Start Bluetooth peripheral service
        await startBluetoothPeripheral();
        
        // Start session duration timer
        sessionTimer = setInterval(updateSessionDuration, 1000);
        
        // Start student connection simulation
        startStudentConnectionSimulation();
        
    } catch (error) {
        console.error('Error starting session:', error);
        logActivity(`Error starting session: ${error.message}`, 'error');
        showAlert(`Failed to start session: ${error.message}`, 'error');
    }
}

async function startBluetoothPeripheral() {
    // Simulate Bluetooth peripheral service
    logActivity('Bluetooth peripheral service started (simulated)', 'success');
    logActivity(`Service UUID: ${CONFIG.serviceUUID}`, 'info');
    logActivity('Waiting for student connections...', 'info');
    
    updateElementText('bluetoothStatus', 'Active');
    
    // Simulate some initial activity
    setTimeout(() => {
        logActivity('Bluetooth service is broadcasting', 'info');
    }, 2000);
    
    setTimeout(() => {
        logActivity('Ready to accept student connections', 'success');
    }, 3000);
}

function startStudentConnectionSimulation() {
    if (!currentSession) return;
    
    let connectionCount = 0;
    
    // Simulate gradual student connections
    const connectionInterval = setInterval(() => {
        if (currentSession) {
            // Randomly increase connections (simulate students joining)
            const shouldConnect = Math.random() > 0.3;
            if (shouldConnect && connectionCount < 30) {
                connectionCount += Math.floor(Math.random() * 3) + 1;
                updateElementText('connectedCount', connectionCount);
                logActivity(`${connectionCount} students connected`, 'info');
            }
        } else {
            clearInterval(connectionInterval);
        }
    }, 5000);
    
    // Simulate some activity logs
    setTimeout(() => {
        logActivity('Student device detected in range', 'info');
    }, 8000);
    
    setTimeout(() => {
        logActivity('OTP generated for student device', 'success');
    }, 12000);
    
    setTimeout(() => {
        logActivity('Attendance marked for student #1234', 'success');
    }, 15000);
}

function endTeacherSession() {
    if (currentSession) {
        // Clear timers
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
        }
        
        const sessionDuration = formatDuration(Date.now() - sessionStartTime);
        logActivity(`Session ended after ${sessionDuration}`, 'info');
        showAlert(`Session ended successfully. Duration: ${sessionDuration}`, 'success');
        
        // Reset UI
        currentSession = null;
        sessionStartTime = null;
        hideElement('activeSession');
        showElement('sessionSetup');
        
        // Reset form
        const form = document.getElementById('teacherForm');
        if (form) {
            form.reset();
        }
    }
}

// Student Functions with enhanced status updates
async function scanForTeacherDevice() {
    if (!checkBluetoothSupport()) return;

    try {
        // Update to scanning state - Orange dot with pulsing animation
        updateConnectionIndicator('scanning', 'Scanning...');
        showAlert('Scanning for teacher device...', 'info');

        // Simulate scanning delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (CONFIG.simulationMode) {
            // Simulate finding a device
            logActivity('Found simulated teacher device', 'success');
            
            // Update to connecting state
            updateConnectionIndicator('scanning', 'Connecting...');
            
            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate successful connection
            updateConnectionIndicator('active', 'Connected');
            showAlert('Connected successfully! Waiting for OTP...', 'success');
            
            // Show attendance form
            hideElement('scanSection');
            showElement('attendanceForm');

            // Update session info (simulated)
            updateElementText('sessionClass', 'Computer Science');
            updateElementText('sessionTeacher', 'Prof. Johnson');
            updateElementText('sessionTime', new Date().toLocaleTimeString());
            
            // Simulate receiving OTP after a delay
            setTimeout(() => {
                const simulatedOTP = generateOTP();
                updateElementValue('receivedOTP', simulatedOTP);
                startOTPTimer(CONFIG.otpValidityTime);
                showAlert('OTP received! You can now submit your attendance.', 'success');
                logActivity(`Simulated OTP received: ${simulatedOTP}`, 'success');
            }, 3000);
            
        } else {
            // Real Bluetooth scanning
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [{ 
                    services: [CONFIG.serviceUUID] 
                }],
                optionalServices: [CONFIG.serviceUUID]
            });

            logActivity(`Found device: ${bluetoothDevice.name || 'Unknown Device'}`, 'success');
            
            // Update to connecting state
            updateConnectionIndicator('scanning', 'Connecting...');
            
            // Connect to GATT server
            bluetoothServer = await bluetoothDevice.gatt.connect();
            logActivity('Connected to GATT server', 'success');

            // Get service and characteristic
            const service = await bluetoothServer.getPrimaryService(CONFIG.serviceUUID);
            otpCharacteristic = await service.getCharacteristic(CONFIG.otpCharacteristicUUID);

            // Start notifications for OTP
            await otpCharacteristic.startNotifications();
            otpCharacteristic.addEventListener('characteristicvaluechanged', handleOTPReceived);

            // Update to connected state
            updateConnectionIndicator('active', 'Connected');
            showAlert('Connected successfully! Waiting for OTP...', 'success');
            
            // Show attendance form
            hideElement('scanSection');
            showElement('attendanceForm');

            // Handle disconnection
            bluetoothDevice.addEventListener('gattserverdisconnected', handleDeviceDisconnected);
        }

    } catch (error) {
        console.error('Bluetooth connection error:', error);
        logActivity(`Connection failed: ${error.message}`, 'error');
        
        // Update to error state - Red dot with error pulse
        updateConnectionIndicator('error', 'Connection Failed');
        
        // Show appropriate error message based on error type
        if (error.name === 'NotFoundError') {
            showAlert('No teacher device found. Make sure you are in classroom range.', 'error');
        } else if (error.name === 'NotAllowedError') {
            showAlert('Permission denied. Please allow Bluetooth access and try again.', 'error');
        } else if (error.name === 'NotSupportedError') {
            showAlert('Bluetooth not supported on this device.', 'error');
        } else {
            showAlert(`Connection failed: ${error.message}`, 'error');
        }
        
        // Reset to ready state after 5 seconds
        setTimeout(() => {
            updateConnectionIndicator('ready', 'Ready to Connect');
        }, 5000);
    }
}

function handleOTPReceived(event) {
    try {
        const value = event.target.value;
        const otp = new TextDecoder().decode(value);
        
        logActivity(`OTP received: ${otp}`, 'success');
        updateElementValue('receivedOTP', otp);
        
        // Start OTP countdown timer
        startOTPTimer(CONFIG.otpValidityTime);
        
        showAlert('OTP received! Please enter your roll number and submit.', 'success');
        
    } catch (error) {
        console.error('Error handling OTP:', error);
        showAlert('Error receiving OTP. Please try again.', 'error');
        updateConnectionIndicator('error', 'OTP Error');
    }
}

function handleDeviceDisconnected() {
    logActivity('Device disconnected', 'warning');
    showAlert('Device disconnected. Please reconnect.', 'warning');
    
    // Update to disconnected state - Dark gray dot
    updateConnectionIndicator('disconnected', 'Disconnected');
    
    // Reset connection state
    bluetoothDevice = null;
    bluetoothServer = null;
    otpCharacteristic = null;
    
    // Clear OTP timer
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
    
    // Show scan section again
    hideElement('attendanceForm');
    showElement('scanSection');
    
    // Reset to ready state after 3 seconds
    setTimeout(() => {
        updateConnectionIndicator('ready', 'Ready to Connect');
    }, 3000);
}

async function submitAttendance(rollNumber, otp) {
    try {
        showAlert('Submitting attendance...', 'info');

        const attendanceData = {
            action: 'mark_attendance',
            rollNumber: rollNumber,
            otp: otp,
            timestamp: new Date().toISOString(),
            date: new Date().toDateString(),
            deviceId: await getDeviceFingerprint(),
            userAgent: navigator.userAgent,
            location: window.location.origin
        };

        let result;
        
        if (CONFIG.simulationMode) {
            // Simulate backend processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = { success: true, message: 'Attendance marked successfully (simulated)' };
        } else {
            // Real backend call
            const response = await fetch(CONFIG.n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(attendanceData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            result = await response.json();
        }
        
        if (result.success !== false) {
            showAlert('Attendance marked successfully!', 'success');
            logActivity(`Attendance marked for roll number: ${rollNumber}`, 'success');
            updateConnectionIndicator('active', 'Attendance Submitted');
            
            // Disable form to prevent multiple submissions
            disableAttendanceForm();
            
            // Clear OTP timer
            if (otpTimer) {
                clearInterval(otpTimer);
                otpTimer = null;
            }
            
        } else {
            throw new Error(result.message || 'Failed to mark attendance');
        }

    } catch (error) {
        console.error('Error submitting attendance:', error);
        showAlert(`Error: ${error.message}`, 'error');
        logActivity(`Attendance submission failed: ${error.message}`, 'error');
        updateConnectionIndicator('error', 'Submission Failed');
    }
}

function disableAttendanceForm() {
    const form = document.getElementById('attendanceSubmission');
    if (form) {
        // Disable all form inputs
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        // Add visual feedback
        form.style.opacity = '0.6';
        form.style.pointerEvents = 'none';
        
        // Add success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-badge';
        successDiv.innerHTML = '<i class="fas fa-check-circle"></i><span>Attendance Submitted Successfully</span>';
        form.appendChild(successDiv);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('SmartAttend System Initialized');
    console.log('Simulation Mode:', CONFIG.simulationMode);
    
    // Show simulation mode indicator
    if (CONFIG.simulationMode) {
        showAlert('Running in SIMULATION mode - no backend required for testing', 'info');
    }
    
    // Initialize connection indicator with ready state - Gray dot
    updateConnectionIndicator('ready', 'Ready to Connect');
    
    // Teacher form submission
    const teacherForm = document.getElementById('teacherForm');
    if (teacherForm) {
        teacherForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const teacherName = document.getElementById('teacherName')?.value;
            const className = document.getElementById('className')?.value;
            const period = document.getElementById('period')?.value;
            const roomNumber = document.getElementById('roomNumber')?.value;
            
            console.log('Form submitted with:', { teacherName, className, period, roomNumber });
            
            if (!teacherName || !className || !period || !roomNumber) {
                showAlert('Please fill in all required fields', 'error');
                return;
            }
            
            await startTeacherSession(teacherName, className, period, roomNumber);
        });
    }

    // End session button
    const endSessionBtn = document.getElementById('endSession');
    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to end the session?')) {
                endTeacherSession();
            }
        });
    }

    // Student Bluetooth scan button
    const scanBtn = document.getElementById('scanBluetooth');
    if (scanBtn) {
        scanBtn.addEventListener('click', scanForTeacherDevice);
    }

    // Student attendance form submission
    const attendanceForm = document.getElementById('attendanceSubmission');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rollNumber = document.getElementById('studentRoll')?.value;
            const otp = document.getElementById('receivedOTP')?.value;
            
            if (!rollNumber || !otp) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            if (rollNumber.length < 3) {
                showAlert('Please enter a valid roll number', 'error');
                return;
            }
            
            if (otp.length !== 6) {
                showAlert('Invalid OTP format', 'error');
                return;
            }
            
            await submitAttendance(rollNumber, otp);
        });
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page hidden - pausing timers');
    } else {
        console.log('Page visible - resuming timers');
        if (currentSession && sessionStartTime) {
            updateSessionDuration();
        }
    }
});

// Handle page unload (cleanup)
window.addEventListener('beforeunload', function(e) {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
    }
    
    if (sessionTimer) clearInterval(sessionTimer);
    if (otpTimer) clearInterval(otpTimer);
});

// Enhanced debugging functions
window.SmartAttend = {
    checkStatus: () => ({
        simulationMode: CONFIG.simulationMode,
        bluetoothSupported: !!navigator.bluetooth,
        deviceConnected: !!(bluetoothDevice && bluetoothDevice.gatt.connected),
        currentSession: currentSession,
        sessionActive: !!currentSession
    }),
    disconnect: () => {
        if (bluetoothDevice && bluetoothDevice.gatt.connected) {
            bluetoothDevice.gatt.disconnect();
        }
    },
    simulateOTP: (otp = '123456') => {
        updateElementValue('receivedOTP', otp);
        startOTPTimer(CONFIG.otpValidityTime);
        showAlert('OTP simulated for testing', 'info');
        updateConnectionIndicator('active', 'OTP Received (Simulated)');
    },
    changeStatus: (status, text) => {
        updateConnectionIndicator(status, text);
    },
    toggleSimulation: () => {
        CONFIG.simulationMode = !CONFIG.simulationMode;
        showAlert(`Simulation mode ${CONFIG.simulationMode ? 'enabled' : 'disabled'}`, 'info');
        return CONFIG.simulationMode;
    }
};

console.log('SmartAttend script loaded successfully');
console.log('Available debug functions: SmartAttend.checkStatus(), SmartAttend.simulateOTP(), SmartAttend.toggleSimulation()');