/**
 * Enemy.js - Enemy spaceship AI and behavior system
 * 
 * Implements intelligent enemy behavior:
 * - Path finding and movement
 * - Targeting and combat
 * - Formation flying
 * - Retreat mechanics
 */

class Enemy extends Spaceship {
    constructor(type, config = {}) {
        super(type, config);
        
        // AI behavior
        this.aiType = config.aiType || 'AGGRESSIVE'; // AGGRESSIVE, DEFENSIVE, SUPPORT, EVASIVE
        this.targetPlayer = null;
        this.targetAlly = null;
        this.patrolPath = config.patrolPath || [];
        this.currentPathIndex = 0;
        
        // Behavior state
        this.state = 'PATROL'; // PATROL, CHASE, ATTACK, RETREAT, FLEE
        this.stateTimer = 0;
        this.stateInterval = 3; // seconds
        
        // Combat AI
        this.detectionRange = config.detectionRange || 300;
        this.attackRange = config.attackRange || 250;
        this.fleeThreshold = config.fleeThreshold || 0.3; // Health percentage
        this.formationOffset = config.formationOffset || new THREE.Vector3(0, 0, 0);
        
        // Movement AI
        this.avoidanceRadius = config.avoidanceRadius || 50;
        this.avoidanceForce = new THREE.Vector3(0, 0, 0);
        this.desiredVelocity = new THREE.Vector3(0, 0, 0);
        
        // Special behaviors
        this.canEvade = config.canEvade !== false;
        this.canFly = config.canFly !== false;
        this.isLeader = config.isLeader || false;
        this.formationMembers = [];
        
        // Reward
        this.pointsReward = config.points || 100;
    }

    /**
     * Update enemy AI each frame
     */
    update(deltaTime, playerShip, allEnemies) {
        if (this.isDestroyed) return;

        // Update health regen (slow)
        if (this.health < this.maxHealth * 0.5) {
            // Only heal if far from player
            if (this.position.distanceTo(playerShip.position) > 400) {
                this.health = Math.min(this.maxHealth, this.health + 5 * deltaTime);
            }
        }

        // Update behavior state
        this.stateTimer += deltaTime;
        if (this.stateTimer > this.stateInterval) {
            this.stateTimer = 0;
            this.updateBehaviorState(playerShip, allEnemies);
        }

        // Execute behavior
        this.executeBehavior(deltaTime, playerShip, allEnemies);

        // Apply movement
        this.applyMovement(deltaTime);

        // Call parent update
        super.update(deltaTime);
    }

    /**
     * Update behavior state based on current situation
     */
    updateBehaviorState(playerShip, allEnemies) {
        const distToPlayer = this.position.distanceTo(playerShip.position);
        const healthPercentage = this.health / this.maxHealth;

        // Determine new state
        if (healthPercentage < this.fleeThreshold && this.canEvade) {
            this.state = 'FLEE';
        } else if (distToPlayer < this.detectionRange) {
            this.targetPlayer = playerShip;
            if (distToPlayer < this.attackRange) {
                this.state = 'ATTACK';
            } else {
                this.state = 'CHASE';
            }
        } else {
            this.state = 'PATROL';
            this.targetPlayer = null;
        }
    }

    /**
     * Execute behavior based on current state
     */
    executeBehavior(deltaTime, playerShip, allEnemies) {
        switch (this.state) {
            case 'PATROL':
                this.patrol(deltaTime);
                break;
            case 'CHASE':
                this.chase(deltaTime, playerShip);
                break;
            case 'ATTACK':
                this.attack(deltaTime, playerShip);
                break;
            case 'FLEE':
                this.flee(deltaTime, playerShip);
                break;
        }

        // Update avoidance
        this.updateAvoidance(allEnemies);
    }

