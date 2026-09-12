/**
 * GameManager.js - Central game orchestration system
 * 
 * Manages:
 * - Game states (menu, playing, paused, game over)
 * - Scene initialization
 * - Player and enemy management
 * - Wave system
 * - Score and progression
 * - HUD and UI updates
 */

class GameManager {
    constructor(container) {
        this.container = container;
        
        // Game state
        this.state = 'MENU'; // MENU, LOADING, PLAYING, PAUSED, GAME_OVER, WAVE_COMPLETE
        this.score = 0;
        this.wave = 0;
        this.isMultiplayer = false;
        
        // Core systems
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.playerShip = null;
        this.playerController = null;
        this.enemySpawner = null;
        this.weaponManager = null;
        this.handTracker = null;
        this.particleSystem = null;
        this.soundManager = null;
        this.hud = null;
        
        // Game settings
        this.difficulty = 1; // 1-5
        this.difficulty_multiplier = 1;
        this.maxWaves = 10;
        
        // Timing
        this.gameTime = 0;
        this.waveTime = 0;
        this.waveStartTime = 0;
        this.lastUpdateTime = Date.now() / 1000;
        
        // Performance monitoring
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsTime = 0;
        
        console.log('GameManager initialized');
    }

    /**
     * Initialize Three.js scene and systems
     */
    initializeScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000814);
        this.scene.fog = new THREE.Fog(0x000814, 1000, 2000);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
        this.camera.position.set(0, 50, 80);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Lighting
        this.setupLighting();
        
        // Create player ship
        this.playerShip = new Spaceship('PLAYER', {
            position: new THREE.Vector3(0, 0, 0),
            health: 100,
            maxHealth: 100,
            shield: 50,
            maxShield: 50,
            speed: 150,
            damage: 10
        });
        
        const playerMesh = this.playerShip.createMesh();
        this.scene.add(playerMesh);
        
        // Initialize weapon manager
        this.weaponManager = new WeaponManager(this.playerShip, this.scene);
        this.weaponManager.selectWeaponBySlot(1);
        
        // Initialize hand tracker
        this.handTracker = new HandTracker();
        this.handTracker.initialize();
        
        // Initialize player controller
        this.playerController = new PlayerController(
            this.playerShip,
            this.handTracker,
            this.weaponManager,
            this.scene
        );
        this.playerController.setCamera(this.camera);
        
        // Initialize enemy spawner
        this.enemySpawner = new EnemySpawner(this.scene);
        
        // Initialize particle system
        this.particleSystem = new ParticleSystem(this.scene);
        
        // Initialize sound manager
        this.soundManager = new SoundManager();
        
        // Initialize HUD
        this.hud = new GameHUD();
        
        // Setup window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start game loop
        this.gameLoop();
    }

    /**
     * Setup scene lighting
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(500, 500, 500);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.far = 1500;
        this.scene.add(directionalLight);
        
        // Point light effects
        const pointLight1 = new THREE.PointLight(0x0099ff, 0.5, 400);
        pointLight1.position.set(300, 100, -300);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff0099, 0.5, 400);
        pointLight2.position.set(-300, 100, 300);
        this.scene.add(pointLight2);
        
        // Stars background
        this.createStarfield();
    }

    /**
     * Create starfield background
     */
    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const posArray = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            posArray[i] = (Math.random() - 0.5) * 4000; // x
            posArray[i + 1] = (Math.random() - 0.5) * 4000; // y
            posArray[i + 2] = (Math.random() - 0.5) * 4000; // z
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            color: 0xffffff,
            sizeAttenuation: true
        });
        
        const starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(starfield);
    }

    /**
     * Start new game
     */
    startGame(difficulty = 1) {
        this.difficulty = Math.max(1, Math.min(5, difficulty));
        this.difficulty_multiplier = 0.5 + (this.difficulty * 0.15);
        this.score = 0;
        this.wave = 0;
        this.gameTime = 0;
        this.state = 'PLAYING';
        
        this.soundManager.playMusic('gameplay');
        this.nextWave();
        
        console.log(`Game started - Difficulty: ${this.difficulty}`);
    }

    /**
     * Start next wave
     */
    nextWave() {
        this.wave++;
        this.waveTime = 0;
        this.waveStartTime = this.gameTime;
        
        if (this.wave > this.maxWaves) {
            this.winGame();
            return;
        }
        
        this.enemySpawner.spawnWave(this.wave);
        this.soundManager.playSound('wave_start');
        
        console.log(`Wave ${this.wave} started`);
    }

    /**
     * Main game loop
     */
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        
        const currentTime = Date.now() / 1000;
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // Cap deltaTime to prevent physics issues
        const cappedDeltaTime = Math.min(deltaTime, 0.033); // ~30 FPS minimum
        
        if (this.state === 'PLAYING') {
            this.update(cappedDeltaTime);
        }
        
        this.render();
        this.updateFPS(deltaTime);
    }

    /**
     * Update game logic
     */
    update(deltaTime) {
        this.gameTime += deltaTime;
        this.waveTime += deltaTime;
        
        // Update player
        this.playerController.update(deltaTime);
        this.playerShip.update(deltaTime);
        
        // Update enemies
        this.enemySpawner.update(deltaTime, this.playerShip);
        
        // Check collisions
        this.checkCollisions();
        
        // Update particles
        this.particleSystem.update(deltaTime);
        
        // Check wave completion
        if (this.enemySpawner.isWaveComplete() && this.waveTime > 2) {
            this.waveComplete();
        }
        
        // Check game over
        if (this.playerShip.health <= 0) {
            this.gameOver();
        }
        
        // Update HUD
        this.updateHUD();
    }

    /**
     * Check collisions between player, enemies, and projectiles
     */
    checkCollisions() {
        // Player projectiles vs enemies
        const playerProjectiles = this.playerController.weaponManager.activeProjectiles;
        const enemies = this.enemySpawner.getAllEnemies();
        
        for (let i = playerProjectiles.length - 1; i >= 0; i--) {
            const projectile = playerProjectiles[i];
            let hit = false;
            
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                const distance = projectile.position.distanceTo(enemy.position);
                
                if (distance < 30) {
                    // Hit detected
                    const damage = projectile.damage;
                    enemy.takeDamage(damage);
                    hit = true;
                    
                    // Create hit effect
                    this.particleSystem.createExplosion(projectile.position, 0xff6600);
                    this.soundManager.playSound('hit');
                    
                    // Award points
                    if (enemy.health <= 0) {
                        this.score += enemy.pointsReward;
                        this.particleSystem.createExplosion(enemy.position, 0xff3300);
                        this.soundManager.playSound('enemy_destroyed');
                    }
                    
                    break;
                }
            }
            
            // Remove projectile if hit or out of range
            if (hit || projectile.distanceTraveled > projectile.range) {
                playerProjectiles.splice(i, 1);
                if (projectile.mesh) {
                    this.scene.remove(projectile.mesh);
                }
            }
        }
        
        // Enemy projectiles vs player
        for (const enemy of enemies) {
            const enemyProjectiles = enemy.tryFire(this.weaponManager) || [];
            
            for (const projectile of enemyProjectiles) {
                const distance = projectile.position.distanceTo(this.playerShip.position);
                
                if (distance < 40) {
                    // Player hit
                    this.playerShip.takeDamage(projectile.damage);
                    this.particleSystem.createExplosion(this.playerShip.position, 0xff0000);
                    this.soundManager.playSound('player_hit');
                }
            }
        }
        
        // Player collision with enemies
        for (const enemy of enemies) {
            const distance = this.playerShip.position.distanceTo(enemy.position);
            
            if (distance < 60) {
                // Collision damage
                const damage = 5;
                this.playerShip.takeDamage(damage);
                enemy.takeDamage(damage);
                
                this.particleSystem.createExplosion(
                    this.playerShip.position.clone().add(enemy.position).multiplyScalar(0.5),
                    0xffaa00
                );
            }
        }
    }

    /**
     * Wave completed
     */
    waveComplete() {
        this.state = 'WAVE_COMPLETE';
        this.soundManager.playSound('wave_complete');
        
        // Bonus points for fast completion
        const timeBonus = Math.max(0, 5000 - this.waveTime * 1000);
        this.score += Math.floor(timeBonus);
        
        // Heal player slightly
        this.playerShip.health = Math.min(
            this.playerShip.maxHealth,
            this.playerShip.health + 20
        );
        
        // Wait before next wave
        setTimeout(() => {
            this.state = 'PLAYING';
            this.nextWave();
        }, 3000);
        
        console.log(`Wave ${this.wave} complete! Score: ${this.score}`);
    }

    /**
     * Game over
     */
    gameOver() {
        this.state = 'GAME_OVER';
        this.soundManager.playSound('game_over');
        this.hud.showGameOver(this.score, this.wave);
        
        console.log(`Game Over! Final Score: ${this.score}, Waves: ${this.wave}`);
    }

    /**
     * Win game (all waves completed)
     */
    winGame() {
        this.state = 'GAME_OVER';
        this.soundManager.playSound('victory');
        this.hud.showVictory(this.score, this.wave);
        
        console.log(`Victory! Final Score: ${this.score}`);
    }

    /**
     * Pause game
     */
    pauseGame() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.soundManager.pauseMusic();
            this.hud.showPause();
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.soundManager.resumeMusic();
            this.hud.hidePause();
        }
    }

    /**
     * Resume game
     */
    resumeGame() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.soundManager.resumeMusic();
            this.hud.hidePause();
        }
    }

    /**
     * Update HUD display
     */
    updateHUD() {
        const playerStatus = this.playerController.getPlayerStatus();
        const enemyStats = this.enemySpawner.getStats();
        
        this.hud.updateDisplay({
            score: this.score,
            wave: this.wave,
            health: playerStatus.health,
            maxHealth: playerStatus.maxHealth,
            shield: playerStatus.shield,
            maxShield: playerStatus.maxShield,
            boost: playerStatus.boost,
            maxBoost: playerStatus.maxBoost,
            weapon: playerStatus.weapon,
            camera: playerStatus.camera,
            velocity: playerStatus.velocity,
            enemies: enemyStats.activeEnemies,
            fps: this.fps,
            gameTime: this.gameTime,
            waveTime: this.waveTime
        });
    }

    /**
     * Update FPS counter
     */
    updateFPS(deltaTime) {
        this.frameCount++;
        
        if (this.lastFpsTime === 0) {
            this.lastFpsTime = Date.now() / 1000;
        }
        
        const elapsed = (Date.now() / 1000) - this.lastFpsTime;
        if (elapsed >= 1) {
            this.fps = Math.round(this.frameCount / elapsed);
            this.frameCount = 0;
            this.lastFpsTime = Date.now() / 1000;
        }
    }

    /**
     * Render scene
     */
    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Get game stats
     */
    getGameStats() {
        return {
            state: this.state,
            score: this.score,
            wave: this.wave,
            maxWaves: this.maxWaves,
            difficulty: this.difficulty,
            playerHealth: this.playerShip.health,
            playerMaxHealth: this.playerShip.maxHealth,
            enemiesActive: this.enemySpawner.enemies.length,
            gameTime: this.gameTime,
            fps: this.fps
        };
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        if (this.handTracker) {
            this.handTracker.dispose();
        }
        
        if (this.soundManager) {
            this.soundManager.dispose();
        }
        
        console.log('GameManager disposed');
    }
}
