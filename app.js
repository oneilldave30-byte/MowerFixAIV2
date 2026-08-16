const app=document.getElementById('app');
let state={brand:'',model:'',fault:'',answers:{},qIndex:0,diagnosis:null,errorQuery:''};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const modelInfo=()=>MODELS.find(x=>x.brand===state.brand&&x.model===state.model);
function shell(html){app.innerHTML=html;window.scrollTo(0,0)}
function home(){shell(`<section class="hero"><div class="tag">V1.3 BETA • ${MODELS.length} MODELS • ${FAULT_LIST.length} FAULTS • ${PARTS.length} VERIFIED PART RECORDS</div><h1>MowerFix AI</h1><p>Diagnose your robotic lawnmower fault and find the right repair.</p><button class="btn btn-primary" onclick="selectMower()">Diagnose a Fault</button></section><div class="card"><h2>Built for real mower problems</h2><p>Choose your mower, answer model-specific questions and get a <b>likely cause</b>, tests and repair guidance. Diagnoses are guidance, not certainty.</p><div class="stats"><div><b>${MODELS.length}</b><span>models</span></div><div><b>${FAULT_LIST.length}</b><span>faults</span></div><div><b>${PARTS.length}</b><span>verified records</span></div></div></div><div class="card"><h2>Search error codes, parts or symptoms</h2><div class="search"><input id="homeSearch" placeholder="e.g. No loop signal, 6109, WA0190"><button class="btn btn-secondary" onclick="searchSite(document.getElementById('homeSearch').value)">Search</button></div></div><div class="card"><h3>Privacy</h3><p class="small muted">Diagnostic feedback is stored only in this browser using localStorage. No account or server is required.</p></div><div class="card"><h3>Get priority repair advice</h3><p class="small muted">Subscribe for ongoing access to priority diagnostic support.</p><a href="https://buy.stripe.com/fZu9AM95PeeJ6Mi2Tu28800" class="btn btn-primary" style="text-decoration:none;display:inline-block">Subscribe Now</a></div>`)}
function selectMower(){state={brand:'',model:'',fault:'',answers:{},qIndex:0,diagnosis:null,errorQuery:''};shell(`<div class="card"><div class="tag">STEP 1 OF 3</div><h2>Select your mower</h2><label>Brand</label><select id="brand" onchange="updateModels()"><option value="">Choose brand</option>${BRANDS.map(b=>`<option>${esc(b)}</option>`).join('')}</select><label>Model</label><select id="model" disabled><option value="">Choose model</option></select><div class="actions"><button class="btn btn-primary" onclick="saveMower()">Continue</button><button class="btn btn-secondary" onclick="home()">Back</button></div></div>`)}
function updateModels(){const b=document.getElementById('brand').value,s=document.getElementById('model');s.disabled=!b;s.innerHTML=`<option value="">Choose model</option>`+MODELS.filter(x=>x.brand===b).map(x=>`<option>${esc(x.model)}</option>`).join('')}
function saveMower(){state.brand=document.getElementById('brand').value;state.model=document.getElementById('model').value;if(!state.brand||!state.model)return alert('Please select a brand and model.');faultSelect()}
function faultApplicable(f){const m=modelInfo();if(!m)return true;if(f.id==='boundary_fault'||f.id==='outside_area')return m.navigation==='wire';return true}
function faultSelect(){const available=FAULT_LIST.filter(f=>faultApplicable(f));shell(`<div class="card"><div class="tag">STEP 2 OF 3</div><h2>What is happening?</h2><p class="muted">${esc(state.brand)} ${esc(state.model)} • ${modelInfo()?.navigation==='wire-free'?'wire-free positioning':'boundary/guide-wire system'}</p><div class="option-grid">${available.map(f=>`<button class="option" onclick="chooseFault('${f.id}')">${esc(f.name)}<span class="small muted"> →</span></button>`).join('')}</div><label>Exact error code/message</label><div class="search"><input id="faultSearch" placeholder="e.g. No loop signal, 6109"><button class="btn btn-secondary" onclick="errorLookup(document.getElementById('faultSearch').value)">Find code</button></div><div class="actions"><button class="btn btn-secondary" onclick="selectMower()">Back</button></div></div>`)}
function chooseFault(id){state.fault=id;state.answers={};state.qIndex=0;question()}
function question(){const f=FAULTS[state.fault],q=f.questions[state.qIndex];if(!q)return diagnose();const pct=Math.round((state.qIndex/f.questions.length)*100);shell(`<div class="card"><div class="tag">STEP 3 OF 3</div><div class="progress"><span style="width:${pct}%"></span></div><p class="muted">${esc(state.brand)} ${esc(state.model)} • ${esc(f.name)}</p><h2>${esc(q.text)}</h2><div class="option-grid">${q.options.map(o=>`<button class="option" onclick="answer('${q.id}','${esc(o)}')">${esc(o)}</button>`).join('')}</div><div class="actions"><button class="btn btn-secondary" onclick="faultSelect()">Back</button></div></div>`)}
function answer(id,val){state.answers[id]=val;state.qIndex++;question()}
function diagnose(){const f=FAULTS[state.fault],profile=MODEL_PROFILES[`${state.brand}|${state.model}`]||{};const match=f.rules.find(r=>Object.entries(r.when).every(([k,v])=>state.answers[k]===v));const d=match?{...f.base,...match}:f.base;const fs=feedbackStats(state.brand,state.model,state.fault);let adjusted=d.confidence;if(fs.count>=3&&fs.rate!==null){adjusted=Math.max(20,Math.min(95,Math.round(d.confidence+(fs.rate-50)*0.12)));}state.diagnosis={...d,confidence:adjusted,baseConfidence:d.confidence,faultName:f.name,matched:!!match,profile,feedback:fs};result()}
function safety(){const hazards=FAULTS[state.fault].hazards;const w=[];if(hazards.includes('electrical')||hazards.includes('battery'))w.push('Electrical/battery safety: switch off and isolate the mower before opening covers or handling electrical connections. Never work on a damaged or swollen battery.');if(hazards.includes('blade'))w.push('Cutting-blade safety: isolate the mower before touching the cutting system. Wear suitable hand protection and keep fingers clear of sharp edges.');if(hazards.includes('motor')||hazards.includes('mechanical'))w.push('Moving-part safety: isolate the mower before inspecting wheels, motors or mechanisms. Do not test exposed moving parts.');if(hazards.includes('charging'))w.push('Charging-station safety: disconnect power before inspecting station wiring or connectors. Do not bypass protective devices.');if(hazards.includes('connectivity'))w.push('Software/connectivity safety: use only the manufacturer-supported app/update process; do not install unofficial firmware.');return w}
function matchingParts(){const terms=state.fault==='poor_cutting'||state.fault==='blade_not_turning'||state.fault==='blade_noise'||state.fault==='cutting_blocked'?['blade','cutting']:state.fault==='wheel_not_turning'||state.fault==='both_wheels'?['wheel','mechanical']:state.fault==='boundary_fault'||state.fault==='outside_area'?['boundary','wire']:state.fault==='wont_charge'||state.fault==='wont_leave_station'?['charging','electrical']:state.fault==='short_mowing_time'?['battery']:[];return PARTS.filter(p=>p.models.includes(state.model)&&terms.some(t=>p.tags.includes(t))).slice(0,8)}
function partCard(){const ps=matchingParts();if(!ps.length)return `<div class="card"><h3>Verified spare parts</h3><p><b>Part number: Not verified</b></p><p class="muted small">No verified part record is currently mapped to this model and fault. MowerFix AI will not guess a part number or price.</p></div>`;return `<div class="card"><h3>Verified spare parts</h3>${ps.map(p=>`<div class="verified"><span class="tag">VERIFIED</span><table><tr><th>Part</th><td>${esc(p.partName)}</td></tr><tr><th>Part number</th><td><b>${esc(p.partNumber)}</b></td></tr><tr><th>Price</th><td>${p.price==null?'Not verified':esc(p.price.toFixed(2)+' '+p.currency)}</td></tr><tr><th>Source</th><td>${esc(p.source)}</td></tr><tr><th>Verified</th><td>${esc(p.verified)}</td></tr><tr><th>Compatibility</th><td>${esc(p.compatibility)}</td></tr></table><p class="small"><a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">View manufacturer source</a></p></div>`).join('')}</div>`}
function feedbackCard(){return `<div class="card no-print"><h3>Was this diagnosis correct?</h3><p class="muted small">Your response is stored anonymously in this browser only.</p><div class="actions"><button class="btn btn-primary" onclick="submitFeedback(true)">Yes</button><button class="btn btn-danger" onclick="showActualFault()">No — tell us the actual fault</button></div><div id="actualFaultBox"></div></div>`}
function showActualFault(){document.getElementById('actualFaultBox').innerHTML=`<label>What was the actual fault?</label><select id="actualFaultSelect"><option value="">Choose one</option><option>Battery</option><option>Charging station / power supply</option><option>Charging contacts</option><option>Boundary wire / loop</option><option>Wheel / drive system</option><option>Blade / cutting system</option><option>Sensor</option><option>GPS / RTK / connectivity</option><option>Software / firmware</option><option>Unknown / still unresolved</option><option>Other</option></select><label>Optional detail</label><input id="actualFaultText" placeholder="e.g. broken wire 2m from station"><div class="actions"><button class="btn btn-primary" onclick="submitFeedback(false)">Save feedback</button></div>`}
function submitFeedback(correct){const actual=correct?'Confirmed likely cause':(document.getElementById('actualFaultSelect')?.value||'Not specified');const detail=document.getElementById('actualFaultText')?.value||'';saveLocalFeedback({brand:state.brand,model:state.model,fault:state.fault,diagnosis:state.diagnosis.cause,correct,actualFault:actual,detail});const box=document.querySelector('.no-print h3');if(box)box.parentElement.innerHTML='<h3>Thanks — feedback saved</h3><p class="muted">This browser can use accumulated feedback to slightly tune confidence for repeated tests of the same mower/fault.</p>';}
function paymentgate(){const d=state.diagnosis,w=safety(),profile=d.profile||{},fs=d.feedback||{};const local=fs.count?`<div class="card"><h3>Local test feedback</h3><p>${fs.count} previous test${fs.count===1?'':'s'} for this mower/fault in this browser; ${fs.yes} marked correct.</p><p class="small muted">Confidence is only lightly adjusted after at least 3 local tests. This is not a substitute for verified technical evidence.</p></div>`:'';shell(`<div class="card"><div class="result-title"><div><div class="tag">DIAGNOSIS</div><h2>Likely cause: ${esc(d.cause)}</h2></div><div class="confidence">${d.confidence}%</div></div><p><b>Confidence:</b> ${d.confidence}% • <b>Repair difficulty:</b> ${d.difficulty}/5 • <b>Estimated time:</b> ${esc(d.time)}</p><p class="muted">This is not a certain diagnosis. Similar symptoms can have different causes.</p></div>${local}<div class="card"><h3>Model-specific diagnostic context</h3><p><b>System:</b> ${esc(profile.system||'Model-specific system information not yet verified')}</p>${(profile.notes||[]).map(n=>`<p class="small">• ${esc(n)}</p>`).join('')}</div>${w.map(x=>`<div class="warning"><strong>Safety warning</strong><br>${esc(x)}</div>`).join('')}<div class="card"><h3>Possible alternative causes</h3><ul>${d.alternatives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="card"><h3>Recommended tests</h3><ol>${d.tests.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div><div class="card"><h3>Step-by-step repair guidance</h3><ol class="steps"><li>Record the exact symptom/error and mower model.</li><li>Switch off and safely isolate the mower before any inspection.</li><li>Perform the recommended checks in order, starting with simple external causes.</li><li>Confirm a model-specific part number before ordering any replacement.</li><li>Reassemble safely and test using the manufacturer's normal operating procedure.</li></ol></div>${partCard()}${feedbackCard()}<div class="card no-print"><h3>Repair report</h3><p>Print this diagnosis or save it as PDF from your browser.</p><div class="actions"><button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button><button class="btn btn-secondary" onclick="selectMower()">New diagnosis</button></div></div>`)}
function errorLookup(q){q=(q||'').trim().toLowerCase();state.errorQuery=q;const m=modelInfo();const matches=ERROR_CODES.filter(e=>(!m||e.model===m.model)&&((e.code+' '+e.title+' '+e.cause).toLowerCase().includes(q)||!q));shell(`<div class="card"><div class="tag">ERROR CODE LOOKUP</div><h2>${m?esc(m.brand+' '+m.model):'All supported models'}</h2><div class="search"><input id="errorSearch" value="${esc(q)}" placeholder="Exact code or message"><button class="btn btn-secondary" onclick="errorLookup(document.getElementById('errorSearch').value)">Search</button></div>${matches.length?matches.map(e=>`<div class="verified"><span class="tag">${esc(e.code)}</span><h3>${esc(e.title)}</h3><p><b>Likely area:</b> ${esc(e.cause)}</p><p><b>Next step:</b> ${esc(e.action)}</p><p class="small"><b>Source:</b> ${esc(e.source)} • <a href="${esc(e.url)}" target="_blank" rel="noopener">Open source</a></p></div>`).join(''):'<p>No verified matching code/message found for this model. Try the exact text shown on the mower/app, or choose another model.</p>'}<div class="actions"><button class="btn btn-primary" onclick="selectMower()">Diagnose a Fault</button><button class="btn btn-secondary" onclick="home()">Home</button></div></div>`)}
function searchSite(q){q=(q||'').trim().toLowerCase();if(!q)return;const models=MODELS.filter(m=>(m.brand+' '+m.model).toLowerCase().includes(q));const faults=FAULT_LIST.filter(f=>f.name.toLowerCase().includes(q)||f.id.includes(q));const parts=PARTS.filter(p=>p.partNumber.toLowerCase().includes(q)||p.partName.toLowerCase().includes(q));const errors=ERROR_CODES.filter(e=>(e.code+' '+e.title+' '+e.model+' '+e.cause).toLowerCase().includes(q));shell(`<div class="card"><div class="tag">SEARCH</div><h2>Search results</h2><div class="search"><input id="siteSearch" value="${esc(q)}"><button class="btn btn-secondary" onclick="searchSite(document.getElementById('siteSearch').value)">Search</button></div>${errors.length?`<h3>Error codes/messages</h3>${errors.slice(0,12).map(e=>`<div class="verified"><b>${esc(e.code)}</b> — ${esc(e.model)}<p class="small">${esc(e.cause)}<br><a href="${esc(e.url)}" target="_blank" rel="noopener">Source</a></p></div>`).join('')}`:''}${models.length?`<h3>Models</h3><ul>${models.map(m=>`<li>${esc(m.brand)} — <b>${esc(m.model)}</b></li>`).join('')}</ul>`:''}${faults.length?`<h3>Faults</h3><ul>${faults.map(f=>`<li><b>${esc(f.name)}</b></li>`).join('')}</ul>`:''}${parts.length?`<h3>Parts</h3><ul>${parts.slice(0,20).map(p=>`<li><b>${esc(p.partName)}</b> — ${esc(p.partNumber)}</li>`).join('')}</ul>`:''}${!models.length&&!faults.length&&!parts.length&&!errors.length?'<p>No matching records found.</p>':''}<div class="actions"><button class="btn btn-primary" onclick="selectMower()">Diagnose a Fault</button><button class="btn btn-secondary" onclick="home()">Home</button></div></div>`)}
document.getElementById('homeBtn').onclick=home;home();
const app=document.getElementById('app');            

const STRIPE_PAYMENT_LINK='https://buy.stripe.com/fZu9const STRIPE_PAYMENT_LINK='https://buy.stripe.com/fZu9AM95PeeJ6Mi2Tu28800';

function paymentGate(){

  shell(`
    <div class="card">

      <div class="tag">DIAGNOSIS READY</div>

      <h2>🔒 Your diagnosis is ready</h2>

      <p>
        MowerFix AI has completed the analysis of your
        ${esc(state.brand)} ${esc(state.model)}.
      </p>

      <div class="card">

        <h3>Unlock your full diagnosis</h3>

        <p>Your €4.99 payment includes:</p>

        <ul>
          <li>Likely fault</li>
          <li>Confidence score</li>
          <li>Alternative possible causes</li>
          <li>Recommended diagnostic tests</li>
          <li>Step-by-step repair guidance</li>
          <li>Compatible verified parts where available</li>
        </ul>

        <h2>€4.99</h2>

        <button
          class="btn btn-primary"
          onclick="startStripePayment()"
        >
          Unlock Diagnosis — €4.99
        </button>

      </div>

      <p class="small muted">
        Secure payment processed by Stripe.
      </p>

    </div>
  `);
}

function startStripePayment(){

  localStorage.setItem(
    'mowerfix_pending_diagnosis',
    JSON.stringify(state)
  );

  window.location.href=STRIPE_PAYMENT_LINK;
}AM95PeeJ6Mi2Tu28800';

let state={
  brand:'',
  model:'',
  fault:'',
  answers:{},
  qIndex:0,
  diagnosis:null,
  errorQuery:''
};

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#039;'
}[m]));

