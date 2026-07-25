import './styles.css';
import { images } from './assets.js';
import { GameEngine } from './game/GameEngine.js';
import { SceneManager } from './game/SceneManager.js';

function showBootError(error) {
    const el = document.getElementById('boot-error');
    if (el) {
        el.style.display = 'block';
        el.textContent = `Echoes of the Basin failed to start.\n\n${error && error.stack ? error.stack : error}`;
    }
    console.error('Error initializing game:', error);
}

function applyWoodBackground() {
    let backgroundContainer = document.querySelector('.background-container');
    if (!backgroundContainer) {
        backgroundContainer = document.createElement('div');
        backgroundContainer.className = 'background-container';
        document.body.insertBefore(backgroundContainer, document.body.firstChild);
    }

    let overlay = document.querySelector('.overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'overlay';
        backgroundContainer.insertAdjacentElement('afterend', overlay);
    }

    const woodUrl = images.woodTexture;
    console.log('Wood texture URL:', woodUrl);

    const testImage = new Image();
    testImage.onload = () => {
        console.log('Wood texture loaded successfully');
        backgroundContainer.style.backgroundImage = `url("${woodUrl}")`;
    };
    testImage.onerror = () => {
        console.error('Failed to load wood texture:', woodUrl);
        backgroundContainer.style.backgroundColor = '#2a1a10';
    };
    testImage.src = woodUrl;
}

class Game {
    constructor() {
        this.gameEngine = new GameEngine();
        this.sceneManager = new SceneManager(this.gameEngine);
        this.init();
        this.gameEngine.addToLog('January 12, 1945 — Echoes of the Basin', 'system');
    }

    init() {
        this.gameEngine.init();

        try {
            this.sceneManager.initialize();
        } catch (error) {
            console.warn('3D scene unavailable; continuing with UI only.', error);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                console.log('Game paused');
            }
        });
    }
}

function boot() {
    try {
        applyWoodBackground();
        window.game = new Game();
        console.log('Game initialized successfully');
    } catch (error) {
        showBootError(error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
