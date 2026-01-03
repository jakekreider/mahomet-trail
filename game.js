// Game State (gameData is loaded from gamedata.js)
let gameState = {
    resources: {},
    distance: 0,
    totalDistance: 0,
    isGameOver: false,
    log: []
};

// DOM Elements
const screens = {
    title: document.getElementById('title-screen'),
    game: document.getElementById('game-screen'),
    gameOver: document.getElementById('gameover-screen'),
    victory: document.getElementById('victory-screen')
};

const buttons = {
    start: document.getElementById('start-button'),
    continue: document.getElementById('continue-button'),
    restart: document.getElementById('restart-button'),
    playAgain: document.getElementById('play-again-button')
};

// Initialize game
function init() {
    console.log('Game initialized with data:', gameData);
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    buttons.start.addEventListener('click', startGame);
    buttons.continue.addEventListener('click', continueJourney);
    buttons.restart.addEventListener('click', resetGame);
    buttons.playAgain.addEventListener('click', resetGame);
}

// Start new game
function startGame() {
    gameState = {
        resources: { ...gameData.starting_resources },
        distance: 0,
        totalDistance: gameData.game.total_distance,
        isGameOver: false,
        log: []
    };

    // Reset hunting trigger flag
    huntingHasTriggered = false;

    showScreen('game');
    updateUI();
    addLogEntry('Your journey begins...', 'important');
}

// Continue journey (trigger next event)
function continueJourney() {
    if (gameState.isGameOver) return;

    const criticalEvent = checkCriticalConditions();
    if (criticalEvent) {
        handleCriticalEvent(criticalEvent);
        return;
    }

    const previousDistance = gameState.distance;
    const progressAmount = Math.random() * 2 + 0.5;
    gameState.distance += progressAmount;

    // Check if we crossed the halfway point (6 miles) and haven't triggered hunting yet
    const halfwayPoint = gameState.totalDistance / 2;
    if (!huntingHasTriggered && previousDistance < halfwayPoint && gameState.distance >= halfwayPoint) {
        huntingHasTriggered = true;
        triggerMandatoryHunting();
        return;
    }

    if (gameState.distance >= gameState.totalDistance) {
        victory();
        return;
    }

    const event = getRandomEvent();

    if (event.customEvent && typeof customEvents !== 'undefined' && customEvents[event.id]) {
        const customResult = customEvents[event.id](gameState, event);
        if (customResult.text) event.text = customResult.text;
        if (customResult.effects) event.effects = customResult.effects;
    }

    displayEvent(event);
    applyEventEffects(event);
    updateUI();
}

// Trigger mandatory hunting at halfway point
function triggerMandatoryHunting() {
    const titleEl = document.getElementById('event-title');
    const textEl = document.getElementById('event-text');
    const effectsEl = document.getElementById('event-effects');

    titleEl.textContent = "Halfway There!";
    textEl.textContent = "You've reached the halfway point. Time to hunt for supplies!";
    effectsEl.innerHTML = '';

    addLogEntry('Reached halfway point - hunting time!', 'important');
    updateUI();

    // Auto-start hunting after a short delay
    setTimeout(() => {
        showHuntingOverlay();
    }, 1500);
}

// Check for critical conditions (game over conditions)
function checkCriticalConditions() {
    const criticalEvents = gameData.events.filter(e => e.type === 'critical');

    for (let event of criticalEvents) {
        if (event.condition) {
            const condition = event.condition
                .replace('gas', gameState.resources.gas)
                .replace('snacks', gameState.resources.snacks)
                .replace('patience', gameState.resources.patience)
                .replace('van_health', gameState.resources.van_health);

            try {
                if (eval(condition)) {
                    return event;
                }
            } catch (e) {
                console.error('Error evaluating condition:', e);
            }
        }
    }

    return null;
}

// Handle critical/fatal event
function handleCriticalEvent(event) {
    gameState.isGameOver = true;
    displayEvent(event);
    addLogEntry(event.title, 'negative');

    setTimeout(() => {
        gameOver(event);
    }, 2000);
}

// Get random event based on weights
function getRandomEvent() {
    const availableEvents = gameData.events.filter(e => e.type !== 'critical');
    const totalWeight = availableEvents.reduce((sum, event) => sum + event.weight, 0);
    let random = Math.random() * totalWeight;

    for (let event of availableEvents) {
        random -= event.weight;
        if (random <= 0) {
            return event;
        }
    }

    return availableEvents[0];
}

// Display event in UI
function displayEvent(event) {
    const titleEl = document.getElementById('event-title');
    const textEl = document.getElementById('event-text');
    const effectsEl = document.getElementById('event-effects');

    titleEl.textContent = event.title;
    textEl.textContent = event.text;

    // Don't show effects for special events
    if (event.special === 'hunting') {
        return;
    }

    effectsEl.innerHTML = '';
    if (event.effects && Object.keys(event.effects).length > 0) {
        for (let [resource, value] of Object.entries(event.effects)) {
            const effectDiv = document.createElement('div');
            effectDiv.className = `effect ${value < 0 ? 'negative' : 'positive'}`;
            const sign = value > 0 ? '+' : '';
            const resourceName = resource.replace('_', ' ').toUpperCase();
            effectDiv.textContent = `${resourceName}: ${sign}${value}`;
            effectsEl.appendChild(effectDiv);
        }
    }

    addLogEntry(event.title, event.type.includes('negative') ? 'negative' : '');
}