const modelInfo=()=>MODELS.find(x=>x.brand===state.brand&&x.model===state.model);

function shell(html){
  app.innerHTML=html;
  window.scrollTo(0,0);
}

function home(){
  shell(`
    <section class="hero">
      <div class="tag">
        V1.3 BETA • ${MODELS.length} MODELS • ${FAULT_LIST.length} FAULTS • ${PARTS.length} VERIFIED PART RECORDS
      </div>

      <h1>MowerFix AI</h1>

      <p>
        Diagnose your robotic lawnmower fault and find the right repair.
      </p>

      <button class="btn btn-primary" onclick="selectMower()">
        Diagnose a Fault
      </button>
    </section>

    <div class="card">
      <h2>Built for real mower problems</h2>

      <p>
        Choose your mower, answer model-specific questions and get a
        <b>likely cause</b>, tests and repair guidance.
        Diagnoses are guidance, not certainty.
      </p>

      <div class="stats">
        <div>
          <b>${MODELS.length}</b>
          <span>models</span>
        </div>

        <div>
          <b>${FAULT_LIST.length}</b>
          <span>faults</span>
        </div>

        <div>
          <b>${PARTS.length}</b>
          <span>verified records</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Search error codes, parts or symptoms</h2>

      <div class="search">
        <input
          id="homeSearch"
          placeholder="e.g. No loop signal, 6109, WA0190"
        >

        <button
          class="btn btn-secondary"
          onclick="searchSite(document.getElementById('homeSearch').value)"
        >
          Search
        </button>
      </div>
    </div>

    <div class="card">
      <h3>Privacy</h3>

      <p class="small muted">
        Diagnostic feedback is stored only in this browser using localStorage.
        No account or server is required.
      </p>
    </div>
  `);
}

