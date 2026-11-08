/* 2T Doorstep Car Detailing - site data
   ------------------------------------------------------------------
   EDIT PRICES, SERVICES, AREAS AND SETTINGS HERE. Both pages (home and
   booking) read from this file, so a change here updates the whole site.
   Prices are in rupees, without commas.
   ------------------------------------------------------------------ */
window.SITE = {
  CONFIG: {
    // Country code + number, digits only. Example: "919876543210"
    WHATSAPP_NUMBER: "916235053966",
    BUSINESS_NAME: "2T Doorstep Car Detailing",

    // TODO: confirm with client what Small / Mid / Big mean
    SIZES: {
      small: { label: "Small", hint: "Hatchback" },
      mid:   { label: "Mid",   hint: "Sedan" },
      big:   { label: "Big",   hint: "SUV and 7-seater" }
    },

    // Open every day, 5 AM to 7 PM
    TIME_SLOTS: ["5:00 AM", "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
                 "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"],
    BOOK_DAYS_AHEAD: 60,      // how far ahead customers can book
    CLOSED_WEEKDAYS: [],      // open all 7 days. To close a day: 0 = Sunday ... 6 = Saturday
    MIN_LEAD_MINUTES: 90,     // same-day slots must be at least this far from now

    // Shared GPS locations outside this box are rejected as wrong (Wayanad and Gudalur, with a margin)
    SERVICE_BOUNDS: { minLat: 11.2, maxLat: 12.15, minLng: 75.55, maxLng: 76.85 },
    MAX_LOCATION_ERROR_M: 1000, // reject GPS readings less accurate than this
    GOOD_LOCATION_M: 30,        // stop refining once the reading is this accurate
  },

  // Detailing packs: price for each car size
  PACKS: [
    { name: "Basic Wash", icon: "i-drop", prices: { small: 799, mid: 799, big: 799 } },
    { name: "Interior Deep Clean", icon: "i-sparkle", prices: { small: 1999, mid: 2499, big: 2999 } },
    { name: "Exterior Detailing", icon: "i-bubbles", prices: { small: 1199, mid: 1499, big: 1799 } },
    { name: "Exterior Decon Wash", icon: "i-shield", prices: { small: 2499, mid: 2749, big: 2999 } },
    { name: "Paint Correction", icon: "i-gem", prices: { small: 6999, mid: 8499, big: 9999 } }
  ],

  // Coatings and specialist services. "from: true" = starting price.
  // "per" = priced per item (the booking form asks how many).
  SPECIALS: [
    { name: "Ceramic Coating", icon: "i-shield", price: 11999, from: true },
    { name: "Graphene Coating", icon: "i-hex", price: 17999, from: true },
    { name: "Headlight Restoration (Basic)", icon: "i-light", price: 999, per: "headlight" },
    { name: "Headlight Restoration with UV Coating", icon: "i-light", price: 1499, per: "headlight" }
  ],

  // Add-ons. "includedIn" = already part of that pack, so it cannot be added twice.
  ADDONS: [
    { name: "Cement removal", icon: "i-bricks", price: 999 },
    { name: "Car bug removal", icon: "i-bug", price: 999 },
    { name: "Water spot removal", icon: "i-spot", price: 999 },
    { name: "Paint transfer removal", icon: "i-brush", price: 999 },
    { name: "AC disinfection", icon: "i-snow", price: 1199, from: true, includedIn: "Interior Deep Clean" }
  ],

  // Places we serve. "aka" = other spellings people type.
  // Remember to update the list on the home page (index.html, section "areas") too.
  TOWNS: [
    { name: "Sultan Bathery", aka: ["bathery", "sulthan bathery", "sulthanbathery", "sultanbathery", "sbt", "s bathery"] },
    { name: "Kalpetta", aka: ["kalpatta", "kalpeta", "kalpetta town"] },
    { name: "Mananthavady", aka: ["mananthavadi", "manathavady", "mananthawady", "mndy"] },
    { name: "Meenangadi", aka: ["meenagadi", "minangadi"] },
    { name: "Panamaram", aka: ["panamarum", "panamarm"] },
    { name: "Ambalavayal", aka: ["ambalavayal", "ambalavyal", "ambalavayil"] },
    { name: "Vythiri", aka: ["vythri", "vythri", "vaithiri"] },
    { name: "Muttil", aka: ["muttil", "mutil"] },
    { name: "Kenichira", aka: ["kenichera", "kenichira", "keni"] },
    { name: "Pulpally", aka: ["pulpalli", "pulpalli", "pulpally town"] },
    { name: "Meppadi", aka: ["meppady", "mepadi"] },
    { name: "Padinjarathara", aka: ["padinjarethara", "padinjaratharra", "padinharathara"] },
    { name: "Kaniyambetta", aka: ["kaniyambeta", "kaniambetta"] },
    { name: "Thariyode", aka: ["thariyod", "tharyode"] },
    { name: "Kottathara", aka: ["kottathra", "kottathara"] },
    { name: "Noolpuzha", aka: ["noolpuza", "nulpuzha"] },
    { name: "Gudalur", aka: ["gudaloor", "gudalur tamil nadu", "gudalur tn", "gudalure"], state: "Tamil Nadu" }
  ],
  VILLAGES: [
    { name: "Kuppadi", aka: [] },
    { name: "Poothadi", aka: ["poothady"] },
    { name: "Nadavayal", aka: ["nadavayil"] },
    { name: "Vellamunda", aka: ["vellamuda"] },
    { name: "Thirunelly", aka: ["thirunelli", "tirunelly"] },
    { name: "Thavinjal", aka: ["thavinjhal"] },
    { name: "Edavaka", aka: ["edavakka"] },
    { name: "Periya", aka: [] },
    { name: "Thondernad", aka: ["thondarnad", "thondernadu"] },
    { name: "Padichira", aka: ["padichera"] },
    { name: "Irulam", aka: [] },
    { name: "Pozhuthana", aka: ["pozhuthena"] },
    { name: "Achooranam", aka: ["achooranum"] },
    { name: "Lakkidi", aka: ["lakidi"] },
    { name: "Kunnathidavaka", aka: ["kunnathidavakka"] },
    { name: "Vaduvanchal", aka: ["vaduvanjal"] }
  ]
};
