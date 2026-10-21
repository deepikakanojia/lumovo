/* Status: DRAFT */
/* Lumovo "Arrival": journey data. Content from arrival-game-spec.md section 4.
   Engine (game.js) consumes this. Strings are verbatim; do not paraphrase Finnish.
   Conventions:
   - check:true marks something still waiting for native-speaker verification ([CHECK]).
   - Tokens {greeting.casual|polite|distractor|casualEn|politeEn|distractorEn} are resolved by the engine.
   - choice.hotspot may be a string or an array of hotspot ids that mirror the choice.
   - A choice with no "fi" shows its "en" as the button label (action buttons).
*/
(function () {
  "use strict";

  var J = {
    version: 1,

    times: [
      { id: "morning", label: "Morning", icon: "☀️" },
      { id: "day", label: "Day", icon: "🌤️" },
      { id: "evening", label: "Evening", icon: "🌇" },
      { id: "night", label: "Night", icon: "🌌" }
    ],

    /* Section 4 greetings table, verbatim. "Check" flags the [CHECK] items.
       en* are English glosses for the same lines. */
    greetings: {
      morning: { casual: "Huomenta!", polite: "Hyvää huomenta!", distractor: "Öitä!",
                 casualEn: "Morning!", politeEn: "Good morning!", distractorEn: "Night!",
                 cards: ["huomenta", "hyvaa-huomenta", "moi-moi"] },
      day:     { casual: "Moi!", polite: "Hei!", distractor: "Hyvää yötä!",
                 casualEn: "Hi!", politeEn: "Hello!", distractorEn: "Good night!",
                 cards: ["moi", "hei", "moi-moi"] },
      evening: { casual: "Iltaa!", polite: "Hyvää iltaa!", distractor: "Huomenta!",
                 casualEn: "Evening!", politeEn: "Good evening!", distractorEn: "Morning!",
                 casualCheck: true,
                 cards: ["iltaa", "hyvaa-iltaa", "moi-moi"] },
      night:   { casual: "Öitä!", polite: "Hyvää yötä!", distractor: "Huomenta!",
                 casualEn: "Night!", politeEn: "Good night!", distractorEn: "Morning!",
                 casualCheck: true,
                 cards: ["moi", "hei", "moi-moi", "oita", "hyvaa-yota"] }
    },

    /* Night rule: Öitä / Hyvää yötä is said when PARTING at night. Arriving at night, Finns still say Moi / Hei.
       So at night the gate's correct answers are Moi! / Hei!, and Hyvää yötä is taught as the goodbye. [CHECK] */
    nightRule: {
      check: true,
      arrival: { casual: "Moi!", polite: "Hei!", casualEn: "Hi!", politeEn: "Hello!" },
      goodbye: { fi: "Hyvää yötä!", en: "Good night!" },
      note: "Öitä / Hyvää yötä is said when parting at night. Arriving at night, Finns still say Moi / Hei."
    },

    cards: {
      "huomenta":        { fi: "Huomenta!", en: "Morning!", say: "HOO-oh-men-tah", check: false },
      "hyvaa-huomenta":  { fi: "Hyvää huomenta!", en: "Good morning!", say: "HÜ-vææ HOO-oh-men-tah", check: false },
      "moi":             { fi: "Moi!", en: "Hi!", say: "\"moy\"", check: false },
      "hei":             { fi: "Hei!", en: "Hello!", say: "\"hey\"", check: false },
      "iltaa":           { fi: "Iltaa!", en: "Evening!", say: "IL-taah", check: true },
      "hyvaa-iltaa":     { fi: "Hyvää iltaa!", en: "Good evening!", say: "HÜ-vææ IL-taah", check: false },
      "oita":            { fi: "Öitä!", en: "Night!", say: "ÖY-tæ", check: true },
      "hyvaa-yota":      { fi: "Hyvää yötä!", en: "Good night!", say: "HÜ-vææ ÜÖ-tæ", check: false },
      "moi-moi":         { fi: "Moi moi!", en: "Bye!", say: "moy-moy", check: true },

      "matkatavarat":    { fi: "Matkatavarat", en: "Baggage", say: "MAT-ka-ta-va-rat", check: true },
      "uloskaynti":      { fi: "Uloskäynti", en: "Exit", say: "U-los-kæ-ün-ti", check: true },
      "lahtevat":        { fi: "Lähtevät", en: "Departures", say: "LÆH-te-væt", check: true },
      "saapuvat":        { fi: "Saapuvat", en: "Arrivals", say: "SAA-pu-vat", check: true },

      "juna":            { fi: "Juna", en: "Train", say: "YU-nah", check: false },
      "bussi":           { fi: "Bussi", en: "Bus", say: "BUS-si", check: true },
      "taksi":           { fi: "Taksi", en: "Taxi", say: "TAK-si", check: true },

      "lippu":           { fi: "lippu", en: "ticket", say: "LIP-pu", check: true },
      "maksa-kortilla":  { fi: "Maksa kortilla", en: "Pay by card", say: "MAK-saah KOR-til-lah", check: true },

      "meneeko-juna":    { fi: "Meneekö tämä juna Helsinkiin?", en: "Does this train go to Helsinki?", say: "ME-nee-kö TÆ-mæ YU-nah HEL-sin-keen", check: false },
      "joo":             { fi: "Joo", en: "Yeah (casual yes)", say: "yoh", check: true },
      "raide":           { fi: "raide", en: "track / platform", say: "RAI-de", check: true },

      "seuraava-asema":  { fi: "Seuraava asema", en: "Next station", say: "SEU-raa-vah A-se-mah", check: true },

      "rautatientori":   { fi: "Rautatientori", en: "Railway Square", say: "RAU-tah-tee-en-to-ri", check: true },
      "pysakki":         { fi: "pysäkki", en: "bus stop", say: "PÜ-sæk-ki", check: true },

      "seuraava-pysakki":{ fi: "Seuraava pysäkki", en: "Next stop", say: "SEU-raa-vah PÜ-sæk-ki", check: true },
      "pysahtyy":        { fi: "Pysähtyy", en: "Stopping", say: "PÜ-sæh-tüü", check: true },

      "minne-mennaan":   { fi: "Minne mennään?", en: "Where are we going?", say: "MIN-ne MEN-næn", check: true },
      "rautatieasemalle":{ fi: "Rautatieasemalle, kiitos.", en: "To the railway station, please.", say: "RAU-tah-tee-ah-se-mal-le KEE-tos", check: false },
      "selva":           { fi: "Selvä!", en: "OK / got it.", say: "SEL-væ", check: true },
      "totta-kai":       { fi: "Totta kai!", en: "Of course!", say: "TOT-ta kai", check: true },

      "rautatieasema":   { fi: "rautatieasema", en: "railway station", say: "RAU-tah-tee-ah-se-mah", check: true },

      "vesi":            { fi: "vesi", en: "water", say: "VE-si", check: false },
      "hiilihapoton":    { fi: "hiilihapoton", en: "still", say: "HEE-li-ha-po-ton", check: false },
      "hiilihapollinen": { fi: "hiilihapollinen", en: "sparkling", say: "HEE-li-ha-pol-li-nen", check: true },
      "mehu":            { fi: "mehu", en: "juice", say: "ME-hu", check: true },
      "pantti":          { fi: "pantti", en: "bottle deposit", say: "PAN-tti", check: true },

      "tarvitsetko-kassin": { fi: "Tarvitsetko kassin?", en: "Do you need a bag?", say: "TAR-vit-set-ko KAS-sin", check: true },
      "ei-kiitos":       { fi: "Ei, kiitos.", en: "No, thanks.", say: "ay KEE-tos", check: true },
      "kuitti":          { fi: "Kuitti?", en: "Receipt?", say: "KUIT-ti", check: true },
      "voinko-maksaa":   { fi: "Voinko maksaa kortilla?", en: "Can I pay by card?", say: "VOIN-ko MAK-saah KOR-til-lah", check: false }
    },

    stamps: {
      arrived:  { fi: "Saavuit Suomeen", en: "You arrived in Finland", icon: "🛂" },
      helsinki: { fi: "Helsinki", en: "Helsinki Central", icon: "🛂" },
      purchase: { fi: "Ensimmäinen ostos", en: "First purchase", icon: "🛂" }
    },

    /* Route-map groups (HUD). "route" is the branch group: scenes depend on the route chosen. */
    map: [
      { icon: "✈️", label: "Arrival gate", scenes: ["gate"] },
      { icon: "🚪", label: "Exit", scenes: ["exit"] },
      { icon: "🧭", label: "Arrivals hall", scenes: ["hall"] },
      { icon: "route", label: "Your route",
        routes: { train: ["ticket", "platform", "train-ride"], bus: ["bus-stop", "bus-ride"], taxi: ["taxi-rank", "taxi-ride"] },
        routeIcons: { train: "🚆", bus: "🚌", taxi: "🚕" }, fallbackIcon: "🛤️" },
      { icon: "🏛️", label: "Helsinki Central", scenes: ["central"] },
      { icon: "🛒", label: "Kiosk", scenes: ["kiosk"] },
      { icon: "🧾", label: "Checkout", scenes: ["checkout"] }
    ],

    start: {
      title: "Your first hour in Finland",
      subtitle: "Land in Helsinki. Get to the city. Buy a water. All in Finnish.",
      question: "When do you land?",
      startLabel: "Start journey",
      continueLabel: "Continue",
      newLabel: "New journey",
      guideLabel: "Text version",
      footer: "Built by a learner, for learners. Draft — Finnish being checked by a native speaker."
    },

    scenes: {

      start: { type: "start", title: "Start", next: "gate" },

      gate: {
        title: "Arrival gate", mapIcon: "✈️", next: "exit",
        npc: { name: "Airport staff", color: "fjord", lineFi: "{greeting.casual}", lineEn: "{greeting.casualEn}" },
        tasks: [
          { prompt: "Greet back.",
            choices: [
              { fi: "{greeting.casual}", en: "{greeting.casualEn}", correct: true, feedback: "Perfect, that's what locals say.", hotspot: "npc", setState: "greeted" },
              { fi: "{greeting.polite}", en: "{greeting.politeEn}", correct: true, feedback: "Polite and friendly. Great.", setState: "greeted" },
              { fi: "{greeting.distractor}", en: "{greeting.distractorEn}", correct: false, feedback: "That's for a different time of day. Look at the sky through the window." }
            ],
            after: {
              setState: "greeted",
              /* Night: Hyvää yötä is taught as the goodbye the staff member says as you leave. [CHECK] */
              night: {
                npc: { name: "Airport staff", color: "fjord", lineFi: "Hyvää yötä!", lineEn: "Good night!" },
                tip: "Öitä / Hyvää yötä is said when parting at night. Arriving at night, Finns still say Moi / Hei.",
                check: true
              }
            }
          }
        ],
        cont: { label: "Follow the corridor →" },
        cards: ["{greeting.cards}"]
      },

      exit: {
        title: "Exit", mapIcon: "🚪", next: "hall",
        tasks: [
          { prompt: "First, get your bag. Which sign?",
            choices: [
              { fi: "Matkatavarat", en: "Baggage", correct: true, hotspot: "sign-matkatavarat", feedback: "Right: baggage claim.", setState: "bag" },
              { fi: "Uloskäynti", en: "Exit", correct: false, hotspot: "sign-uloskaynti", feedback: "That's the exit. Bag first!" },
              { fi: "Lähtevät", en: "Departures", correct: false, hotspot: "sign-lahtevat", feedback: "Departures. You just arrived!" }
            ],
            after: { setState: "bag" } },
          { prompt: "Now leave the airport. Which sign?",
            choices: [
              { fi: "Uloskäynti", en: "Exit", correct: true, hotspot: ["sign-uloskaynti", "doors"], feedback: "Exit it is. The doors slide open.", setState: "open" },
              { fi: "Lähtevät", en: "Departures", correct: false, hotspot: "sign-lahtevat", feedback: "Departures is for people leaving Finland. You want the exit." }
            ],
            after: { setState: "open", stamp: "arrived" } }
        ],
        hotspotInfo: { "doors": "The doors are still closed. Sort out your bag first." },
        cont: { label: "Into the arrivals hall →" },
        cards: ["matkatavarat", "uloskaynti", "lahtevat", "saapuvat"]
      },

      hall: {
        type: "hall", title: "Arrivals hall", mapIcon: "🧭",
        introHtml: "You're going to <strong>Helsinki Central</strong> (<em lang=\"fi\">Helsingin päärautatieasema</em>). Pick your way in.",
        goLabel: "Go this way",
        routes: {
          train: { hotspot: "route-train", fi: "Juna", en: "train", icon: "🚆", recommended: true,
                   time: "about 30 min", price: "about €4–5, zones ABC", priceCheck: true, note: "Fastest and cheapest." },
          bus:   { hotspot: "route-bus", fi: "Bussit", en: "bus", icon: "🚌",
                   time: "about 45–60 min", timeCheck: true, price: "same HSL ticket", priceCheck: true, note: "Good late at night." },
          taxi:  { hotspot: "route-taxi", fi: "Taksit", en: "taxi", icon: "🚕",
                   time: "about 30 min", price: "about €40–60", priceCheck: true, note: "Door to door." }
        },
        branch: { train: "ticket", bus: "bus-stop", taxi: "taxi-rank" },
        cards: ["juna", "bussi", "taksi"]
      },

      /* ---------- train route ---------- */
      ticket: {
        title: "Ticket machine", mapIcon: "🚆", next: "platform", initState: "zones",
        tasks: [
          { prompt: "The airport is in zone C. Which ticket takes you to Helsinki?", check: true,
            choices: [
              { fi: "ABC", correct: true, hotspot: "zone-abc", feedback: "ABC covers the airport (zone C) and the city.", setState: "pay" },
              { fi: "AB", correct: false, hotspot: "zone-ab", feedback: "AB doesn't cover the airport — you'd be fined." },
              { fi: "ABCD", correct: false, hotspot: "zone-abcd", feedback: "That works, but you're paying for a zone you don't need." }
            ],
            after: { setState: "pay" } },
          { prompt: "Tap your card.",
            choices: [
              { fi: "Maksa kortilla", en: "Pay by card", correct: true, hotspot: "card-reader", feedback: "Beep! Your ticket prints.", setState: "printed" }
            ],
            after: { setState: "printed", tip: "Easier: buy the same ticket in the HSL app before you board. You can't buy tickets on the train." } }
        ],
        cont: { label: "To the platform →" },
        cards: ["lippu", "maksa-kortilla"]
      },

      platform: {
        title: "Platform", mapIcon: "🚆", next: "train-ride", door: "train",
        npc: null,
        tasks: [
          { prompt: "Two trains: I and P. Which goes to Helsinki Central?", check: true,
            choices: [
              { en: "Only I", correct: false, feedback: "Not quite. Look at the board again." },
              { en: "Only P", correct: false, feedback: "Not quite. Look at the board again." },
              { en: "Both", correct: true, feedback: "The airport is on a loop line, so both end at Helsinki Central.", setState: "train" }
            ],
            after: { setState: "train" } },
          { prompt: "The train arrives. Make sure: ask the passenger.",
            choices: [
              { fi: "Meneekö tämä juna Helsinkiin?", en: "Does this train go to Helsinki?", correct: true, hotspot: "passenger", feedback: "Good question to ask." },
              { fi: "Paljonko se maksaa?", en: "How much is it?", correct: false, feedback: "That asks the price." },
              { fi: "Kiitos!", en: "Thank you!", correct: false, feedback: "Nice, but ask first!" }
            ],
            after: { npc: { name: "Passenger", color: "aurora2", lineFi: "Joo, menee!", lineEn: "Yep, it does!", check: true } } }
        ],
        hotspotInfo: { "board": "The board lists two trains: I to Helsinki in 2 min, and P to Helsinki in 6 min." },
        cont: { label: "Board the train →", hotspot: "train-doors" },
        cards: ["meneeko-juna", "joo", "raide"]
      },

      "train-ride": {
        type: "timed", title: "Train ride", mapIcon: "🚆", next: "central", door: "train",
        prompt: "Get off at Helsinki Central. Watch the display.",
        timed: {
          states: ["pasila", "helsinki"], ms: 4000, correctState: "helsinki",
          status: { pasila: "Seuraava asema: Pasila", helsinki: "Seuraava asema: Helsinki" },
          early: "Pasila is one stop early. Stay on!",
          late: "That's the end of the line. Get off now!",
          exitLabel: "Get off now", exitHotspot: "exit-door",
          stayLabel: "Stay on",
          stayFeedback: "Good. Stay on, it's one stop early.",
          successFeedback: "Helsinki Central. The doors open."
        },
        cards: ["seuraava-asema"]
      },

      /* ---------- bus route ---------- */
      "bus-stop": {
        title: "Bus stop", mapIcon: "🚌", next: "bus-ride",
        tasks: [
          { prompt: "Helsinki Central is next to Rautatientori (Railway Square). Which bus?",
            choices: [
              { fi: "600 Rautatientori", correct: true, hotspot: "bus-1", feedback: "That's the one.", fixedPos: true },
              { fi: "Tikkurila", correct: false, hotspot: "bus-2", feedback: "That one goes elsewhere — read the display." },
              { fi: "Kerava", correct: false, hotspot: "bus-3", feedback: "That one goes elsewhere — read the display." }
            ],
            after: {} },
          { prompt: "The driver greets you. Reply.",
            npcBefore: { name: "Bus driver", color: "fjord", lineFi: "Moi!", lineEn: "Hi!" },
            choices: [
              { fi: "Moi!", en: "Hi!", correct: true, feedback: "Show your ticket in the HSL app as you board." },
              { fi: "Hyvää yötä!", en: "Good night!", correct: false, feedback: "Good night is for parting. Try a hello." },
              { fi: "Anteeksi", en: "Sorry / excuse me", correct: false, feedback: "Not quite. The driver just said hi." }
            ],
            after: {} }
        ],
        cont: { label: "Take a seat →" },
        cards: ["rautatientori", "pysakki"]
      },

      "bus-ride": {
        type: "timed", title: "Bus ride", mapIcon: "🚌", next: "central",
        prompt: "Press STOP when the display shows Rautatientori.",
        timed: {
          states: ["kamppi", "rautatientori"], ms: 4000, correctState: "rautatientori",
          status: { kamppi: "Seuraava pysäkki: Kamppi", rautatientori: "Seuraava pysäkki: Rautatientori" },
          statusCheck: { kamppi: true },
          early: "Not yet, that's a different stop.",
          late: "",
          exitLabel: "STOP", exitHotspot: "stop-button",
          stayLabel: null,
          successFeedback: "Pysähtyy: the bus is stopping. The doors open."
        },
        cards: ["seuraava-pysakki", "pysahtyy"]
      },

      /* ---------- taxi route ---------- */
      "taxi-rank": {
        title: "Taxi rank", mapIcon: "🚕", next: "taxi-ride", door: "taxi",
        npc: { name: "Taxi driver", color: "taxi", lineFi: "Moi! Minne mennään?", lineEn: "Hi! Where are we going?" },
        tasks: [
          { prompt: "Tell the driver where to go.",
            choices: [
              { fi: "Rautatieasemalle, kiitos.", en: "To the railway station, please.", correct: true, hotspot: "driver", feedback: "Perfect. Destination plus please." },
              { fi: "Meneekö tämä juna Helsinkiin?", en: "Does this train go to Helsinki?", correct: false, feedback: "That's for trains!" },
              { fi: "Huomenta!", en: "Morning!", correct: false, feedback: "Greeting done; now the destination." }
            ],
            after: { npc: { name: "Taxi driver", color: "taxi", lineFi: "Selvä!", lineEn: "Got it!" } } },
          { prompt: "Ask the price before you go.",
            choices: [
              { fi: "Paljonko se maksaa?", en: "How much is it?", correct: true, feedback: "Smart. Always ask first." },
              { fi: "Voinko maksaa kortilla?", en: "Can I pay by card?", correct: false, feedback: "Good question, but price first." }
            ],
            after: { npc: { name: "Taxi driver", color: "taxi", lineFi: "Noin neljäkymmentä euroa.", lineEn: "About forty euros.", check: true } } }
        ],
        cont: { label: "Hop in →" },
        cards: ["minne-mennaan", "rautatieasemalle", "selva"]
      },

      "taxi-ride": {
        title: "Taxi ride", mapIcon: "🚕", next: "central", door: "taxi",
        introText: "Arrival.",
        tasks: [
          { prompt: "Pay.",
            choices: [
              { fi: "Voinko maksaa kortilla?", en: "Can I pay by card?", correct: true, feedback: "Good. Now tap the terminal." },
              { fi: "Paljonko se maksaa?", en: "How much is it?", correct: false, feedback: "You already know the price." }
            ],
            after: { npc: { name: "Taxi driver", color: "taxi", lineFi: "Totta kai!", lineEn: "Of course!" } } },
          { prompt: "Tap the terminal.", tap: true,
            choices: [
              { en: "Tap the card terminal", correct: true, hotspot: "card-terminal", feedback: "Beep! Paid." }
            ],
            after: {} }
        ],
        cont: { label: "Get out →" },
        cards: ["totta-kai"]
      },

      /* ---------- shared tail ---------- */
      central: {
        type: "central", title: "Helsinki Central", mapIcon: "🏛️", next: "kiosk",
        onEnter: { stamp: "helsinki" },
        textHtml: "You made it to Helsinki Central! You're thirsty. Find a kiosk.",
        cont: { label: "Find a kiosk →" },
        hotspots: ["lanterns"],
        lanterns: { hotspot: "lanterns", xp: 5, line: "The Lantern Carriers — Helsinki's famous station statues.", button: "✨ Tap the lanterns" },
        cards: ["rautatieasema"]
      },

      kiosk: {
        title: "Kiosk", mapIcon: "🛒", next: "checkout",
        tasks: [
          { prompt: "You want still water. Which bottle?",
            choices: [
              { fi: "hiilihapoton", correct: true, hotspot: "bottle-still", feedback: "Hiilihapoton = no bubbles." },
              { fi: "hiilihapollinen", correct: false, hotspot: "bottle-sparkling", feedback: "Look at the bubbles: that's sparkling." },
              { fi: "mehu", correct: false, hotspot: "bottle-juice", feedback: "Mehu is juice." }
            ],
            after: { tip: "♻️ See the pantti mark? It's a small deposit on the bottle. Return the empty bottle to any supermarket machine to get it back." } }
        ],
        cont: { label: "To the till →" },
        cards: ["vesi", "hiilihapoton", "hiilihapollinen", "mehu", "pantti"]
      },

      /* Checkout: the 4 turns exactly as in guide.html. */
      checkout: {
        title: "Checkout", mapIcon: "🧾", next: "postcard",
        npc: { name: "Cashier", color: "cloudberry", lineFi: "Moi!", lineEn: "Hi!" },
        tasks: [
          { prompt: "Say hello back.",
            choices: [
              { fi: "Moi!", correct: true, feedback: "Moi back is perfect." },
              { fi: "Hyvää yötä!", correct: false, feedback: "Hyvää yötä is good night. Try a hello." },
              { fi: "Kiitti!", correct: false, feedback: "Kiitti means thanks. You haven't bought anything yet! Say hello first." }
            ],
            after: { npc: { name: "Cashier", color: "cloudberry", lineFi: "Tarvitsetko kassin?", lineEn: "Do you need a bag?" } } },
          { prompt: "Answer the cashier.",
            choices: [
              { fi: "Ei, kiitos.", en: "(No, thanks.)", correct: true, feedback: "Both are right: bags cost extra in Finland, so 'Ei, kiitos' saves you a few cents." },
              { fi: "Kyllä, kiitos.", en: "(Yes, please.)", correct: true, feedback: "Both are right: bags cost extra in Finland, so 'Ei, kiitos' saves you a few cents." }
            ],
            after: { npc: { name: "Cashier", color: "cloudberry", lineFi: "Se on kaksi euroa.", lineEn: "That's two euros." } } },
          { prompt: "Pay.",
            choices: [
              { fi: "Voinko maksaa kortilla?", correct: true, feedback: "Card is normal everywhere. Tap and go." },
              { fi: "Paljonko se maksaa?", correct: false, feedback: "The cashier just told you the price: kaksi euroa = €2." }
            ],
            after: {} },
          { prompt: "Tap your card on the terminal.", tap: true,
            choices: [
              { en: "Tap the card terminal", correct: true, hotspot: "card-terminal", feedback: "Beep! Paid." }
            ],
            after: { npc: { name: "Cashier", color: "cloudberry", lineFi: "Kuitti?", lineEn: "Receipt?" } } },
          { prompt: "Answer the cashier.",
            choices: [
              { fi: "Ei, kiitos. Moi moi!", correct: true, feedback: "Done! You just bought water in Finnish." },
              { fi: "Huomenta!", correct: false, feedback: "Huomenta is good morning, a greeting for arriving. You're leaving: say no to the receipt, then bye." }
            ],
            after: { setState: "done", stamp: "purchase" } }
        ],
        cont: { label: "See your postcard →" },
        cards: ["tarvitsetko-kassin", "ei-kiitos", "kuitti", "voinko-maksaa"]
      },

      postcard: {
        type: "postcard", title: "Postcard", mapIcon: "💌",
        noteFi: "Terveisiä Suomesta!", noteEn: "Greetings from Finland!", noteCheck: true,
        buttons: {
          route: "Try another route",
          time: "Land at a different time",
          guide: "Text version",
          next: "Next: Unit 1 — Hei!",
          nextNote: "Coming soon"
        }
      }
    }
  };

  window.LUMOVO_JOURNEY = J;
})();
