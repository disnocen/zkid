/** @typedef {import('pear-interface')} */ /* global Pear */
import crypto from 'hypercore-crypto'
import BBSModule from './bbs-module.js'
import CredentialIssuer from './credential-issuer.js'

document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

// Three actors in our system
let credentialIssuer = null
let saraCredential = null
let bbsModule = null
let creditProof = null

// UI elements
const issueCredentialBtn = document.getElementById('issueCredentialBtn')
const proceedToLoanBtn = document.getElementById('proceedToLoanBtn')
const proveCreditBtn = document.getElementById('proveCreditBtn')
const applyBtn = document.getElementById('applyBtn')

// User input elements
const nameInput = document.getElementById('nameInput')
const surnameInput = document.getElementById('surnameInput')
const creditScoreInput = document.getElementById('creditScoreInput')
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
      creditScore: parseInt(creditScoreInput.value),
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
proceedToLoanBtn.addEventListener('click', async () => {
  console.log('=== STEP 1: SARA RECEIVES CREDENTIAL ===')

  try {
    await initBBS()

    // Update UI to show Sara has received her credential
    document.getElementById('issuerName').textContent = credentialIssuer.issuerName
    document.getElementById('saraAnonId').textContent = saraCredential.anonId.substring(0, 16) + '...'
    document.getElementById('step2').style.display = 'block'

    proceedToLoanBtn.disabled = true
    proceedToLoanBtn.textContent = '✓ Credential Received'

  } catch (error) {
    console.error('Error setting up Sara\'s credential:', error)
    alert('Error: ' + error.message)
  }
})

// Step 2: Sara creates zero-knowledge credit proof
proveCreditBtn.addEventListener('click', async () => {
  console.log('=== STEP 2: SARA CREATES ZERO-KNOWLEDGE CREDIT PROOF ===')

  try {
    proveCreditBtn.disabled = true
    proveCreditBtn.textContent = 'Generating ZK Proof...'

    console.log('Sara creating zero-knowledge proof that credit category ≥ fair...')

    // Sara creates ZK proof using her credential
    creditProof = await bbsModule.proveCreditCategoryPredicate(saraCredential, 'fair')

    console.log('Zero-knowledge credit proof generated successfully')
    console.log('Proof reveals: Anonymous ID and credit category only')
    console.log('Proof hides: Exact credit score, name, location, SSN')

    // Update UI
    document.getElementById('creditProofGenerated').style.display = 'block'
    document.getElementById('step3').style.display = 'block'

    proveCreditBtn.textContent = '✓ ZK Proof Generated'

  } catch (error) {
    console.error('Credit proof generation failed:', error)
    alert('Credit proof generation failed: ' + error.message)
    proveCreditBtn.disabled = false
    proveCreditBtn.textContent = '🔐 Prove Credit ≥Fair (Zero-Knowledge)'
  }
})

// Step 3: Car Lender verifies proof and approves financing
applyBtn.addEventListener('click', async () => {
  console.log('=== STEP 3: CAR LENDER VERIFIES AND APPROVES FINANCING ===')

  if (!creditProof) {
    alert('Please generate credit proof first')
    return
  }

  try {
    applyBtn.disabled = true
    applyBtn.textContent = 'Verifying Credit Proof...'

    console.log('Car Lender verifying zero-knowledge credit proof...')

    // Car Lender verifies the proof using the issuer's public key
    const verification = await bbsModule.verifyCreditCategoryPredicate(creditProof, 'fair')

    if (!verification.valid) {
      throw new Error('Credit verification failed: ' + verification.reason)
    }

    console.log('Car Lender verification successful!')
    console.log('Car Lender knows: Credit Category ≥ Fair ✓, Anonymous ID:', verification.anonId.substring(0, 8) + '...')
    console.log('Car Lender does NOT know: Exact credit score, real name, location, SSN')

    applyBtn.textContent = 'Processing Application...'

    // Simulate loan processing
    setTimeout(() => {
      console.log('Car loan application processed')

      document.getElementById('approvalStatus').style.display = 'block'
      document.getElementById('step4').style.display = 'block'

      // Generate loan approval
      const loanId = crypto.randomBytes(8).toString('hex').toUpperCase()
      const shortAnonId = saraCredential.anonId.substring(0, 8) + '...'

      document.getElementById('loanId').textContent = loanId
      document.getElementById('loanAnonId').textContent = shortAnonId

      // QR code contains the ZK proof reference for the dealership
      const qrData = {
        loanId: loanId,
        proofReference: creditProof.predicateProof.mockProof.substring(0, 20) + '...',
        anonId: verification.anonId.substring(0, 16) + '...',
        loanAmount: '$35,000',
        verified: 'credit≥fair',
        timestamp: Date.now()
      }

      const qrString = JSON.stringify(qrData)
      console.log('Loan approval QR data:', qrString)
      document.getElementById('qrDisplay').textContent = qrString.substring(0, 50) + '...'

      applyBtn.textContent = '✓ Loan Approved'

      console.log('=== PRIVACY ACHIEVED ===')
      console.log('✓ Sara proved her credit is fair or better')
      console.log('✓ Car Lender verified the requirement')
      console.log('❌ Sara\'s exact credit score was NEVER revealed!')
      console.log('❌ Sara\'s real name, location, SSN remain private!')

    }, 2000)

  } catch (error) {
    console.error('Loan application failed:', error)
    alert('Loan application failed: ' + error.message)
    applyBtn.disabled = false
    applyBtn.textContent = '🚗 Apply for Car Loan ($35,000)'
  }
})