function selectMower(){
  state={
    brand:'',
    model:'',
    fault:'',
    answers:{},
    qIndex:0,
    diagnosis:null,
    errorQuery:''
  };

  shell(`
    <div class="card">

      <div class="tag">STEP 1 OF 3</div>

      <h2>Select your mower</h2>

      <label>Brand</label>

      <select id="brand" onchange="updateModels()">
        <option value="">Choose brand</option>
        ${BRANDS.map(b=>`<option>${esc(b)}</option>`).join('')}
      </select>

      <label>Model</label>

      <select id="model" disabled>
        <option value="">Choose model</option>
      </select>

      <div class="actions">

        <button class="btn btn-primary" onclick="saveMower()">
          Continue
        </button>

        <button class="btn btn-secondary" onclick="home()">
          Back
        </button>

      </div>

    </div>
  `);
}

function updateModels(){
  const b=document.getElementById('brand').value;
  const s=document.getElementById('model');

  s.disabled=!b;

  s.innerHTML=
    `<option value="">Choose model</option>`+
    MODELS
      .filter(x=>x.brand===b)
      .map(x=>`<option>${esc(x.model)}</option>`)
      .join('');
}

function saveMower(){
  state.brand=document.getElementById('brand').value;
  state.model=document.getElementById('model').value;

  if(!state.brand||!state.model){
    return alert('Please select a brand and model.');
  }

  faultSelect();
}