// Apply event effects to resources
function applyEventEffects(event) {
    if (!event.effects) return;

    for (let [resource, value] of Object.entries(event.effects)) {
        if (gameState.resources.hasOwnProperty(resource)) {
            gameState.resources[resource] += value;
            gameState.resources[resource] = Math.max(0, Math.min(100, gameState.resources[resource]));
        }
    }
}

// Update all UI elements
function updateUI() {
    updateProgress();
    updateResources();
}

// Update progress bar
function updateProgress() {
    const progress = (gameState.distance / gameState.totalDistance) * 100;
    const progressFill = document.getElementById('progress-fill');
    const vanIcon = document.querySelector('.van-icon');

    progressFill.style.width = `${progress}%`;
    vanIcon.style.left = `${progress}%`;

    document.getElementById('miles-traveled').textContent = gameState.distance.toFixed(1);
    document.getElementById('total-miles').textContent = gameState.totalDistance;
}

// Update resource bars
function updateResources() {
    for (let [resource, value] of Object.entries(gameState.resources)) {
        const barEl = document.getElementById(`${resource.replace('_', '-')}-bar`);
        const valueEl = document.getElementById(`${resource.replace('_', '-')}-value`);

        if (barEl && valueEl) {
            const percentage = Math.max(0, value);
            barEl.style.width = `${percentage}%`;
            valueEl.textContent = Math.round(value);

            barEl.classList.remove('warning', 'critical');
            if (value <= 20) {
                barEl.classList.add('critical');
            } else if (value <= 40) {
                barEl.classList.add('warning');
            }
        }
    }
}

// Add entry to game log
function addLogEntry(text, className = '') {
    const logEl = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.textContent = `> ${text}`;
    logEl.appendChild(entry);

    logEl.scrollTop = logEl.scrollHeight;

    while (logEl.children.length > 20) {
        logEl.removeChild(logEl.firstChild);
    }
}

// Victory!
function victory() {
    gameState.isGameOver = true;

    const messagesEl = document.getElementById('victory-messages');
    messagesEl.innerHTML = '';

    gameData.victory.messages.forEach(message => {
        const p = document.createElement('p');
        p.textContent = message;
        messagesEl.appendChild(p);
    });

    const statsEl = document.getElementById('victory-stats');
    statsEl.innerHTML = `
        <p>Final Stats:</p>
        <p>⛽ Gas Remaining: ${Math.round(gameState.resources.gas)}</p>
        <p>🍿 Snacks Remaining: ${Math.round(gameState.resources.snacks)}</p>
        <p>😌 Patience Remaining: ${Math.round(gameState.resources.patience)}</p>
        <p>🚐 Van Health: ${Math.round(gameState.resources.van_health)}</p>
    `;

    showScreen('victory');
}

// Game Over
function gameOver(event) {
    const titleEl = document.getElementById('gameover-title');
    const textEl = document.getElementById('gameover-text');
    const statsEl = document.getElementById('gameover-stats');

    titleEl.textContent = event.title;
    textEl.textContent = event.text;

    statsEl.innerHTML = `
        <p>You traveled ${gameState.distance.toFixed(1)} of ${gameState.totalDistance} miles.</p>
        <p>Final Resources:</p>
        <p>⛽ Gas: ${Math.round(gameState.resources.gas)}</p>
        <p>🍿 Snacks: ${Math.round(gameState.resources.snacks)}</p>
        <p>😌 Patience: ${Math.round(gameState.resources.patience)}</p>
        <p>🚐 Van Health: ${Math.round(gameState.resources.van_health)}</p>
    `;

    showScreen('gameOver');
}

// Reset game
function resetGame() {
    showScreen('title');
    document.getElementById('log').innerHTML = '';
}

// Show specific screen
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);

// ============================================================================
// HUNTING MINI-GAME
// ============================================================================

let huntingScene, huntingCamera, huntingRenderer;
let animals = [];
let huntingGameActive = false;
let huntingTimeRemaining = 30;
let huntingAmmo = 10;
let huntingKills = { squirrels: 0, deer: 0, cats: 0 };
let huntingRaycaster, huntingMouse;
let huntingHasTriggered = false;
let huntingKeys = { w: false, a: false, s: false, d: false };
let cameraVelocity = { x: 0, z: 0 };
let cameraRotation = { yaw: 0, pitch: 0 };
let isPointerLocked = false;

// Mobile controls
// Check URL parameter for forcing mobile mode (for testing)
const urlParams = new URLSearchParams(window.location.search);
const forceMobile = urlParams.get('mobile') === 'true';

let isMobile = forceMobile || (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
);

// Log for debugging
console.log('========================================');
console.log('MAHOMET TRAIL - HUNTING GAME LOADED');
console.log('Mobile mode:', isMobile);
console.log('Forced via URL:', forceMobile);
console.log('User Agent:', navigator.userAgent);
console.log('Touch support:', 'ontouchstart' in window);
console.log('Max touch points:', navigator.maxTouchPoints);
console.log('========================================');

