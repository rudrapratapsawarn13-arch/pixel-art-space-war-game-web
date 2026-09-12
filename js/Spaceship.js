/**
 * Spaceship.js - Defines all spaceship types and properties
 * 
 * Player Spaceships: 10 different types with unique properties
 * Enemy Spaceships: Multiple types with varying difficulty
 * Teammate Spaceships: Different roles to support the player
 */

class Spaceship {
    constructor(type, config = {}) {
        this.type = type;
        this.config = config;
        
        // Physical properties
        this.position = new THREE.Vector3(config.position?.x || 0, config.position?.y || 0, config.position?.z || 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale = config.scale || 1;
        
        // Health system
        this.maxHealth = config.maxHealth || 100;
        this.health = this.maxHealth;
        this.maxShield = config.maxShield || 50;
        this.shield = this.maxShield;
        
        // Combat properties
        this.damage = config.damage || 10;
        this.fireRate = config.fireRate || 0.5; // seconds
        this.lastFireTime = 0;
        this.weaponSlots = config.weaponSlots || [0, 0];
        
        // Movement properties
        this.maxSpeed = config.maxSpeed || 50;
        this.acceleration = config.acceleration || 20;
        this.rotationSpeed = config.rotationSpeed || 2;
        
        // Three.js mesh
        this.mesh = null;
        this.isDestroyed = false;
    }

    /**
     * Create 3D pixel-art mesh for spaceship
     */
    createMesh() {
        const group = new THREE.Group();
        
        // Create modular spaceship components based on type
        const hull = this.createHull();
        const engines = this.createEngines();
        const weaponMounts = this.createWeaponMounts();
        
        group.add(hull);
        group.add(engines);
        group.add(weaponMounts);
        
        group.position.copy(this.position);
        group.rotation.copy(this.rotation);
        group.scale.multiplyScalar(this.scale);
        
        this.mesh = group;
        return group;
    }

    /**
     * Create pixel-art hull mesh
     */
    createHull() {
        const hulls = {
            // Player Ships
            'PLAYER_FIGHTER': () => this.createPixelCube(0.8, 0.4, 1.5, 0x0088ff),
            'PLAYER_HEAVY': () => this.createPixelCube(1.2, 0.6, 1.8, 0x0066ff),
            'PLAYER_SCOUT': () => this.createPixelCube(0.6, 0.3, 1.2, 0x00ff88),
            'PLAYER_INTERCEPTOR': () => this.createPixelCube(0.7, 0.35, 1.4, 0x00ffcc),
            'PLAYER_BOMBER': () => this.createPixelCube(1.4, 0.7, 1.6, 0x0044ff),
            'PLAYER_SUPPORT': () => this.createPixelCube(0.9, 0.5, 1.3, 0x00ff44),
            'PLAYER_STEALTH': () => this.createPixelCube(0.75, 0.35, 1.35, 0x2200ff),
            'PLAYER_ASSAULT': () => this.createPixelCube(1.3, 0.65, 1.7, 0x0066aa),
            'PLAYER_EXPLORER': () => this.createPixelCube(0.85, 0.45, 1.4, 0x00ffaa),
            'PLAYER_BATTLESHIP': () => this.createPixelCube(1.5, 0.8, 2.0, 0x003399),
            
            // Enemy Ships
            'ENEMY_SCOUT': () => this.createPixelCube(0.5, 0.25, 1.0, 0xff3300),
            'ENEMY_FIGHTER': () => this.createPixelCube(0.7, 0.35, 1.2, 0xff5500),
            'ENEMY_INTERCEPTOR': () => this.createPixelCube(0.6, 0.3, 1.1, 0xff6600),
            'ENEMY_HEAVY_FIGHTER': () => this.createPixelCube(1.0, 0.5, 1.5, 0xff4400),
            'ENEMY_BOMBER': () => this.createPixelCube(1.2, 0.6, 1.4, 0xff2200),
            'ENEMY_DEFENSE': () => this.createPixelCube(1.1, 0.55, 1.3, 0xff3300),
            'ENEMY_ASSAULT': () => this.createPixelCube(1.3, 0.65, 1.6, 0xff1100),
            'ENEMY_COMMAND': () => this.createPixelCube(1.4, 0.7, 1.8, 0xff0000),
            'ENEMY_FLAGSHIP': () => this.createPixelCube(2.0, 1.0, 2.5, 0xaa0000),
            
            // Teammate Ships
            'TEAMMATE_FIGHTER': () => this.createPixelCube(0.7, 0.35, 1.2, 0x00ff00),
            'TEAMMATE_SUPPORT': () => this.createPixelCube(0.9, 0.45, 1.3, 0x00aa00),
            'TEAMMATE_HEAVY': () => this.createPixelCube(1.1, 0.55, 1.5, 0x00ff44)
        };

        const hullCreator = hulls[this.type] || hulls['PLAYER_FIGHTER'];
        return hullCreator.call(this);
    }

    /**
     * Create pixel cube geometry
     */
    createPixelCube(width, height, depth, color) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Add more segments for pixelated look
        geometry.subdivisions = 4;
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.8,
            emissive: color,
            emissiveIntensity: 0.3
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    /**
     * Create engine components
     */
    createEngines() {
        const engineGroup = new THREE.Group();
        
        const engineGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.8);
        const engineMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff6600,
            emissiveIntensity: 0.8
        });
        
        const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
        leftEngine.position.set(-0.4, -0.1, -1.2);
        
        const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
        rightEngine.position.set(0.4, -0.1, -1.2);
        
        engineGroup.add(leftEngine);
        engineGroup.add(rightEngine);
        
        return engineGroup;
    }

    /**
     * Create weapon mount points
     */
    createWeaponMounts() {
        const mountGroup = new THREE.Group();
        
        const mountGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.4);
        const mountMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.5
        });
        
        const leftMount = new THREE.Mesh(mountGeometry, mountMaterial);
        leftMount.position.set(-0.35, 0.15, 0.3);
        
        const rightMount = new THREE.Mesh(mountGeometry, mountMaterial);
        rightMount.position.set(0.35, 0.15, 0.3);
        
        mountGroup.add(leftMount);
        mountGroup.add(rightMount);
        
        return mountGroup;
    }

    /**
     * Update spaceship position and movement
     */
    update(deltaTime) {
        if (this.isDestroyed) return;

        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }

        // Regenerate shield (slow)
        if (this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + 5 * deltaTime);
        }
    }

    /**
     * Apply damage to spaceship
     */
    takeDamage(amount) {
        if (this.isDestroyed) return;

        // Damage shield first
        const shieldDamage = Math.min(this.shield, amount);
        this.shield -= shieldDamage;
        const remainingDamage = amount - shieldDamage;

        // Then damage health
        if (remainingDamage > 0) {
            this.health -= remainingDamage;
        }

        // Check if destroyed
        if (this.health <= 0) {
            this.destroy();
        }

        return this.health <= 0;
    }

    /**
     * Fire weapon
     */
    canFireWeapon() {
        const now = Date.now() / 1000;
        return now - this.lastFireTime >= this.fireRate;
    }

    fireWeapon() {
        this.lastFireTime = Date.now() / 1000;
        return {
            position: this.position.clone(),
            direction: this.getForwardDirection(),
            damage: this.damage
        };
    }

    /**
     * Get forward direction vector
     */
    getForwardDirection() {
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.mesh ? this.mesh.quaternion : new THREE.Quaternion());
        return forward;
    }

    /**
     * Destroy spaceship
     */
    destroy() {
        this.isDestroyed = true;
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    /**
     * Get spaceship info for HUD
     */
    getInfo() {
        return {
            type: this.type,
            health: Math.max(0, this.health),
            maxHealth: this.maxHealth,
            shield: Math.max(0, this.shield),
            maxShield: this.maxShield,
            position: this.position.clone(),
            speed: this.velocity.length()
        };
    }
}