    /**
     * Patrol behavior - fly in patrol pattern
     */
    patrol(deltaTime) {
        if (this.patrolPath.length === 0) {
            // Random wandering
            this.desiredVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * this.maxSpeed,
                (Math.random() - 0.5) * this.maxSpeed * 0.5,
                (Math.random() - 0.5) * this.maxSpeed
            ).normalize().multiplyScalar(this.maxSpeed * 0.5);
        } else {
            // Follow patrol path
            const targetPoint = this.patrolPath[this.currentPathIndex];
            const dirToTarget = targetPoint.clone().sub(this.position);
            
            if (dirToTarget.length() < 50) {
                this.currentPathIndex = (this.currentPathIndex + 1) % this.patrolPath.length;
            } else {
                this.desiredVelocity = dirToTarget.normalize().multiplyScalar(this.maxSpeed * 0.3);
            }
        }
    }

    /**
     * Chase behavior - pursue player
     */
    chase(deltaTime, playerShip) {
        const dirToPlayer = playerShip.position.clone().sub(this.position);
        
        // Predict player position
        const predictedPos = playerShip.position.clone();
        predictedPos.add(playerShip.velocity.clone().multiplyScalar(0.5));
        
        const dirToPredicted = predictedPos.clone().sub(this.position);
        this.desiredVelocity = dirToPredicted.normalize().multiplyScalar(this.maxSpeed * 0.8);

        // Rotate to face target
        this.faceTarget(playerShip.position, deltaTime);
    }

    /**
     * Attack behavior - engage player
     */
    attack(deltaTime, playerShip) {
        const dirToPlayer = playerShip.position.clone().sub(this.position);
        
        // Maintain distance and circle player
        const distToPlayer = dirToPlayer.length();
        const optimalDistance = this.attackRange * 0.8;
        
        if (distToPlayer > optimalDistance) {
            // Move closer
            this.desiredVelocity = dirToPlayer.normalize().multiplyScalar(this.maxSpeed * 0.6);
        } else if (distToPlayer < optimalDistance * 0.6) {
            // Back away
            this.desiredVelocity = dirToPlayer.normalize().multiplyScalar(-this.maxSpeed * 0.4);
        } else {
            // Circle around player
            const circleDir = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).normalize();
            this.desiredVelocity = circleDir.multiplyScalar(this.maxSpeed * 0.5);
        }

        // Face target and fire
        this.faceTarget(playerShip.position, deltaTime);
    }

    /**
     * Flee behavior - retreat from battle
     */
    flee(deltaTime, playerShip) {
        const dirFromPlayer = this.position.clone().sub(playerShip.position);
        this.desiredVelocity = dirFromPlayer.normalize().multiplyScalar(this.maxSpeed * 0.9);
        this.faceTarget(this.position.clone().add(this.desiredVelocity), deltaTime);
    }

    /**
     * Update collision avoidance with other enemies
     */
    updateAvoidance(allEnemies) {
        this.avoidanceForce.set(0, 0, 0);

        for (const other of allEnemies) {
            if (other === this || other.isDestroyed) continue;

            const dist = this.position.distanceTo(other.position);
            if (dist < this.avoidanceRadius) {
                const avoidDir = this.position.clone().sub(other.position).normalize();
                const force = (1 - dist / this.avoidanceRadius) * this.maxSpeed * 0.3;
                this.avoidanceForce.add(avoidDir.multiplyScalar(force));
            }
        }
    }

    /**
     * Face a target point
     */
    faceTarget(targetPos, deltaTime) {
        const dirToTarget = targetPos.clone().sub(this.position).normalize();
        const forward = new THREE.Vector3(0, 0, 1);
        
        // Smooth rotation
        const angle = forward.angleTo(dirToTarget);
        if (angle > 0.01) {
            const rotAxis = forward.clone().cross(dirToTarget).normalize();
            const maxRotation = this.rotationSpeed * deltaTime;
            const rotAmount = Math.min(angle, maxRotation);
            
            const quat = new THREE.Quaternion();
            quat.setFromAxisAngle(rotAxis, rotAmount);
            this.rotation.order = 'YXZ';
            
            const euler = new THREE.Euler().setFromQuaternion(quat);
            this.rotation.x += euler.x;
            this.rotation.y += euler.y;
            this.rotation.z += euler.z;
        }
    }

    /**
     * Apply movement with acceleration
     */
    applyMovement(deltaTime) {
        // Add avoidance to desired velocity
        const totalDesired = this.desiredVelocity.clone().add(this.avoidanceForce);

        // Accelerate towards desired velocity
        const accelDir = totalDesired.clone().normalize();
        const currentSpeed = this.velocity.length();
        const targetSpeed = Math.min(totalDesired.length(), this.maxSpeed);

        if (currentSpeed < targetSpeed) {
            this.velocity.add(accelDir.multiplyScalar(this.acceleration * deltaTime));
        } else if (currentSpeed > targetSpeed) {
            this.velocity.add(accelDir.multiplyScalar(-this.acceleration * 0.5 * deltaTime));
        }

        // Clamp speed
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
    }

    /**
     * Try to fire weapon at player
     */
    tryFire(weaponManager) {
        if (this.state !== 'ATTACK' || !this.targetPlayer) return null;

        if (this.canFireWeapon()) {
            this.lastFireTime = Date.now() / 1000;
            
            // Simple projectile
            const projectile = {
                position: this.position.clone(),
                direction: this.getForwardDirection(),
                velocity: this.getForwardDirection().multiplyScalar(100),
                damage: this.damage,
                range: 500,
                distanceTraveled: 0,
                type: 'LASER',
                color: 0xff3300,
                size: 0.2,
                isEnemyProjectile: true
            };

            return [projectile];
        }

        return null;
    }

    /**
     * Spawn formation members
     */
    spawnFormation(memberCount) {
        this.formationMembers = [];
        
        for (let i = 0; i < memberCount; i++) {
            const angle = (i / memberCount) * Math.PI * 2;
            const distance = 80;
            
            const offset = new THREE.Vector3(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance * 0.3,
                Math.sin(angle) * distance
            );

            this.formationMembers.push({
                offset: offset,
                index: i
            });
        }
    }

    /**
     * Get difficulty rating (1-10)
     */
    getDifficulty() {
        return Math.ceil((this.maxHealth + this.damage) / 50);
    }

    /**
     * Get enemy info for HUD
     */
    getEnemyInfo() {
        return {
            type: this.type,
            state: this.state,
            health: Math.max(0, this.health),
            maxHealth: this.maxHealth,
            position: this.position.clone(),
            difficulty: this.getDifficulty(),
            reward: this.pointsReward
        };
    }
}

