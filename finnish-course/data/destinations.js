// Status: DRAFT
// Destination data for the "Get into the city" step.
// Values may contain simple inline HTML (strong, em); lang="fi" on Finnish words.
// `check` lists field names that get a "check" badge (being verified before publishing).
window.LUMOVO_DESTINATIONS = [
  {
    id: "helsinki-central",
    name: "Helsinki Central",
    nameFi: "Helsingin päärautatieasema",
    taxiPhraseFi: "Rautatieasemalle, kiitos.",
    taxiPhraseEn: "To the railway station, please.",
    taxiPhraseSay: "RAU-tah-tee-ah-se-mal-le",
    options: [
      {
        mode: "train",
        labelFi: "juna",
        labelEn: "Train",
        recommended: true,
        time: "about 30 min",
        price: "single ticket, zones ABC, about €4–5",
        where: "follow the <strong>Juna / Trains</strong> signs down to the airport station under the terminal.",
        which: "both the <strong>I</strong> and <strong>P</strong> trains go to Helsinki Central. Take whichever comes first.",
        ticket: "buy in the <strong>HSL app</strong> or at the machine <em>before</em> you board. You can't buy one on the train.",
        getOff: "the end of the line, <strong>Helsinki</strong> (<em lang=\"fi\">Helsingin päärautatieasema</em>).",
        check: ["price", "which"]
      },
      {
        mode: "bus",
        labelFi: "bussi",
        labelEn: "Bus",
        recommended: false,
        time: "about 45–60 min",
        price: "same HSL ticket, zones ABC",
        where: "the bus stops outside arrivals; bus <strong>600</strong>",
        getOff: "<strong lang=\"fi\">Rautatientori</strong> (Railway Square), next to Helsinki Central.",
        goodFor: "late at night, or when your hotel is on the bus route.",
        check: ["time", "price", "where"]
      },
      {
        mode: "taxi",
        labelFi: "taksi",
        labelEn: "Taxi",
        recommended: false,
        time: "about 30 min",
        price: "about €40–60",
        where: "the official taxi rank outside arrivals, or a ride app.",
        tip: "ask for the price or a fixed fare before you go. Card payment is normal.",
        check: ["price"]
      }
    ]
  }
];