function faultApplicable(f){
  const m=modelInfo();

  if(!m)return true;

  if(f.id==='boundary_fault'||f.id==='outside_area'){
    return m.navigation==='wire';
  }

  return true;
}

function faultSelect(){
  const available=FAULT_LIST.filter(f=>faultApplicable(f));

  shell(`
    <div class="card">

      <div class="tag">STEP 2 OF 3</div>

      <h2>What is happening?</h2>

      <p class="muted">
        ${esc(state.brand)} ${esc(state.model)}
        •
        ${modelInfo()?.navigation==='wire-free'
          ?'wire-free positioning'
          :'boundary/guide-wire system'}
      </p>

      <div class="option-grid">

        ${available.map(f=>`
          <button
            class="option"
            onclick="chooseFault('${f.id}')"
          >
            ${esc(f.name)}
            <span class="small muted"> →</span>
          </button>
        `).join('')}

      </div>

      <label>Exact error code/message</label>

      <div class="search">

        <input
          id="faultSearch"
          placeholder="e.g. No loop signal, 6109"
        >

        <button
          class="btn btn-secondary"
          onclick="errorLookup(document.getElementById('faultSearch').value)"
        >
          Find code
        </button>

      </div>

      <div class="actions">

        <button
          class="btn btn-secondary"
          onclick="selectMower()"
        >
          Back
        </button>

      </div>

    </div>
  `);
}