/**
 * PLAYER SPACESHIP DEFINITIONS
 */
const PlayerShips = {
    FIGHTER: {
        name: 'Combat Fighter',
        maxHealth: 100,
        maxShield: 50,
        damage: 15,
        maxSpeed: 60,
        acceleration: 25,
        scale: 1.0,
        weaponSlots: 2
    },
    HEAVY: {
        name: 'Heavy Cruiser',
        maxHealth: 150,
        maxShield: 80,
        damage: 20,
        maxSpeed: 40,
        acceleration: 15,
        scale: 1.3,
        weaponSlots: 3
    },
    SCOUT: {
        name: 'Scout Runner',
        maxHealth: 60,
        maxShield: 30,
        damage: 10,
        maxSpeed: 80,
        acceleration: 35,
        scale: 0.8,
        weaponSlots: 1
    },
    INTERCEPTOR: {
        name: 'Interceptor',
        maxHealth: 80,
        maxShield: 40,
        damage: 12,
        maxSpeed: 75,
        acceleration: 32,
        scale: 0.9,
        weaponSlots: 2
    },
    BOMBER: {
        name: 'Assault Bomber',
        maxHealth: 140,
        maxShield: 70,
        damage: 25,
        maxSpeed: 35,
        acceleration: 12,
        scale: 1.4,
        weaponSlots: 4
    },
    SUPPORT: {
        name: 'Support Vessel',
        maxHealth: 120,
        maxShield: 90,
        damage: 8,
        maxSpeed: 45,
        acceleration: 18,
        scale: 1.1,
        weaponSlots: 2
    },
    STEALTH: {
        name: 'Stealth Fighter',
        maxHealth: 70,
        maxShield: 35,
        damage: 14,
        maxSpeed: 85,
        acceleration: 38,
        scale: 0.85,
        weaponSlots: 2
    },
    ASSAULT: {
        name: 'Assault Destroyer',
        maxHealth: 160,
        maxShield: 100,
        damage: 22,
        maxSpeed: 42,
        acceleration: 14,
        scale: 1.35,
        weaponSlots: 3
    },
    EXPLORER: {
        name: 'Deep Space Explorer',
        maxHealth: 110,
        maxShield: 60,
        damage: 12,
        maxSpeed: 55,
        acceleration: 20,
        scale: 1.05,
        weaponSlots: 2
    },
    BATTLESHIP: {
        name: 'Battleship Titan',
        maxHealth: 200,
        maxShield: 120,
        damage: 30,
        maxSpeed: 30,
        acceleration: 10,
        scale: 1.5,
        weaponSlots: 5
    }
};