// Add visual debug indicator
if (isMobile) {
    const indicator = document.createElement('div');
    indicator.id = 'mobile-mode-indicator';
    indicator.textContent = 'MOBILE MODE';
    indicator.style.cssText = 'position: fixed; top: 5px; right: 5px; background: rgba(255,0,0,0.8); color: white; padding: 5px 10px; font-family: monospace; font-size: 12px; z-index: 9999; border-radius: 3px;';
    document.body.appendChild(indicator);
    console.log('Mobile mode indicator added to page');
}

let touchState = {
    moveTouch: null,
    lookTouch: null,
    moveVector: { x: 0, y: 0 },
    lookStart: { x: 0, y: 0 }
};

// Animal types with their properties
const ANIMAL_TYPES = {
    squirrel: {
        emoji: '🐿️',
        scale: 0.3,
        speed: 0.06,
        snackValue: 5,
        spawnWeight: 70
    },
    deer: {
        emoji: '🦌',
        scale: 0.5,
        speed: 0.04,
        snackValue: 15,
        spawnWeight: 20
    },
    cat: {
        emoji: '🐱',
        scale: 0.35,
        speed: 0.08,
        snackValue: -10,
        spawnWeight: 10
    }
};

// Initialize hunting scene
function initHuntingScene() {
    console.log('*** Initializing hunting scene - Mobile mode:', isMobile);

    huntingScene = new THREE.Scene();
    huntingScene.fog = new THREE.Fog(0x000000, 5, 15);

    huntingCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    huntingCamera.position.z = 5;

    const canvas = document.getElementById('hunting-canvas');
    huntingRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    huntingRenderer.setSize(window.innerWidth, window.innerHeight);
    huntingRenderer.setClearColor(0x000000);

    huntingRaycaster = new THREE.Raycaster();
    huntingMouse = new THREE.Vector2();

    createHuntingGround();
    addHuntingScenery();

    window.addEventListener('resize', onHuntingWindowResize);

    // Keyboard controls (desktop only)
    if (!isMobile) {
        document.addEventListener('keydown', onHuntingKeyDown);
        document.addEventListener('keyup', onHuntingKeyUp);

        // Pointer lock for mouse look
        canvas.addEventListener('click', () => {
            if (!isPointerLocked) {
                canvas.requestPointerLock();
            } else {
                onHuntingShoot();
            }
        });

        let timerStarted = false;
        document.addEventListener('pointerlockchange', () => {
            const wasLocked = isPointerLocked;
            isPointerLocked = document.pointerLockElement === canvas;
            const lockPrompt = document.getElementById('hunting-lock-prompt');
            const crosshair = document.getElementById('hunting-crosshair');

            if (isPointerLocked) {
                lockPrompt.classList.add('hidden');
                crosshair.classList.add('active');

                // Start timer on first lock
                if (huntingGameActive && !timerStarted) {
                    timerStarted = true;
                    startHuntingTimer();
                }
            } else if (huntingGameActive) {
                lockPrompt.classList.remove('hidden');
                crosshair.classList.remove('active');
            }
        });

        document.addEventListener('mousemove', onMouseMove);
    } else {
        console.log('*** Setting up MOBILE touch controls');

        // Mobile touch controls
        canvas.addEventListener('touchstart', (e) => {
            console.log('RAW touchstart event on canvas!', e.touches.length);
            onTouchStart(e);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            console.log('RAW touchmove event on canvas!');
            onTouchMove(e);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            console.log('RAW touchend event on canvas!');
            onTouchEnd(e);
        }, { passive: false });

        console.log('Touch event listeners added to canvas');

        // Also test if we can capture touches on the whole document
        document.addEventListener('touchstart', (e) => {
            console.log('RAW touchstart on DOCUMENT!', e.target.id || e.target.tagName);
        }, { passive: false });

        // DESKTOP TESTING: Add mouse events that simulate touch for testing on desktop
        if (forceMobile) {
            console.log('*** Adding MOUSE events for desktop testing (mobile mode forced via URL)');

            let mouseDown = false;
            let mouseTouchId = 'mouse';

            canvas.addEventListener('mousedown', (e) => {
                console.log('MOUSE DOWN on canvas - simulating touch!');
                mouseDown = true;

                // Create fake touch event
                const fakeTouch = {
                    identifier: mouseTouchId,
                    clientX: e.clientX,
                    clientY: e.clientY
                };

                const fakeTouchEvent = {
                    preventDefault: () => e.preventDefault(),
                    changedTouches: [fakeTouch],
                    touches: [fakeTouch]
                };

                onTouchStart(fakeTouchEvent);
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!mouseDown) return;

                const fakeTouch = {
                    identifier: mouseTouchId,
                    clientX: e.clientX,
                    clientY: e.clientY
                };

                const fakeTouchEvent = {
                    preventDefault: () => e.preventDefault(),
                    changedTouches: [fakeTouch],
                    touches: [fakeTouch]
                };

                onTouchMove(fakeTouchEvent);
            });

            canvas.addEventListener('mouseup', (e) => {
                if (!mouseDown) return;
                console.log('MOUSE UP on canvas');
                mouseDown = false;

                const fakeTouch = {
                    identifier: mouseTouchId,
                    clientX: e.clientX,
                    clientY: e.clientY
                };

                const fakeTouchEvent = {
                    preventDefault: () => e.preventDefault(),
                    changedTouches: [fakeTouch],
                    touches: []
                };

                onTouchEnd(fakeTouchEvent);
            });

            console.log('Mouse simulation events added for desktop testing');
        }

        // Prevent default touch behaviors globally during hunting
        document.addEventListener('touchmove', (e) => {
            if (huntingGameActive) e.preventDefault();
        }, { passive: false });

        document.addEventListener('gesturestart', (e) => {
            if (huntingGameActive) e.preventDefault();
        });
        console.log('Global touch prevention listeners added');

        // Hide pointer lock prompt on mobile
        const lockPrompt = document.getElementById('hunting-lock-prompt');
        lockPrompt.style.display = 'none';

        // Show crosshair immediately on mobile
        const crosshair = document.getElementById('hunting-crosshair');
        crosshair.classList.add('active');

        // Show mobile joystick and setup shoot button
        const joystick = document.getElementById('mobile-joystick');
        const shootBtn = document.getElementById('mobile-shoot-btn');

        if (joystick) {
            joystick.style.display = 'block';
            console.log('Mobile joystick shown');
        } else {
            console.error('Mobile joystick element not found!');
        }

        if (shootBtn) {
            shootBtn.style.display = 'block';

            // Try both touchstart and click
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔫 Shoot button TOUCHSTART!');
                onHuntingShoot();
            });

            shootBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔫 Shoot button CLICK!');
                onHuntingShoot();
            });

            // Test if it's even clickable
            shootBtn.style.pointerEvents = 'auto';
            console.log('Mobile shoot button shown and event listeners added');
            console.log('Shoot button element:', shootBtn);
            console.log('Shoot button style.display:', shootBtn.style.display);
            console.log('Shoot button bounding rect:', shootBtn.getBoundingClientRect());
        } else {
            console.error('Mobile shoot button element not found!');
        }

        // Update instructions for mobile
        const instructions = document.getElementById('hunting-instructions');
        if (instructions) {
            instructions.textContent = 'Left joystick to move | Drag right side to aim | Tap SHOOT button to fire';
        }
    }
}