function chooseFault(id){
  state.fault=id;
  state.answers={};
  state.qIndex=0;

  question();
}

function question(){
  const f=FAULTS[state.fault];
  const q=f.questions[state.qIndex];

  if(!q){
    diagnose();
    return;
  }

  const pct=Math.round(
    (state.qIndex/f.questions.length)*100
  );

  shell(`
    <div class="card">

      <div class="tag">STEP 3 OF 3</div>

      <div class="progress">
        <span style="width:${pct}%"></span>
      </div>

      <p class="muted">
        ${esc(state.brand)}
        ${esc(state.model)}
        •
        ${esc(f.name)}
      </p>

      <h2>${esc(q.text)}</h2>

      <div class="option-grid">

        ${q.options.map(o=>`
          <button
            class="option"
            onclick="answer('${q.id}','${esc(o)}')"
          >
            ${esc(o)}
          </button>
        `).join('')}

      </div>

      <div class="actions">

        <button
          class="btn btn-secondary"
          onclick="faultSelect()"
        >
          Back
        </button>

      </div>

    </div>
  `);
}

function answer(id,val){
  state.answers[id]=val;
  state.qIndex++;

  question();
}

/*
=========================================================
GENERATE DIAGNOSIS
=========================================================
The diagnosis is calculated here but NOT shown yet.
The customer is sent to the Stripe payment screen first.
*/

function diagnose(){

  const f=FAULTS[state.fault];

  const profile=
    MODEL_PROFILES[`${state.brand}|${state.model}`]||{};

  const match=f.rules.find(r=>
    Object.entries(r.when).every(
      ([k,v])=>state.answers[k]===v
    )
  );

  const d=match
    ?{...f.base,...match}
    :f.base;

  const fs=
    feedbackStats(
      state.brand,
      state.model,
      state.fault
    );

  let adjusted=d.confidence;

  if(fs.count>=3&&fs.rate!==null){

    adjusted=Math.max(
      20,
      Math.min(
        95,
        Math.round(
          d.confidence+(fs.rate-50)*0.12
        )
      )
    );

  }

  state.diagnosis={
    ...d,
    confidence:adjusted,
    baseConfidence:d.confidence,
    faultName:f.name,
    matched:!!match,
    profile,
    feedback:fs
  };

  /*
  IMPORTANT:
  Do NOT call result() here.

  Payment screen comes first.
  */

  paymentGate();
}


/*
=========================================================
STRIPE PAYMENT GATE
=========================================================
*/

function paymentGate(){

  shell(`

    <div class="card payment-card">

      <div class="tag">STEP 4 OF 4</div>

      <h2>🔒 Your diagnosis is ready</h2>

      <p>
        MowerFix AI has completed the diagnostic analysis
        for your mower.
      </p>

      <div class="card">

        <h3>Unlock your full diagnosis</h3>

        <p>
          Your €4.99 payment unlocks:
        </p>

        <ul>

          <li>Likely fault and confidence score</li>

          <li>Possible alternative causes</li>

          <li>Recommended diagnostic tests</li>

          <li>Step-by-step repair guidance</li>

          <li>Verified compatible parts where available</li>

          <li>Manufacturer source links</li>

        </ul>

        <h2>€4.99</h2>

        <p class="small muted">
          One-time payment.
        </p>

        <button
          class="btn btn-primary"
          onclick="startStripePayment()"
        >
          Unlock Diagnosis — €4.99
        </button>

      </div>

      <p class="small muted">
        Payment is processed securely by Stripe.
        MowerFix AI does not receive or store your card details.
      </p>

      <div class="actions">

        <button
          class="btn btn-secondary"
          onclick="question()"
        >
          Back
        </button>

      </div>

    </div>

  `);
}


/*
=========================================================
START STRIPE PAYMENT
=========================================================
*/

