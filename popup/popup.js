let currentProfile = null
let profiles = []
let settings = {}

function normalizeProfile(profile) {
  if (!profile) return { ...DEFAULT_PROFILE }
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    personal: { ...DEFAULT_PROFILE.personal, ...profile.personal },
    professional: { ...DEFAULT_PROFILE.professional, ...profile.professional },
    employment: Array.isArray(profile.employment) ? profile.employment : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    resume: profile.resume || { filename: '', data: '' }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const storage = await getStorage()
  profiles = storage.profiles
  settings = storage.settings
  currentProfile = profiles.find(p => p.id === settings.activeProfile) || profiles[0]
  
  // Ensure profile has all required fields
  currentProfile = normalizeProfile(currentProfile)

  renderProfiles()
  renderTabs()
  loadProfileIntoForm()
  updatePlatformBadge()

  document.getElementById('saveProfile').addEventListener('click', onSaveProfile)
  document.getElementById('fillForm').addEventListener('click', onFillForm)
  document.getElementById('clearForm').addEventListener('click', onClearForm)
  document.getElementById('addEmployment').addEventListener('click', () => addEntry('employment'))
  document.getElementById('addEducation').addEventListener('click', () => addEntry('education'))
  document.getElementById('autoFillDelay').addEventListener('change', onSettingsChange)
  document.getElementById('profileSelect').addEventListener('change', onProfileChange)
  document.getElementById('exportProfiles').addEventListener('click', onExportProfiles)
  document.getElementById('importProfiles').addEventListener('click', () => {
    document.getElementById('importFile').click()
  })
  document.getElementById('importFile').addEventListener('change', onImportProfiles)

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active')
    })
  })
})

function renderProfiles() {
  const select = document.getElementById('profileSelect')
  select.innerHTML = profiles.map(p =>
    `<option value="${p.id}" ${p.id === currentProfile.id ? 'selected' : ''}>${p.name}</option>`
  ).join('')
}

function renderTabs() {
  renderEntries('employment')
  renderEntries('education')
}

function loadProfileIntoForm() {
  const p = currentProfile.personal || {}
  setVal('fullName', p.fullName)
  setVal('email', p.email)
  setVal('phone', p.phone)
  setVal('address', p.address)
  setVal('city', p.city)
  setVal('state', p.state)
  setVal('zip', p.zip)
  setVal('linkedin', p.linkedin)
  setVal('portfolio', p.portfolio)
  setVal('workAuthorized', p.workAuthorized || 'yes')

  const prof = currentProfile.professional || {}
  setVal('headline', prof.headline)
  setVal('summary', prof.summary)
  setVal('skills', Array.isArray(prof.skills) ? prof.skills.join(', ') : '')

  setVal('autoFillDelay', settings.autoFillDelay)
}

function renderEntries(type) {
  const list = document.getElementById(`${type}List`)
  const items = Array.isArray(currentProfile[type]) ? currentProfile[type] : []
  list.innerHTML = items.map((item, i) => `
    <div class="entry-item">
      <span class="remove" data-type="${type}" data-index="${i}">&times;</span>
      ${type === 'employment' ? `
        <label>Company <input value="${esc(item.company)}" data-entry="${type}.${i}.company"></label>
        <label>Title <input value="${esc(item.title)}" data-entry="${type}.${i}.title"></label>
        <div class="row">
          <label>Start <input value="${esc(item.startDate)}" data-entry="${type}.${i}.startDate" placeholder="YYYY-MM"></label>
          <label>End <input value="${esc(item.endDate)}" data-entry="${type}.${i}.endDate" placeholder="YYYY-MM"></label>
        </div>
        <label>Description <textarea rows="2" data-entry="${type}.${i}.description">${esc(item.description)}</textarea></label>
      ` : `
        <label>School <input value="${esc(item.institution)}" data-entry="${type}.${i}.institution"></label>
        <label>Degree <input value="${esc(item.degree)}" data-entry="${type}.${i}.degree"></label>
        <div class="row">
          <label>Field <input value="${esc(item.field)}" data-entry="${type}.${i}.field"></label>
          <label>GPA <input value="${esc(item.gpa)}" data-entry="${type}.${i}.gpa"></label>
        </div>
      `}
    </div>
  `).join('')

  list.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', () => {
      currentProfile[type].splice(parseInt(el.dataset.index), 1)
      renderEntries(type)
    })
  })

  list.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('change', () => {
      const path = el.dataset.entry.split('.')
      if (path.length === 3) {
        const [, idx, field] = path
        currentProfile[type][parseInt(idx)][field] = el.value
      }
    })
  })
}