// Mouse movement handler (desktop)
function onMouseMove(e) {
    if (!isPointerLocked || !huntingGameActive) return;

    const sensitivity = 0.002;
    cameraRotation.yaw -= e.movementX * sensitivity;
    cameraRotation.pitch -= e.movementY * sensitivity;

    // Clamp pitch to prevent camera flipping
    cameraRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraRotation.pitch));
}

// Touch event handlers (mobile)
function onTouchStart(e) {
    if (!huntingGameActive) return;
    e.preventDefault();

    const canvas = document.getElementById('hunting-canvas');
    const rect = canvas.getBoundingClientRect();
    const midpoint = window.innerWidth / 2;

    console.log('Touch start - touches:', e.changedTouches.length);

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchX = touch.clientX;

        console.log('Touch X:', touchX, 'Midpoint:', midpoint, 'Is left side:', touchX < midpoint);

        if (touchX < midpoint) {
            // Left side - movement joystick
            touchState.moveTouch = touch.identifier;
            const joystick = document.getElementById('mobile-joystick');
            const joystickRect = joystick.getBoundingClientRect();
            const centerX = joystickRect.left + joystickRect.width / 2;
            const centerY = joystickRect.top + joystickRect.height / 2;

            console.log('Joystick center:', centerX, centerY);
            updateJoystick(touch.clientX, touch.clientY, centerX, centerY);
        } else {
            // Right side - look around
            touchState.lookTouch = touch.identifier;
            touchState.lookStart.x = touch.clientX;
            touchState.lookStart.y = touch.clientY;
            console.log('Look touch started');
        }
    }
}

function onTouchMove(e) {
    if (!huntingGameActive) return;
    e.preventDefault();

    const canvas = document.getElementById('hunting-canvas');
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === touchState.moveTouch) {
            // Update movement joystick
            const joystick = document.getElementById('mobile-joystick');
            const joystickRect = joystick.getBoundingClientRect();
            const centerX = joystickRect.left + joystickRect.width / 2;
            const centerY = joystickRect.top + joystickRect.height / 2;

            updateJoystick(touch.clientX, touch.clientY, centerX, centerY);
        } else if (touch.identifier === touchState.lookTouch) {
            // Update look direction
            const deltaX = touch.clientX - touchState.lookStart.x;
            const deltaY = touch.clientY - touchState.lookStart.y;

            const sensitivity = 0.003;
            cameraRotation.yaw -= deltaX * sensitivity;
            cameraRotation.pitch -= deltaY * sensitivity;

            // Clamp pitch
            cameraRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraRotation.pitch));

            touchState.lookStart.x = touch.clientX;
            touchState.lookStart.y = touch.clientY;
        }
    }
}

function onTouchEnd(e) {
    if (!huntingGameActive) return;
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === touchState.moveTouch) {
            touchState.moveTouch = null;
            touchState.moveVector = { x: 0, y: 0 };
            resetJoystick();
        } else if (touch.identifier === touchState.lookTouch) {
            touchState.lookTouch = null;
        }
    }
}

