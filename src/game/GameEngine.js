import { transmissions, gameEvents } from './data/transmissions.js';
import { TransmissionUI } from './ui/TransmissionUI.js';
import { Calendar } from './ui/Calendar.js';
import { RadioImage } from './ui/RadioImage.js';
import { SoundManager } from './audio/SoundManager.js';
import { ResourceDisplay } from './ui/ResourceDisplay.js';
import { assetPath } from '../assetBase.js';

export class GameEngine {
    constructor() {
        // Initialize state first
        this.state = {
            currentFrequency: 88.5,
            availableFrequencies: [88.5, 89.1, 90.3, 91.7, 93.2, 94.8, 96.4, 98.1, 99.5, 100.9, 102.3, 103.7, 104.6],
            currentFrequencyIndex: 0,
            foundFrequencies: new Set(),
            dailyTarget: 5,
            currentDay: 1,
            transmissions: {},
            dailyTransmissionPool: new Map(),
            resources: {
                food: 100,
                batteries: 100,
                medicine: 100
            },
            factions: {
                military: 50,
                indigenous: 50,
                researchers: 50
            },
            activeEvents: [],
            defaultTransmissions: {
                '88.5': 'Static noise... A faint voice breaks through: "The jungle is alive tonight. Strange lights moving between the trees. We\'re not alone out here."',
                '89.1': 'Whispers in Portuguese: "The ancient ones speak through the radio. They warn us about the outsiders. The forest remembers."',
                '90.3': 'A military transmission: "Delta team reporting unusual activity at grid coordinates 7-4-2. Multiple heat signatures detected. Requesting backup."',
                '91.7': 'Radio interference... A distorted voice: "The anomaly is growing. Our equipment is malfunctioning. We need to evacuate before it\'s too late."',
                '93.2': 'A researcher\'s voice: "Fascinating discovery in the cave system. Ancient technology that seems to be still operational. The patterns match the radio interference."',
                '94.8': 'Indigenous chanting mixed with static: "The spirits are restless. The balance is disturbed. The outsiders must leave before the forest claims them."',
                '96.4': 'A mysterious broadcast: "Day 47: The radio signals are getting stronger. We\'re picking up patterns that shouldn\'t exist. The jungle is trying to tell us something."',
                '98.1': 'An unidentified voice: "The military base is not what it seems. They\'re hiding something in the underground facility. The walls... they\'re moving."',
                '99.5': 'A weak signal: "Help... we\'re trapped in the research station. The power keeps fluctuating. Something is in the walls. Please, if anyone can hear this..."',
                '100.9': 'A fading transmission: "The indigenous tribes speak of a time before the military came. When the forest was pure. We need to understand what they know."',
                '102.3': 'Intermittent signal: "The anomaly readings are off the charts. The equipment is picking up patterns that defy explanation. We need more time to study this."',
                '103.7': 'A distant broadcast: "The military\'s experiments have awakened something. The jungle is fighting back. We\'re seeing unprecedented biological activity."',
                '104.6': 'Unknown frequency: "The ancient technology is responding to the military\'s presence. The patterns in the radio waves... they\'re not random. They\'re a warning."'
            }
        };

        // Initialize sound manager
        this.soundManager = new SoundManager();
        
        // Load sound files (Pages-safe absolute paths when hosted under /echoes-of-the-basin/)
        this.soundManager.loadSound('static', assetPath('src/assets/sounds/static.wav'));
        this.soundManager.loadSound('staticBlip', assetPath('src/assets/sounds/static_blip.wav'));
        this.soundManager.loadSound('radioBeep', assetPath('src/assets/sounds/radio_beep.wav'));
        this.soundManager.loadSound('rainforest', assetPath('src/assets/sounds/459925__rtb45__costa-rica-rainforest.wav'));
        this.soundManager.loadSound('piano', assetPath('src/assets/sounds/Whispers in the Canopy_piano.mp3'));
        this.soundManager.loadSound('militaryVoice', assetPath('src/assets/sounds/ElevenLabs_Military_1.mp3'));
        this.soundManager.loadSound('explorerVoice', assetPath('src/assets/sounds/ElevenLabs_Explorer_1.mp3'));
        this.soundManager.loadSound('shamanVoice', assetPath('src/assets/sounds/ElevenLabs_Shaman_1.mp3'));
        this.soundManager.loadSound('seerVoice', assetPath('src/assets/sounds/ElevenLabs_Seer_1.mp3'));
        this.soundManager.loadSound('oldSong', assetPath('src/assets/sounds/old_song.wav'));

        // Generate transmission pools after state is initialized
        this.state.transmissionPools = this.generateTransmissionPools();

        this.eventListeners = new Map();
        
        // Initialize calendar
        this.calendar = new Calendar();
        
        // Initialize daily transmissions
        this.initializeDailyTransmissions();

        this.createDayEndPrompt();

        // Create fade overlay
        this.createFadeOverlay();
    }