function startStripePayment(){

  /*
  Save the current diagnosis locally so it remains
  available when the customer returns from Stripe.
  */

  localStorage.setItem(
    'mowerfix_pending_diagnosis',
    JSON.stringify({
      state:state,
      createdAt:Date.now()
    })
  );

  /*
  Send customer to your Stripe Payment Link.
  */

  window.location.href=STRIPE_PAYMENT_LINK;
}


/*
=========================================================
CHECK WHETHER CUSTOMER RETURNED FROM STRIPE
=========================================================
*/

function checkStripeReturn(){

  const params=
    new URLSearchParams(window.location.search);

  const payment=params.get('payment');

  if(payment==='success'){

    const saved=
      localStorage.getItem(
        'mowerfix_pending_diagnosis'
      );

    if(saved){

      try{

        const parsed=JSON.parse(saved);

        state=parsed.state;

        localStorage.removeItem(
          'mowerfix_pending_diagnosis'
        );

        /*
        Remove ?payment=success from browser URL.
        */

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        result();

        return true;

      }catch(e){

        console.error(
          'Could not restore diagnosis:',
          e
        );

      }

    }

  }

  return false;
}


/*
=========================================================
SAFETY
=========================================================
*/

function safety(){

  const hazards=
    FAULTS[state.fault].hazards;

  const w=[];

  if(
    hazards.includes('electrical')||
    hazards.includes('battery')
  ){

    w.push(
      'Electrical/battery safety: switch off and isolate the mower before opening covers or handling electrical connections. Never work on a damaged or swollen battery.'
    );

  }

  if(hazards.includes('blade')){

    w.push(
      'Cutting-blade safety: isolate the mower before touching the cutting system. Wear suitable hand protection and keep fingers clear of sharp edges.'
    );

  }

  if(
    hazards.includes('motor')||
    hazards.includes('mechanical')
  ){

    w.push(
      'Moving-part safety: isolate the mower before inspecting wheels, motors or mechanisms. Do not test exposed moving parts.'
    );

  }

  if(hazards.includes('charging')){

    w.push(
      'Charging-station safety: disconnect power before inspecting station wiring or connectors. Do not bypass protective devices.'
    );

  }

  if(hazards.includes('connectivity')){

    w.push(
      'Software/connectivity safety: use only the manufacturer-supported app/update process; do not install unofficial firmware.'
    );

  }

  return w;
}


/*
=========================================================
PART MATCHING
=========================================================
*/

function matchingParts(){

  const terms=
    state.fault==='poor_cutting'||
    state.fault==='blade_not_turning'||
    state.fault==='blade_noise'||
    state.fault==='cutting_blocked'
      ?['blade','cutting']

    :state.fault==='wheel_not_turning'||
     state.fault==='both_wheels'
      ?['wheel','mechanical']

    :state.fault==='boundary_fault'||
     state.fault==='outside_area'
      ?['boundary','wire']

    :state.fault==='wont_charge'||
     state.fault==='wont_leave_station'
      ?['charging','electrical']

    :state.fault==='short_mowing_time'
      ?['battery']

    :[];

  return PARTS
    .filter(
      p=>
        p.models.includes(state.model)&&
        terms.some(t=>p.tags.includes(t))
    )
    .slice(0,8);
}


/*
=========================================================
PART CARD
=========================================================
*/

function partCard(){

  const ps=matchingParts();

  if(!ps.length){

    return `
      <div class="card">

        <h3>Verified spare parts</h3>

        <p>
          <b>Part number: Not verified</b>
        </p>

        <p class="muted small">
          No verified part record is currently mapped
          to this model and fault. MowerFix AI will not
          guess a part number or price.
        </p>

      </div>
    `;

  }

  return `
    <div class="card">

      <h3>Verified spare parts</h3>

      ${ps.map(p=>`

        <div class="verified">

          <span class="tag">VERIFIED</span>

          <table>

            <tr>
              <th>Part</th>
              <td>${esc(p.partName)}</td>
            </tr>

            <tr>
              <th>Part number</th>
              <td><b>${esc(p.partNumber)}</b></td>
            </tr>

            <tr>
              <th>Price</th>
              <td>
                ${
                  p.price==null
                    ?'Not verified'
                    :esc(
                      p.price.toFixed(2)+' '+p.currency
                    )
                }
              </td>
            </tr>

            <tr>
              <th>Source</th>
              <td>${esc(p.source)}</td>
            </tr>

            <tr>
              <th>Verified</th>
              <td>${esc(p.verified)}</td>
            </tr>

            <tr>
              <th>Compatibility</th>
              <td>${esc(p.compatibility)}</td>
            </tr>

          </table>

          <p class="small">

            <a
              href="${esc(p.sourceUrl)}"
              target="_blank"
              rel="noopener"
            >
              View manufacturer source
            </a>

          </p>

        </div>

      `).join('')}

    </div>
  `;
}


/*
=========================================================
FEEDBACK
=========================================================
*/

function feedbackCard(){

  return `

    <div class="card no-print">

      <h3>Was this diagnosis correct?</h3>

      <p class="muted small">
        Your response is stored anonymously in this browser only.
      </p>

      <div class="actions">

        <button
          class="btn btn-primary"
          onclick="submitFeedback(true)"
        >
          Yes
        </button>

        <button
          class="btn btn-danger"
          onclick="showActualFault()"
        >
          No — tell us the actual fault
        </button>

      </div>

      <div id="actualFaultBox"></div>

    </div>

  `;
}

