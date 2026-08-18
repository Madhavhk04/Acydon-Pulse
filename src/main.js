import './style.css';

// ==========================================
// 1. DATA AND STATES FOR SIMULATION
// ==========================================

const MOCK_JOB_TEMPLATES = [
  {
    name: 'ProcessPayment',
    status: 'SUCCESS',
    duration: '184ms',
    durationVal: 0.184,
    worker: 'worker-01',
    attempts: 1,
    args: '{\n  "charge_id": "ch_3M4o9L",\n  "amount": 2900,\n  "currency": "usd"\n}',
    sql: 'SELECT * FROM users WHERE stripe_id = \'usr_92a1\';\nUPDATE billing_info SET paid = true WHERE user_id = 1290;'
  },
  {
    name: 'SendWelcomeEmail',
    status: 'SUCCESS',
    duration: '92ms',
    durationVal: 0.092,
    worker: 'worker-02',
    attempts: 1,
    args: '{\n  "user_id": 10482,\n  "template": "welcome_v2",\n  "email": "jane.doe@gmail.com"\n}',
    sql: 'SELECT email, name FROM users WHERE id = 10482;'
  },
  {
    name: 'SyncInventory',
    status: 'WARNING',
    duration: '1.84s',
    durationVal: 1.84,
    worker: 'worker-04',
    attempts: 2,
    args: '{\n  "warehouse_id": "wh_east",\n  "sync_all": true,\n  "batch_size": 500\n}',
    sql: 'SELECT COUNT(*) FROM inventory WHERE synced = false;\nUPDATE inventory SET synced = true WHERE warehouse_id = \'wh_east\';'
  },
  {
    name: 'GenerateInvoice',
    status: 'SUCCESS',
    duration: '327ms',
    durationVal: 0.327,
    worker: 'worker-01',
    attempts: 1,
    args: '{\n  "invoice_id": "inv_99812",\n  "draft": false,\n  "send_email": true\n}',
    sql: 'SELECT * FROM invoices WHERE id = \'inv_99812\';\nINSERT INTO audit_logs (event, timestamp) VALUES (\'invoice_generated\', NOW());'
  },
  {
    name: 'UpdateSubscription',
    status: 'FAILED',
    duration: '2.41s',
    durationVal: 2.41,
    worker: 'worker-03',
    attempts: 3,
    args: '{\n  "customer_id": 48291,\n  "plan": "pro",\n  "cycle": "yearly"\n}',
    sql: 'UPDATE subscriptions\nSET status = \'active\'\nWHERE customer_id = 48291;\n-- STUCK ON SOCKET READ TIMEOUT FROM STRIPE GATEWAY'
  },
  {
    name: 'BackupDatabase',
    status: 'SUCCESS',
    duration: '4.12s',
    durationVal: 4.12,
    worker: 'worker-03',
    attempts: 1,
    args: '{\n  "compress": true,\n  "destination": "s3://production-backups-bucket/daily/"\n}',
    sql: 'SELECT pg_start_backup(\'pulse_backup\');\nSELECT pg_stop_backup();'
  },
  {
    name: 'PruneSessions',
    status: 'SUCCESS',
    duration: '612ms',
    durationVal: 0.612,
    worker: 'worker-02',
    attempts: 1,
    args: '{\n  "threshold_days": 30,\n  "batch_limit": 1000\n}',
    sql: 'DELETE FROM sessions WHERE last_active < NOW() - INTERVAL \'30 days\';'
  },
  {
    name: 'ReindexCatalog',
    status: 'WARNING',
    duration: '2.89s',
    durationVal: 2.89,
    worker: 'worker-04',
    attempts: 2,
    args: '{\n  "table": "products",\n  "incremental": true\n}',
    sql: 'VACUUM ANALYZE products;\nREINDEX TABLE products;'
  },
  {
    name: 'WebhookNotification',
    status: 'SUCCESS',
    duration: '145ms',
    durationVal: 0.145,
    worker: 'worker-01',
    attempts: 1,
    args: '{\n  "channel": "#billing-alerts",\n  "text": "Task succeeded successfully"\n}',
    sql: 'SELECT webhook_url FROM integrations WHERE provider = \'slack\';'
  }
];

let activeJobs = [];
let jobCounter = 0;
let processedCount = 0;
let failedCount = 0;
let totalLatencySum = 0;
let selectedJobId = null;

let simSpeed = 1; // 1 = 1x, 2 = 2x, 0 = paused
let simIntervalId = null;

// ==========================================
// 2. DOM ELEMENT REFERENCES
// ==========================================