    init() {
        // Initialize UI components after state is ready
        this.transmissionUI = new TransmissionUI(this);
        this.radioImage = new RadioImage(this);
        
        // Initialize resource display
        this.resourceDisplay = new ResourceDisplay(this);

        // Ensure message-log exists
        let messageLog = document.getElementById('message-log');
        if (!messageLog) {
            messageLog = document.createElement('div');
            messageLog.id = 'message-log';
            messageLog.className = 'message-log';
            document.body.appendChild(messageLog);
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Set initial frequency display
        this.updateFrequencyDisplay();
        
        // Start game systems
        this.loadSavedGame();
        this.startGameLoop();
        this.scheduleDailyEvents();

        // Add click listener to start sounds on first interaction
        const startSounds = () => {
            // Play rainforest ambient sound
            this.soundManager.play('rainforest', { volume: 0.3 });  // Play at 30% volume for ambient effect
            
            // Play piano music
            this.soundManager.play('piano', { volume: 0.2 });  // Play at 20% volume

            // Remove the listener after first interaction
            document.removeEventListener('click', startSounds);
            document.removeEventListener('touchstart', startSounds);
        };

        // Add listeners for both click and touch events
        document.addEventListener('click', startSounds);
        document.addEventListener('touchstart', startSounds);
    }

    setupEventListeners() {
        const tuneUpButton = document.getElementById('tune-up');
        const tuneDownButton = document.getElementById('tune-down');

        if (tuneUpButton) {
            tuneUpButton.addEventListener('click', () => this.tuneFrequency(1));
        }
        if (tuneDownButton) {
            tuneDownButton.addEventListener('click', () => this.tuneFrequency(-1));
        }
    }

    tuneFrequency(delta) {
        const currentIndex = this.state.availableFrequencies.indexOf(this.state.currentFrequency);
        let newIndex;
        
        if (delta > 0) {
            // Moving up in frequency
            newIndex = currentIndex + 1;
            if (newIndex >= this.state.availableFrequencies.length) {
                newIndex = 0; // Loop back to start
            }
        } else {
            // Moving down in frequency
            newIndex = currentIndex - 1;
            if (newIndex < 0) {
                newIndex = this.state.availableFrequencies.length - 1; // Loop to end
            }
        }
        
        const newFrequency = this.state.availableFrequencies[newIndex];
        if (newFrequency !== this.state.currentFrequency) {
            this.changeFrequency(newFrequency);
        }
    }

    updateFrequencyDisplay() {
        // Update the bottom interface display
        const frequencyDisplay = document.getElementById('current-frequency');
        if (frequencyDisplay) {
            frequencyDisplay.textContent = `${this.state.currentFrequency} MHz`;
        }
        
        // Update the radio image display
        if (this.radioImage) {
            this.radioImage.updateFrequency(this.state.currentFrequency);
        }
    }

    generateTransmissionPools() {
        const pools = [];
        const baseMessages = {
            military: [
                "Delta team reporting unusual activity at grid coordinates 7-4-2. Multiple heat signatures detected. Requesting backup.",
                "Perimeter breach detected at sector 3. Unknown entity moving through the jungle. All units on high alert.",
                "Aerial patrol reporting strange electromagnetic interference. Equipment malfunctioning at altitude 5000ft.",
                "Underground facility experiencing power fluctuations. Security systems compromised. Requesting immediate support.",
                "Heat signature anomalies detected in the research sector. Possible infiltration attempt.",
                "Radio interference patterns match known hostile activity. All units maintain current positions.",
                "Unidentified aircraft detected on radar. Not responding to hails. Scrambling interceptors.",
                "Base perimeter sensors detecting movement. Multiple contacts, non-human signatures.",
                "Research team reporting containment breach. Unknown biological entity escaped.",
                "Military satellite feed showing unusual atmospheric phenomena. Possible connection to recent events."
            ],
            indigenous: [
                "The ancient ones speak through the radio. They warn us about the outsiders. The forest remembers.",
                "The spirits are restless. The balance is disturbed. The outsiders must leave before the forest claims them.",
                "The jungle speaks of a great disturbance. The military's presence has awakened something ancient.",
                "Our ancestors warn us of the coming storm. The forest's protectors are growing stronger.",
                "The sacred grounds are being defiled. The spirits demand retribution.",
                "The ancient technology in the caves hums with new life. The forest responds to its call.",
                "The tribal elders speak of a prophecy. The outsiders' presence heralds great change.",
                "The jungle's voice grows louder. The spirits guide us to protect our home.",
                "The ancient ones show us visions of the past. The military's experiments must end.",
                "The forest's guardians stir from their slumber. The balance must be restored."
            ],
            researchers: [
                "Fascinating discovery in the cave system. Ancient technology that seems to be still operational.",
                "The anomaly readings are off the charts. The equipment is picking up patterns that defy explanation.",
                "Biological samples showing unprecedented mutation rates. The jungle's influence is accelerating.",
                "The military's experiments have awakened something. The jungle is fighting back.",
                "Ancient technology responding to military presence. The patterns in the radio waves... they're not random.",
                "Research station experiencing unexplained phenomena. Equipment behaving erratically.",
                "The cave paintings match our radio interference patterns. Ancient knowledge coming to light.",
                "Biological specimens showing signs of advanced evolution. The jungle's influence is growing.",
                "The anomaly is expanding. Our containment measures are failing.",
                "New evidence suggests the military's presence has triggered an ancient defense mechanism."
            ]
        };

        // Generate 15 days worth of unique message pools
        for (let day = 1; day <= 15; day++) {
            const dayPool = new Map();
            
            // For each frequency, select a random message from each category
            this.state.availableFrequencies.forEach(freq => {
                const freqStr = freq.toString();
                const category = this.getRandomCategory();
                const messages = baseMessages[category];
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                
                dayPool.set(freq, {
                    sender: this.getRandomSenderForCategory(category),
                    message: randomMessage,
                    category: category
                });
            });
            
            pools.push(dayPool);
        }

        return pools;
    }

    getRandomCategory() {
        const categories = ['military', 'indigenous', 'researchers'];
        return categories[Math.floor(Math.random() * categories.length)];
    }

    getRandomSenderForCategory(category) {
        const senders = {
            military: ['Military Patrol', 'Military Base', 'Aerial Patrol'],
            indigenous: ['Indigenous Settlement', 'Village Elder', 'Hunter Group'],
            researchers: ['Research Team', 'Field Team', 'Lab Station']
        };
        const categorySenders = senders[category];
        return categorySenders[Math.floor(Math.random() * categorySenders.length)];
    }

    initializeDailyTransmissions() {
        // Get the current day's transmission pool
        const currentPool = this.state.transmissionPools[this.state.currentDay - 1];
        
        // Create a pool of transmissions for each available frequency
        this.state.availableFrequencies.forEach(freq => {
            const freqStr = freq.toString();
            const transmission = currentPool.get(freq);
            
            if (transmission) {
                const transmissionObj = {
                    sender: transmission.sender,
                    message: transmission.message,
                    choices: [
                        {
                            text: "Acknowledge and log",
                            consequences: {
                                [transmission.category]: { trust: 5 },
                                resources: {
                                    batteries: -5  // Small battery cost for logging
                                }
                            }
                        },
                        {
                            text: "Request more information",
                            consequences: {
                                [transmission.category]: { trust: 2 },
                                resources: {
                                    batteries: -10,  // More battery cost for extended communication
                                    food: -5  // Small food cost for the effort
                                }
                            }
                        }
                    ]
                };
                this.state.dailyTransmissionPool.set(freq, [transmissionObj]);
            }
        });
    }

    generateNewDailyFrequencies() {
        // Keep our fixed set of frequencies
        const fixedFrequencies = [
            88.5, 89.1, 90.3, 91.7, 93.2, 94.8, 96.4, 
            98.1, 99.5, 100.9, 102.3, 103.7, 104.6
        ];
        
        // Reset to our fixed frequencies
        this.state.availableFrequencies = [...fixedFrequencies];
        
        // Reset current frequency to start of the range
        this.state.currentFrequency = this.state.availableFrequencies[0];
        
        // Clear and reinitialize the daily transmission pool
        this.state.dailyTransmissionPool.clear();
        this.initializeDailyTransmissions();
        
        // Update the display
        this.updateFrequencyDisplay();
    }

    checkForTransmissions() {
        const frequency = this.state.currentFrequency;
        const transmissionPool = this.state.dailyTransmissionPool.get(frequency);
        
        if (transmissionPool && transmissionPool.length > 0) {
            // Always use the first (and only) transmission for this frequency today
            const transmission = transmissionPool[0];
            this.handleNewTransmission(transmission);
        }
    }

    handleNewTransmission(transmission) {
        if (!transmission) return;

        // Play the static blip sound
        this.soundManager.play('staticBlip');

        // Play appropriate voice based on faction
        const faction = this.getFactionFromSender(transmission.sender);
        if (faction === 'military') {
            this.soundManager.play('militaryVoice', { volume: 0.75 });  // Play at 75% volume
        } else if (faction === 'researchers') {
            this.soundManager.play('explorerVoice', { volume: 0.75 });  // Play at 75% volume
        } else if (faction === 'indigenous') {
            this.soundManager.play('shamanVoice', { volume: 0.75 });  // Play at 75% volume
        } else if (faction === 'unknown') {
            this.soundManager.play('seerVoice', { volume: 0.75 });  // Play at 75% volume
        }

        // Log the transmission message
        this.addMessage(`[${this.state.currentFrequency}MHz] ${transmission.sender}: ${transmission.message}`, 'transmission');

        // Add standard choices if not present
        if (!transmission.choices) {
            transmission.choices = [
                {
                    text: "Acknowledge and log",
                    consequences: {
                        [this.getFactionFromSender(transmission.sender)]: { trust: 5 }
                    }
                },
                {
                    text: "Request more information",
                    consequences: {
                        [this.getFactionFromSender(transmission.sender)]: { trust: 2 }
                    }
                }
            ];
        }

        // Add to found frequencies if not already found today
        if (!this.state.foundFrequencies.has(this.state.currentFrequency)) {
            this.state.foundFrequencies.add(this.state.currentFrequency);
            
            // Check if day should end
            if (this.state.foundFrequencies.size >= this.state.dailyTarget) {
                this.checkDayCompletion();
            }
        }

        // Show transmission choices
        this.transmissionUI.showChoices(transmission);
    }

    scheduleDailyEvents() {
        // Schedule daily events
        gameEvents.daily.forEach(event => {
            this.state.activeEvents.push({
                ...event,
                nextTrigger: this.state.currentDay
            });
        });
    }

    startGameLoop() {
        // Check for events every minute
        setInterval(() => {
            this.checkEvents();
        }, 60000);
    }

    checkEvents() {
        const currentDay = this.state.currentDay;
        
        // Check and trigger daily events
        this.state.activeEvents.forEach(event => {
            if (event.nextTrigger === currentDay) {
                this.triggerEvent(event);
                event.nextTrigger = currentDay + 1;
            }
        });
    }

    triggerEvent(event) {
        // Apply event consequences
        if (event.consequences) {
            Object.entries(event.consequences).forEach(([type, changes]) => {
                if (type === 'resources') {
                    Object.entries(changes).forEach(([resource, change]) => {
                        this.state.resources[resource] += change;
                        this.emit('resourceUpdate', { resource, change });
                    });
                }
            });
        }

        // Add event message to log
        this.addMessage(event.message, 'event');
    }

    addMessage(text, type = 'info') {
        // Only add to the log container in the right-hand notepad
        if (this.transmissionUI && this.transmissionUI.logContainer) {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${type}`;
            
            // Add timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'timestamp';
            const now = new Date();
            timestamp.textContent = now.toLocaleTimeString();
            logEntry.appendChild(timestamp);
            
            // Add message content
            const messageContent = document.createElement('span');
            messageContent.className = 'message-content';
            messageContent.textContent = text;
            logEntry.appendChild(messageContent);
            
            // Add to log container
            this.transmissionUI.logContainer.appendChild(logEntry);
            
            // Scroll to bottom
            this.transmissionUI.logContainer.scrollTop = this.transmissionUI.logContainer.scrollHeight;
        }
    }

    saveGame() {
        const payload = {
            ...this.state,
            foundFrequencies: [...(this.state.foundFrequencies || [])],
            // Maps are not JSON-safe; rebuild on load
            dailyTransmissionPool: undefined,
            transmissionPools: undefined
        };
        localStorage.setItem('amazonRadioMystery', JSON.stringify(payload));
    }

    loadSavedGame() {
        const raw = localStorage.getItem('amazonRadioMystery');
        if (!raw) {
            return;
        }

        try {
            const saved = JSON.parse(raw);
            const found = saved.foundFrequencies;
            const foundSet = new Set(
                Array.isArray(found)
                    ? found
                    : found && typeof found === 'object'
                        ? Object.keys(found)
                        : []
            );

            this.state = {
                ...this.state,
                ...saved,
                foundFrequencies: foundSet,
                dailyTransmissionPool: new Map(),
                resources: { ...this.state.resources, ...(saved.resources || {}) },
                factions: { ...this.state.factions, ...(saved.factions || {}) },
                availableFrequencies: saved.availableFrequencies || this.state.availableFrequencies,
                defaultTransmissions: saved.defaultTransmissions || this.state.defaultTransmissions
            };
            this.state.transmissionPools = this.generateTransmissionPools();
            this.updateFrequencyDisplay();
        } catch (error) {
            console.warn('Corrupt save cleared:', error);
            localStorage.removeItem('amazonRadioMystery');
        }
    }

    // Event system
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(callback);
    }

    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    changeFrequency(newFrequency) {
        if (this.state.availableFrequencies.includes(newFrequency)) {
            this.state.currentFrequency = newFrequency;
            this.updateFrequencyDisplay();
            this.checkForTransmissions();
        }
    }

    checkDayCompletion() {
        if (this.state.foundFrequencies.size >= this.state.dailyTarget) {
            // Add message about day ending
            this.addToLog('Night falls on the Amazon outpost...', 'system');
            
            // Show the day end prompt
            if (this.dayEndPrompt) {
                this.dayEndPrompt.style.display = 'flex';
            }
        }
    }

    async proceedToNextDay() {
        // Fade to black
        await this.fadeToBlack();

        // Advance to next day
        this.calendar.advanceDay();
        
        // Clear found frequencies for the new day
        this.state.foundFrequencies.clear();
        
        // Generate new frequencies for the next day
        this.generateNewDailyFrequencies();
        
        // Add message about new day
        const newDate = this.calendar.getCurrentDate();
        const dateStr = newDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.addToLog(`Dawn breaks on ${dateStr}`, 'system');

        // Fade from black
        await this.fadeFromBlack();
    }

    addToLog(message, type = 'info') {
        // Only add to the log container in the right-hand notepad
        if (this.transmissionUI && this.transmissionUI.logContainer) {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry ${type}`;
            
            // Add timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'timestamp';
            const now = new Date();
            timestamp.textContent = now.toLocaleTimeString();
            logEntry.appendChild(timestamp);
            
            // Add message content
            const messageContent = document.createElement('span');
            messageContent.className = 'message-content';
            messageContent.textContent = message;
            logEntry.appendChild(messageContent);
            
            // Add to log container
            this.transmissionUI.logContainer.appendChild(logEntry);
            
            // Scroll to bottom
            this.transmissionUI.logContainer.scrollTop = this.transmissionUI.logContainer.scrollHeight;
        }
    }

    getFactionFromSender(sender) {
        // Map sender names to factions
        const factionMap = {
            'Military Patrol': 'military',
            'Military Base': 'military',
            'Aerial Patrol': 'military',
            'Indigenous Settlement': 'indigenous',
            'Village Elder': 'indigenous',
            'Hunter Group': 'indigenous',
            'Research Team': 'researchers',
            'Field Team': 'researchers',
            'Lab Station': 'researchers'
        };

        return factionMap[sender] || 'unknown';
    }

    createDayEndPrompt() {
        // Create day end prompt container
        const promptContainer = document.createElement('div');
        promptContainer.className = 'day-end-prompt';
        promptContainer.style.display = 'none';

        // Create prompt content
        const promptContent = document.createElement('div');
        promptContent.className = 'prompt-content';

        // Create message
        const message = document.createElement('p');
        message.textContent = 'Night has fallen. Would you like to go to sleep?';
        promptContent.appendChild(message);

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'prompt-buttons';

        // Create Yes button
        const yesButton = document.createElement('button');
        yesButton.textContent = 'Yes';
        yesButton.className = 'prompt-button yes-button';
        yesButton.addEventListener('click', async () => {
            promptContainer.style.display = 'none';
            await this.proceedToNextDay();
        });

        // Create No button
        const noButton = document.createElement('button');
        noButton.textContent = 'No';
        noButton.className = 'prompt-button no-button';
        noButton.addEventListener('click', () => {
            promptContainer.style.display = 'none';
        });

        buttonsContainer.appendChild(yesButton);
        buttonsContainer.appendChild(noButton);
        promptContent.appendChild(buttonsContainer);
        promptContainer.appendChild(promptContent);
        document.body.appendChild(promptContainer);

        this.dayEndPrompt = promptContainer;
    }

    updateResource(resource, amount) {
        if (this.state.resources[resource] !== undefined) {
            this.state.resources[resource] += amount;
            
            // Ensure resources don't go below 0
            if (this.state.resources[resource] < 0) {
                this.state.resources[resource] = 0;
            }
            
            // Emit resource update event
            this.emit('resourceUpdate', {
                resource,
                amount,
                newValue: this.state.resources[resource]
            });
        }
    }

    updateFactionTrust(faction, amount) {
        if (this.state.factions[faction] !== undefined) {
            this.state.factions[faction] += amount;
            
            // Ensure trust stays within bounds (0-100)
            if (this.state.factions[faction] < 0) {
                this.state.factions[faction] = 0;
            } else if (this.state.factions[faction] > 100) {
                this.state.factions[faction] = 100;
            }
            
            // Emit faction update event
            this.emit('factionUpdate', {
                faction,
                amount,
                newValue: this.state.factions[faction]
            });
        }
    }

    createFadeOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'fade-overlay';
        document.body.appendChild(overlay);
        this.fadeOverlay = overlay;
    }

