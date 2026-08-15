/* MowerFix AI V1.1 database
   Model names were checked against manufacturer product/support pages during the V1.1 build.
   Part records are only added when a part number and/or price has been verified from a source.
*/

const MODEL_GROUPS = [
  {brand:'Husqvarna', navigation:'wire', connectivity:'Automower Connect varies', models:[
    'Automower 305','Automower 315 Mark II','Automower 405X','Automower 415X','Automower 305E NERA'
  ]},
  {brand:'Worx', navigation:'wire', connectivity:'Wi-Fi / app varies', models:[
    'Landroid S300 (WR130E)','Landroid S400 (WR141E)','Landroid M500 Plus (WR165E)'
  ]},
  {brand:'Gardena', navigation:'wire', connectivity:'Bluetooth / smart app varies', models:[
    'SILENO minimo 250','smart SILENO city 500','smart SILENO life 1000'
  ]},
  {brand:'Flymo', navigation:'wire', connectivity:'Bluetooth / app varies', models:[
    'EasiLife 350','EasiLife 500'
  ]},
  {brand:'Segway Navimow', navigation:'wire-free', connectivity:'Bluetooth / Wi-Fi / cellular varies', models:[
    'i105E','i108E'
  ]}
];

const MODELS = MODEL_GROUPS.flatMap(g => g.models.map(model => ({model, brand:g.brand, navigation:g.navigation, connectivity:g.connectivity})));
const BRANDS = [...new Set(MODELS.map(x=>x.brand))];

const Q = {
  error: {id:'error', text:'Does the mower show an error code or warning?', options:['Yes','No','Not sure']},
  power: {id:'power', text:'Does the mower show any sign of power (display, LEDs or sounds)?', options:['Yes','No','Not sure']},
  stationPower: {id:'stationPower', text:'Does the charging station appear to have power?', options:['Yes','No','Not sure']},
  contacts: {id:'contacts', text:'Are the charging contacts clean and making contact?', options:['Yes','No','Not sure']},
  dock: {id:'dock', text:'Does the mower reach the charging station but fail to dock correctly?', options:['Yes','No','Not sure']},
  obstruction: {id:'obstruction', text:'Is there visible grass, debris or an object blocking the mower?', options:['Yes','No','Not sure']},
  oneWheel: {id:'oneWheel', text:'Is only one wheel affected?', options:['Yes','No','Not sure']},
  blade: {id:'blade', text:'Are the cutting blades visibly worn, damaged or obstructed?', options:['Yes','No','Not sure']},
  noise: {id:'noise', text:'Is there an unusual noise or vibration from the affected mechanism?', options:['Yes','No','Not sure']},
  schedule: {id:'schedule', text:'Is the mowing schedule enabled and within its allowed operating time?', options:['Yes','No','Not sure']},
  boundary: {id:'boundary', text:'Does the mower or station report a boundary/loop/signal problem?', options:['Yes','No','Not sure']},
  recentWork: {id:'recentWork', text:'Has the lawn, boundary installation or garden layout changed recently?', options:['Yes','No','Not sure']},
  batteryAge: {id:'batteryAge', text:'Has the battery performance noticeably declined compared with before?', options:['Yes','No','Not sure']},
  weather: {id:'weather', text:'Is the problem happening during rain, frost or very cold/wet conditions?', options:['Yes','No','Not sure']},
  app: {id:'app', text:'Can the mower connect to its app normally?', options:['Yes','No','Not sure']},
  signal: {id:'signal', text:'Is the problem worse in a location with poor GPS/RTK/Wi-Fi/cellular coverage?', options:['Yes','No','Not sure']},
  update: {id:'update', text:'Did the problem begin after a firmware or app update?', options:['Yes','No','Not sure']},
  lifted: {id:'lifted', text:'Was the mower recently lifted, tilted or handled while running?', options:['Yes','No','Not sure']},
  flat: {id:'flat', text:'Does the problem occur on flat ground as well as slopes?', options:['Yes','No','Not sure']},
  clean: {id:'clean', text:'Have you safely cleaned the affected area and checked again?', options:['Yes','No','Not sure']}
};

const COMMON = {
  power:['Check the mower is switched on and adequately charged.','Record any exact warning or error code before resetting anything.'],
  isolate:['Switch off the mower and isolate it before inspecting moving, electrical or cutting components.'],
  visual:['Inspect accessible areas for obvious debris, damage, loose connectors or trapped grass.'],
  station:['Confirm the station has power and inspect accessible cables/connectors for visible damage.'],
  contacts:['Inspect and clean accessible charging contacts using a method suitable for the mower; do not work on live electrical connections.'],
  battery:['Compare runtime with its previous normal performance and check whether the mower reports a battery warning.'],
  app:['Check the app connection, phone Bluetooth/Wi-Fi/mobile data and mower connectivity status.'],
  wire:['Inspect visible boundary/guide wire and connectors for disturbance or damage. Use the manufacturer-approved loop test method where available.'],
  blade:['With the mower isolated, inspect the cutting system for wear, damage and debris without touching sharp edges.']
};

function fault(name, questions, base, rules, hazards=[]) {
  return {name, questions, base, rules, hazards};
}