function updateJoystick(touchX, touchY, centerX, centerY) {
    const deltaX = touchX - centerX;
    const deltaY = touchY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 50; // pixels

    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    touchState.moveVector.x = Math.cos(angle) * (clampedDistance / maxDistance);
    touchState.moveVector.y = Math.sin(angle) * (clampedDistance / maxDistance);

    console.log('Joystick update - moveVector:', touchState.moveVector.x.toFixed(2), touchState.moveVector.y.toFixed(2));

    // Update joystick stick visual
    const stick = document.getElementById('mobile-joystick-stick');
    if (stick) {
        const stickX = Math.cos(angle) * clampedDistance;
        const stickY = Math.sin(angle) * clampedDistance;
        stick.style.transform = `translate(-50%, -50%) translate(${stickX}px, ${stickY}px)`;
        console.log('Stick moved to:', stickX.toFixed(2), stickY.toFixed(2));
    } else {
        console.error('Joystick stick element not found!');
    }
}

function resetJoystick() {
    const stick = document.getElementById('mobile-joystick-stick');
    if (stick) {
        stick.style.transform = 'translate(-50%, -50%)';
    }
}

// Create ground reference
function createHuntingGround() {
    const groundGeometry = new THREE.PlaneGeometry(20, 20, 10, 10);
    const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0x003300,
        wireframe: true,
        opacity: 0.3,
        transparent: true
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    huntingScene.add(ground);
}

// Create a tree
function createHuntingTree(x, z) {
    const tree = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0x006600, linewidth: 2 });

    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
    const trunkEdges = new THREE.EdgesGeometry(trunkGeometry);
    const trunk = new THREE.LineSegments(trunkEdges, material);
    trunk.position.y = 0;

    const foliageMaterial = new THREE.LineBasicMaterial({ color: 0x00aa00, linewidth: 2 });

    const foliage1Geometry = new THREE.ConeGeometry(1, 1.5, 8);
    const foliage1Edges = new THREE.EdgesGeometry(foliage1Geometry);
    const foliage1 = new THREE.LineSegments(foliage1Edges, foliageMaterial);
    foliage1.position.y = 1.5;

    const foliage2Geometry = new THREE.ConeGeometry(0.8, 1.2, 8);
    const foliage2Edges = new THREE.EdgesGeometry(foliage2Geometry);
    const foliage2 = new THREE.LineSegments(foliage2Edges, foliageMaterial);
    foliage2.position.y = 2.3;

    const foliage3Geometry = new THREE.ConeGeometry(0.6, 1, 8);
    const foliage3Edges = new THREE.EdgesGeometry(foliage3Geometry);
    const foliage3 = new THREE.LineSegments(foliage3Edges, foliageMaterial);
    foliage3.position.y = 3;

    tree.add(trunk);
    tree.add(foliage1);
    tree.add(foliage2);
    tree.add(foliage3);

    tree.position.set(x, -2, z);
    return tree;
}

// Add scenery trees
function addHuntingScenery() {
    huntingScene.add(createHuntingTree(-8, -3));
    huntingScene.add(createHuntingTree(-6, -5));
    huntingScene.add(createHuntingTree(-9, -7));
    huntingScene.add(createHuntingTree(-7, -2));

    huntingScene.add(createHuntingTree(8, -4));
    huntingScene.add(createHuntingTree(6, -6));
    huntingScene.add(createHuntingTree(9, -3));
    huntingScene.add(createHuntingTree(7, -8));

    huntingScene.add(createHuntingTree(-4, -9));
    huntingScene.add(createHuntingTree(4, -10));
    huntingScene.add(createHuntingTree(0, -11));
}

// Create an animal mesh
function createHuntingAnimal(type) {
    const properties = ANIMAL_TYPES[type];
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const animal = new THREE.Group();

    if (type === 'squirrel') {
        const bodyGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const body = new THREE.LineSegments(bodyEdges, material);

        const headGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const headEdges = new THREE.EdgesGeometry(headGeometry);
        const head = new THREE.LineSegments(headEdges, material);
        head.position.set(0, 0.6, 0.3);

        const tailGeometry = new THREE.ConeGeometry(0.4, 1.2, 6);
        const tailEdges = new THREE.EdgesGeometry(tailGeometry);
        const tail = new THREE.LineSegments(tailEdges, material);
        tail.position.set(0, 0.3, -0.7);
        tail.rotation.x = Math.PI / 3;

        animal.add(body);
        animal.add(head);
        animal.add(tail);

    } else if (type === 'deer') {
        const bodyGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.6);
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const body = new THREE.LineSegments(bodyEdges, material);

        const headGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.5);
        const headEdges = new THREE.EdgesGeometry(headGeometry);
        const head = new THREE.LineSegments(headEdges, material);
        head.position.set(0, 0.8, 0.6);

        const antlerGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4);
        const antlerEdges = new THREE.EdgesGeometry(antlerGeometry);

        const antlerLeft = new THREE.LineSegments(antlerEdges, material);
        antlerLeft.position.set(-0.2, 1.3, 0.6);
        antlerLeft.rotation.z = -Math.PI / 6;

        const antlerRight = new THREE.LineSegments(antlerEdges, material);
        antlerRight.position.set(0.2, 1.3, 0.6);
        antlerRight.rotation.z = Math.PI / 6;

        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 4);
        const legEdges = new THREE.EdgesGeometry(legGeometry);

        for (let i = 0; i < 4; i++) {
            const leg = new THREE.LineSegments(legEdges.clone(), material);
            const x = i % 2 === 0 ? -0.4 : 0.4;
            const z = i < 2 ? 0.2 : -0.2;
            leg.position.set(x, -0.7, z);
            animal.add(leg);
        }

        animal.add(body);
        animal.add(head);
        animal.add(antlerLeft);
        animal.add(antlerRight);

    } else if (type === 'cat') {
        const bodyGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.5);
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const body = new THREE.LineSegments(bodyEdges, material);

        const headGeometry = new THREE.SphereGeometry(0.3, 6, 6);
        const headEdges = new THREE.EdgesGeometry(headGeometry);
        const head = new THREE.LineSegments(headEdges, material);
        head.position.set(0, 0.3, 0.5);

        const earGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
        const earEdges = new THREE.EdgesGeometry(earGeometry);

        const earLeft = new THREE.LineSegments(earEdges, material);
        earLeft.position.set(-0.15, 0.6, 0.5);

        const earRight = new THREE.LineSegments(earEdges, material);
        earRight.position.set(0.15, 0.6, 0.5);

        const tailGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.9, 4);
        const tailEdges = new THREE.EdgesGeometry(tailGeometry);
        const tail = new THREE.LineSegments(tailEdges, material);
        tail.position.set(0, 0.2, -0.6);
        tail.rotation.x = Math.PI / 4;

        animal.add(body);
        animal.add(head);
        animal.add(earLeft);
        animal.add(earRight);
        animal.add(tail);
    }

    animal.scale.set(properties.scale, properties.scale, properties.scale);

    // Spawn animals in a circle around the player at various distances
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 15; // Spawn 10-25 units away
    animal.position.x = Math.cos(angle) * distance;
    animal.position.y = -1 + Math.random() * 2; // Height variation from -1 to 1
    animal.position.z = Math.sin(angle) * distance;

    // Animals move in random directions (but generally wandering)
    const moveAngle = Math.random() * Math.PI * 2;
    const moveSpeed = properties.speed * (0.8 + Math.random() * 0.4);

    animal.userData = {
        type: type,
        velocity: {
            x: Math.cos(moveAngle) * moveSpeed,
            z: Math.sin(moveAngle) * moveSpeed
        },
        bobPhase: Math.random() * Math.PI * 2,
        killed: false
    };

    return animal;
}

