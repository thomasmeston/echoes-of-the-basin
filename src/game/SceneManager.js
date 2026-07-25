import * as THREE from 'three';

export class SceneManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.pixelShader = null;
    }

    initialize() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.OrthographicCamera(
            window.innerWidth / -2,
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerHeight / -2,
            1,
            1000
        );
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            pixelated: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1); // Force pixelated look
        this.renderer.domElement.classList.add('game-canvas');
        document.body.appendChild(this.renderer.domElement);

        // Set up camera position
        this.camera.position.z = 5;
        this.camera.lookAt(0, 0, 0);

        // Create pixel art shader material
        this.pixelShader = {
            uniforms: {
                resolution: { value: new THREE.Vector2() }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec2 resolution;
                varying vec2 vUv;
                
                void main() {
                    vec2 dxy = 1.0 / resolution;
                    vec2 coord = vUv - mod(vUv, dxy);
                    gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
                }
            `
        };

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Create the room and start animation
        this.createRoom();
        this.animate();
    }

    onWindowResize() {
        this.camera.left = window.innerWidth / -2;
        this.camera.right = window.innerWidth / 2;
        this.camera.top = window.innerHeight / 2;
        this.camera.bottom = window.innerHeight / -2;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.pixelShader.uniforms.resolution.value.set(
            window.innerWidth / 4,
            window.innerHeight / 4
        );
    }

    createRoom() {
        // Create the radio room environment
        const roomGeometry = new THREE.BoxGeometry(10, 10, 10);
        const roomMaterial = new THREE.MeshBasicMaterial({
            color: 0x2a2a2a,
            side: THREE.BackSide
        });
        const room = new THREE.Mesh(roomGeometry, roomMaterial);
        this.scene.add(room);

        // Add radio equipment
        this.createRadioEquipment();
    }

    createRadioEquipment() {
        // Create the main radio console
        const consoleGeometry = new THREE.BoxGeometry(2, 0.5, 1);
        const consoleMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const radioConsole = new THREE.Mesh(consoleGeometry, consoleMaterial);
        radioConsole.position.set(0, -2, 0);
        this.scene.add(radioConsole);

        // Add frequency display
        const displayGeometry = new THREE.PlaneGeometry(1, 0.3);
        const displayMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const display = new THREE.Mesh(displayGeometry, displayMaterial);
        display.position.set(0, -1.8, 0.6);
        this.scene.add(display);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.renderer.dispose();
    }
} 