function showActualFault(){

  document.getElementById(
    'actualFaultBox'
  ).innerHTML=`

    <label>What was the actual fault?</label>

    <select id="actualFaultSelect">

      <option value="">Choose one</option>

      <option>Battery</option>

      <option>Charging station / power supply</option>

      <option>Charging contacts</option>

      <option>Boundary wire / loop</option>

      <option>Wheel / drive system</option>

      <option>Blade / cutting system</option>

      <option>Sensor</option>

      <option>GPS / RTK / connectivity</option>

      <option>Software / firmware</option>

      <option>Unknown / still unresolved</option>

      <option>Other</option>

    </select>

    <label>Optional detail</label>

    <input
      id="actualFaultText"
      placeholder="e.g. broken wire 2m from station"
    >

    <div class="actions">

      <button
        class="btn btn-primary"
        onclick="submitFeedback(false)"
      >
        Save feedback
      </button>

    </div>

  `;
}

function submitFeedback(correct){

  const actual=
    correct
      ?'Confirmed likely cause'
      :(document.getElementById(
        'actualFaultSelect'
      )?.value||'Not specified');

  const detail=
    document.getElementById(
      'actualFaultText'
    )?.value||'';

  saveLocalFeedback({

    brand:state.brand,

    model:state.model,

    fault:state.fault,

    diagnosis:state.diagnosis.cause,

    correct,

    actualFault:actual,

    detail

  });

  const box=
    document.querySelector('.no-print h3');

  if(box){

    box.parentElement.innerHTML=`

      <h3>Thanks — feedback saved</h3>

      <p class="muted">
        This browser can use accumulated feedback
        to slightly tune confidence for repeated tests
        of the same mower/fault.
      </p>

    `;

  }

}


/*
=========================================================
FULL DIAGNOSIS RESULT
=========================================================
*/

function result(){

  const d=state.diagnosis;

  const w=safety();

  const profile=d.profile||{};

  const fs=d.feedback||{};

  const local=
    fs.count
      ?`

        <div class="card">

          <h3>Local test feedback</h3>

          <p>
            ${fs.count}
            previous test${fs.count===1?'':'s'}
            for this mower/fault in this browser;
            ${fs.yes} marked correct.
          </p>

          <p class="small muted">
            Confidence is only lightly adjusted after
            at least 3 local tests. This is not a substitute
            for verified technical evidence.
          </p>

        </div>

      `
      :'';

  shell(`

    <div class="card">

      <div class="result-title">

        <div>

          <div class="tag">DIAGNOSIS UNLOCKED</div>

          <h2>
            Likely cause: ${esc(d.cause)}
          </h2>

        </div>

        <div class="confidence">
          ${d.confidence}%
        </div>

      </div>

      <p>
        <b>Confidence:</b> ${d.confidence}%
        •
        <b>Repair difficulty:</b> ${d.difficulty}/5
        •
        <b>Estimated time:</b> ${esc(d.time)}
      </p>

      <p class="muted">
        This is not a certain diagnosis.
        Similar symptoms can have different causes.
      </p>

    </div>

    ${local}

    <div class="card">

      <h3>Model-specific diagnostic context</h3>

      <p>
        <b>System:</b>
        ${esc(
          profile.system||
          'Model-specific system information not yet verified'
        )}
      </p>

      ${(profile.notes||[])
        .map(n=>`
          <p class="small">
            • ${esc(n)}
          </p>
        `)
        .join('')}

    </div>

    ${w.map(x=>`

      <div class="warning">

        <strong>Safety warning</strong>

        <br>

        ${esc(x)}

      </div>

    `).join('')}

    <div class="card">

      <h3>Possible alternative causes</h3>

      <ul>

        ${d.alternatives
          .map(x=>`<li>${esc(x)}</li>`)
          .join('')}

      </ul>

    </div>

    <div class="card">

      <h3>Recommended tests</h3>

      <ol>

        ${d.tests
          .map(x=>`<li>${esc(x)}</li>`)
          .join('')}

      </ol>

    </div>

    <div class="card">

      <h3>Step-by-step repair guidance</h3>

      <ol class="steps">

        <li>
          Record the exact symptom/error and mower model.
        </li>

        <li>
          Switch off and safely isolate the mower
          before any inspection.
        </li>

        <li>
          Perform the recommended checks in order,
          starting with simple external causes.
        </li>

        <li>
          Confirm a model-specific part number
          before ordering any replacement.
        </li>

        <li>
          Reassemble safely and test using the
          manufacturer's normal operating procedure.
        </li>

      </ol>

    </div>

    ${partCard()}

    ${feedbackCard()}

    <div class="card no-print">

      <h3>Repair report</h3>

      <p>
        Print this diagnosis or save it as PDF
        from your browser.
      </p>

      <div class="actions">

        <button
          class="btn btn-primary"
          onclick="window.print()"
        >
          Print / Save PDF
        </button>

        <button
          class="btn btn-secondary"
          onclick="selectMower()"
        >
          New diagnosis
        </button>

      </div>

    </div>

  `);
}