// Spawn animal
function spawnHuntingAnimal() {
    if (!huntingGameActive) return;

    const rand = Math.random() * 100;
    let type;

    if (rand < ANIMAL_TYPES.squirrel.spawnWeight) {
        type = 'squirrel';
    } else if (rand < ANIMAL_TYPES.squirrel.spawnWeight + ANIMAL_TYPES.deer.spawnWeight) {
        type = 'deer';
    } else {
        type = 'cat';
    }

    const animal = createHuntingAnimal(type);
    huntingScene.add(animal);
    animals.push(animal);
}

// Start hunting game
function startHuntingGame() {
    if (!huntingScene) {
        initHuntingScene();
    }

    huntingGameActive = true;
    huntingTimeRemaining = 30;
    huntingAmmo = 10;
    huntingKills = { squirrels: 0, deer: 0, cats: 0 };
    animals = [];

    // Reset camera position and movement
    huntingCamera.position.set(0, 0, 5);
    cameraVelocity = { x: 0, z: 0 };
    cameraRotation = { yaw: 0, pitch: 0 };
    huntingKeys = { w: false, a: false, s: false, d: false };
    isPointerLocked = false;

    // Show lock prompt (desktop only)
    const lockPrompt = document.getElementById('hunting-lock-prompt');
    if (!isMobile) {
        lockPrompt.classList.remove('hidden');
    }

    updateHuntingHUD();

    // Start timer immediately on mobile, on pointer lock for desktop
    if (isMobile) {
        startHuntingTimer();
    }

    animateHunting();
}

// Start timer and spawning (called when pointer locks)
function startHuntingTimer() {
    const timerInterval = setInterval(() => {
        if (!huntingGameActive) {
            clearInterval(timerInterval);
            return;
        }

        huntingTimeRemaining--;
        updateHuntingHUD();

        if (huntingTimeRemaining <= 0) {
            endHuntingGame();
            clearInterval(timerInterval);
        }
    }, 1000);

    const spawnInterval = setInterval(() => {
        if (!huntingGameActive) {
            clearInterval(spawnInterval);
            return;
        }
        spawnHuntingAnimal();
    }, 1200);

    // Initial spawns spread out
    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnHuntingAnimal(), i * 400);
    }
}

// Update hunting HUD
function updateHuntingHUD() {
    document.getElementById('hunting-timer').textContent = huntingTimeRemaining;
    const ammoEl = document.getElementById('hunting-ammo');
    ammoEl.textContent = huntingAmmo;
    ammoEl.className = huntingAmmo <= 3 ? 'low' : '';

    document.getElementById('squirrel-count').textContent = huntingKills.squirrels;
    document.getElementById('deer-count').textContent = huntingKills.deer;
    document.getElementById('cat-count').textContent = huntingKills.cats;
}

// Handle shooting
function onHuntingShoot() {
    // On mobile, we don't use pointer lock, so skip that check
    if (!huntingGameActive || huntingAmmo <= 0) return;
    if (!isMobile && !isPointerLocked) return;

    console.log('SHOOT! Ammo before:', huntingAmmo);

    huntingAmmo--;
    updateHuntingHUD();

    // Shoot from center of screen (where camera is looking)
    huntingMouse.x = 0;
    huntingMouse.y = 0;

    huntingRaycaster.setFromCamera(huntingMouse, huntingCamera);

    const intersects = huntingRaycaster.intersectObjects(animals, true);

    // Create bullet tracer
    createBulletTracer(huntingRaycaster, intersects);

    if (intersects.length > 0) {
        let hitObject = intersects[0].object;
        while (hitObject.parent && !hitObject.userData.type) {
            hitObject = hitObject.parent;
        }

        if (hitObject.userData && hitObject.userData.type && !hitObject.userData.killed) {
            killHuntingAnimal(hitObject);
        }
    }

    if (huntingAmmo <= 0) {
        endHuntingGame();
    }
}