/**
 * ENEMY SPACESHIP DEFINITIONS
 */
const EnemyShips = {
    SCOUT: {
        name: 'Enemy Scout',
        maxHealth: 30,
        maxShield: 10,
        damage: 5,
        maxSpeed: 70,
        acceleration: 30,
        scale: 0.6,
        points: 50
    },
    FIGHTER: {
        name: 'Enemy Fighter',
        maxHealth: 60,
        maxShield: 25,
        damage: 10,
        maxSpeed: 60,
        acceleration: 25,
        scale: 0.8,
        points: 100
    },
    INTERCEPTOR: {
        name: 'Enemy Interceptor',
        maxHealth: 50,
        maxShield: 20,
        damage: 12,
        maxSpeed: 75,
        acceleration: 32,
        scale: 0.75,
        points: 120
    },
    HEAVY_FIGHTER: {
        name: 'Heavy Fighter',
        maxHealth: 100,
        maxShield: 45,
        damage: 15,
        maxSpeed: 50,
        acceleration: 20,
        scale: 1.0,
        points: 150
    },
    BOMBER: {
        name: 'Enemy Bomber',
        maxHealth: 110,
        maxShield: 50,
        damage: 20,
        maxSpeed: 35,
        acceleration: 12,
        scale: 1.2,
        points: 200
    },
    DEFENSE: {
        name: 'Defense Ship',
        maxHealth: 90,
        maxShield: 60,
        damage: 14,
        maxSpeed: 40,
        acceleration: 15,
        scale: 1.1,
        points: 180
    },
    ASSAULT: {
        name: 'Assault Destroyer',
        maxHealth: 130,
        maxShield: 70,
        damage: 18,
        maxSpeed: 42,
        acceleration: 14,
        scale: 1.3,
        points: 250
    },
    COMMAND: {
        name: 'Command Cruiser',
        maxHealth: 150,
        maxShield: 90,
        damage: 16,
        maxSpeed: 38,
        acceleration: 12,
        scale: 1.4,
        points: 300
    },
    FLAGSHIP: {
        name: 'Enemy Flagship',
        maxHealth: 300,
        maxShield: 150,
        damage: 25,
        maxSpeed: 30,
        acceleration: 10,
        scale: 2.0,
        points: 1000
    }
};

/**
 * TEAMMATE SPACESHIP DEFINITIONS
 */
const TeammateShips = {
    FIGHTER: {
        name: 'Teammate Fighter',
        maxHealth: 80,
        maxShield: 40,
        damage: 12,
        maxSpeed: 60,
        acceleration: 25,
        scale: 0.9,
        aiType: 'AGGRESSIVE'
    },
    INTERCEPTOR: {
        name: 'Teammate Interceptor',
        maxHealth: 70,
        maxShield: 35,
        damage: 11,
        maxSpeed: 70,
        acceleration: 30,
        scale: 0.85,
        aiType: 'SUPPORT'
    },
    HEAVY: {
        name: 'Teammate Heavy',
        maxHealth: 120,
        maxShield: 70,
        damage: 16,
        maxSpeed: 45,
        acceleration: 15,
        scale: 1.2,
        aiType: 'DEFENSIVE'
    }
};
