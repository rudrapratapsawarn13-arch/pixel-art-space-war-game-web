/**
 * HandTracker.js - Core hand tracking and gesture recognition system
 * Uses MediaPipe Hands for real-time hand detection and gesture parsing
 * 
 * Tracks:
 * - Left hand movement (spaceship control)
 * - Right hand finger counts 1-5 (weapon selection)
 * - Both hands triangle gesture (U-turn)
 * - Both hands peace signs (camera switch)
 */

class HandTracker {
    constructor() {
        this.leftHand = {
            isTracked: false,
            position: new THREE.Vector3(0, 0, 0),
            landmarks: [],
            gesture: 'NONE',
            extendedFingers: 0
        };

        this.rightHand = {
            isTracked: false,
            position: new THREE.Vector3(0, 0, 0),
            landmarks: [],
            gesture: 'NONE',
            extendedFingers: 0
        };

        this.camera = null;
        this.canvasElement = null;
        this.hands = null;
        this.isInitialized = false;
        this.smoothingFactor = 0.3;

        // Gesture detection thresholds
        this.fingerExtensionThreshold = 0.05;
        this.triangleThreshold = 0.08;
        this.peaceLandmarkDistance = 0.1;
    }

    /**
     * Initialize MediaPipe Hands
     */
    async initialize() {
        try {
            const videoElement = document.createElement('video');
            videoElement.width = 640;
            videoElement.height = 480;
            videoElement.style.display = 'none';
            document.body.appendChild(videoElement);

            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onHandsResults.bind(this));

            const camera = new Camera(videoElement, {
                onFrame: async () => {
                    await this.hands.send({ image: videoElement });
                },
                width: 640,
                height: 480
            });

            camera.start();
            this.isInitialized = true;
            console.log('✓ HandTracker initialized successfully');
        } catch (error) {
            console.error('✗ HandTracker initialization failed:', error);
        }
    }

    /**
     * Process hand landmarks from MediaPipe
     */
    onHandsResults(results) {
        // Reset hands
        this.leftHand.isTracked = false;
        this.rightHand.isTracked = false;

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            return;
        }

        // Process each detected hand
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;

            if (handedness === 'Left') {
                this.updateHandData(this.leftHand, landmarks);
            } else if (handedness === 'Right') {
                this.updateHandData(this.rightHand, landmarks);
            }
        }
    }

    /**
     * Update hand position and gesture from landmarks
     */
    updateHandData(hand, landmarks) {
        hand.isTracked = true;
        hand.landmarks = landmarks;

        // Get palm position (wrist landmark)
        const wrist = landmarks[0];
        const newPos = new THREE.Vector3(wrist.x - 0.5, 0.5 - wrist.y, wrist.z);

        // Apply smoothing
        hand.position.lerp(newPos, this.smoothingFactor);

        // Detect gesture
        this.detectGesture(hand, landmarks);
    }

    /**
     * Detect hand gesture from landmarks
     */
    detectGesture(hand, landmarks) {
        hand.extendedFingers = this.countExtendedFingers(landmarks);

        if (hand.extendedFingers === 0) {
            hand.gesture = 'FIST';
        } else if (hand.extendedFingers === 5) {
            hand.gesture = 'OPEN';
        } else if (hand.extendedFingers === 2) {
            hand.gesture = 'PEACE';
        } else if (hand.extendedFingers >= 1 && hand.extendedFingers <= 4) {
            hand.gesture = 'FINGER_COUNT';
        } else {
            hand.gesture = 'NONE';
        }
    }

    /**
     * Count how many fingers are extended
     * Landmark indices: 0=wrist, 1-4=thumb, 5-8=index, 9-12=middle, 13-16=ring, 17-20=pinky
     */
    countExtendedFingers(landmarks) {
        const fingerTips = [4, 8, 12, 16, 20]; // Tip of each finger
        const fingerPIPs = [3, 7, 11, 15, 19]; // PIP joint of each finger
        const wrist = landmarks[0];

        let count = 0;

        for (let i = 0; i < fingerTips.length; i++) {
            const tip = landmarks[fingerTips[i]];
            const pip = landmarks[fingerPIPs[i]];

            // Check if tip is above PIP (extended)
            if (tip.y < pip.y - this.fingerExtensionThreshold) {
                count++;
            }
        }

        return count;
    }

    /**
     * Check if both hands form a triangle (U-turn gesture)
     */
    isBothHandsTriangle() {
        if (!this.leftHand.isTracked || !this.rightHand.isTracked) {
            return false;
        }

        // Triangle: index and thumb touching
        const leftThumb = this.leftHand.landmarks[4];
        const leftIndex = this.leftHand.landmarks[8];
        const rightThumb = this.rightHand.landmarks[4];
        const rightIndex = this.rightHand.landmarks[8];

        if (!leftThumb || !leftIndex || !rightThumb || !rightIndex) {
            return false;
        }

        const leftDist = Math.sqrt(
            Math.pow(leftThumb.x - leftIndex.x, 2) +
            Math.pow(leftThumb.y - leftIndex.y, 2) +
            Math.pow(leftThumb.z - leftIndex.z, 2)
        );

        const rightDist = Math.sqrt(
            Math.pow(rightThumb.x - rightIndex.x, 2) +
            Math.pow(rightThumb.y - rightIndex.y, 2) +
            Math.pow(rightThumb.z - rightIndex.z, 2)
        );

        return leftDist < this.triangleThreshold && rightDist < this.triangleThreshold;
    }

    /**
     * Check if both hands show peace signs (camera switch)
     */
    isBothHandsPeaceSigns() {
        return this.leftHand.gesture === 'PEACE' && this.rightHand.gesture === 'PEACE';
    }

    /**
     * Get left hand movement vector (normalized)
     */
    getLeftHandMovement() {
        if (!this.leftHand.isTracked || this.leftHand.gesture === 'FIST') {
            return new THREE.Vector3(0, 0, 0);
        }
        return this.leftHand.position.clone().normalize();
    }

    /**
     * Get right hand finger count for weapon selection (1-5)
     */
    getRightHandFingerCount() {
        if (!this.rightHand.isTracked || this.rightHand.gesture !== 'FINGER_COUNT') {
            return 0;
        }
        return this.rightHand.extendedFingers;
    }

    /**
     * Check if left hand is in fist (reverse gear)
     */
    isLeftHandFist() {
        return this.leftHand.isTracked && this.leftHand.gesture === 'FIST';
    }

    /**
     * Get left hand position
     */
    getLeftHandPosition() {
        return this.leftHand.position.clone();
    }

    /**
     * Get right hand position
     */
    getRightHandPosition() {
        return this.rightHand.position.clone();
    }

    /**
     * Debug: Get hand status for HUD
     */
    getDebugInfo() {
        return {
            leftTracked: this.leftHand.isTracked,
            rightTracked: this.rightHand.isTracked,
            leftGesture: this.leftHand.gesture,
            rightGesture: this.rightHand.gesture,
            leftFingers: this.leftHand.extendedFingers,
            rightFingers: this.rightHand.extendedFingers,
            triangleDetected: this.isBothHandsTriangle(),
            peaceSigns: this.isBothHandsPeaceSigns()
        };
    }
}