// Create bullet tracer effect
function createBulletTracer(raycaster, intersects) {
    const start = huntingCamera.position.clone();

    // Move start point slightly forward from camera
    const gunOffset = raycaster.ray.direction.clone().multiplyScalar(1);
    start.add(gunOffset);

    // Determine end point
    let end;
    if (intersects.length > 0) {
        end = intersects[0].point.clone();
    } else {
        // If no hit, extend ray far out
        end = start.clone().add(raycaster.ray.direction.clone().multiplyScalar(100));
    }

    // Calculate distance and create cylinder for tracer
    const distance = start.distanceTo(end);
    const tracerGeometry = new THREE.CylinderGeometry(0.02, 0.02, distance, 8);
    const tracerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 1
    });
    const tracer = new THREE.Mesh(tracerGeometry, tracerMaterial);

    // Position and orient the tracer
    tracer.position.copy(start).lerp(end, 0.5);
    tracer.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        end.clone().sub(start).normalize()
    );

    huntingScene.add(tracer);

    // Create muzzle flash (multiple spheres for effect)
    const flashGroup = new THREE.Group();

    // Main flash
    const flashGeometry1 = new THREE.SphereGeometry(0.2, 8, 8);
    const flashMaterial1 = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 1
    });
    const flash1 = new THREE.Mesh(flashGeometry1, flashMaterial1);
    flashGroup.add(flash1);

    // Outer glow
    const flashGeometry2 = new THREE.SphereGeometry(0.35, 8, 8);
    const flashMaterial2 = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.6
    });
    const flash2 = new THREE.Mesh(flashGeometry2, flashMaterial2);
    flashGroup.add(flash2);

    flashGroup.position.copy(start);
    huntingScene.add(flashGroup);

    // Fade out and remove
    let opacity = 1;
    let frame = 0;
    const fadeInterval = setInterval(() => {
        frame++;
        opacity -= 0.2;
        tracerMaterial.opacity = opacity;
        flashMaterial1.opacity = opacity;
        flashMaterial2.opacity = opacity * 0.6;

        if (opacity <= 0 || frame > 10) {
            huntingScene.remove(tracer);
            huntingScene.remove(flashGroup);
            tracerGeometry.dispose();
            tracerMaterial.dispose();
            flashGeometry1.dispose();
            flashMaterial1.dispose();
            flashGeometry2.dispose();
            flashMaterial2.dispose();
            clearInterval(fadeInterval);
        }
    }, 30);
}

// Kill an animal
function killHuntingAnimal(animal) {
    animal.userData.killed = true;

    const type = animal.userData.type;
    if (type === 'squirrel') huntingKills.squirrels++;
    else if (type === 'deer') huntingKills.deer++;
    else if (type === 'cat') huntingKills.cats++;

    updateHuntingHUD();

    animal.children.forEach(child => {
        if (child.material) {
            child.material.color.setHex(0xff0000);
        }
    });

    setTimeout(() => {
        huntingScene.remove(animal);
        const index = animals.indexOf(animal);
        if (index > -1) animals.splice(index, 1);
    }, 200);
}

// Keyboard handlers
function onHuntingKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === 'w') huntingKeys.w = true;
    if (key === 'a') huntingKeys.a = true;
    if (key === 's') huntingKeys.s = true;
    if (key === 'd') huntingKeys.d = true;
}

function onHuntingKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === 'w') huntingKeys.w = false;
    if (key === 'a') huntingKeys.a = false;
    if (key === 's') huntingKeys.s = false;
    if (key === 'd') huntingKeys.d = false;
}

