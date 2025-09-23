/** @typedef {import('pear-interface')} */ /* global Pear */
import crypto from 'hypercore-crypto'
import BBSModule from './bbs-module.js'
import CredentialIssuer from './credential-issuer.js'

document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

// Three actors in our system
let credentialIssuer = null
let saraCredential = null
let bbsModule = null
let ageProof = null

// UI elements
const issueCredentialBtn = document.getElementById('issueCredentialBtn')
const proceedToTicketBtn = document.getElementById('proceedToTicketBtn')
const proveAgeBtn = document.getElementById('proveAgeBtn')
const purchaseBtn = document.getElementById('purchaseBtn')

// User input elements
const nameInput = document.getElementById('nameInput')
const surnameInput = document.getElementById('surnameInput')
const realAgeInput = document.getElementById('realAgeInput')
const birthdateInput = document.getElementById('birthdateInput')
const locationInput = document.getElementById('locationInput')
const ssnInput = document.getElementById('ssnInput')

async function initIssuer() {
  console.log('Initializing credential issuer...')
  if (!credentialIssuer) {
    credentialIssuer = new CredentialIssuer('Government Identity Authority')
    await credentialIssuer.init()
    console.log('Credential issuer initialized successfully')
  }
}

async function initBBS() {
  console.log('Initializing BBS module for Sara...')
  if (!bbsModule) {
    bbsModule = new BBSModule()
    await bbsModule.init()
    console.log('BBS module for Sara initialized successfully')
  }
}

// Step 0: Credential Issuance (Government/Company issues Sara's credential)
issueCredentialBtn.addEventListener('click', async () => {
  console.log('=== STEP 0: CREDENTIAL ISSUANCE ===')

  try {
    issueCredentialBtn.disabled = true
    issueCredentialBtn.textContent = 'Issuing Credential...'

    // Initialize issuer
    await initIssuer()

    // Collect Sara's real identity information
    const userInfo = {
      name: nameInput.value,
      surname: surnameInput.value,
      age: parseInt(realAgeInput.value),
      birthdate: birthdateInput.value,
      location: locationInput.value,
      ssn: ssnInput.value
    }

    console.log('Government issuing credential for:', userInfo.name, userInfo.surname)

    // Government issues credential with BBS signature
    saraCredential = await credentialIssuer.issueCredential(userInfo)

    console.log('Credential issued successfully:', saraCredential.anonId.substring(0, 8) + '...')

    // Update UI
    document.getElementById('issuedAnonId').textContent = saraCredential.anonId.substring(0, 16) + '...'
    document.getElementById('credentialIssued').style.display = 'block'
    document.getElementById('step1').style.display = 'block'

    issueCredentialBtn.textContent = '✓ Credential Issued'

  } catch (error) {
    console.error('Credential issuance failed:', error)
    alert('Credential issuance failed: ' + error.message)
    issueCredentialBtn.disabled = false
    issueCredentialBtn.textContent = '🏛️ Issue Identity Credential'
  }
})

// Step 1: Sara receives her credential
proceedToTicketBtn.addEventListener('click', async () => {
  console.log('=== STEP 1: SARA RECEIVES CREDENTIAL ===')

  try {
    await initBBS()

    // Update UI to show Sara has received her credential
    document.getElementById('issuerName').textContent = credentialIssuer.issuerName
    document.getElementById('saraAnonId').textContent = saraCredential.anonId.substring(0, 16) + '...'
    document.getElementById('step2').style.display = 'block'

    proceedToTicketBtn.disabled = true
    proceedToTicketBtn.textContent = '✓ Credential Received'

  } catch (error) {
    console.error('Error setting up Sara\'s credential:', error)
    alert('Error: ' + error.message)
  }
})

