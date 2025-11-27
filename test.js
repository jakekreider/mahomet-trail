// Test Suite for Mahomet Trail
let testResults = [];
let passCount = 0;
let failCount = 0;

// Test runner
class TestRunner {
    constructor() {
        this.results = [];
    }

    runTest(name, testFn) {
        try {
            const result = testFn();
            if (result.pass) {
                this.results.push({ name, pass: true, message: result.message });
                passCount++;
            } else {
                this.results.push({ name, pass: false, message: result.message });
                failCount++;
            }
        } catch (error) {
            this.results.push({ name, pass: false, message: `Error: ${error.message}` });
            failCount++;
        }
    }

    assert(condition, message) {
        return { pass: condition, message: message || (condition ? 'Passed' : 'Failed') };
    }

    assertEqual(actual, expected, message) {
        const pass = actual === expected;
        const msg = message || `Expected ${expected}, got ${actual}`;
        return { pass, message: msg };
    }

    assertGreaterThan(actual, threshold, message) {
        const pass = actual > threshold;
        const msg = message || `Expected > ${threshold}, got ${actual}`;
        return { pass, message: msg };
    }

    assertExists(value, message) {
        const pass = value !== null && value !== undefined;
        const msg = message || `Value should exist`;
        return { pass, message: msg };
    }
}

// Test Sections
function testGameDataStructure(runner) {
    runner.runTest('Game data exists', () => {
        return runner.assertExists(gameData, 'gameData should be defined');
    });

    runner.runTest('Game config has required properties', () => {
        const hasTitle = gameData.game && gameData.game.title;
        const hasDistance = gameData.game && gameData.game.total_distance;
        return runner.assert(hasTitle && hasDistance, 'Game config has title and distance');
    });

    runner.runTest('Total distance is 12 miles', () => {
        return runner.assertEqual(gameData.game.total_distance, 12, 'Distance should be 12 miles');
    });

    runner.runTest('Starting resources exist', () => {
        const resources = gameData.starting_resources;
        const hasAll = resources.gas && resources.snacks && resources.patience && resources.van_health;
        return runner.assert(hasAll, 'All starting resources defined');
    });

    runner.runTest('Starting resources all equal 100', () => {
        const resources = gameData.starting_resources;
        const allHundred = resources.gas === 100 && resources.snacks === 100 &&
                          resources.patience === 100 && resources.van_health === 100;
        return runner.assert(allHundred, 'All resources start at 100');
    });

    runner.runTest('Events array exists and not empty', () => {
        const hasEvents = gameData.events && gameData.events.length > 0;
        return runner.assert(hasEvents, `Found ${gameData.events?.length || 0} events`);
    });

    runner.runTest('Victory data exists', () => {
        const hasVictory = gameData.victory && gameData.victory.messages;
        return runner.assert(hasVictory, 'Victory data is defined');
    });
}

function testEventStructure(runner) {
    const events = gameData.events;

    runner.runTest('All events have required properties', () => {
        const allValid = events.every(e => e.id && e.type && e.title && e.text);
        return runner.assert(allValid, 'All events have id, type, title, and text');
    });

    runner.runTest('All events have valid types', () => {
        const validTypes = ['positive', 'neutral', 'minor_negative', 'major_negative', 'critical'];
        const allValid = events.every(e => validTypes.includes(e.type));
        return runner.assert(allValid, 'All events have valid type values');
    });

    runner.runTest('All non-critical events have weight', () => {
        const nonCritical = events.filter(e => e.type !== 'critical');
        const allHaveWeight = nonCritical.every(e => typeof e.weight === 'number' && e.weight > 0);
        return runner.assert(allHaveWeight, 'All non-critical events have positive weights');
    });

    runner.runTest('All events have effects property', () => {
        const allHaveEffects = events.every(e => e.effects !== undefined);
        return runner.assert(allHaveEffects, 'All events have effects property (can be empty)');
    });

    runner.runTest('Critical events have conditions', () => {
        const critical = events.filter(e => e.type === 'critical');
        const allHaveConditions = critical.every(e => e.condition);
        return runner.assert(allHaveConditions, `${critical.length} critical events all have conditions`);
    });

    runner.runTest('Event IDs are unique', () => {
        const ids = events.map(e => e.id);
        const uniqueIds = new Set(ids);
        return runner.assertEqual(ids.length, uniqueIds.size, 'All event IDs are unique');
    });
}