// Animation loop
function animateHunting() {
    if (!huntingGameActive) return;

    requestAnimationFrame(animateHunting);

    // Apply camera rotation
    huntingCamera.rotation.order = 'YXZ';
    huntingCamera.rotation.y = cameraRotation.yaw;
    huntingCamera.rotation.x = cameraRotation.pitch;

    // Update camera position based on input (WASD or touch)
    const moveSpeed = 0.15;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Get camera forward and right vectors
    huntingCamera.getWorldDirection(forward);
    forward.y = 0; // Keep movement on horizontal plane
    forward.normalize();

    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    right.normalize();

    // Apply movement from keyboard (desktop)
    if (huntingKeys.w) {
        cameraVelocity.x += forward.x * moveSpeed;
        cameraVelocity.z += forward.z * moveSpeed;
    }
    if (huntingKeys.s) {
        cameraVelocity.x -= forward.x * moveSpeed;
        cameraVelocity.z -= forward.z * moveSpeed;
    }
    if (huntingKeys.a) {
        cameraVelocity.x -= right.x * moveSpeed;
        cameraVelocity.z -= right.z * moveSpeed;
    }
    if (huntingKeys.d) {
        cameraVelocity.x += right.x * moveSpeed;
        cameraVelocity.z += right.z * moveSpeed;
    }

    // Apply movement from touch joystick (mobile)
    if (isMobile && touchState.moveTouch !== null) {
        const touchMoveSpeed = 0.2;
        cameraVelocity.x += right.x * touchState.moveVector.x * touchMoveSpeed;
        cameraVelocity.z += right.z * touchState.moveVector.x * touchMoveSpeed;
        cameraVelocity.x += forward.x * -touchState.moveVector.y * touchMoveSpeed;
        cameraVelocity.z += forward.z * -touchState.moveVector.y * touchMoveSpeed;

        // Debug log (only log occasionally to avoid spam)
        if (Math.random() < 0.01) {
            console.log('Applying touch movement - velocity:', cameraVelocity.x.toFixed(3), cameraVelocity.z.toFixed(3));
        }
    }

    // Apply camera movement with damping
    huntingCamera.position.x += cameraVelocity.x;
    huntingCamera.position.z += cameraVelocity.z;

    // Camera bounds (don't go too far)
    huntingCamera.position.x = Math.max(-20, Math.min(20, huntingCamera.position.x));
    huntingCamera.position.z = Math.max(-10, Math.min(20, huntingCamera.position.z));

    // Damping - slow down over time
    cameraVelocity.x *= 0.85;
    cameraVelocity.z *= 0.85;

    // Update animals
    for (let i = animals.length - 1; i >= 0; i--) {
        const animal = animals[i];

        if (animal.userData.killed) continue;

        // Move animal in 3D space
        animal.position.x += animal.userData.velocity.x;
        animal.position.z += animal.userData.velocity.z;

        // Bobbing motion for realism
        animal.userData.bobPhase += 0.05;
        animal.position.y += Math.sin(animal.userData.bobPhase) * 0.003;

        // Make animals face their movement direction
        const targetRotation = Math.atan2(animal.userData.velocity.x, animal.userData.velocity.z);
        animal.rotation.y = targetRotation;

        // Remove animals that are too far away
        const distanceFromOrigin = Math.sqrt(
            animal.position.x * animal.position.x +
            animal.position.z * animal.position.z
        );

        if (distanceFromOrigin > 40) {
            huntingScene.remove(animal);
            animals.splice(i, 1);
        }
    }

    huntingRenderer.render(huntingScene, huntingCamera);
}

// End hunting game
function endHuntingGame() {
    huntingGameActive = false;

    // Release pointer lock
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    // Hide lock prompt and crosshair
    const lockPrompt = document.getElementById('hunting-lock-prompt');
    const crosshair = document.getElementById('hunting-crosshair');
    lockPrompt.classList.add('hidden');
    crosshair.classList.remove('active');

    // Reset keys
    huntingKeys = { w: false, a: false, s: false, d: false };

    let snacksGained = 0;
    snacksGained += huntingKills.squirrels * ANIMAL_TYPES.squirrel.snackValue;
    snacksGained += huntingKills.deer * ANIMAL_TYPES.deer.snackValue;
    snacksGained += huntingKills.cats * ANIMAL_TYPES.cat.snackValue;

    snacksGained = Math.max(0, snacksGained);

    document.getElementById('final-squirrels').textContent = huntingKills.squirrels;
    document.getElementById('final-deer').textContent = huntingKills.deer;
    document.getElementById('final-cats').textContent = huntingKills.cats;
    document.getElementById('snacks-amount').textContent = snacksGained;

    document.getElementById('hunting-result-screen').classList.add('active');

    // Apply snacks to game state
    gameState.resources.snacks += snacksGained;
    gameState.resources.snacks = Math.min(100, gameState.resources.snacks);
}

// Continue from hunting
document.getElementById('hunting-continue-btn').addEventListener('click', () => {
    document.getElementById('hunting-result-screen').classList.remove('active');
    document.getElementById('hunting-overlay').classList.remove('active');
    document.body.classList.remove('hunting-active');

    // Restore scrolling
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    // Hide mobile controls
    if (isMobile) {
        const joystick = document.getElementById('mobile-joystick');
        const shootBtn = document.getElementById('mobile-shoot-btn');
        if (joystick) joystick.style.display = 'none';
        if (shootBtn) shootBtn.style.display = 'none';
    }

    let message = `Hunting complete! `;
    if (huntingKills.squirrels > 0) message += `Shot ${huntingKills.squirrels} squirrel(s). `;
    if (huntingKills.deer > 0) message += `Shot ${huntingKills.deer} deer! `;
    if (huntingKills.cats > 0) message += `Accidentally shot ${huntingKills.cats} cat(s)... `;
    const snacks = Math.max(0, huntingKills.squirrels * 5 + huntingKills.deer * 15 + huntingKills.cats * -10);
    message += `Gained ${snacks} snacks.`;

    addLogEntry(message, snacks > 0 ? '' : 'negative');
    updateUI();
});

// Window resize handler
function onHuntingWindowResize() {
    if (huntingCamera && huntingRenderer) {
        huntingCamera.aspect = window.innerWidth / window.innerHeight;
        huntingCamera.updateProjectionMatrix();
        huntingRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Show hunting overlay
function showHuntingOverlay() {
    document.getElementById('hunting-overlay').classList.add('active');
    document.body.classList.add('hunting-active');

    // Prevent scrolling on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    startHuntingGame();
}
