/**
 * Weapon.js - Defines all weapon types and properties
 * 
 * 10+ unique weapons with different characteristics
 * Each weapon has unique appearance, damage, fire rate, and special effects
 */

class Weapon {
    constructor(type, config = {}) {
        this.type = type;
        this.config = config;
        
        // Weapon properties
        this.name = config.name || 'Unknown Weapon';
        this.damage = config.damage || 10;
        this.fireRate = config.fireRate || 0.5; // seconds between shots
        this.projectileSpeed = config.projectileSpeed || 100;
        this.projectileSize = config.projectileSize || 0.2;
        this.range = config.range || 500;
        this.ammo = config.ammo || -1; // -1 = infinite
        this.maxAmmo = config.ammo || -1;
        this.cooldown = 0;
        
        // Visual properties
        this.color = config.color || 0xff6600;
        this.effectType = config.effectType || 'LASER'; // LASER, MISSILE, PLASMA, RAILGUN, etc.
        this.trailColor = config.trailColor || 0xff8800;
        
        // Weapon behavior
        this.spreadAngle = config.spreadAngle || 0; // For spread weapons
        this.projectilesPerShot = config.projectilesPerShot || 1;
        this.isUnlocked = config.isUnlocked || false;
        this.cost = config.cost || 100;
    }

    /**
     * Check if weapon can fire
     */
    canFire() {
        return this.cooldown <= 0 && (this.ammo > 0 || this.ammo === -1);
    }

    /**
     * Fire weapon and generate projectile(s)
     */
    fire(position, direction) {
        if (!this.canFire()) return null;

        this.cooldown = this.fireRate;
        
        if (this.ammo > 0) {
            this.ammo--;
        }

        // Generate projectiles
        const projectiles = [];
        
        for (let i = 0; i < this.projectilesPerShot; i++) {
            let fireDirection = direction.clone();
            
            // Add spread if multi-projectile
            if (this.projectilesPerShot > 1) {
                const spreadRange = this.spreadAngle / this.projectilesPerShot;
                const offset = (i - this.projectilesPerShot / 2) * spreadRange;
                
                // Rotate direction within spread angle
                const axis = new THREE.Vector3(0, 1, 0);
                fireDirection.applyAxisAngle(axis, offset * Math.PI / 180);
            }

            projectiles.push({
                position: position.clone(),
                direction: fireDirection.normalize(),
                velocity: fireDirection.multiplyScalar(this.projectileSpeed),
                damage: this.damage,
                range: this.range,
                distanceTraveled: 0,
                type: this.effectType,
                color: this.color,
                size: this.projectileSize,
                trailColor: this.trailColor,
                mesh: this.createProjectileMesh()
            });
        }

        return projectiles;
    }

    /**
     * Create 3D mesh for projectile
     */
    createProjectileMesh() {
        let geometry;
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.8
        });

        // Different shapes based on weapon type
        if (this.effectType === 'LASER') {
            geometry = new THREE.CylinderGeometry(this.projectileSize * 0.3, this.projectileSize * 0.3, this.projectileSize * 2, 8);
        } else if (this.effectType === 'MISSILE') {
            geometry = new THREE.ConeGeometry(this.projectileSize * 0.5, this.projectileSize * 2, 8);
        } else if (this.effectType === 'PLASMA') {
            geometry = new THREE.SphereGeometry(this.projectileSize, 8, 8);
        } else if (this.effectType === 'RAILGUN') {
            geometry = new THREE.CylinderGeometry(this.projectileSize * 0.2, this.projectileSize * 0.2, this.projectileSize * 3, 6);
        } else {
            geometry = new THREE.BoxGeometry(this.projectileSize, this.projectileSize, this.projectileSize * 1.5);
        }

        return new THREE.Mesh(geometry, material);
    }

    /**
     * Update weapon cooldown
     */
    update(deltaTime) {
        this.cooldown = Math.max(0, this.cooldown - deltaTime);
    }

    /**
     * Unlock weapon
     */
    unlock() {
        this.isUnlocked = true;
    }

    /**
     * Get weapon info
     */
    getInfo() {
        return {
            type: this.type,
            name: this.name,
            damage: this.damage,
            fireRate: this.fireRate,
            range: this.range,
            ammo: this.ammo,
            isUnlocked: this.isUnlocked,
            cost: this.cost,
            effectType: this.effectType
        };
    }
}