    async fadeToBlack() {
        return new Promise(resolve => {
            this.fadeOverlay.classList.add('fade-in');
            // Wait for fade to complete (1s) plus 2s delay
            setTimeout(resolve, 3000);
        });
    }

    async fadeFromBlack() {
        return new Promise(resolve => {
            this.fadeOverlay.classList.remove('fade-in');
            // Wait for fade to complete (1s)
            setTimeout(resolve, 1000);
        });
    }

    async startNewDay() {
        // Fade to black
        await this.fadeToBlack();

        // Reset daily state
        this.state.foundFrequencies.clear();
        this.state.currentDay++;
        this.state.currentFrequency = this.state.availableFrequencies[0];
        this.state.transmissionPool = new Map();
        this.state.dailyTransmissionPool = new Map();
        this.state.foundFrequencies = new Set();
        this.state.dailyTarget = Math.min(3 + Math.floor(this.state.currentDay / 2), 5);
        this.state.resources.food = Math.max(0, this.state.resources.food - 10);
        this.state.resources.batteries = Math.max(0, this.state.resources.batteries - 5);
        this.state.resources.medicine = Math.max(0, this.state.resources.medicine - 5);

        // Generate new transmissions
        this.generateTransmissionPools();
        this.initializeDailyTransmissions();

        // Update UI
        this.updateFrequencyDisplay();
        this.updateResourceDisplay();
        this.transmissionUI.clearLog();
        this.transmissionUI.addToLog(`Day ${this.state.currentDay} begins.`, 'system');

        // Fade from black
        await this.fadeFromBlack();

        // Check for game over
        if (this.state.resources.food <= 0 || this.state.resources.batteries <= 0 || this.state.resources.medicine <= 0) {
            this.handleGameOver();
        }
    }

    // Handle window resize events
    handleResize() {
        // Update UI elements that need to respond to window size changes
        if (this.transmissionUI && this.transmissionUI.gameUI) {
            // Ensure the game UI doesn't exceed window height
            const maxHeight = window.innerHeight - 100;
            if (this.transmissionUI.gameUI.offsetHeight > maxHeight) {
                this.transmissionUI.gameUI.style.height = `${maxHeight}px`;
            }
        }
        
        // Update radio image if it exists
        if (this.radioImage) {
            this.radioImage.handleResize();
        }
    }
} 