const activityList = document.getElementById('job-activity-list');
const detailPlaceholder = document.getElementById('detail-placeholder-view');
const detailContent = document.getElementById('detail-content-view');

const detailName = document.getElementById('detail-name');
const detailStatus = document.getElementById('detail-status');
const detailDuration = document.getElementById('detail-duration');
const detailWorker = document.getElementById('detail-worker');
const detailAttempts = document.getElementById('detail-attempts');
const detailArgs = document.getElementById('detail-args');
const detailSql = document.getElementById('detail-sql');
const detailJobIdSub = document.getElementById('detail-job-id');

const processedMetric = document.getElementById('metric-processed');
const failuresMetric = document.getElementById('metric-failures');
const latencyMetric = document.getElementById('metric-latency');

// Speed selectors
const speedBtns = document.querySelectorAll('.btn-speed');

// ==========================================
// 3. LOGIC FOR THE LIVE WORKER ACTIVITY STREAM
// ==========================================

// Pre-fill the console stream with initial items
function initConsoleData() {
  // Clear lists
  activityList.innerHTML = '';
  activeJobs = [];
  
  // Insert initial items matching requirements
  const initialData = [
    MOCK_JOB_TEMPLATES[0], // ProcessPayment
    MOCK_JOB_TEMPLATES[1], // SendWelcomeEmail
    MOCK_JOB_TEMPLATES[2], // SyncInventory
    MOCK_JOB_TEMPLATES[3], // GenerateInvoice
    MOCK_JOB_TEMPLATES[4], // UpdateSubscription
  ];

  initialData.forEach(item => {
    addJobToStream(item, true); // true = historical, add to bottom
  });

  updateMetricsUI();
}

function getStatusSymbol(status) {
  switch (status) {
    case 'SUCCESS':
      return '<span class="job-status-symbol symbol-success">✓</span>';
    case 'WARNING':
      return '<span class="job-status-symbol symbol-warning">⚠</span>';
    case 'FAILED':
      return '<span class="job-status-symbol symbol-failed">✕</span>';
    default:
      return '';
  }
}

function addJobToStream(template, addToBottom = false) {
  const jobId = `job_${++jobCounter}_` + Math.floor(Math.random() * 1000);
  const newJob = {
    ...template,
    id: jobId
  };

  if (addToBottom) {
    activeJobs.push(newJob);
  } else {
    activeJobs.unshift(newJob);
  }

  // Calculate statistics
  processedCount++;
  if (newJob.status === 'FAILED') {
    failedCount++;
  }
  totalLatencySum += newJob.durationVal;

  // Keep list bounded to 25 items
  if (activeJobs.length > 25) {
    const popped = activeJobs.pop();
    if (selectedJobId === popped.id) {
      // If we popped the selected job, clear the highlight
      selectedJobId = null;
    }
  }

  renderJobRow(newJob, addToBottom);
  updateMetricsUI();
}

function renderJobRow(job, addToBottom = false) {
  const row = document.createElement('div');
  row.className = `job-row ${selectedJobId === job.id ? 'active' : ''}`;
  row.setAttribute('data-id', job.id);
  
  row.innerHTML = `
    ${getStatusSymbol(job.status)}
    <span class="job-name-text">${job.name}</span>
    <span class="job-duration-text">${job.status === 'FAILED' ? 'FAILED' : job.duration}</span>
  `;

  row.addEventListener('click', () => {
    selectJob(job.id);
  });

  if (addToBottom) {
    activityList.appendChild(row);
  } else {
    activityList.insertBefore(row, activityList.firstChild);
  }
}

function selectJob(jobId) {
  selectedJobId = jobId;
  
  // Highlight active row in UI
  const rows = activityList.querySelectorAll('.job-row');
  rows.forEach(r => {
    if (r.getAttribute('data-id') === jobId) {
      r.classList.add('active');
    } else {
      r.classList.remove('active');
    }
  });

  // Find job details
  const job = activeJobs.find(j => j.id === jobId);
  if (!job) return;

  // Show detailed panel view
  detailPlaceholder.classList.add('hidden');
  detailContent.classList.remove('hidden');

  detailJobIdSub.textContent = `ID: ${job.id}`;
  detailName.textContent = job.name;
  detailStatus.textContent = job.status;
  
  // Clean badge status classes
  detailStatus.className = 'detail-status-badge';
  if (job.status === 'SUCCESS') detailStatus.classList.add('badge-success');
  if (job.status === 'WARNING') detailStatus.classList.add('badge-warning');
  if (job.status === 'FAILED') detailStatus.classList.add('badge-failed');

  detailDuration.textContent = job.duration;
  detailWorker.textContent = job.worker;
  detailAttempts.textContent = job.attempts;
  detailArgs.textContent = job.args;
  detailSql.textContent = job.sql;
}