const FAULTS = {
  wont_start: fault("Won't start", [Q.power,Q.error],
    {cause:'Power, battery, safety-switch or control-system issue',confidence:58,alternatives:['Battery discharged or degraded','Power/safety switch or cover sensor','Control electronics'],tests:[...COMMON.power,...COMMON.visual],difficulty:2,time:'15–60 minutes'},
    [{when:{power:'No'},cause:'Power supply, battery or power-switch issue',confidence:78},{when:{error:'Yes'},cause:'Error-code related fault',confidence:84}], ['electrical']),
  wont_charge: fault("Won't charge", [Q.stationPower,Q.contacts,Q.error],
    {cause:'Charging connection, station supply or battery issue',confidence:62,alternatives:['Charging station supply','Dirty/damaged contacts','Battery degradation'],tests:[...COMMON.station,...COMMON.contacts,...COMMON.battery],difficulty:2,time:'15–60 minutes'},
    [{when:{stationPower:'No'},cause:'Charging-station power supply issue',confidence:86},{when:{contacts:'No'},cause:'Poor charging-contact connection',confidence:82},{when:{error:'Yes'},cause:'Charging-related error condition',confidence:80}], ['electrical','charging']),
  wont_leave_station: fault("Won't leave charging station", [Q.schedule,Q.stationPower,Q.dock,Q.error],
    {cause:'Schedule, charging state, docking or safety condition preventing departure',confidence:61,alternatives:['Low battery/charging state','Schedule or operating mode','Docking/sensor condition'],tests:[...COMMON.station,'Confirm the schedule and operating mode are appropriate for the current time.','Check for obstructions around the station.'],difficulty:1,time:'10–30 minutes'},
    [{when:{schedule:'No'},cause:'Schedule or operating-mode setting',confidence:82},{when:{dock:'Yes'},cause:'Docking/alignment or charging-contact issue',confidence:78},{when:{error:'Yes'},cause:'Error-code related departure lockout',confidence:83}], ['charging']),
  stops_mowing: fault('Stops while mowing', [Q.error,Q.obstruction,Q.batteryAge],
    {cause:'Obstruction, sensor, battery or drive-system issue',confidence:64,alternatives:['Grass/debris blockage','Battery condition','Drive or sensor fault'],tests:[...COMMON.isolate,...COMMON.visual,...COMMON.battery],difficulty:2,time:'20–60 minutes'},
    [{when:{obstruction:'Yes'},cause:'Obstruction or debris is a leading possibility',confidence:82},{when:{batteryAge:'Yes'},cause:'Battery condition may be limiting runtime',confidence:76},{when:{error:'Yes'},cause:'Displayed error should be investigated first',confidence:84}], ['mechanical','electrical']),
  wheel_not_turning: fault('Wheel not turning', [Q.oneWheel,Q.obstruction,Q.noise],
    {cause:'Wheel obstruction or drive-system fault',confidence:70,alternatives:['Debris around wheel','Drive motor/gearbox','Wheel mounting or mechanical damage'],tests:[...COMMON.isolate,...COMMON.visual,'Check that the affected wheel rotates freely only when the mower is safely isolated.'],difficulty:3,time:'30–90 minutes'},
    [{when:{obstruction:'Yes'},cause:'Wheel obstruction/debris',confidence:86},{when:{noise:'Yes'},cause:'Drive motor/gearbox may be affected',confidence:78}], ['mechanical']),
  both_wheels: fault('Both wheels not turning', [Q.power,Q.error,Q.obstruction],
    {cause:'Drive-system, power or control fault',confidence:65,alternatives:['Control/system fault','Low power/battery issue','Obstruction affecting both drives'],tests:[...COMMON.power,...COMMON.isolate,...COMMON.visual],difficulty:3,time:'30–120 minutes'},
    [{when:{power:'No'},cause:'Power/battery issue',confidence:78},{when:{error:'Yes'},cause:'Drive/control error condition',confidence:82}], ['mechanical','electrical']),
  blade_not_turning: fault('Blade not turning', [Q.power,Q.blade,Q.noise,Q.error],
    {cause:'Cutting system obstruction, blade condition or cutting-motor fault',confidence:70,alternatives:['Debris under cutting deck','Cutting motor fault','Blade/disc damage'],tests:[...COMMON.isolate,...COMMON.blade,...COMMON.visual],difficulty:3,time:'20–90 minutes'},
    [{when:{blade:'Yes'},cause:'Blade/disc obstruction or damage',confidence:82},{when:{noise:'Yes'},cause:'Cutting motor/bearing issue is possible',confidence:78},{when:{error:'Yes'},cause:'Cutting-system error condition',confidence:84}], ['blade','motor']),
  poor_cutting: fault('Poor or uneven cutting', [Q.blade,Q.obstruction,Q.noise],
    {cause:'Worn blades, cutting obstruction or mowing-condition issue',confidence:76,alternatives:['Worn/damaged blades','Debris around cutting system','Cutting height or mowing schedule issue'],tests:[...COMMON.isolate,...COMMON.blade,'Check cutting height and whether the mower is mowing frequently enough for the lawn.'],difficulty:1,time:'15–45 minutes'},
    [{when:{blade:'Yes'},cause:'Worn or damaged blades are likely',confidence:90},{when:{obstruction:'Yes'},cause:'Cutting-system obstruction',confidence:83}], ['blade']),
  blade_noise: fault('Blade/cutting system noisy or vibrating', [Q.blade,Q.noise,Q.obstruction],
    {cause:'Blade/disc imbalance, damage or debris',confidence:74,alternatives:['Damaged blade','Debris under disc','Cutting disc/bearing issue'],tests:[...COMMON.isolate,...COMMON.blade,'Do not continue operating if vibration is severe or components appear damaged.'],difficulty:2,time:'20–60 minutes'},
    [{when:{blade:'Yes'},cause:'Blade/disc condition issue',confidence:84},{when:{obstruction:'Yes'},cause:'Debris around cutting system',confidence:82}], ['blade','motor']),
  cutting_blocked: fault('Cutting system blocked', [Q.obstruction,Q.blade],
    {cause:'Grass, cable, object or debris has obstructed the cutting system',confidence:86,alternatives:['Blade damage','Cutting disc issue','Wet/long grass'],tests:[...COMMON.isolate,...COMMON.blade,'Check whether long/wet grass has wrapped around the cutting system.'],difficulty:1,time:'10–30 minutes'},
    [{when:{obstruction:'Yes'},cause:'Cutting-system obstruction',confidence:94},{when:{blade:'Yes'},cause:'Blade damage or wear',confidence:84}], ['blade','mechanical']),
  boundary_fault: fault('Boundary wire / loop fault', [Q.boundary,Q.recentWork],
    {cause:'Boundary loop, connector or signal issue',confidence:72,alternatives:['Broken/disturbed wire','Loose connector','Station loop-signal issue'],tests:[COMMON.wire,'Check whether recent digging, edging, aeration or landscaping may have disturbed the wire.'],difficulty:3,time:'30–120 minutes'},
    [{when:{recentWork:'Yes'},cause:'Boundary wire disturbance after garden work',confidence:86},{when:{boundary:'Yes'},cause:'Boundary loop/signal issue',confidence:82}], ['electrical']),
  outside_area: fault('Mower reports outside working area', [Q.boundary,Q.recentWork],
    {cause:'Boundary/positioning signal or installation issue',confidence:70,alternatives:['Boundary wire disturbance','Incorrect installation geometry','Signal interference or positioning issue'],tests:[COMMON.wire,'Check the reported location and whether the mower is actually outside the defined working area.'],difficulty:2,time:'20–90 minutes'},
    [{when:{recentWork:'Yes'},cause:'Recent boundary/layout change is a strong possibility',confidence:83},{when:{boundary:'Yes'},cause:'Boundary signal issue',confidence:80}], ['electrical']),
  station_fault: fault('Charging station fault / no station signal', [Q.stationPower,Q.boundary,Q.error],
    {cause:'Station power, loop/signal or connection issue',confidence:65,alternatives:['Power supply','Station wiring','Boundary/loop signal','Station electronics'],tests:[...COMMON.station,...COMMON.wire],difficulty:3,time:'20–90 minutes'},
    [{when:{stationPower:'No'},cause:'Station power supply issue',confidence:88},{when:{boundary:'Yes'},cause:'Loop/signal issue',confidence:82}], ['electrical','charging']),
  docking_problem: fault('Mower cannot dock correctly', [Q.dock,Q.contacts,Q.obstruction],
    {cause:'Dock alignment, charging contacts or station approach issue',confidence:69,alternatives:['Station alignment','Dirty contacts','Obstacle near station'],tests:[...COMMON.station,...COMMON.contacts,...COMMON.visual],difficulty:2,time:'15–60 minutes'},
    [{when:{contacts:'No'},cause:'Charging contacts are a likely contributor',confidence:83},{when:{obstruction:'Yes'},cause:'Station approach obstruction',confidence:80}], ['charging','electrical']),
  battery_drains: fault('Battery drains unusually quickly', [Q.batteryAge,Q.obstruction,Q.error],
    {cause:'Battery degradation, excessive load or operating-condition issue',confidence:68,alternatives:['Battery ageing','Long grass/slope/load','Cold weather','Drive/cutting resistance'],tests:[COMMON.battery,...COMMON.visual,'Compare runtime on a similar lawn and weather condition.'],difficulty:2,time:'20–60 minutes'},
    [{when:{batteryAge:'Yes'},cause:'Battery degradation is a leading possibility',confidence:84},{when:{obstruction:'Yes'},cause:'Mechanical resistance may increase power consumption',confidence:78}], ['battery','electrical']),
  short_mow_time: fault('Mowing time is much shorter than normal', [Q.batteryAge,Q.weather,Q.obstruction],
    {cause:'Battery capacity, temperature or mechanical load issue',confidence:70,alternatives:['Battery ageing','Cold conditions','Long/wet grass or mechanical drag'],tests:[COMMON.battery,...COMMON.visual,'Compare with the mower specification and previous normal runtime rather than a single cycle.'],difficulty:2,time:'20–60 minutes'},
    [{when:{batteryAge:'Yes'},cause:'Reduced battery capacity is possible',confidence:84},{when:{weather:'Yes'},cause:'Temperature/weather may be reducing runtime',confidence:74}], ['battery']),
  weather_lockout: fault('Rain/frost/weather lockout', [Q.weather,Q.schedule],
    {cause:'Weather protection or schedule condition is preventing mowing',confidence:78,alternatives:['Rain/frost sensor or setting','Weather-based scheduling','Cold/unsafe conditions'],tests:['Check the mower’s weather/frost setting and schedule.','Allow conditions to return to the normal operating range before testing.'],difficulty:1,time:'5–20 minutes'},
    [{when:{weather:'Yes'},cause:'Weather-related operating lockout',confidence:90},{when:{schedule:'No'},cause:'Schedule/operating setting',confidence:78}], ['weather']),
  lift_sensor: fault('Lift sensor / mower lifted warning', [Q.lifted,Q.error],
    {cause:'Lift sensor triggered or sensor/control fault',confidence:76,alternatives:['Mower was physically lifted','Sensor contamination/damage','Sensor/control electronics'],tests:[...COMMON.isolate,'Place the mower back on a stable surface and follow its normal reset procedure.','If the warning repeats without lifting, further sensor diagnosis may be needed.'],difficulty:2,time:'10–45 minutes'},
    [{when:{lifted:'Yes'},cause:'A recent lift/handling event may explain the warning',confidence:90},{when:{error:'Yes'},cause:'Persistent lift-sensor fault',confidence:82}], ['electrical']),
  collision_sensor: fault('Collision / obstacle sensor issue', [Q.obstruction,Q.error],
    {cause:'Obstacle, bumper/sensor condition or control fault',confidence:67,alternatives:['Physical obstacle','Dirty/damaged bumper or sensor','Sensor wiring/control issue'],tests:[COMMON.isolate,...COMMON.visual,'Check the mower body and bumper for damage or sticking.'],difficulty:2,time:'15–60 minutes'},
    [{when:{obstruction:'Yes'},cause:'Physical obstacle or debris',confidence:82},{when:{error:'Yes'},cause:'Sensor/control error',confidence:80}], ['mechanical','electrical']),
  tilt_sensor: fault('Tilt sensor / tilt warning', [Q.lifted,Q.flat,Q.error],
    {cause:'Tilt condition, uneven terrain or sensor/control issue',confidence:66,alternatives:['Mower is on a steep/uneven surface','Lift/tilt event','Tilt sensor fault'],tests:[COMMON.isolate,'Place the mower on level ground and check whether the warning persists.','If repeated on level ground, record the exact warning code.'],difficulty:2,time:'10–45 minutes'},
    [{when:{flat:'Yes'},cause:'Sensor/control issue is more plausible if it occurs on flat ground',confidence:78},{when:{lifted:'Yes'},cause:'Recent handling may have triggered the warning',confidence:84}], ['mechanical','electrical']),
  gps_connectivity: fault('GPS / RTK / connectivity problem', [Q.signal,Q.app,Q.update],
    {cause:'Signal, network/app connection or positioning-module issue',confidence:64,alternatives:['Poor GPS/RTK environment','Wi-Fi/cellular/app connection','Positioning module issue','Software issue'],tests:[COMMON.app,'Move to an open area and compare signal behaviour.','Check the app/device connection status.'],difficulty:2,time:'15–60 minutes'},
    [{when:{signal:'Yes'},cause:'Signal environment is a likely contributor',confidence:82},{when:{app:'No'},cause:'App/network connectivity issue',confidence:80},{when:{update:'Yes'},cause:'Software/update-related issue is possible',confidence:74}], ['connectivity']),
  app_pairing: fault('Cannot pair/connect to app', [Q.app,Q.update],
    {cause:'Bluetooth/Wi-Fi/cellular pairing or account/app issue',confidence:66,alternatives:['Phone permissions','Network conditions','Mower/app state','Software version'],tests:[COMMON.app,'Check phone permissions and Bluetooth/Wi-Fi as applicable.','Restart the mower/app only using normal manufacturer procedures.'],difficulty:1,time:'10–30 minutes'},
    [{when:{update:'Yes'},cause:'Recent software change may be relevant',confidence:76},{when:{app:'No'},cause:'Connection/pairing issue',confidence:80}], ['connectivity']),
  firmware_update: fault('Firmware/software update problem', [Q.update,Q.app,Q.error],
    {cause:'Software update, compatibility or connectivity issue',confidence:60,alternatives:['Interrupted update','Connectivity issue','Software compatibility/state'],tests:[COMMON.app,'Record current software version and any displayed error.','Use only the manufacturer-supported update process.'],difficulty:2,time:'15–60 minutes'},
    [{when:{update:'Yes'},cause:'Recent update may be associated with the issue',confidence:78},{when:{error:'Yes'},cause:'Update-related error condition',confidence:80}], ['connectivity','electrical']),
  schedule_fault: fault('Schedule not working', [Q.schedule,Q.weather,Q.error],
    {cause:'Schedule, operating mode, weather condition or error state',confidence:72,alternatives:['Schedule disabled/incorrect','Weather/frost lockout','Persistent error condition'],tests:['Check date/time and schedule settings.','Check whether a manual mow command works.','Check for weather/frost restrictions and error messages.'],difficulty:1,time:'5–30 minutes'},
    [{when:{schedule:'No'},cause:'Schedule or operating-mode setting',confidence:88},{when:{weather:'Yes'},cause:'Weather-related restriction',confidence:78},{when:{error:'Yes'},cause:'Error condition preventing scheduled operation',confidence:82}], ['weather']),
  error_code: fault('Error code / warning message', [Q.error],
    {cause:'The exact error code needs to be identified before a model-specific conclusion can be made',confidence:45,alternatives:['Sensor fault','Motor/drive fault','Battery/charging fault','Boundary/positioning fault','Software/connectivity fault'],tests:['Record the exact code/message and when it appears.','Search the exact code in MowerFix AI.','Use the model-specific owner/support information for the code.'],difficulty:2,time:'10–60 minutes'},
    [{when:{error:'Yes'},cause:'Error code requires exact-code lookup',confidence:60}], ['varies'])
};