function testEventBalance(runner) {
    const events = gameData.events.filter(e => e.type !== 'critical');

    runner.runTest('Has positive events', () => {
        const positive = events.filter(e => e.type === 'positive');
        return runner.assertGreaterThan(positive.length, 0, `Found ${positive.length} positive events`);
    });

    runner.runTest('Has negative events', () => {
        const negative = events.filter(e => e.type.includes('negative'));
        return runner.assertGreaterThan(negative.length, 0, `Found ${negative.length} negative events`);
    });

    runner.runTest('Total event weight is reasonable', () => {
        const totalWeight = events.reduce((sum, e) => sum + (e.weight || 0), 0);
        return runner.assertGreaterThan(totalWeight, 0, `Total weight: ${totalWeight}`);
    });

    runner.runTest('Negative events have negative effects', () => {
        const negEvents = events.filter(e => e.type.includes('negative'));
        const mostHaveNegEffects = negEvents.filter(e => {
            if (!e.effects || Object.keys(e.effects).length === 0) return false;
            return Object.values(e.effects).some(v => v < 0);
        });
        const ratio = mostHaveNegEffects.length / negEvents.length;
        return runner.assert(ratio > 0.8, `${mostHaveNegEffects.length}/${negEvents.length} negative events have negative effects`);
    });

    runner.runTest('Positive events have positive effects', () => {
        const posEvents = events.filter(e => e.type === 'positive');
        const allHavePosEffects = posEvents.filter(e => {
            if (!e.effects || Object.keys(e.effects).length === 0) return false;
            return Object.values(e.effects).some(v => v > 0);
        });
        const ratio = allHavePosEffects.length / posEvents.length;
        return runner.assert(ratio > 0.5, `${allHavePosEffects.length}/${posEvents.length} positive events have positive effects`);
    });
}

function testResourceMechanics(runner) {
    runner.runTest('Resource effects are within reasonable bounds', () => {
        const events = gameData.events;
        const allEffects = events.flatMap(e => Object.values(e.effects || {}));
        const allReasonable = allEffects.every(v => Math.abs(v) <= 100);
        return runner.assert(allReasonable, 'All effects are between -100 and 100');
    });

    runner.runTest('Major negative events have larger effects', () => {
        const majorNeg = gameData.events.filter(e => e.type === 'major_negative');
        const hasSignificantEffects = majorNeg.some(e => {
            return Object.values(e.effects || {}).some(v => v <= -20);
        });
        return runner.assert(hasSignificantEffects, 'Major negative events have effects of -20 or worse');
    });

    runner.runTest('Resource names match starting resources', () => {
        const validResources = Object.keys(gameData.starting_resources);
        const allEvents = gameData.events;
        const allResourcesValid = allEvents.every(e => {
            if (!e.effects) return true;
            return Object.keys(e.effects).every(res => validResources.includes(res));
        });
        return runner.assert(allResourcesValid, 'All event effects use valid resource names');
    });
}

function testCriticalConditions(runner) {
    const criticalEvents = gameData.events.filter(e => e.type === 'critical');

    runner.runTest('Has critical event for gas depletion', () => {
        const hasGas = criticalEvents.some(e => e.condition.includes('gas'));
        return runner.assert(hasGas, 'Has critical event checking gas');
    });

    runner.runTest('Has critical event for van health', () => {
        const hasVan = criticalEvents.some(e => e.condition.includes('van_health'));
        return runner.assert(hasVan, 'Has critical event checking van_health');
    });

    runner.runTest('Has critical event for patience', () => {
        const hasPatience = criticalEvents.some(e => e.condition.includes('patience'));
        return runner.assert(hasPatience, 'Has critical event checking patience');
    });

    runner.runTest('Critical events are marked as fatal', () => {
        const allFatal = criticalEvents.every(e => e.fatal === true);
        return runner.assert(allFatal, 'All critical events have fatal: true');
    });

    runner.runTest('Critical conditions check for zero or less', () => {
        const checkZero = criticalEvents.every(e => e.condition.includes('<= 0'));
        return runner.assert(checkZero, 'All critical conditions check for <= 0');
    });
}