function updateMetricsUI() {
  processedMetric.textContent = processedCount;
  
  const failRate = processedCount > 0 ? ((failedCount / processedCount) * 100).toFixed(1) : '0.0';
  failuresMetric.textContent = `${failRate}%`;
  
  const avgLat = processedCount > 0 ? (totalLatencySum / processedCount) : 0.245;
  if (avgLat < 1) {
    latencyMetric.textContent = `${Math.round(avgLat * 1000)}ms`;
  } else {
    latencyMetric.textContent = `${avgLat.toFixed(2)}s`;
  }
}

function runJobSimulation() {
  if (simSpeed === 0) return;

  // Select a random template (bias slightly away from constant failures)
  const randIdx = Math.floor(Math.random() * MOCK_JOB_TEMPLATES.length);
  const template = MOCK_JOB_TEMPLATES[randIdx];
  
  addJobToStream(template, false);
}

function startSimulationTimer() {
  if (simIntervalId) clearInterval(simIntervalId);
  if (simSpeed === 0) return;

  const baseInterval = 3200; // ms
  const interval = baseInterval / simSpeed;

  simIntervalId = setInterval(runJobSimulation, interval);
}

// Setup Speed Listeners
speedBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    speedBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const speed = parseInt(btn.getAttribute('data-speed'), 10);
    simSpeed = speed;

    const dot = document.querySelector('.pulse-status-dot');
    if (speed === 0) {
      dot.className = 'pulse-status-dot paused';
    } else {
      dot.className = 'pulse-status-dot green';
    }

    startSimulationTimer();
  });
});

// Initialize simulation
initConsoleData();
startSimulationTimer();

// Scroll handler to focus view the pulse
const viewPulseBtn = document.getElementById('cta-view-pulse');
if (viewPulseBtn) {
  viewPulseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const section = document.getElementById('interactive-pulse');
    section.scrollIntoView({ behavior: 'smooth' });
    
    // Automatically select the UpdateSubscription failed job to showcase the details details panel
    const subscriptionJob = activeJobs.find(j => j.name === 'UpdateSubscription');
    if (subscriptionJob) {
      setTimeout(() => {
        selectJob(subscriptionJob.id);
      }, 500);
    }
  });
}


// ==========================================
// 4. INTEGRATION TERMINAL LANGUAGE SELECTOR & COPY
// ==========================================

const tabBtns = document.querySelectorAll('.terminal-tab-btn');
const codeBlocks = document.querySelectorAll('.terminal-code');
const copyCodeBtn = document.getElementById('btn-copy-code');
const copyText = document.getElementById('copy-text');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const lang = btn.getAttribute('data-lang');
    codeBlocks.forEach(block => {
      if (block.id === `code-${lang}`) {
        block.classList.add('active');
      } else {
        block.classList.remove('active');
      }
    });
  });
});

if (copyCodeBtn) {
  copyCodeBtn.addEventListener('click', () => {
    const activeCodeBlock = document.querySelector('.terminal-code.active');
    if (!activeCodeBlock) return;

    const textToCopy = activeCodeBlock.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      copyText.textContent = 'Copied!';
      copyCodeBtn.style.borderColor = 'var(--status-success)';
      copyCodeBtn.style.color = 'var(--status-success)';
      
      setTimeout(() => {
        copyText.textContent = 'Copy Code';
        copyCodeBtn.style.borderColor = 'var(--border-light)';
        copyCodeBtn.style.color = 'var(--color-text-muted)';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  });
}


// ==========================================
// 5. EASTER EGG (KONAMI CODE & RETRO TERMINAL)
// ==========================================

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 
  'ArrowDown', 'ArrowDown', 
  'ArrowLeft', 'ArrowRight', 
  'ArrowLeft', 'ArrowRight', 
  'b', 'a'
];
let konamiIndex = 0;

const easterEggConsole = document.getElementById('easter-egg-console');
const closeRetroBtn = document.getElementById('close-retro-btn');
const retroLogOutput = document.getElementById('retro-log-output');
const commandInput = document.getElementById('retro-command-input');
const canvas = document.getElementById('matrix-canvas');

// Keypress Listener for Konami Code
window.addEventListener('keydown', (e) => {
  if (e.key === KONAMI_CODE[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === KONAMI_CODE.length) {
      activateEasterEgg();
      konamiIndex = 0;
    }
  } else {
    // Reset if wrong key
    konamiIndex = 0;
  }
});

// Esc Key closes the retro terminal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !easterEggConsole.classList.contains('hidden')) {
    deactivateEasterEgg();
  }
});