/**
 * WEAPON DEFINITIONS - 10+ UNIQUE WEAPONS
 */
const WeaponTypes = {
    // Weapon 1: Plasma Cannon
    PLASMA_CANNON: {
        name: '⚡ Plasma Cannon',
        damage: 12,
        fireRate: 0.4,
        projectileSpeed: 80,
        projectileSize: 0.3,
        range: 400,
        ammo: -1,
        effectType: 'PLASMA',
        color: 0x00ff00,
        trailColor: 0x00aa00,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 0,
        isUnlocked: true
    },

    // Weapon 2: Laser Rifle
    LASER_RIFLE: {
        name: '🔫 Laser Rifle',
        damage: 8,
        fireRate: 0.3,
        projectileSpeed: 150,
        projectileSize: 0.15,
        range: 600,
        ammo: -1,
        effectType: 'LASER',
        color: 0xff0000,
        trailColor: 0xff6600,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 100,
        isUnlocked: false
    },

    // Weapon 3: Missile Launcher
    MISSILE_LAUNCHER: {
        name: '🚀 Missile Launcher',
        damage: 25,
        fireRate: 1.2,
        projectileSpeed: 60,
        projectileSize: 0.4,
        range: 500,
        ammo: 20,
        effectType: 'MISSILE',
        color: 0xff3300,
        trailColor: 0xff9900,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 200,
        isUnlocked: false
    },

    // Weapon 4: Dual Cannon
    DUAL_CANNON: {
        name: '⚔️ Dual Cannon',
        damage: 10,
        fireRate: 0.35,
        projectileSpeed: 100,
        projectileSize: 0.2,
        range: 450,
        ammo: -1,
        effectType: 'LASER',
        color: 0x0088ff,
        trailColor: 0x0044ff,
        projectilesPerShot: 2,
        spreadAngle: 15,
        cost: 150,
        isUnlocked: false
    },

    // Weapon 5: Railgun
    RAILGUN: {
        name: '⚡ Railgun',
        damage: 30,
        fireRate: 1.5,
        projectileSpeed: 200,
        projectileSize: 0.1,
        range: 800,
        ammo: -1,
        effectType: 'RAILGUN',
        color: 0xffff00,
        trailColor: 0xffaa00,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 300,
        isUnlocked: false
    },

    // Weapon 6: Photon Burst
    PHOTON_BURST: {
        name: '💥 Photon Burst',
        damage: 15,
        fireRate: 0.5,
        projectileSpeed: 120,
        projectileSize: 0.25,
        range: 500,
        ammo: -1,
        effectType: 'PLASMA',
        color: 0x00ffff,
        trailColor: 0x0088ff,
        projectilesPerShot: 3,
        spreadAngle: 25,
        cost: 250,
        isUnlocked: false
    },

    // Weapon 7: Heavy Blaster
    HEAVY_BLASTER: {
        name: '🔫 Heavy Blaster',
        damage: 20,
        fireRate: 0.7,
        projectileSpeed: 90,
        projectileSize: 0.35,
        range: 480,
        ammo: -1,
        effectType: 'LASER',
        color: 0xff4400,
        trailColor: 0xffaa00,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 200,
        isUnlocked: false
    },

    // Weapon 8: Pulse Cannon
    PULSE_CANNON: {
        name: '⚡ Pulse Cannon',
        damage: 14,
        fireRate: 0.45,
        projectileSpeed: 110,
        projectileSize: 0.22,
        range: 520,
        ammo: -1,
        effectType: 'PLASMA',
        color: 0xff00ff,
        trailColor: 0xaa00ff,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 180,
        isUnlocked: false
    },

    // Weapon 9: Spread Gun
    SPREAD_GUN: {
        name: '🌊 Spread Gun',
        damage: 8,
        fireRate: 0.35,
        projectileSpeed: 95,
        projectileSize: 0.18,
        range: 400,
        ammo: -1,
        effectType: 'LASER',
        color: 0x00ff88,
        trailColor: 0x00ff44,
        projectilesPerShot: 5,
        spreadAngle: 45,
        cost: 220,
        isUnlocked: false
    },

    // Weapon 10: Ion Accelerator
    ION_ACCELERATOR: {
        name: '⚙️ Ion Accelerator',
        damage: 18,
        fireRate: 0.6,
        projectileSpeed: 130,
        projectileSize: 0.28,
        range: 550,
        ammo: -1,
        effectType: 'PLASMA',
        color: 0xffff00,
        trailColor: 0xff8800,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 270,
        isUnlocked: false
    },

    // Weapon 11: Charge Blaster
    CHARGE_BLASTER: {
        name: '⚡ Charge Blaster',
        damage: 35,
        fireRate: 2.0,
        projectileSpeed: 100,
        projectileSize: 0.4,
        range: 500,
        ammo: -1,
        effectType: 'LASER',
        color: 0xff0088,
        trailColor: 0xff00ff,
        projectilesPerShot: 1,
        spreadAngle: 0,
        cost: 350,
        isUnlocked: false
    },

    // Weapon 12: Swarm Missiles
    SWARM_MISSILES: {
        name: '🎯 Swarm Missiles',
        damage: 12,
        fireRate: 0.8,
        projectileSpeed: 70,
        projectileSize: 0.3,
        range: 480,
        ammo: 30,
        effectType: 'MISSILE',
        color: 0xaa0000,
        trailColor: 0xff6600,
        projectilesPerShot: 4,
        spreadAngle: 30,
        cost: 280,
        isUnlocked: false
    }
};

