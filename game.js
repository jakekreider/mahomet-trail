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
    // gameData is already loaded from gamedata.js
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
    // Initialize game state
    gameState = {
        resources: { ...gameData.starting_resources },
        distance: 0,
        totalDistance: gameData.game.total_distance,
        isGameOver: false,
        log: []
    };

    // Switch to game screen
    showScreen('game');

    // Initialize UI
    updateUI();
    addLogEntry('Your journey begins...', 'important');
}

// Continue journey (trigger next event)
function continueJourney() {
    if (gameState.isGameOver) return;

    // Check for critical conditions first
    const criticalEvent = checkCriticalConditions();
    if (criticalEvent) {
        handleCriticalEvent(criticalEvent);
        return;
    }

    // Progress distance
    const progressAmount = Math.random() * 2 + 0.5; // 0.5-2.5 miles per step
    gameState.distance += progressAmount;

    // Check if reached destination
    if (gameState.distance >= gameState.totalDistance) {
        victory();
        return;
    }

    // Trigger random event
    const event = getRandomEvent();

    // Check if this is a custom event with dynamic logic
    if (event.customEvent && typeof customEvents !== 'undefined' && customEvents[event.id]) {
        const customResult = customEvents[event.id](gameState, event);

        // Merge custom results into the event
        if (customResult.text) {
            event.text = customResult.text;
        }
        if (customResult.effects) {
            event.effects = customResult.effects;
        }
    }

    displayEvent(event);
    applyEventEffects(event);
    updateUI();
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

    // Calculate total weight
    const totalWeight = availableEvents.reduce((sum, event) => sum + event.weight, 0);

    // Random selection based on weight
    let random = Math.random() * totalWeight;

    for (let event of availableEvents) {
        random -= event.weight;
        if (random <= 0) {
            return event;
        }
    }

    return availableEvents[0]; // Fallback
}

// Display event in UI
function displayEvent(event) {
    const titleEl = document.getElementById('event-title');
    const textEl = document.getElementById('event-text');
    const effectsEl = document.getElementById('event-effects');

    titleEl.textContent = event.title;
    textEl.textContent = event.text;

    // Display effects
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

    // Log event
    addLogEntry(event.title, event.type.includes('negative') ? 'negative' : '');
}

// Apply event effects to resources
function applyEventEffects(event) {
    if (!event.effects) return;

    for (let [resource, value] of Object.entries(event.effects)) {
        if (gameState.resources.hasOwnProperty(resource)) {
            gameState.resources[resource] += value;
            // Clamp between 0 and 100
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

            // Add warning/critical classes
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

    // Auto-scroll to bottom
    logEl.scrollTop = logEl.scrollHeight;

    // Keep log size manageable
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

    // Show stats
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

    // Clear log
    document.getElementById('log').innerHTML = '';
}

// Show specific screen
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);
