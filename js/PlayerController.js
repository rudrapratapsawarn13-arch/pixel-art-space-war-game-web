/**
 * PlayerController.js - Handles player input and spaceship control
 * 
 * Input methods:
 * - Hand tracking (MediaPipe)
 * - Keyboard controls (fallback)
 * - Mouse/Touch controls
 * 
 * Controls:
 * - Left hand: Movement (forward/backward, strafe)
 * - Right hand: Weapon selection (1-5 fingers)
 * - Both hands triangle: U-turn
 * - Both hands peace: Camera switch
 * - Left hand fist: Reverse/Brake
 */

class PlayerController {
    constructor(playerShip, handTracker, weaponManager, scene) {
        this.playerShip = playerShip;
        this.handTracker = handTracker;
        this.weaponManager = weaponManager;
        this.scene = scene;

        // Input state
        this.keyboardInput = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            fire: false,
            boost: false
        };

        this.gamepadInput = {
            leftStickX: 0,
            leftStickY: 0,
            rightStickX: 0,
            rightStickY: 0,
            triggerL: 0,
            triggerR: 0
        };

        // Hand tracking input
        this.handInput = {
            leftHandPosition: new THREE.Vector3(0, 0, 0),
            rightHandFingers: 0,
            isTriangleGesture: false,
            isPeaceSign: false,
            isLeftHandFist: false,
            movementVector: new THREE.Vector3(0, 0, 0)
        };

        // Camera
        this.camera = null;
        this.cameraMode = 'THIRD_PERSON'; // THIRD_PERSON, FIRST_PERSON, TOP_DOWN
        this.cameraDistance = 80;
        this.cameraHeight = 40;
        this.cameraAngle = 0;

        // Movement dampening
        this.dampening = 0.85;
        this.maxTurnSpeed = 100;
        this.maxPitchSpeed = 60;

        // Fire control
        this.fireHeld = false;
        this.fireDelay = 0;

        // Boost
        this.boostEnergy = 100;
        this.maxBoostEnergy = 100;
        this.boostRechargeRate = 20;
        this.boostDrainRate = 60;