function testEventDistribution(runner) {
    // Simulate event selection 1000 times
    const events = gameData.events.filter(e => e.type !== 'critical');
    const selections = {};
    const iterations = 1000;

    // Simulate weighted random selection
    for (let i = 0; i < iterations; i++) {
        const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
        let random = Math.random() * totalWeight;

        for (let event of events) {
            random -= event.weight;
            if (random <= 0) {
                selections[event.id] = (selections[event.id] || 0) + 1;
                break;
            }
        }
    }

    runner.runTest('All weighted events can be selected', () => {
        const allSelected = events.every(e => selections[e.id] > 0);
        return runner.assert(allSelected, `${Object.keys(selections).length}/${events.length} events selected in ${iterations} iterations`);
    });

    runner.runTest('Higher weight events selected more often', () => {
        // Find highest and lowest weight events
        const sorted = [...events].sort((a, b) => b.weight - a.weight);
        const highest = sorted[0];
        const lowest = sorted[sorted.length - 1];

        const highCount = selections[highest.id] || 0;
        const lowCount = selections[lowest.id] || 0;

        return runner.assert(highCount > lowCount,
            `Highest weight (${highest.weight}) selected ${highCount} times, lowest (${lowest.weight}) selected ${lowCount} times`);
    });
}

function testGameLogic(runner) {
    runner.runTest('Can calculate progress percentage', () => {
        const distance = 6;
        const total = 12;
        const progress = (distance / total) * 100;
        return runner.assertEqual(progress, 50, 'Halfway progress is 50%');
    });

    runner.runTest('Resources should clamp at 0', () => {
        let resource = 20;
        resource += -30; // Apply negative effect
        resource = Math.max(0, resource);
        return runner.assertEqual(resource, 0, 'Resource clamped at 0');
    });

    runner.runTest('Resources should clamp at 100', () => {
        let resource = 90;
        resource += 20; // Apply positive effect
        resource = Math.min(100, resource);
        return runner.assertEqual(resource, 100, 'Resource clamped at 100');
    });

    runner.runTest('Victory occurs when distance >= total', () => {
        const distance = 12.5;
        const total = 12;
        const hasWon = distance >= total;
        return runner.assert(hasWon, 'Victory condition met at 12.5 miles');
    });

    runner.runTest('Game continues when distance < total', () => {
        const distance = 11.9;
        const total = 12;
        const hasWon = distance >= total;
        return runner.assert(!hasWon, 'Game continues at 11.9 miles');
    });
}

function testVictoryConditions(runner) {
    runner.runTest('Victory has multiple messages', () => {
        const messageCount = gameData.victory.messages.length;
        return runner.assertGreaterThan(messageCount, 0, `Has ${messageCount} victory messages`);
    });

    runner.runTest('Victory messages are strings', () => {
        const allStrings = gameData.victory.messages.every(m => typeof m === 'string');
        return runner.assert(allStrings, 'All victory messages are strings');
    });

    runner.runTest('Victory messages are not empty', () => {
        const allNonEmpty = gameData.victory.messages.every(m => m.length > 0);
        return runner.assert(allNonEmpty, 'All victory messages have content');
    });
}