function addEntry(type) {
  const empty = type === 'employment'
    ? { company: '', title: '', startDate: '', endDate: '', current: false, description: '' }
    : { institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' }
  if (!Array.isArray(currentProfile[type])) {
    currentProfile[type] = []
  }
  currentProfile[type].push(empty)
  renderEntries(type)
}

async function onSaveProfile() {
  currentProfile.personal = {
    fullName: getVal('fullName'), email: getVal('email'), phone: getVal('phone'),
    address: getVal('address'), city: getVal('city'), state: getVal('state'),
    zip: getVal('zip'), linkedin: getVal('linkedin'), portfolio: getVal('portfolio'),
    website: '', country: 'US', workAuthorized: getVal('workAuthorized'),
  }
  currentProfile.professional = {
    headline: getVal('headline'), summary: getVal('summary'),
    skills: getVal('skills').split(',').map(s => s.trim()).filter(Boolean),
    languages: [], certifications: [],
  }
  
  // Ensure employment and education arrays exist
  if (!Array.isArray(currentProfile.employment)) {
    currentProfile.employment = []
  }
  if (!Array.isArray(currentProfile.education)) {
    currentProfile.education = []
  }

  const idx = profiles.findIndex(p => p.id === currentProfile.id)
  if (idx >= 0) profiles[idx] = currentProfile
  else profiles.push(currentProfile)

  try {
    await saveProfiles(profiles)
    setStatus('Profile saved ✓', '#2e7d32')
  } catch (e) {
    setStatus('Error saving profile', '#d32f2f')
    console.error('Save error:', e)
  }
}

async function onFillForm() {
  setStatus('Filling application...', '#f57c00')
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'FILL_JOB_APPLICATION' })
  } catch (e) {
    setStatus('Refresh page and try again', '#d32f2f')
  }
}

async function onClearForm() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_FIELDS' })
    setStatus('Fields cleared', '#555')
  } catch (e) {
    setStatus('Refresh page and try again', '#d32f2f')
  }
}

async function onSettingsChange() {
  settings.autoFillDelay = parseInt(getVal('autoFillDelay')) || 300
  await saveSettings(settings)
}

async function onProfileChange() {
  const id = document.getElementById('profileSelect').value
  currentProfile = profiles.find(p => p.id === id) || profiles[0]
  currentProfile = normalizeProfile(currentProfile)
  settings.activeProfile = id
  await saveSettings(settings)
  loadProfileIntoForm()
  renderTabs()
}

function updatePlatformBadge() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]?.url) return
    const badge = document.getElementById('platformBadge')
    const url = tabs[0].url
    if (url.includes('linkedin.com')) { 
      badge.textContent = 'LinkedIn'
      badge.className = 'platform-badge active' 
    } else if (url.includes('indeed.com')) { 
      badge.textContent = 'Indeed'
      badge.className = 'platform-badge active' 
    } else if (url.startsWith('https')) {
      badge.textContent = 'Job Site'
      badge.className = 'platform-badge active'
    } else { 
      badge.textContent = 'Not Supported'
      badge.className = 'platform-badge' 
    }
  })
}

function setVal(id, val) {
  const el = document.getElementById(id)
  if (el) el.value = val ?? ''
}
function getVal(id) {
  const el = document.getElementById(id)
  return el ? el.value : ''
}
function esc(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;') }
function setStatus(msg, color) {
  const el = document.getElementById('status')
  el.textContent = msg
  el.style.color = color || '#888'
  setTimeout(() => { el.textContent = '' }, 3000)
}

async function onExportProfiles() {
  const { profiles, settings } = await getStorage()
  const data = {
    version: '1.0.0',
    exported: new Date().toISOString(),
    profiles,
    settings
  }
  
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `job-whiz-profiles-${new Date().getTime()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  setStatus('Profiles exported ✓', '#2e7d32')
}

async function onImportProfiles(e) {
  const file = e.target.files[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    if (!data.profiles || !Array.isArray(data.profiles)) {
      setStatus('Invalid backup file', '#d32f2f')
      return
    }
    
    await saveProfiles(data.profiles)
    if (data.settings) {
      await saveSettings(data.settings)
    }
    
    profiles = data.profiles
    settings = data.settings || settings
    currentProfile = profiles.find(p => p.id === settings.activeProfile) || profiles[0]
    currentProfile = normalizeProfile(currentProfile)
    
    renderProfiles()
    renderTabs()
    loadProfileIntoForm()
    setStatus('Profiles imported ✓', '#2e7d32')
  } catch (err) {
    console.error('Import error:', err)
    setStatus('Error importing profiles', '#d32f2f')
  }
  
  e.target.value = ''
}