/**
 * Create all weapons
 */
function createAllWeapons() {
    const weapons = [];
    let slotNumber = 1;

    for (const [key, config] of Object.entries(WeaponTypes)) {
        const weapon = new Weapon(key, config);
        weapon.slotNumber = slotNumber;
        weapons.push(weapon);
        slotNumber++;
    }

    return weapons;
}

/**
 * Weapon Manager - handles weapon selection and firing
 */
class WeaponManager {
    constructor(player) {
        this.player = player;
        this.weapons = createAllWeapons();
        this.currentWeaponIndex = 0;
        this.projectiles = [];
    }

    /**
     * Select weapon by slot number (1-5)
     */
    selectWeaponBySlot(slotNumber) {
        const index = slotNumber - 1;
        if (index >= 0 && index < this.weapons.length) {
            this.currentWeaponIndex = index;
            return this.weapons[index];
        }
        return null;
    }

    /**
     * Get current weapon
     */
    getCurrentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }

    /**
     * Fire current weapon
     */
    fireWeapon(position, direction) {
        const weapon = this.getCurrentWeapon();
        if (!weapon) return null;

        const newProjectiles = weapon.fire(position, direction);
        if (newProjectiles) {
            this.projectiles.push(...newProjectiles);
            return newProjectiles;
        }
        return null;
    }

    /**
     * Get all weapons
     */
    getAllWeapons() {
        return this.weapons;
    }

    /**
     * Get unlocked weapons
     */
    getUnlockedWeapons() {
        return this.weapons.filter(w => w.isUnlocked);
    }

    /**
     * Unlock weapon by type
     */
    unlockWeapon(weaponType) {
        const weapon = this.weapons.find(w => w.type === weaponType);
        if (weapon) {
            weapon.unlock();
            return true;
        }
        return false;
    }

    /**
     * Update all weapons and projectiles
     */
    update(deltaTime) {
        // Update weapon cooldowns
        this.weapons.forEach(w => w.update(deltaTime));

        // Update projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.distanceTraveled += p.velocity.length() * deltaTime;
            p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
            
            // Remove if out of range
            return p.distanceTraveled < p.range;
        });
    }

    /**
     * Get weapon info for HUD
     */
    getWeaponInfo() {
        return this.weapons.map((w, idx) => ({
            slot: idx + 1,
            name: w.name,
            damage: w.damage,
            fireRate: w.fireRate,
            ammo: w.ammo,
            isUnlocked: w.isUnlocked,
            isActive: idx === this.currentWeaponIndex
        }));
    }
}