// Only verified records are shown as verified. Prices are only stored where an official source currently provides a price.
const PARTS = [
  {
    "id": "hus-endurance",
    "brand": "Husqvarna",
    "partName": "Automower Endurance Blades, 6 pack",
    "partNumber": "595 08 44-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/accessories-category/robotic-lawn-mower-blades/endurance-blades/",
    "verified": "2026-08-15",
    "compatibility": "Manufacturer lists this blade for Automower 305, 315 Mark II, 405X, 415X and 305E NERA.",
    "tags": [
      "blade",
      "cutting"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-classic-9",
    "brand": "Husqvarna",
    "partName": "Classic Blades, 9 pack",
    "partNumber": "577 86 46-03",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/robotic-lawn-mower-blades/classic-blades/?article=577864603",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna states the Classic blade fits Automower robotic mowers; model fit should be checked by exact mower variant.",
    "tags": [
      "blade",
      "cutting"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-classic-45",
    "brand": "Husqvarna",
    "partName": "Classic Blades, 45 pack",
    "partNumber": "577 60 65-05",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/robotic-lawn-mower-blades/classic-blades/?article=577606505",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna lists this variant across Automower models including 305, 315 Mark II, 405X and 415X; verify exact variant.",
    "tags": [
      "blade",
      "cutting"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-hss-45",
    "brand": "Husqvarna",
    "partName": "Automower Enhance HSS Blades, 45 pack",
    "partNumber": "599 80 53-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/accessories-category/robotic-lawn-mower-blades/automower-enhance-hss-blades/",
    "verified": "2026-08-15",
    "compatibility": "Manufacturer lists this HSS blade for the priority Automower models in the database.",
    "tags": [
      "blade",
      "cutting"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-hss-300",
    "brand": "Husqvarna",
    "partName": "Automower Enhance HSS Blades, 300 pack",
    "partNumber": "599 80 53-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/accessories-category/robotic-lawn-mower-blades/automower-enhance-hss-blades/",
    "verified": "2026-08-15",
    "compatibility": "Manufacturer lists this HSS blade for the priority Automower models in the database.",
    "tags": [
      "blade",
      "cutting"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-power-0",
    "brand": "Husqvarna",
    "partName": "Power supply unit 1.3A UK, IE",
    "partNumber": "529 53 26-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/power-supply-unit/",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna official catalogue; the selected power-supply variant must be matched to the exact mower/installation before ordering.",
    "tags": [
      "electrical",
      "charging"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-power-1",
    "brand": "Husqvarna",
    "partName": "Power supply unit kit 1.0A EU",
    "partNumber": "587 79 70-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/power-supply-unit/",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna official catalogue; the selected power-supply variant must be matched to the exact mower/installation before ordering.",
    "tags": [
      "electrical",
      "charging"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-power-2",
    "brand": "Husqvarna",
    "partName": "Power supply unit 2.2A UK, IE",
    "partNumber": "599 62 85-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/power-supply-unit/",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna official catalogue; the selected power-supply variant must be matched to the exact mower/installation before ordering.",
    "tags": [
      "electrical",
      "charging"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-power-3",
    "brand": "Husqvarna",
    "partName": "Power supply unit 4.2A EU",
    "partNumber": "599 66 26-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/power-supply-unit/",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna official catalogue; the selected power-supply variant must be matched to the exact mower/installation before ordering.",
    "tags": [
      "electrical",
      "charging"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-power-4",
    "brand": "Husqvarna",
    "partName": "Power supply unit 4.2A UK, IE",
    "partNumber": "599 66 26-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/power-supply-unit/",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna official catalogue; the selected power-supply variant must be matched to the exact mower/installation before ordering.",
    "tags": [
      "electrical",
      "charging"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-power-5",
    "brand": "Husqvarna",
    "partName": "Power supply unit 7.0A EU",
    "partNumber": "599 66 27-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/power-supply-unit/",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna official catalogue; the selected power-supply variant must be matched to the exact mower/installation before ordering.",
    "tags": [
      "electrical",
      "charging"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-power-6",
    "brand": "Husqvarna",
    "partName": "Power supply unit 7.0A UK, IE",
    "partNumber": "599 66 27-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official product page",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/power-supply-unit/",
    "verified": "2026-08-15",
    "compatibility": "Husqvarna official catalogue; the selected power-supply variant must be matched to the exact mower/installation before ordering.",
    "tags": [
      "electrical",
      "charging"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-0",
    "brand": "Husqvarna",
    "partName": "BATTERY Li-Ion 18V",
    "partNumber": "593 24 72-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-1",
    "brand": "Husqvarna",
    "partName": "Battery kit Type 14 18.0 V/5.0 Ah",
    "partNumber": "529 60 68-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-2",
    "brand": "Husqvarna",
    "partName": "Battery Type 19 18.0 V/8.4 Ah",
    "partNumber": "531 29 37-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-3",
    "brand": "Husqvarna",
    "partName": "Battery Type 20 18.0 V/8.4 Ah",
    "partNumber": "534 19 94-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-4",
    "brand": "Husqvarna",
    "partName": "Battery 18.0 V/2.2 Ah",
    "partNumber": "535 12 09-03",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-5",
    "brand": "Husqvarna",
    "partName": "Battery kit Type 20 18.0 V/8.4 Ah",
    "partNumber": "536 89 60-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-6",
    "brand": "Husqvarna",
    "partName": "BATTERY Type 18, Premium 5S2P",
    "partNumber": "536 89 82-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-7",
    "brand": "Husqvarna",
    "partName": "Battery Type 6 18.5 V/2.1 Ah",
    "partNumber": "589 58 61-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-8",
    "brand": "Husqvarna",
    "partName": "Battery Type 4 18.5 V/2.1 Ah",
    "partNumber": "589 58 62-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-9",
    "brand": "Husqvarna",
    "partName": "BATTERY Type 12 Li-Ion 18V 4.0 Ah",
    "partNumber": "593 24 73-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-10",
    "brand": "Husqvarna",
    "partName": "BATTERY Type 14 5S2P Basic 18V 5.2Ah",
    "partNumber": "593 24 74-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-11",
    "brand": "Husqvarna",
    "partName": "Battery Type 31",
    "partNumber": "593 78 55-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-battery-12",
    "brand": "Husqvarna",
    "partName": "Battery 21.6 V/5 Ah",
    "partNumber": "597 21 32-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official battery catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/robotic-lawn-mower-battery/?article=593247201",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna battery catalogue record; exact battery variant must be matched to the mower article number.",
    "tags": [
      "battery",
      "electrical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-front-0",
    "brand": "Husqvarna",
    "partName": "Wheel, front",
    "partNumber": "522 66 45-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official front wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/front-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna front-wheel variant. The official catalogue provides model-fit data; confirm the exact variant against the mower article number.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-front-1",
    "brand": "Husqvarna",
    "partName": "Wheel, front",
    "partNumber": "536 11 97-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official front wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/front-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna front-wheel variant. The official catalogue provides model-fit data; confirm the exact variant against the mower article number.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-front-2",
    "brand": "Husqvarna",
    "partName": "Wheel, front",
    "partNumber": "574 44 98-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official front wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/front-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna front-wheel variant. The official catalogue provides model-fit data; confirm the exact variant against the mower article number.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-front-3",
    "brand": "Husqvarna",
    "partName": "Wheel, front",
    "partNumber": "581 62 14-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official front wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/front-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna front-wheel variant. The official catalogue provides model-fit data; confirm the exact variant against the mower article number.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-front-4",
    "brand": "Husqvarna",
    "partName": "Wheel, front",
    "partNumber": "587 65 19-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official front wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/front-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna front-wheel variant. The official catalogue provides model-fit data; confirm the exact variant against the mower article number.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-front-5",
    "brand": "Husqvarna",
    "partName": "Front Wheel",
    "partNumber": "589 30 08-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official front wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/front-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna front-wheel variant. The official catalogue provides model-fit data; confirm the exact variant against the mower article number.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-0",
    "brand": "Husqvarna",
    "partName": "WHEEL assy, rear",
    "partNumber": "538 81 65-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-1",
    "brand": "Husqvarna",
    "partName": "Wheel, rear",
    "partNumber": "544 90 58-04",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-2",
    "brand": "Husqvarna",
    "partName": "Wheel",
    "partNumber": "574 46 51-04",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-3",
    "brand": "Husqvarna",
    "partName": "Wheel, rear",
    "partNumber": "578 27 51-03",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-4",
    "brand": "Husqvarna",
    "partName": "WHEEL ASSY Complete grey",
    "partNumber": "582 28 02-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-5",
    "brand": "Husqvarna",
    "partName": "WHEEL ASSY Complete Orange 250mm",
    "partNumber": "582 28 02-03",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-6",
    "brand": "Husqvarna",
    "partName": "Rear wheel kit",
    "partNumber": "583 85 39-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-7",
    "brand": "Husqvarna",
    "partName": "Wheel, rear",
    "partNumber": "590 21 73-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-rear-8",
    "brand": "Husqvarna",
    "partName": "Wheel, rear",
    "partNumber": "590 21 73-03",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official rear wheel catalogue",
    "sourceUrl": "https://www.husqvarna.com/uk/maintenance-and-spare-parts/rear-wheel-kit/",
    "verified": "2026-08-15",
    "compatibility": "Genuine Husqvarna rear-wheel variant. Confirm the exact mower variant before ordering.",
    "tags": [
      "wheel",
      "mechanical"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-coupler-0",
    "brand": "Husqvarna",
    "partName": "Automower Coupler, 1 pc",
    "partNumber": "501 98 02-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official coupler product page",
    "sourceUrl": "https://www.husqvarna.com/uk/accessories-category/robotic-lawn-mower-installation/automower-coupler/",
    "verified": "2026-08-15",
    "compatibility": "Genuine boundary/guide-wire repair coupler. Official page lists compatibility including priority Automower models.",
    "tags": [
      "boundary",
      "wire"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-coupler-1",
    "brand": "Husqvarna",
    "partName": "Automower Coupler, 5 pcs",
    "partNumber": "577 86 47-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official coupler product page",
    "sourceUrl": "https://www.husqvarna.com/uk/accessories-category/robotic-lawn-mower-installation/automower-coupler/",
    "verified": "2026-08-15",
    "compatibility": "Genuine boundary/guide-wire repair coupler. Official page lists compatibility including priority Automower models.",
    "tags": [
      "boundary",
      "wire"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-coupler-2",
    "brand": "Husqvarna",
    "partName": "Automower Coupler, 5 pcs",
    "partNumber": "536 08 54-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official coupler product page",
    "sourceUrl": "https://www.husqvarna.com/uk/accessories-category/robotic-lawn-mower-installation/automower-coupler-mp-147418150/",
    "verified": "2026-08-15",
    "compatibility": "Genuine boundary/guide-wire repair coupler. Official page lists compatibility including priority Automower models.",
    "tags": [
      "boundary",
      "wire"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-kit-0",
    "brand": "Husqvarna",
    "partName": "Installation kit, 150 m loop wire",
    "partNumber": "967 97 21-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official installation kit page",
    "sourceUrl": "https://www.husqvarna.com/uk/robotic-lawn-mower-installation/automower-installation-kit/",
    "verified": "2026-08-15",
    "compatibility": "Official installation-kit variant; page lists compatibility including Automower 305, 315 Mark II, 405X and 415X.",
    "tags": [
      "boundary",
      "wire",
      "installation"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-kit-1",
    "brand": "Husqvarna",
    "partName": "Installation kit, 250 m loop wire",
    "partNumber": "967 97 22-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official installation kit page",
    "sourceUrl": "https://www.husqvarna.com/uk/robotic-lawn-mower-installation/automower-installation-kit/",
    "verified": "2026-08-15",
    "compatibility": "Official installation-kit variant; page lists compatibility including Automower 305, 315 Mark II, 405X and 415X.",
    "tags": [
      "boundary",
      "wire",
      "installation"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-kit-2",
    "brand": "Husqvarna",
    "partName": "Installation kit, 400 m loop wire",
    "partNumber": "967 97 23-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official installation kit page",
    "sourceUrl": "https://www.husqvarna.com/uk/robotic-lawn-mower-installation/automower-installation-kit/",
    "verified": "2026-08-15",
    "compatibility": "Official installation-kit variant; page lists compatibility including Automower 305, 315 Mark II, 405X and 415X.",
    "tags": [
      "boundary",
      "wire",
      "installation"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X",
      "Automower 305E NERA"
    ]
  },
  {
    "id": "hus-hanger-0",
    "brand": "Husqvarna",
    "partName": "Automower Wall Hanger, large model variant",
    "partNumber": "585 01 97-02",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official wall hanger page",
    "sourceUrl": "https://www.husqvarna.com/uk/storage/automower-wall-hanger/",
    "verified": "2026-08-15",
    "compatibility": "Official accessory record. Use only as storage/installation accessory, not as a repair part.",
    "tags": [
      "accessory"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X"
    ]
  },
  {
    "id": "hus-hanger-1",
    "brand": "Husqvarna",
    "partName": "Automower Wall Hanger, 310/315",
    "partNumber": "587 22 40-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official wall hanger page",
    "sourceUrl": "https://www.husqvarna.com/uk/storage/automower-wall-hanger/",
    "verified": "2026-08-15",
    "compatibility": "Official accessory record. Use only as storage/installation accessory, not as a repair part.",
    "tags": [
      "accessory"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X"
    ]
  },
  {
    "id": "hus-hanger-2",
    "brand": "Husqvarna",
    "partName": "Automower Wall Hanger, 305/310 Mark II/315 Mark II/405X/415X",
    "partNumber": "597 70 36-01",
    "price": null,
    "currency": "GBP",
    "source": "Husqvarna UK official wall hanger page",
    "sourceUrl": "https://www.husqvarna.com/uk/storage/automower-wall-hanger/",
    "verified": "2026-08-15",
    "compatibility": "Official accessory record. Use only as storage/installation accessory, not as a repair part.",
    "tags": [
      "accessory"
    ],
    "models": [
      "Automower 305",
      "Automower 315 Mark II",
      "Automower 405X",
      "Automower 415X"
    ]
  },
  {
    "id": "gardena-0",
    "brand": "Gardena",
    "partName": "Charging Tower",
    "partNumber": "00054-74.590.01",
    "price": null,
    "currency": "EUR",
    "source": "GARDENA official spare-parts/product page",
    "sourceUrl": "https://www.gardena.com/int/products/lawn-care/robotic-lawnmowers/robotic-mower-sileno-city-600-m/970450603.html",
    "verified": "2026-08-15",
    "compatibility": "Part number and model/application are shown in the official GARDENA spare-parts data.",
    "tags": [
      "charging"
    ],
    "models": [
      "smart SILENO city 500",
      "smart SILENO life 1000"
    ]
  },
  {
    "id": "gardena-1",
    "brand": "Gardena",
    "partName": "Charging station plate",
    "partNumber": "00058-27.843.01",
    "price": null,
    "currency": "EUR",
    "source": "GARDENA official spare-parts/product page",
    "sourceUrl": "https://www.gardena.com/int/products/lawn-care/robotic-lawnmowers/robotic-mower-sileno-city-600-m/970450603.html",
    "verified": "2026-08-15",
    "compatibility": "Part number and model/application are shown in the official GARDENA spare-parts data.",
    "tags": [
      "charging"
    ],
    "models": [
      "smart SILENO city 500"
    ]
  },
  {
    "id": "gardena-2",
    "brand": "Gardena",
    "partName": "Charging station cap",
    "partNumber": "00059-33.072.01",
    "price": null,
    "currency": "EUR",
    "source": "GARDENA official spare-parts/product page",
    "sourceUrl": "https://www.gardena.com/int/products/lawn-care/robotic-lawnmowers/robotic-mower-sileno-city-600-m/970450603.html",
    "verified": "2026-08-15",
    "compatibility": "Part number and model/application are shown in the official GARDENA spare-parts data.",
    "tags": [
      "charging"
    ],
    "models": [
      "smart SILENO city 500"
    ]
  },
  {
    "id": "gardena-3",
    "brand": "Gardena",
    "partName": "Cover air filter",
    "partNumber": "00058-60.389.02",
    "price": null,
    "currency": "EUR",
    "source": "GARDENA official spare-parts/product page",
    "sourceUrl": "https://www.gardena.com/int/products/lawn-care/robotic-lawnmowers/robotic-mower-smart-sileno-life-1250-m-set/970573106.html",
    "verified": "2026-08-15",
    "compatibility": "Part number and model/application are shown in the official GARDENA spare-parts data.",
    "tags": [
      "maintenance"
    ],
    "models": [
      "smart SILENO life 1000"
    ]
  },
  {
    "id": "gardena-4",
    "brand": "Gardena",
    "partName": "Air filter, 10 pcs",
    "partNumber": "00057-77.537.01",
    "price": null,
    "currency": "EUR",
    "source": "GARDENA official spare-parts/product page",
    "sourceUrl": "https://www.gardena.com/int/products/lawn-care/robotic-lawnmowers/robotic-mower-smart-sileno-life-1250-m-set/970573106.html",
    "verified": "2026-08-15",
    "compatibility": "Part number and model/application are shown in the official GARDENA spare-parts data.",
    "tags": [
      "maintenance"
    ],
    "models": [
      "smart SILENO life 1000"
    ]
  }
];

const FAULT_LIST = Object.entries(FAULTS).map(([id,f])=>({id,...f}));

// Model-specific diagnostic context. These are deliberately conservative: they refine tests rather than asserting a certain fault.
const MODEL_PROFILES = {
  'Husqvarna|Automower 305': {system:'Boundary/guide wire', notes:['Uses a physical boundary installation.','For charging, start with station power and charging contacts before suspecting the battery.']},
  'Husqvarna|Automower 315 Mark II': {system:'Boundary/guide wire', notes:['Uses a physical boundary installation.','Check boundary/guide wire and docking behaviour separately.']},
  'Husqvarna|Automower 405X': {system:'Boundary/guide wire + Automower Connect', notes:['Connectivity problems can be separated from physical mowing faults.','For boundary faults, inspect the loop and station signal before replacing electronics.']},
  'Husqvarna|Automower 415X': {system:'Boundary/guide wire + Automower Connect', notes:['Check charging, boundary and connectivity as separate branches.','Do not assume an app problem is a mower hardware failure.']},
  'Husqvarna|Automower 305E NERA': {system:'Boundary/guide wire', notes:['Confirm the exact NERA variant before ordering parts.','Boundary and charging diagnostics remain separate branches.']},
  'Worx|Landroid S300 (WR130E)': {system:'Boundary wire + Landroid app', notes:['Worx lists WR130E as compatible with WA0190 replacement blades.','Boundary-loop faults should be checked before replacing mower electronics.']},
  'Worx|Landroid S400 (WR141E)': {system:'Boundary wire + Landroid app', notes:['Worx lists WR141E as compatible with WA0190 replacement blades.','Check charging contacts and boundary signal separately.']},
  'Worx|Landroid M500 Plus (WR165E)': {system:'Boundary wire + Landroid app', notes:['Worx lists WR165E as compatible with WA0190 replacement blades.','PowerShare battery is part of the platform; confirm the exact battery variant before ordering.']},
  'Gardena|SILENO minimo 250': {system:'Physical boundary wire', notes:['GARDENA specifies a 250 m² class model with physical boundary wire.','Blade kit 4087-20 is listed by GARDENA as suitable for any GARDENA robotic mower.']},
  'Gardena|smart SILENO city 500': {system:'Physical boundary wire + smart app', notes:['GARDENA specifies physical boundary wire for SILENO city.','Separate app/connectivity checks from boundary-loop checks.']},
  'Gardena|smart SILENO life 1000': {system:'Physical boundary + guide wire + smart app', notes:['GARDENA specifies boundary and guide wire installation for SILENO life.','A docking issue can involve the guide-wire route even when the boundary loop is healthy.']},
  'Flymo|EasiLife 350': {system:'Boundary wire + guide wire', notes:['Flymo documents a blue flashing station light as a boundary-wire issue.','Flymo also documents guide-wire alignment as a possible docking problem.']},
  'Flymo|EasiLife 500': {system:'Boundary wire + guide wire', notes:['Flymo documents battery runtime decline as a sign the battery may need replacement.','Blade condition should be checked periodically as part of maintenance.']},
  'Segway Navimow|i105E': {system:'Wire-free RTK + Vision', notes:['No traditional boundary-wire diagnosis is used for this model family.','Check dock power, positioning/signal and app connectivity separately.']},
  'Segway Navimow|i108E': {system:'Wire-free RTK + Vision', notes:['Use positioning/signal diagnostics rather than a physical boundary-loop branch.','Segway lists Blade Assembly Plus as compatible across Navimow series.']}
};


// Exact error/message lookup. Entries are based on manufacturer support/manual material;
// where a numeric code is not manufacturer-published, the exact displayed message is used.
const ERROR_CODES = [
  // Husqvarna family support entries
  ...['Automower 305','Automower 315 Mark II','Automower 405X','Automower 415X','Automower 305E NERA'].flatMap(model => [
    {model, brand:'Husqvarna', code:'No loop signal', title:'No loop signal', cause:'Boundary/guide-wire signal, connection, station power or interference issue', action:'Check charging-station power and visible wire/connector condition. Use the manufacturer loop-test procedure before replacing electronics.', source:'Husqvarna Automower support', url:'https://www.husqvarna.com/uk/support/husqvarna-self-service/no-loop-signal-on-automower-causes-and-solutions-ka-01417/'},
    {model, brand:'Husqvarna', code:'Charging station blocked', title:'Charging station blocked', cause:'Docking obstruction, poor charging contact, uneven station or guide-wire layout', action:'Clear the docking path, check alignment and accessible charging contacts, and inspect guide-wire layout.', source:'Husqvarna Automower support', url:'https://www.husqvarna.com/uk/support/husqvarna-self-service/charging-station-blocked-automower-error-message-ka-01449/'},
    {model, brand:'Husqvarna', code:'Lifted', title:'Lifted / Alarm! Mower was lifted', cause:'Lift sensor triggered by lifting, tilting or physical terrain', action:'Move the mower to a clear flat area, restart normally and inspect the work area for raised obstacles.', source:'Husqvarna Automower support', url:'https://www.husqvarna.com/ie/support/husqvarna-self-service/lifted-alarm-mower-lifted-automower-error-message-ka-01419/'},
    {model, brand:'Husqvarna', code:'Searching for satellites', title:'Searching for satellites', cause:'Weak or temporarily unavailable satellite positioning signal on wire-free installations', action:'Move to an area with clearer sky view and check the installation/reference-station or cloud connection if the condition persists.', source:'Husqvarna Automower support', url:'https://www.husqvarna.com/ie/support/husqvarna-self-service/automower-won-t-start-or-keeps-stopping-ka-01503/'},
    {model, brand:'Husqvarna', code:'No correction data available', title:'No correction data available', cause:'Lost internet/correction-data connection on supported wire-free installations', action:'Check internet coverage and the wire-free correction-data path.', source:'Husqvarna Automower support', url:'https://www.husqvarna.com/ie/support/husqvarna-self-service/automower-won-t-start-or-keeps-stopping-ka-01503/'}
  ]),
  // Worx Landroid support messages
  ...['Landroid S300 (WR130E)','Landroid S400 (WR141E)','Landroid M500 Plus (WR165E)'].flatMap(model => [
    {model,brand:'Worx',code:'Wire missing',title:'Wire missing',cause:'Boundary wire signal is missing/too weak',action:'Inspect the boundary wire and connections and follow the official Landroid wire-missing troubleshooting.',source:'Worx Landroid Support',url:'https://eu.worx.com/en/support-for-landroid/'},
    {model,brand:'Worx',code:'Lifted',title:'Mower lifted / blade stop safety condition',cause:'Lift/tilt condition or physical obstruction',action:'Safely return the mower to level ground and inspect the area for obstacles before restarting.',source:'Worx Landroid model/support information',url:'https://eu.worx.com/en/landroid/landroid-models/'}
  ]),
  // GARDENA SILENO messages from manufacturer-hosted operator documentation
  ...['SILENO minimo 250','smart SILENO city 500','smart SILENO life 1000'].flatMap(model => [
    {model,brand:'Gardena',code:'No loop signal',title:'No loop signal',cause:'Power/low-voltage cable, boundary wire, interference or loop-signal issue',action:'Check station power, low-voltage cable, boundary connections and the station indicator.',source:'GARDENA operator documentation',url:'https://content.tdr.dss.husqvarnagroup.net/pub000004244/doc000016357'},
    {model,brand:'Gardena',code:'Cutting system blocked',title:'Cutting system blocked',cause:'Grass or an object around the blade disc',action:'Safely isolate the mower and remove accessible debris from the cutting system.',source:'GARDENA operator documentation',url:'https://content.tdr.dss.husqvarnagroup.net/pub000004244/doc000016357'},
    {model,brand:'Gardena',code:'Wheel motor blocked',title:'Wheel motor blocked, left/right',cause:'Grass or another object around a drive wheel',action:'Safely isolate the mower and clean around the affected drive wheel.',source:'GARDENA operator documentation',url:'https://content.tdr.dss.husqvarnagroup.net/pub000004244/doc000016357'},
    {model,brand:'Gardena',code:'Battery temperature outside limits',title:'Battery temperature outside limits',cause:'Battery temperature is outside operating limits',action:'Allow the mower/battery to return to an acceptable temperature before normal operation.',source:'GARDENA operator documentation',url:'https://content.tdr.dss.husqvarnagroup.net/pub000004246/doc000017142'}
  ]),
  // Flymo EasiLife messages from manufacturer documentation
  ...['EasiLife 350','EasiLife 500'].flatMap(model => [
    {model,brand:'Flymo',code:'No loop signal',title:'No loop signal',cause:'Power supply, low-voltage cable or boundary-loop issue',action:'Check station power, low-voltage cable and boundary-wire connections.',source:'Flymo EasiLife operator documentation',url:'https://dccf75d8gej24.cloudfront.net/documents/FLYO2019_EUen__1141896-26.pdf'},
    {model,brand:'Flymo',code:'Mower tilted',title:'Mower tilted',cause:'Mower is tilted too far or upside down',action:'Place the mower correctly on level ground and check for physical obstacles.',source:'Flymo EasiLife operator documentation',url:'https://dccf75d8gej24.cloudfront.net/documents/FLYO2019_EUen__1141896-26.pdf'},
    {model,brand:'Flymo',code:'Cutting system blocked',title:'Cutting system blocked',cause:'Grass or an object around the blade disc',action:'Safely isolate the mower and clear accessible cutting-system debris.',source:'Flymo EasiLife operator documentation',url:'https://dccf75d8gej24.cloudfront.net/documents/FLYO2019_EUen__1141896-26.pdf'},
    {model,brand:'Flymo',code:'Battery temperature outside limits',title:'Battery temperature outside limits',cause:'Battery temperature outside operating range',action:'Allow the battery to return to normal temperature before mowing/charging.',source:'Flymo EasiLife operator documentation',url:'https://dccf75d8gej24.cloudfront.net/documents/FLYO2019_EUen__1141896-26.pdf'}
  ]),
  // Navimow i-series: exact numeric codes surfaced from an i-series status cross-reference; official manual confirms four-digit E-codes are displayed.
  ...['i105E','i108E'].flatMap(model => [
    {model,brand:'Segway Navimow',code:'6106',title:'Motion Planning error (6106)',cause:'Motion-planning/positioning condition',action:'Move the mower to a clear area, check positioning and restart using the normal procedure if appropriate.',source:'Navimow i-series community error-code cross-reference; i-series manual confirms E + four-digit error display',url:'https://manualsfile.com/product/k5qnnylqdyb.html'},
    {model,brand:'Segway Navimow',code:'6108',title:'Mower unable to move (6108)',cause:'Movement/drive condition',action:'Check for physical obstruction and wheel/drive condition; if clear, follow Navimow support.',source:'Navimow i108 status/error-code cross-reference',url:'https://community.home-assistant.io/t/segway-navimow/435023/150'},
    {model,brand:'Segway Navimow',code:'6109',title:'Mower stuck out of boundary (6109)',cause:'Position/boundary-map condition',action:'Place the mower within its mapped work area and check positioning/map conditions.',source:'Navimow i108 status/error-code cross-reference',url:'https://community.home-assistant.io/t/segway-navimow/435023/150'},
    {model,brand:'Segway Navimow',code:'6113',title:'Mower docking error (6113)',cause:'Docking/charging-station approach condition',action:'Check the charging station approach, station power and mower alignment.',source:'Navimow i108 status/error-code cross-reference',url:'https://community.home-assistant.io/t/segway-navimow/435023/150'}
  ])
];

function getLocalFeedback(){try{return JSON.parse(localStorage.getItem('mowerfix_feedback_v13')||'[]')}catch(e){return []}}
function saveLocalFeedback(item){const all=getLocalFeedback();all.push({...item,ts:new Date().toISOString()});localStorage.setItem('mowerfix_feedback_v13',JSON.stringify(all.slice(-500)))}
function feedbackStats(brand,model,fault){const all=getLocalFeedback().filter(x=>x.brand===brand&&x.model===model&&x.fault===fault);const yes=all.filter(x=>x.correct===true).length;return {count:all.length,yes,rate:all.length?Math.round(yes/all.length*100):null}}