function testCustomEvents(runner) {
    runner.runTest('Custom events map exists', () => {
        const exists = typeof customEvents !== 'undefined';
        return runner.assert(exists, 'customEvents map is defined');
    });

    runner.runTest('Custom events are marked correctly', () => {
        const customEvts = gameData.events.filter(e => e.customEvent === true);
        return runner.assertGreaterThan(customEvts.length, 0, `Found ${customEvts.length} custom events`);
    });

    runner.runTest('All custom events have handlers', () => {
        if (typeof customEvents === 'undefined') {
            return runner.assert(false, 'customEvents not defined');
        }
        const customEvts = gameData.events.filter(e => e.customEvent === true);
        const allHaveHandlers = customEvts.every(e => typeof customEvents[e.id] === 'function');
        return runner.assert(allHaveHandlers, 'All custom events have function handlers');
    });

    runner.runTest('ford_corn_field custom event exists', () => {
        const event = gameData.events.find(e => e.id === 'ford_corn_field');
        return runner.assertExists(event, 'ford_corn_field event found');
    });

    runner.runTest('ford_corn_field has custom handler', () => {
        if (typeof customEvents === 'undefined') {
            return runner.assert(false, 'customEvents not defined');
        }
        const hasHandler = typeof customEvents.ford_corn_field === 'function';
        return runner.assert(hasHandler, 'ford_corn_field has function handler');
    });

    runner.runTest('Custom event handler returns valid result', () => {
        if (typeof customEvents === 'undefined' || !customEvents.ford_corn_field) {
            return runner.assert(false, 'ford_corn_field handler not available');
        }

        const mockGameState = {
            resources: { gas: 100, snacks: 100, patience: 100, van_health: 100 }
        };
        const mockEvent = gameData.events.find(e => e.id === 'ford_corn_field');

        const result = customEvents.ford_corn_field(mockGameState, mockEvent);

        const hasText = typeof result.text === 'string';
        const hasEffects = result.effects && typeof result.effects === 'object';
        return runner.assert(hasText && hasEffects, 'Handler returns text and effects');
    });

    runner.runTest('ford_corn_field patience loss is in range', () => {
        if (typeof customEvents === 'undefined' || !customEvents.ford_corn_field) {
            return runner.assert(false, 'ford_corn_field handler not available');
        }

        const mockGameState = {
            resources: { gas: 100, snacks: 100, patience: 100, van_health: 100 }
        };
        const mockEvent = gameData.events.find(e => e.id === 'ford_corn_field');

        // Run it multiple times to test randomness
        let allInRange = true;
        for (let i = 0; i < 20; i++) {
            const result = customEvents.ford_corn_field(mockGameState, mockEvent);
            const patienceLoss = Math.abs(result.effects.patience);
            if (patienceLoss < 5 || patienceLoss > 1000) {
                allInRange = false;
                break;
            }
        }

        return runner.assert(allInRange, 'Patience loss consistently between 5-1000');
    });

    runner.runTest('Custom event modifies text dynamically', () => {
        if (typeof customEvents === 'undefined' || !customEvents.ford_corn_field) {
            return runner.assert(false, 'ford_corn_field handler not available');
        }

        const mockGameState = {
            resources: { gas: 100, snacks: 100, patience: 100, van_health: 100 }
        };
        const mockEvent = gameData.events.find(e => e.id === 'ford_corn_field');
        const originalText = mockEvent.text;

        const result = customEvents.ford_corn_field(mockGameState, mockEvent);

        const textModified = result.text.length > originalText.length;
        return runner.assert(textModified, 'Event text is dynamically modified');
    });
}

// Main test execution
function runAllTests() {
    // Reset counters
    testResults = [];
    passCount = 0;
    failCount = 0;

    const runner = new TestRunner();

    // Create sections
    const sections = [
        { name: 'Game Data Structure', fn: testGameDataStructure },
        { name: 'Event Structure', fn: testEventStructure },
        { name: 'Event Balance', fn: testEventBalance },
        { name: 'Resource Mechanics', fn: testResourceMechanics },
        { name: 'Critical Conditions', fn: testCriticalConditions },
        { name: 'Event Distribution', fn: testEventDistribution },
        { name: 'Game Logic', fn: testGameLogic },
        { name: 'Victory Conditions', fn: testVictoryConditions },
        { name: 'Custom Events', fn: testCustomEvents }
    ];

    const resultsContainer = document.getElementById('test-results');
    resultsContainer.innerHTML = '';

    sections.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'test-section';

        const heading = document.createElement('h2');
        heading.textContent = section.name;
        sectionDiv.appendChild(heading);

        // Run section tests
        const beforeCount = runner.results.length;
        section.fn(runner);
        const afterCount = runner.results.length;

        // Display results for this section
        for (let i = beforeCount; i < afterCount; i++) {
            const result = runner.results[i];
            const testDiv = document.createElement('div');
            testDiv.className = `test-case ${result.pass ? 'pass' : 'fail'}`;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'test-name';
            nameDiv.textContent = result.name;

            const detailDiv = document.createElement('div');
            detailDiv.className = 'test-detail';
            detailDiv.textContent = result.message;

            testDiv.appendChild(nameDiv);
            testDiv.appendChild(detailDiv);
            sectionDiv.appendChild(testDiv);
        }

        resultsContainer.appendChild(sectionDiv);
    });

    // Show summary
    const summary = document.getElementById('summary');
    summary.style.display = 'block';
    document.getElementById('pass-count').textContent = passCount;
    document.getElementById('fail-count').textContent = failCount;
    document.getElementById('total-count').textContent = passCount + failCount;

    // Scroll to top
    window.scrollTo(0, 0);
}

function clearResults() {
    document.getElementById('test-results').innerHTML = '';
    document.getElementById('summary').style.display = 'none';
    passCount = 0;
    failCount = 0;
}

// Event listeners
document.getElementById('run-tests').addEventListener('click', runAllTests);
document.getElementById('clear-results').addEventListener('click', clearResults);

// Auto-run tests on load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Test suite loaded. Click "Run All Tests" to begin.');
});