// Step 2: Sara creates zero-knowledge age proof
proveAgeBtn.addEventListener('click', async () => {
  console.log('=== STEP 2: SARA CREATES ZERO-KNOWLEDGE AGE PROOF ===')

  try {
    proveAgeBtn.disabled = true
    proveAgeBtn.textContent = 'Generating ZK Proof...'

    console.log('Sara creating zero-knowledge proof that age ≥ 18...')

    // Sara creates ZK proof using her credential
    ageProof = await bbsModule.proveAgePredicate(saraCredential, 18)

    console.log('Zero-knowledge age proof generated successfully')
    console.log('Proof reveals: Anonymous ID only')
    console.log('Proof hides: Exact age, name, location, SSN')

    // Update UI
    document.getElementById('ageProofGenerated').style.display = 'block'
    document.getElementById('step3').style.display = 'block'

    proveAgeBtn.textContent = '✓ ZK Proof Generated'

  } catch (error) {
    console.error('Age proof generation failed:', error)
    alert('Age proof generation failed: ' + error.message)
    proveAgeBtn.disabled = false
    proveAgeBtn.textContent = '🔐 Prove Age ≥18 (Zero-Knowledge)'
  }
})

// Step 3: Ticket Manager verifies proof and sells ticket
purchaseBtn.addEventListener('click', async () => {
  console.log('=== STEP 3: TICKET MANAGER VERIFIES AND SELLS TICKET ===')

  if (!ageProof) {
    alert('Please generate age proof first')
    return
  }

  try {
    purchaseBtn.disabled = true
    purchaseBtn.textContent = 'Verifying Age Proof...'

    console.log('Ticket Manager verifying zero-knowledge age proof...')

    // Ticket Manager verifies the proof using the issuer's public key
    const verification = await bbsModule.verifyAgePredicate(ageProof, 18)

    if (!verification.valid) {
      throw new Error('Age verification failed: ' + verification.reason)
    }

    console.log('Ticket Manager verification successful!')
    console.log('Ticket Manager knows: Age ≥ 18 ✓, Anonymous ID:', verification.anonId.substring(0, 8) + '...')
    console.log('Ticket Manager does NOT know: Exact age, real name, location, SSN')

    purchaseBtn.textContent = 'Processing Payment...'

    // Simulate Lightning payment
    setTimeout(() => {
      console.log('Lightning payment completed')

      document.getElementById('purchaseStatus').style.display = 'block'
      document.getElementById('step4').style.display = 'block'

      // Generate ticket
      const ticketId = crypto.randomBytes(8).toString('hex').toUpperCase()
      const shortAnonId = saraCredential.anonId.substring(0, 8) + '...'

      document.getElementById('ticketId').textContent = ticketId
      document.getElementById('ticketAnonId').textContent = shortAnonId

      // QR code contains the ZK proof reference, not raw data
      const qrData = {
        ticketId: ticketId,
        proofReference: ageProof.predicateProof.mockProof.substring(0, 20) + '...',
        anonId: verification.anonId.substring(0, 16) + '...',
        event: 'Electronic Music Festival 2024',
        verified: 'age≥18',
        timestamp: Date.now()
      }

      const qrString = JSON.stringify(qrData)
      console.log('Ticket QR data:', qrString)
      document.getElementById('qrDisplay').textContent = qrString.substring(0, 50) + '...'

      purchaseBtn.textContent = '✓ Ticket Purchased'

      console.log('=== PRIVACY ACHIEVED ===')
      console.log('✓ Sara proved she\'s over 18')
      console.log('✓ Ticket Manager verified the requirement')
      console.log('❌ Sara\'s exact age (22) was NEVER revealed!')
      console.log('❌ Sara\'s real name, location, SSN remain private!')

    }, 2000)

  } catch (error) {
    console.error('Ticket purchase failed:', error)
    alert('Ticket purchase failed: ' + error.message)
    purchaseBtn.disabled = false
    purchaseBtn.textContent = '🎟️ Purchase with Lightning ⚡ ($150 BTC)'
  }
})