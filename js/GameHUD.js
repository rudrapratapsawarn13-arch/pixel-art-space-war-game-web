/**
 * GameHUD.js - Heads-Up Display and UI System
 * 
 * Displays:
 * - Player health and shield
 * - Score and wave progression
 * - Weapon and ammo info
 * - Minimap with enemies
 * - Status effects
 * - Game over and pause screens
 */

class GameHUD {
    constructor() {
        this.container = document.body;
        this.hudCanvas = null;
        this.hudContext = null;
        this.minimapCanvas = null;
        this.minimapContext = null;
        
        // Display data
        this.displayData = {
            score: 0,
            wave: 0,
            health: 100,
            maxHealth: 100,
            shield: 50,
            maxShield: 50,
            boost: 100,
            maxBoost: 100,
            weapon: 'LASER',
            camera: 'THIRD_PERSON',
            velocity: 0,
            enemies: 0,
            fps: 60,
            gameTime: 0,
            waveTime: 0
        };
        
        // UI state
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        
        this.initialize();
    }

    /**
     * Initialize HUD elements
     */
    initialize() {
        // Create main HUD canvas
        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.id = 'game-hud';
        this.hudCanvas.style.position = 'fixed';
        this.hudCanvas.style.top = '0';
        this.hudCanvas.style.left = '0';
        this.hudCanvas.style.zIndex = '100';
        this.hudCanvas.style.pointerEvents = 'none';
        this.hudCanvas.width = window.innerWidth;
        this.hudCanvas.height = window.innerHeight;
        this.container.appendChild(this.hudCanvas);
        this.hudContext = this.hudCanvas.getContext('2d');
        
        // Create minimap canvas
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.id = 'game-minimap';
        this.minimapCanvas.style.position = 'fixed';
        this.minimapCanvas.style.top = '20px';
        this.minimapCanvas.style.right = '20px';
        this.minimapCanvas.style.zIndex = '101';
        this.minimapCanvas.style.border = '2px solid #00ff00';
        this.minimapCanvas.style.backgroundColor = '#000000aa';
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
        this.container.appendChild(this.minimapCanvas);
        this.minimapContext = this.minimapCanvas.getContext('2d');
        
        // Create info panel
        this.createInfoPanel();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.hudCanvas.width = window.innerWidth;
            this.hudCanvas.height = window.innerHeight;
        });
    }

    /**
     * Create info panel HTML
     */
    createInfoPanel() {
        const panel = document.createElement('div');
        panel.id = 'info-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.left = '20px';
        panel.style.color = '#00ff00';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '14px';
        panel.style.zIndex = '101';
        panel.style.backgroundColor = '#00000080';
        panel.style.padding = '10px';
        panel.style.border = '1px solid #00ff00';
        panel.style.maxWidth = '300px';
        panel.innerHTML = `
            <div id="fps-display">FPS: 60</div>
            <div id="camera-display">Camera: THIRD_PERSON</div>
            <div id="velocity-display">Velocity: 0 m/s</div>
            <div id="enemies-display">Enemies: 0</div>
            <div id="game-time-display">Time: 0:00</div>
        `;
        this.container.appendChild(panel);
    }

    /**
     * Update HUD display each frame
     */
    updateDisplay(data) {
        this.displayData = { ...this.displayData, ...data };
        
        // Clear canvas
        this.hudContext.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        
        // Draw HUD elements
        this.drawHealthBar();
        this.drawShieldBar();
        this.drawBoostBar();
        this.drawScoreAndWave();
        this.drawWeaponInfo();
        this.drawCrosshair();
        this.drawStatusIndicators();
        
        // Draw minimap
        this.drawMinimap();
        
        // Update info panel
        this.updateInfoPanel();
    }

    /**
     * Draw health bar
     */
    drawHealthBar() {
        const x = 20;
        const y = 20;
        const width = 200;
        const height = 20;
        const healthPercent = this.displayData.health / this.displayData.maxHealth;
        
        // Background
        this.hudContext.fillStyle = '#333333';
        this.hudContext.fillRect(x, y, width, height);
        
        // Health bar
        const healthColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.hudContext.fillStyle = healthColor;
        this.hudContext.fillRect(x, y, width * healthPercent, height);
        
        // Border
        this.hudContext.strokeStyle = '#00ff00';
        this.hudContext.lineWidth = 2;
        this.hudContext.strokeRect(x, y, width, height);
        
        // Text
        this.hudContext.fillStyle = '#00ff00';
        this.hudContext.font = 'bold 12px monospace';
        this.hudContext.textAlign = 'center';
        this.hudContext.fillText(
            `HEALTH: ${Math.ceil(this.displayData.health)}/${this.displayData.maxHealth}`,
            x + width / 2,
            y + height - 4
        );
    }

    /**
     * Draw shield bar
     */
    drawShieldBar() {
        const x = 20;
        const y = 50;
        const width = 200;
        const height = 15;
        const shieldPercent = this.displayData.shield / this.displayData.maxShield;
        
        // Background
        this.hudContext.fillStyle = '#333333';
        this.hudContext.fillRect(x, y, width, height);
        
        // Shield bar
        this.hudContext.fillStyle = '#0099ff';
        this.hudContext.fillRect(x, y, width * shieldPercent, height);
        
        // Border
        this.hudContext.strokeStyle = '#0099ff';
        this.hudContext.lineWidth = 2;
        this.hudContext.strokeRect(x, y, width, height);
        
        // Text
        this.hudContext.fillStyle = '#0099ff';
        this.hudContext.font = 'bold 11px monospace';
        this.hudContext.textAlign = 'center';
        this.hudContext.fillText(
            `SHIELD: ${Math.ceil(this.displayData.shield)}`,
            x + width / 2,
            y + height - 2
        );
    }

    /**
     * Draw boost bar
     */
    drawBoostBar() {
        const x = 20;
        const y = 75;
        const width = 200;
        const height = 12;
        const boostPercent = this.displayData.boost / this.displayData.maxBoost;
        
        // Background
        this.hudContext.fillStyle = '#333333';
        this.hudContext.fillRect(x, y, width, height);
        
        // Boost bar
        this.hudContext.fillStyle = '#ffaa00';
        this.hudContext.fillRect(x, y, width * boostPercent, height);
        
        // Border
        this.hudContext.strokeStyle = '#ffaa00';
        this.hudContext.lineWidth = 1;
        this.hudContext.strokeRect(x, y, width, height);
    }

    /**
     * Draw score and wave info
     */
    drawScoreAndWave() {
        const x = this.hudCanvas.width - 250;
        const y = 20;
        
        this.hudContext.fillStyle = '#ffff00';
        this.hudContext.font = 'bold 24px monospace';
        this.hudContext.textAlign = 'right';
        this.hudContext.fillText(`SCORE: ${this.displayData.score}`, x + 230, y + 30);
        
        this.hudContext.fillStyle = '#00ff00';
        this.hudContext.font = 'bold 18px monospace';
        this.hudContext.fillText(`WAVE: ${this.displayData.wave}`, x + 230, y + 60);
    }

    /**
     * Draw weapon info
     */
    drawWeaponInfo() {
        const x = 20;
        const y = this.hudCanvas.height - 100;
        
        this.hudContext.fillStyle = '#ff00ff';
        this.hudContext.font = 'bold 14px monospace';
        this.hudContext.textAlign = 'left';
        this.hudContext.fillText(`WEAPON: ${this.displayData.weapon}`, x, y);
        
        this.hudContext.fillStyle = '#00ff00';
        this.hudContext.font = '12px monospace';
        this.hudContext.fillText('1-5: Select Weapon', x, y + 25);
        this.hudContext.fillText('SPACE: Fire', x, y + 45);
        this.hudContext.fillText('SHIFT: Boost', x, y + 65);
        this.hudContext.fillText('C: Camera', x, y + 85);
    }

    /**
     * Draw crosshair at center
     */
    drawCrosshair() {
        const centerX = this.hudCanvas.width / 2;
        const centerY = this.hudCanvas.height / 2;
        const size = 20;
        
        this.hudContext.strokeStyle = '#00ff00';
        this.hudContext.lineWidth = 2;
        
        // Horizontal line
        this.hudContext.beginPath();
        this.hudContext.moveTo(centerX - size, centerY);
        this.hudContext.lineTo(centerX + size, centerY);
        this.hudContext.stroke();
        
        // Vertical line
        this.hudContext.beginPath();
        this.hudContext.moveTo(centerX, centerY - size);
        this.hudContext.lineTo(centerX, centerY + size);
        this.hudContext.stroke();
        
        // Center dot
        this.hudContext.fillStyle = '#00ff00';
        this.hudContext.beginPath();
        this.hudContext.arc(centerX, centerY, 3, 0, Math.PI * 2);
        this.hudContext.fill();
    }

    /**
     * Draw status indicators
     */
    drawStatusIndicators() {
        const x = this.hudCanvas.width - 250;
        const y = this.hudCanvas.height - 120;
        
        // Warning if low health
        if (this.displayData.health < this.displayData.maxHealth * 0.3) {
            this.hudContext.fillStyle = '#ff0000';
            this.hudContext.font = 'bold 16px monospace';
            this.hudContext.textAlign = 'right';
            this.hudContext.fillText('⚠ CRITICAL DAMAGE ⚠', x + 230, y);
        }
        
        // Warning if low shield
        if (this.displayData.shield < 10) {
            this.hudContext.fillStyle = '#ff0000';
            this.hudContext.font = 'bold 14px monospace';
            this.hudContext.textAlign = 'right';
            this.hudContext.fillText('SHIELDS DOWN', x + 230, y + 25);
        }
    }

    /**
     * Draw minimap
     */
    drawMinimap() {
        const canvas = this.minimapCanvas;
        const ctx = this.minimapContext;
        
        // Clear
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw player (center)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction indicator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.lineTo(canvas.width / 2, canvas.height / 2 - 15);
        ctx.stroke();
        
        // Draw scale indicator
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('500m', canvas.width / 2, 15);
    }

    /**
     * Update info panel text
     */
    updateInfoPanel() {
        const fpsDisplay = document.getElementById('fps-display');
        const cameraDisplay = document.getElementById('camera-display');
        const velocityDisplay = document.getElementById('velocity-display');
        const enemiesDisplay = document.getElementById('enemies-display');
        const timeDisplay = document.getElementById('game-time-display');
        
        if (fpsDisplay) fpsDisplay.textContent = `FPS: ${this.displayData.fps}`;
        if (cameraDisplay) cameraDisplay.textContent = `Camera: ${this.displayData.camera}`;
        if (velocityDisplay) velocityDisplay.textContent = `Velocity: ${Math.round(this.displayData.velocity)} m/s`;
        if (enemiesDisplay) enemiesDisplay.textContent = `Enemies: ${this.displayData.enemies}`;
        
        if (timeDisplay) {
            const minutes = Math.floor(this.displayData.gameTime / 60);
            const seconds = Math.floor(this.displayData.gameTime % 60);
            timeDisplay.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Show pause screen
     */
    showPause() {
        this.isPaused = true;
        
        const pauseOverlay = document.createElement('div');
        pauseOverlay.id = 'pause-overlay';
        pauseOverlay.style.position = 'fixed';
        pauseOverlay.style.top = '0';
        pauseOverlay.style.left = '0';
        pauseOverlay.style.width = '100%';
        pauseOverlay.style.height = '100%';
        pauseOverlay.style.backgroundColor = '#00000080';
        pauseOverlay.style.display = 'flex';
        pauseOverlay.style.alignItems = 'center';
        pauseOverlay.style.justifyContent = 'center';
        pauseOverlay.style.zIndex = '1000';
        
        pauseOverlay.innerHTML = `
            <div style="
                backgroundColor: #000000;
                border: 3px solid #00ff00;
                padding: 40px;
                textAlign: center;
                color: #00ff00;
                fontFamily: monospace;
            ">
                <h1 style="fontSize: 48px; margin: 0 0 20px 0;">PAUSED</h1>
                <p style="fontSize: 18px; margin: 10px 0;">Press ESC to resume</p>
                <p style="fontSize: 14px; margin: 10px 0; color: #aaaaaa;">Score: ${this.displayData.score}</p>
            </div>
        `;
        
        this.container.appendChild(pauseOverlay);
    }

    /**
     * Hide pause screen
     */
    hidePause() {
        this.isPaused = false;
        const overlay = document.getElementById('pause-overlay');
        if (overlay) {
            this.container.removeChild(overlay);
        }
    }

    /**
     * Show game over screen
     */
    showGameOver(finalScore, waveReached) {
        this.isGameOver = true;
        
        const gameOverOverlay = document.createElement('div');
        gameOverOverlay.id = 'gameover-overlay';
        gameOverOverlay.style.position = 'fixed';
        gameOverOverlay.style.top = '0';
        gameOverOverlay.style.left = '0';
        gameOverOverlay.style.width = '100%';
        gameOverOverlay.style.height = '100%';
        gameOverOverlay.style.backgroundColor = '#00000090';
        gameOverOverlay.style.display = 'flex';
        gameOverOverlay.style.alignItems = 'center';
        gameOverOverlay.style.justifyContent = 'center';
        gameOverOverlay.style.zIndex = '1000';
        gameOverOverlay.style.pointerEvents = 'auto';
        
        gameOverOverlay.innerHTML = `
            <div style="
                backgroundColor: #000000;
                border: 3px solid #ff0000;
                padding: 50px;
                textAlign: center;
                color: #ff0000;
                fontFamily: monospace;
                minWidth: 400px;
            ">
                <h1 style="fontSize: 64px; margin: 0 0 30px 0; textTransform: uppercase;">GAME OVER</h1>
                <div style="color: #ffff00; fontSize: 24px; margin: 20px 0;">
                    <p>FINAL SCORE</p>
                    <p style="fontSize: 48px; margin: 10px 0;">${finalScore}</p>
                </div>
                <div style="color: #00ff00; fontSize: 18px; margin: 20px 0;">
                    <p>Waves Survived: ${waveReached}</p>
                </div>
                <button onclick="location.reload()" style="
                    marginTop: 30px;
                    padding: 10px 30px;
                    fontSize: 18px;
                    backgroundColor: #00ff00;
                    color: #000000;
                    border: none;
                    cursor: pointer;
                    fontFamily: monospace;
                    fontWeight: bold;
                ">PLAY AGAIN</button>
            </div>
        `;
        
        this.container.appendChild(gameOverOverlay);
    }

    /**
     * Show victory screen
     */
    showVictory(finalScore, wavesCompleted) {
        this.isVictory = true;
        
        const victoryOverlay = document.createElement('div');
        victoryOverlay.id = 'victory-overlay';
        victoryOverlay.style.position = 'fixed';
        victoryOverlay.style.top = '0';
        victoryOverlay.style.left = '0';
        victoryOverlay.style.width = '100%';
        victoryOverlay.style.height = '100%';
        victoryOverlay.style.backgroundColor = '#00000090';
        victoryOverlay.style.display = 'flex';
        victoryOverlay.style.alignItems = 'center';
        victoryOverlay.style.justifyContent = 'center';
        victoryOverlay.style.zIndex = '1000';
        victoryOverlay.style.pointerEvents = 'auto';
        
        victoryOverlay.innerHTML = `
            <div style="
                backgroundColor: #000000;
                border: 3px solid #ffff00;
                padding: 50px;
                textAlign: center;
                color: #ffff00;
                fontFamily: monospace;
                minWidth: 400px;
            ">
                <h1 style="fontSize: 64px; margin: 0 0 30px 0; textTransform: uppercase;">🎉 VICTORY 🎉</h1>
                <div style="color: #00ff00; fontSize: 24px; margin: 20px 0;">
                    <p>All waves completed!</p>
                </div>
                <div style="color: #0099ff; fontSize: 24px; margin: 20px 0;">
                    <p>FINAL SCORE</p>
                    <p style="fontSize: 48px; margin: 10px 0;">${finalScore}</p>
                </div>
                <div style="color: #ff00ff; fontSize: 18px; margin: 20px 0;">
                    <p>Waves Completed: ${wavesCompleted}</p>
                </div>
                <button onclick="location.reload()" style="
                    marginTop: 30px;
                    padding: 10px 30px;
                    fontSize: 18px;
                    backgroundColor: #ffff00;
                    color: #000000;
                    border: none;
                    cursor: pointer;
                    fontFamily: monospace;
                    fontWeight: bold;
                ">PLAY AGAIN</button>
            </div>
        `;
        
        this.container.appendChild(victoryOverlay);
    }

    /**
     * Cleanup HUD
     */
    dispose() {
        if (this.hudCanvas && this.hudCanvas.parentNode) {
            this.hudCanvas.parentNode.removeChild(this.hudCanvas);
        }
        if (this.minimapCanvas && this.minimapCanvas.parentNode) {
            this.minimapCanvas.parentNode.removeChild(this.minimapCanvas);
        }
    }
}
