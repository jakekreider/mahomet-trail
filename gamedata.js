// Game Data - converted from YAML for direct browser loading
const gameData = {
    game: {
        title: "MAHOMET TRAIL",
        start_location: "Champaign, IL",
        end_location: "Mahomet, IL",
        total_distance: 12
    },

    starting_resources: {
        gas: 100,
        snacks: 100,
        patience: 100,
        van_health: 100
    },

    events: [
        // Positive/Neutral Events
        {
            id: "county_market",
            type: "positive",
            title: "You pass the County Market",
            text: "The smell of stale donuts wafts through your van. Your spirits lift.",
            effects: { patience: 10 },
            weight: 5
        },
        {
            id: "corn_fields",
            type: "neutral",
            title: "Endless Corn Fields",
            text: "Corn. More corn. Still more corn. This is Illinois.",
            effects: {},
            weight: 10
        },
        {
            id: "slow_farmer",
            type: "minor_negative",
            title: "Leisurely Tractor",
            text: "A farmer pulls in front of you and drives 5mph in his tractor. Bro country blasts from his speakers.",
            effects: { patience: -5, gas: -10 },
            weight: 8
        },
        {
            id: "smooth_sailing",
            type: "positive",
            title: "Clear Road",
            text: "The road is clear and smooth, with only sporadic orange barrels. You make good progress.",
            effects: { gas: -5 },
            weight: 15
        },

        // Negative Events - Minor
        {
            id: "pothole",
            type: "minor_negative",
            title: "Pothole!",
            text: "You hit a massive pothole. Your van rattles violently.",
            effects: { van_health: -10, patience: -5 },
            weight: 12
        },
        {
            id: "construction",
            type: "minor_negative",
            title: "Road Construction",
            text: "Orange cones everywhere. You're down to one lane. Illinois has two seasons: winter and construction.",
            effects: { gas: -15, patience: -15 },
            weight: 10
        },
        {
            id: "kids_fighting",
            type: "minor_negative",
            title: "Kids Are Fighting",
            text: "The kids in the backseat are arguing about 6-7 or something, you're not really sure.",
            effects: { patience: -20 },
            weight: 8
        },
        {
            id: "forgot_phone",
            type: "minor_negative",
            title: "Forgot Your Phone",
            text: "You realize you left your phone at home. But you're already halfway there...",
            effects: { patience: -15 },
            weight: 5
        },
        {
            id: "spilled_drink",
            type: "minor_negative",
            title: "Spilled Drink",
            text: "Someone knocked over their latte in the cupholder. It's dripping everywhere. It will surely smell.",
            effects: { patience: -10, van_health: -5 },
            weight: 7
        },

        // Negative Events - Major
        {
            id: "flat_tire",
            type: "major_negative",
            title: "Flat Tire!",
            text: "You hear a loud POP. Great, a flat tire in the middle of Champaign County.",
            effects: { van_health: -25, patience: -25, gas: -10 },
            weight: 4
        },
        {
            id: "check_engine",
            type: "major_negative",
            title: "Check Engine Light",
            text: "The check engine light comes on. Your van makes a concerning noise.",
            effects: { van_health: -30, patience: -20 },
            weight: 4
        },
        {
            id: "wrong_turn",
            type: "major_negative",
            title: "Wrong Turn",
            text: "You missed the turn and ended up in Savoy. Now you have to backtrack.",
            effects: { gas: -25, patience: -30 },
            weight: 5
        },
        {
            id: "deer_crossing",
            type: "major_negative",
            title: "Deer in the Road!",
            text: "A deer jumps out! You swerve and barely avoid it, but your nerves are shot. The deer didn't even apologize.",
            effects: { patience: -25, gas: -15 },
            weight: 6
        },
        {
            id: "hungry_kids",
            type: "minor_negative",
            title: "\"I'm Hungry!\"",
            text: "The kids are hungry. Again. You just fed them 20 minutes ago. Goldfish crackers have no nutritional value.",
            effects: { snacks: -20, patience: -10 },
            weight: 10
        },
        {
            id: "ac_broken",
            type: "major_negative",
            title: "AC Stopped Working",
            text: "The AC dies. It's 90 degrees outside. Welcome to Illinois summer.",
            effects: { van_health: -20, patience: -30 },
            weight: 4
        },
        {
            id: "train_crossing",
            type: "minor_negative",
            title: "Train Crossing",
            text: "A freight train blocks your path. You count 87 cars. It appears to be slowing down.",
            effects: { patience: -20, gas: -10 },
            weight: 8
        },

        // Custom Events (logic defined in customEvents map)
        {
            id: "ford_corn_field",
            type: "major_negative",
            title: "You Attempt to Ford the Corn Field",
            text: "Against all logic, you decide to drive through the corn field as a shortcut.",
            customEvent: true,
            weight: 3
        },

        // Critical Events
        {
            id: "ran_out_gas",
            type: "critical",
            title: "Out of Gas!",
            text: "Your van sputters to a stop. You've run out of gas.",
            condition: "gas <= 0",
            fatal: true,
            effects: {}
        },
        {
            id: "van_breakdown",
            type: "critical",
            title: "Van Breakdown",
            text: "Your van has given up. You're stranded on the side of the road.",
            condition: "van_health <= 0",
            fatal: true,
            effects: {}
        },
        {
            id: "lost_patience",
            type: "critical",
            title: "Lost All Patience",
            text: "You can't take it anymore. You turn around and go back home.",
            condition: "patience <= 0",
            fatal: true,
            effects: {}
        }
    ],

    victory: {
        title: "YOU MADE IT TO MAHOMET!",
        messages: [
            "After an arduous 12-mile journey, you have arrived in Mahomet!",
            "Your van survived. Your family survived. Mostly.",
            "The legends will speak of your journey for generations.",
            "Casey's General Store never looked so good."
        ]
    }
};

// Custom Event Functions
// These functions receive gameState and the event object, and return effects to apply
const customEvents = {
    ford_corn_field: function(gameState, event) {
        // Random patience loss between 5 and 1000
        const patienceLoss = Math.floor(Math.random() * 996) + 5; // 5 to 1000

        // Update event text dynamically based on how bad it was
        let outcomeText = event.text;
        if (patienceLoss < 100) {
            outcomeText += " Surprisingly, it wasn't that bad.";
        } else if (patienceLoss < 300) {
            outcomeText += " Corn stalks slap against the windows. This was a mistake.";
        } else if (patienceLoss < 600) {
            outcomeText += " You're completely lost in the corn. Your family is screaming.";
        } else {
            outcomeText += " CORN EVERYWHERE. You've made a terrible, terrible mistake.";
        }

        return {
            text: outcomeText,
            effects: {
                patience: -patienceLoss,
                van_health: -Math.floor(patienceLoss / 10) // Also damages van
            }
        };
    }
};