/**
 * Enemy Spawner - manages enemy generation
 */
class EnemySpawner {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.waveNumber = 0;
        this.enemiesDefeated = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 5; // seconds between spawns
    }

    /**
     * Spawn a single enemy
     */
    spawnEnemy(type, position) {
        const config = EnemyShips[type] || EnemyShips.FIGHTER;
        const enemy = new Enemy(`ENEMY_${type}`, {
            ...config,
            position: position || this.getRandomSpawnPosition(),
            aiType: this.getAIType(type),
            patrolPath: this.generatePatrolPath()
        });

        const mesh = enemy.createMesh();
        this.scene.add(mesh);
        this.enemies.push(enemy);

        return enemy;
    }

    /**
     * Spawn wave of enemies
     */
    spawnWave(waveNumber) {
        this.waveNumber = waveNumber;
        const enemyCount = 3 + Math.floor(waveNumber * 1.5);
        const enemyTypes = this.getEnemyTypesForWave(waveNumber);

        for (let i = 0; i < enemyCount; i++) {
            const type = enemyTypes[i % enemyTypes.length];
            const delay = i * 2; // Stagger spawns

            setTimeout(() => {
                this.spawnEnemy(type);
            }, delay * 1000);
        }
    }

    /**
     * Get appropriate enemy types for wave
     */
    getEnemyTypesForWave(waveNumber) {
        if (waveNumber <= 2) {
            return ['SCOUT', 'FIGHTER'];
        } else if (waveNumber <= 5) {
            return ['FIGHTER', 'INTERCEPTOR', 'HEAVY_FIGHTER'];
        } else if (waveNumber <= 10) {
            return ['HEAVY_FIGHTER', 'BOMBER', 'DEFENSE'];
        } else {
            return ['ASSAULT', 'COMMAND', 'FLAGSHIP'];
        }
    }

    /**
     * Get AI type based on enemy type
     */
    getAIType(enemyType) {
        const aiMap = {
            SCOUT: 'EVASIVE',
            FIGHTER: 'AGGRESSIVE',
            INTERCEPTOR: 'AGGRESSIVE',
            HEAVY_FIGHTER: 'AGGRESSIVE',
            BOMBER: 'AGGRESSIVE',
            DEFENSE: 'DEFENSIVE',
            ASSAULT: 'AGGRESSIVE',
            COMMAND: 'DEFENSIVE',
            FLAGSHIP: 'DEFENSIVE'
        };
        return aiMap[enemyType] || 'AGGRESSIVE';
    }

    /**
     * Generate random patrol path
     */
    generatePatrolPath() {
        const path = [];
        const centerX = Math.random() * 200 - 100;
        const centerZ = Math.random() * 200 - 100;

        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const radius = 150;
            
            path.push(new THREE.Vector3(
                centerX + Math.cos(angle) * radius,
                50,
                centerZ + Math.sin(angle) * radius
            ));
        }

        return path;
    }

    /**
     * Get random spawn position (off-screen)
     */
    getRandomSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 400;

        return new THREE.Vector3(
            Math.cos(angle) * distance,
            Math.random() * 100,
            Math.sin(angle) * distance
        );
    }

    /**
     * Update all enemies
     */
    update(deltaTime, playerShip) {
        // Spawn timer
        this.spawnTimer += deltaTime;

        // Update existing enemies
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.isDestroyed) {
                this.scene.remove(enemy.mesh);
                this.enemiesDefeated++;
                return false;
            }

            enemy.update(deltaTime, playerShip, this.enemies);
            return true;
        });

        return this.enemies;
    }

    /**
     * Get all active enemies
     */
    getAllEnemies() {
        return this.enemies.filter(e => !e.isDestroyed);
    }

    /**
     * Check if wave is complete
     */
    isWaveComplete() {
        return this.enemies.length === 0;
    }

    /**
     * Get spawner stats
     */
    getStats() {
        return {
            waveNumber: this.waveNumber,
            activeEnemies: this.enemies.length,
            enemiesDefeated: this.enemiesDefeated,
            totalDifficulty: this.enemies.reduce((sum, e) => sum + e.getDifficulty(), 0)
        };
    }
}