        // Setup input listeners
        this.setupKeyboardInput();
        this.setupGamepadInput();
        this.setupMouseInput();
    }

    /**
     * Setup keyboard input listeners
     */
    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            
            switch (key) {
                case 'w': this.keyboardInput.forward = true; break;
                case 's': this.keyboardInput.backward = true; break;
                case 'a': this.keyboardInput.left = true; break;
                case 'd': this.keyboardInput.right = true; break;
                case 'q': this.keyboardInput.up = true; break;
                case 'e': this.keyboardInput.down = true; break;
                case ' ': this.keyboardInput.fire = true; e.preventDefault(); break;
                case 'shift': this.keyboardInput.boost = true; break;
                case '1': this.weaponManager.selectWeaponBySlot(1); break;
                case '2': this.weaponManager.selectWeaponBySlot(2); break;
                case '3': this.weaponManager.selectWeaponBySlot(3); break;
                case '4': this.weaponManager.selectWeaponBySlot(4); break;
                case '5': this.weaponManager.selectWeaponBySlot(5); break;
                case 'c': this.switchCamera(); break;
                case 'r': this.resetShip(); break;
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            
            switch (key) {
                case 'w': this.keyboardInput.forward = false; break;
                case 's': this.keyboardInput.backward = false; break;
                case 'a': this.keyboardInput.left = false; break;
                case 'd': this.keyboardInput.right = false; break;
                case 'q': this.keyboardInput.up = false; break;
                case 'e': this.keyboardInput.down = false; break;
                case ' ': this.keyboardInput.fire = false; break;
                case 'shift': this.keyboardInput.boost = false; break;
            }
        });
    }

    /**
     * Setup gamepad input
     */
    setupGamepadInput() {
        setInterval(() => {
            const gamepads = navigator.getGamepads();
            if (!gamepads || gamepads.length === 0) return;

            const gamepad = gamepads[0];
            if (!gamepad) return;

            // Left stick
            this.gamepadInput.leftStickX = gamepad.axes[0];
            this.gamepadInput.leftStickY = gamepad.axes[1];

            // Right stick
            this.gamepadInput.rightStickX = gamepad.axes[2];
            this.gamepadInput.rightStickY = gamepad.axes[3];

            // Triggers
            this.gamepadInput.triggerL = gamepad.buttons[4].value;
            this.gamepadInput.triggerR = gamepad.buttons[5].value;

            // Buttons
            if (gamepad.buttons[0].pressed) this.keyboardInput.fire = true; // A button
            if (gamepad.buttons[1].pressed) this.keyboardInput.boost = true; // B button
            if (gamepad.buttons[6].pressed) this.weaponManager.selectWeaponBySlot(1); // LT
            if (gamepad.buttons[7].pressed) this.weaponManager.selectWeaponBySlot(2); // RT
        }, 16); // 60 FPS polling
    }

    /**
     * Setup mouse input
     */
    setupMouseInput() {
        document.addEventListener('click', (e) => {
            if (e.button === 0) { // Left click
                this.keyboardInput.fire = true;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.keyboardInput.fire = false;
            }
        });

        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.switchCamera();
        });
    }

    /**
     * Update player controller
     */
    update(deltaTime) {
        // Get input from all sources
        this.getHandTrackingInput();
        this.processInput(deltaTime);
        this.updateMovement(deltaTime);
        this.updateFiring(deltaTime);
        this.updateBoost(deltaTime);
        this.updateCamera(deltaTime);
    }

    /**
     * Get input from hand tracking
     */
    getHandTrackingInput() {
        if (!this.handTracker || !this.handTracker.isInitialized) return;

        // Get hand data
        this.handInput.leftHandPosition = this.handTracker.getLeftHandPosition();
        this.handInput.rightHandFingers = this.handTracker.getRightHandFingerCount();
        this.handInput.isTriangleGesture = this.handTracker.isBothHandsTriangle();
        this.handInput.isPeaceSign = this.handTracker.isBothHandsPeaceSigns();
        this.handInput.isLeftHandFist = this.handTracker.isLeftHandFist();

        // Get movement vector from left hand
        if (this.handTracker.leftHand.isTracked) {
            this.handInput.movementVector = this.handTracker.getLeftHandMovement();
        }

        // Weapon selection from right hand fingers
        if (this.handInput.rightHandFingers > 0 && this.handInput.rightHandFingers <= 5) {
            this.weaponManager.selectWeaponBySlot(this.handInput.rightHandFingers);
        }

        // U-turn gesture
        if (this.handInput.isTriangleGesture) {
            this.playerShip.rotation.y += Math.PI;
        }

        // Camera switch gesture
        if (this.handInput.isPeaceSign) {
            this.switchCamera();
        }
    }

    /**
     * Process all input sources
     */
    processInput(deltaTime) {
        let moveX = 0;
        let moveY = 0;
        let moveZ = 0;

        // Keyboard input
        if (this.keyboardInput.forward) moveZ += 1;
        if (this.keyboardInput.backward) moveZ -= 1;
        if (this.keyboardInput.right) moveX += 1;
        if (this.keyboardInput.left) moveX -= 1;
        if (this.keyboardInput.up) moveY += 1;
        if (this.keyboardInput.down) moveY -= 1;

        // Gamepad input
        moveX += this.gamepadInput.leftStickX;
        moveY += this.gamepadInput.rightStickY;
        moveZ += this.gamepadInput.triggerR - this.gamepadInput.triggerL;

        // Hand tracking input
        if (this.handTracker && this.handTracker.isInitialized) {
            if (this.handInput.isLeftHandFist) {
                moveZ -= 1; // Reverse
            } else {
                moveX += this.handInput.movementVector.x * 0.5;
                moveZ += this.handInput.movementVector.z * 0.5;
            }
        }

        // Clamp movement
        const moveMagnitude = Math.sqrt(moveX * moveX + moveY * moveY + moveZ * moveZ);
        if (moveMagnitude > 1) {
            moveX /= moveMagnitude;
            moveY /= moveMagnitude;
            moveZ /= moveMagnitude;
        }

        // Store for movement update
        this.currentInput = {
            x: moveX,
            y: moveY,
            z: moveZ,
            boost: this.keyboardInput.boost
        };
    }

    /**
     * Update player ship movement
     */
    updateMovement(deltaTime) {
        if (!this.currentInput) return;

        const input = this.currentInput;

        // Calculate movement direction in world space
        const forward = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3(1, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);

        // Get ship rotation
        const quat = new THREE.Quaternion().setFromEuler(this.playerShip.rotation);

        // Apply rotation to direction vectors
        forward.applyQuaternion(quat);
        right.applyQuaternion(quat);

        // Calculate desired velocity
        const desiredVel = forward.multiplyScalar(input.z * this.playerShip.maxSpeed)
            .add(right.multiplyScalar(input.x * this.playerShip.maxSpeed))
            .add(up.multiplyScalar(input.y * this.playerShip.maxSpeed * 0.7));

        // Apply boost
        if (input.boost && this.boostEnergy > 0) {
            desiredVel.multiplyScalar(1.5);
        }

        // Smoothly interpolate velocity
        this.playerShip.velocity.lerp(desiredVel, 1 - Math.pow(this.dampening, deltaTime));

        // Rotate ship to face movement direction
        if (this.playerShip.velocity.length() > 1) {
            this.rotateShipToVelocity(deltaTime);
        }
    }

    /**
     * Rotate ship to match velocity direction
     */
    rotateShipToVelocity(deltaTime) {
        const targetDir = this.playerShip.velocity.clone().normalize();
        const forward = new THREE.Vector3(0, 0, 1);

        const angle = forward.angleTo(targetDir);
        if (angle > 0.01) {
            const axis = forward.clone().cross(targetDir).normalize();
            const maxRotation = this.maxTurnSpeed * deltaTime * (Math.PI / 180);
            const rotAmount = Math.min(angle, maxRotation);

            const quat = new THREE.Quaternion();
            quat.setFromAxisAngle(axis, rotAmount);

            const currentQuat = new THREE.Quaternion().setFromEuler(this.playerShip.rotation);
            currentQuat.multiplyQuaternions(quat, currentQuat);

            this.playerShip.rotation.setFromQuaternion(currentQuat);
        }
    }

    /**
     * Update firing
     */
    updateFiring(deltaTime) {
        const isFiring = this.keyboardInput.fire || 
                         this.gamepadInput.triggerR > 0.5 ||
                         (this.handTracker && this.handTracker.rightHand.gesture === 'OPEN');

        if (isFiring && this.weaponManager.getCurrentWeapon().canFire()) {
            const direction = new THREE.Vector3(0, 0, 1);
            const quat = new THREE.Quaternion().setFromEuler(this.playerShip.rotation);
            direction.applyQuaternion(quat);

            const projectiles = this.weaponManager.fireWeapon(this.playerShip.position, direction);
            if (projectiles) {
                projectiles.forEach(p => {
                    p.mesh = this.weaponManager.getCurrentWeapon().createProjectileMesh();
                    this.scene.add(p.mesh);
                    p.mesh.position.copy(p.position);
                });
            }
        }
    }

    /**
     * Update boost energy
     */
    updateBoost(deltaTime) {
        if (this.currentInput.boost && this.boostEnergy > 0) {
            this.boostEnergy = Math.max(0, this.boostEnergy - this.boostDrainRate * deltaTime);
        } else {
            this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + this.boostRechargeRate * deltaTime);
        }
    }

    /**
     * Update camera position and rotation
     */
    updateCamera(deltaTime) {
        if (!this.camera) return;

        const shipPos = this.playerShip.position;
        const shipDir = new THREE.Vector3(0, 0, 1);
        const quat = new THREE.Quaternion().setFromEuler(this.playerShip.rotation);
        shipDir.applyQuaternion(quat);

        let cameraPos = new THREE.Vector3();

        switch (this.cameraMode) {
            case 'THIRD_PERSON':
                // Behind and above ship
                const offset = shipDir.clone().multiplyScalar(-this.cameraDistance);
                offset.y += this.cameraHeight;
                cameraPos = shipPos.clone().add(offset);
                break;

            case 'FIRST_PERSON':
                // Inside ship cockpit
                const cockpitOffset = shipDir.clone().multiplyScalar(5);
                cockpitOffset.y += this.cameraHeight * 0.8;
                cameraPos = shipPos.clone().add(cockpitOffset);
                break;

            case 'TOP_DOWN':
                // Bird's eye view
                cameraPos = shipPos.clone();
                cameraPos.y += 200;
                break;
        }

        // Smoothly move camera
        this.camera.position.lerp(cameraPos, 0.1);
        this.camera.lookAt(shipPos);
    }

    /**
     * Switch camera mode
     */
    switchCamera() {
        const modes = ['THIRD_PERSON', 'FIRST_PERSON', 'TOP_DOWN'];
        const currentIndex = modes.indexOf(this.cameraMode);
        this.cameraMode = modes[(currentIndex + 1) % modes.length];
    }

    /**
     * Reset ship position
     */
    resetShip() {
        this.playerShip.position.set(0, 0, 0);
        this.playerShip.velocity.set(0, 0, 0);
        this.playerShip.rotation.set(0, 0, 0);
    }

    /**
     * Get player status for HUD
     */
    getPlayerStatus() {
        return {
            position: this.playerShip.position.clone(),
            velocity: this.playerShip.velocity.length(),
            health: this.playerShip.health,
            maxHealth: this.playerShip.maxHealth,
            shield: this.playerShip.shield,
            maxShield: this.playerShip.maxShield,
            boost: this.boostEnergy,
            maxBoost: this.maxBoostEnergy,
            camera: this.cameraMode,
            weapon: this.weaponManager.getCurrentWeapon().name
        };
    }

    /**
     * Set camera reference
     */
    setCamera(camera) {
        this.camera = camera;
    }
}