/*
=========================================================
ERROR CODE LOOKUP
=========================================================
*/

function errorLookup(q){

  q=(q||'').trim().toLowerCase();

  state.errorQuery=q;

  const m=modelInfo();

  const matches=
    ERROR_CODES.filter(e=>
      (!m||e.model===m.model)&&
      (
        (e.code+' '+e.title+' '+e.cause)
          .toLowerCase()
          .includes(q)
        ||!q
      )
    );

  shell(`

    <div class="card">

      <div class="tag">ERROR CODE LOOKUP</div>

      <h2>
        ${m
          ?esc(m.brand+' '+m.model)
          :'All supported models'}
      </h2>

      <div class="search">

        <input
          id="errorSearch"
          value="${esc(q)}"
          placeholder="Exact code or message"
        >

        <button
          class="btn btn-secondary"
          onclick="errorLookup(document.getElementById('errorSearch').value)"
        >
          Search
        </button>

      </div>

      ${
        matches.length
          ?matches.map(e=>`

            <div class="verified">

              <span class="tag">
                ${esc(e.code)}
              </span>

              <h3>
                ${esc(e.title)}
              </h3>

              <p>
                <b>Likely area:</b>
                ${esc(e.cause)}
              </p>

              <p>
                <b>Next step:</b>
                ${esc(e.action)}
              </p>

              <p class="small">

                <b>Source:</b>
                ${esc(e.source)}
                •
                <a
                  href="${esc(e.url)}"
                  target="_blank"
                  rel="noopener"
                >
                  Open source
                </a>

              </p>

            </div>

          `).join('')

          :'<p>No verified matching code/message found for this model. Try the exact text shown on the mower/app, or choose another model.</p>'
      }

      <div class="actions">

        <button
          class="btn btn-primary"
          onclick="selectMower()"
        >
          Diagnose a Fault
        </button>

        <button
          class="btn btn-secondary"
          onclick="home()"
        >
          Home
        </button>

      </div>

    </div>

  `);
}


/*
=========================================================
SITE SEARCH
=========================================================
*/

function searchSite(q){

  q=(q||'').trim().toLowerCase();

  if(!q)return;

  const models=
    MODELS.filter(m=>
      (m.brand+' '+m.model)
        .toLowerCase()
        .includes(q)
    );

  const faults=
    FAULT_LIST.filter(f=>
      f.name.toLowerCase().includes(q)||
      f.id.includes(q)
    );

  const parts=
    PARTS.filter(p=>
      p.partNumber.toLowerCase().includes(q)||
      p.partName.toLowerCase().includes(q)
    );

  const errors=
    ERROR_CODES.filter(e=>
      (
        e.code+
        ' '+
        e.title+
        ' '+
        e.model+
        ' '+
        e.cause
      )
      .toLowerCase()
      .includes(q)
    );

  shell(`

    <div class="card">

      <div class="tag">SEARCH</div>

      <h2>Search results</h2>

      <div class="search">

        <input
          id="siteSearch"
          value="${esc(q)}"
        >

        <button
          class="btn btn-secondary"
          onclick="searchSite(document.getElementById('siteSearch').value)"
        >
          Search
        </button>

      </div>

      ${
        errors.length
          ?`

            <h3>Error codes/messages</h3>

            ${errors.slice(0,12).map(e=>`

              <div class="verified">

                <b>${esc(e.code)}</b>
                — ${esc(e.model)}

                <p class="small">

                  ${esc(e.cause)}

                  <br>

                  <a
                    href="${esc(e.url)}"
                    target="_blank"
                    rel="noopener"
                  >
                    Source
                  </a>

                </p>

              </div>

            `).join('')}

          `
          :''
      }

      ${
        models.length
          ?`

            <h3>Models</h3>

            <ul>

              ${models.map(m=>`

                <li>
                  ${esc(m.brand)}
                  —
                  <b>${esc(m.model)}</b>
                </li>

              `).join('')}

            </ul>

          `
          :''
      }

      ${
        faults.length
          ?`

            <h3>Faults</h3>

            <ul>

              ${faults.map(f=>`

                <li>
                  <b>${esc(f.name)}</b>
                </li>

              `).join('')}

            </ul>

          `
          :''
      }

      ${
        parts.length
          ?`

            <h3>Parts</h3>

            <ul>

              ${parts.slice(0,20).map(p=>`

                <li>
                  <b>${esc(p.partName)}</b>
                  —
                  ${esc(p.partNumber)}
                </li>

              `).join('')}

            </ul>

          `
          :''
      }

      ${
        !models.length&&
        !faults.length&&
        !parts.length&&
        !errors.length
          ?'<p>No matching records found.</p>'
          :''
      }

      <div class="actions">

        <button
          class="btn btn-primary"
          onclick="selectMower()"
        >
          Diagnose a Fault
        </button>

        <button
          class="btn btn-secondary"
          onclick="home()"
        >
          Home
        </button>

      </div>

    </div>

  `);
}


/*
=========================================================
START APP
=========================================================
*/

document.getElementById('homeBtn').onclick=home;

/*
Check whether the customer has returned from Stripe
before showing the normal home screen.
*/

if(!checkStripeReturn()){
  home();
}