function activateEasterEgg() {
  easterEggConsole.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Lock main scrolling
  initMatrixRain();
  commandInput.focus();
  
  writeRetroLog('>>> INITIALIZING BACKEND SHELL INTERACTIVE PLAYGROUND...', 'text-green');
  writeRetroLog('>>> Type "help" for a list of root terminal operations.', 'text-cyan');
}

function deactivateEasterEgg() {
  easterEggConsole.classList.add('hidden');
  document.body.style.overflow = ''; // Unlock scrolling
  stopMatrixRain();
}

if (closeRetroBtn) {
  closeRetroBtn.addEventListener('click', deactivateEasterEgg);
}

// Retro Console Input Handler
if (commandInput) {
  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = commandInput.value.trim().toLowerCase();
      commandInput.value = '';
      
      if (!cmd) return;
      
      writeRetroLog(`acydon-sysadmin@pulse:~$ ${cmd}`, 'text-green');
      handleRetroCommand(cmd);
    }
  });
}

function writeRetroLog(text, className = '') {
  const p = document.createElement('p');
  if (className) p.className = className;
  p.textContent = text;
  retroLogOutput.appendChild(p);
  retroLogOutput.scrollTop = retroLogOutput.scrollHeight;
}

function handleRetroCommand(cmd) {
  switch (cmd) {
    case 'help':
      writeRetroLog('Available commands:', 'text-cyan');
      writeRetroLog('  help             - Show this dashboard assistance helper menu', 'text-cyan');
      writeRetroLog('  pulse-status     - Check current observability socket status', 'text-cyan');
      writeRetroLog('  kill-worker-03   - Force crash worker-03 simulation to test panic handler', 'text-cyan');
      writeRetroLog('  sys-info         - Fetch detailed client resource statistics', 'text-cyan');
      writeRetroLog('  clear            - Wipe terminal buffer output', 'text-cyan');
      writeRetroLog('  exit             - Return to normal dashboard home page', 'text-cyan');
      break;
    case 'clear':
      retroLogOutput.innerHTML = '';
      break;
    case 'exit':
      deactivateEasterEgg();
      break;
    case 'pulse-status':
      writeRetroLog('MONITOR: 4 nodes active. Pulse gateway: ONLINE.', 'text-green');
      writeRetroLog(`Jobs simulation: processed=${processedCount}, failures=${failedCount}, speed=${simSpeed}x`, 'text-cyan');
      break;
    case 'kill-worker-03':
      writeRetroLog('CRITICAL: Sending SIGTERM to worker-03 [PID: 8812]...', 'text-red');
      writeRetroLog('worker-03 exited with code 139 (Segfault)', 'text-red');
      writeRetroLog('Pulse Agent captured stack trace: segment panic at memory ref 0x48a0ff1.', 'text-yellow');
      writeRetroLog('Autoscaling: Spawning replacement node worker-03-revived...', 'text-green');
      writeRetroLog('worker-03-revived successfully bound to queue.', 'text-green');
      break;
    case 'sys-info':
      writeRetroLog('HOST INFO:', 'text-cyan');
      writeRetroLog('  OS: Alpine Linux 3.19 (Docker Container)', 'text-cyan');
      writeRetroLog('  CPU Load: 12.4% (4 Cores)', 'text-cyan');
      writeRetroLog('  Memory: 412MB / 1024MB', 'text-cyan');
      writeRetroLog('  Observability Overlap Latency: <0.04ms (eBPF Kernel hooks)', 'text-cyan');
      break;
    default:
      writeRetroLog(`bash: command not found: ${cmd}. Type "help" for a list of operations.`, 'text-red');
      break;
  }
}

// Matrix Digital Rain Generator
let matrixIntervalId = null;
const ctx = canvas.getContext('2d');

function initMatrixRain() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const katakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const alphabet = katakana.split('');

  const fontSize = 16;
  const columns = canvas.width / fontSize;

  const rainDrops = [];

  for (let x = 0; x < columns; x++) {
    rainDrops[x] = 1;
  }

  const draw = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#33ff33';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < rainDrops.length; i++) {
      const text = alphabet[Math.floor(Math.random() * alphabet.length)];
      ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

      if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        rainDrops[i] = 0;
      }
      rainDrops[i]++;
    }
  };

  // Redraw matrix canvas on resize
  window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  if (matrixIntervalId) clearInterval(matrixIntervalId);
  matrixIntervalId = setInterval(draw, 30);
}

function stopMatrixRain() {
  if (matrixIntervalId) {
    clearInterval(matrixIntervalId);
    matrixIntervalId = null;
  }
  window.onresize = null;
}
