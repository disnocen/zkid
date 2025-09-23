/** @typedef {import('pear-interface')} */ /* global Pear */
import crypto from 'hypercore-crypto'
import BBSModule from './bbs-module.js'

document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

let anonymousKeyPair = null
let anonymousIdPublic = null
let bbsModule = null
let ageProof = null

const createIdBtn = document.getElementById('createIdBtn')
const verifyAgeBtn = document.getElementById('verifyAgeBtn')
const purchaseBtn = document.getElementById('purchaseBtn')
const ageInput = document.getElementById('ageInput')

async function initBBS() {
  console.log('Initializing BBS module...')
  if (!bbsModule) {
    bbsModule = new BBSModule()
    console.log('Created BBS module instance')
    await bbsModule.init()
    console.log('BBS module initialized successfully')
  }
}

createIdBtn.addEventListener('click', async () => {
  console.log('Creating anonymous ID...')

  try {
    anonymousKeyPair = crypto.keyPair()
    anonymousIdPublic = anonymousKeyPair.publicKey.toString('hex')
    console.log('Anonymous key pair created:', anonymousIdPublic.substring(0, 16) + '...')

    document.getElementById('anonymousId').textContent = anonymousIdPublic.substring(0, 16) + '...'
    document.getElementById('idDisplay').style.display = 'block'
    document.getElementById('step2').style.display = 'block'

    createIdBtn.disabled = true
    createIdBtn.textContent = '✓ Anonymous ID Created'

    await initBBS()
  } catch (error) {
    console.error('Error creating anonymous ID:', error)
    alert('Error creating anonymous ID: ' + error.message)
  }
})

verifyAgeBtn.addEventListener('click', async () => {
  console.log('Starting age verification...')
  const age = parseInt(ageInput.value)
  console.log('Age input:', age)

  if (!age || age < 18) {
    console.log('Invalid age:', age)
    alert('Please enter a valid age (18 or older)')
    return
  }

  if (!anonymousIdPublic) {
    console.log('No anonymous ID found')
    alert('Please create an anonymous ID first')
    return
  }

  try {
    verifyAgeBtn.disabled = true
    verifyAgeBtn.textContent = 'Verifying...'
    console.log('Generating age proof with BBS module...')

    ageProof = await bbsModule.generateAgeOnlyProof(age, anonymousIdPublic, 18)
    console.log('Age proof generated successfully:', ageProof)

    document.getElementById('ageVerification').style.display = 'block'
    document.getElementById('step3').style.display = 'block'

    verifyAgeBtn.textContent = '✓ Age Verified'
    ageInput.disabled = true

  } catch (error) {
    console.error('Age verification failed:', error)
    alert(`Age verification failed: ${error.message}`)
    verifyAgeBtn.disabled = false
    verifyAgeBtn.textContent = 'Verify Age (18+)'
  }
})

purchaseBtn.addEventListener('click', () => {
  console.log('Starting ticket purchase...')

  if (!ageProof) {
    console.log('No age proof found')
    alert('Please verify your age first')
    return
  }

  console.log('Age proof exists, proceeding with purchase')
  purchaseBtn.disabled = true
  purchaseBtn.textContent = 'Processing Payment...'

  setTimeout(() => {
    console.log('Processing Lightning payment simulation...')
    document.getElementById('purchaseStatus').style.display = 'block'
    document.getElementById('step4').style.display = 'block'

    const ticketId = crypto.randomBytes(8).toString('hex').toUpperCase()
    const shortAnonId = anonymousIdPublic.substring(0, 8) + '...'
    console.log('Generated ticket ID:', ticketId)

    document.getElementById('ticketId').textContent = ticketId
    document.getElementById('ticketAnonId').textContent = shortAnonId

    const qrData = {
      ticketId: ticketId,
      anonymousId: anonymousIdPublic,
      ageVerified: true,
      event: 'Electronic Music Festival 2024',
      timestamp: Date.now()
    }

    const qrString = JSON.stringify(qrData)
    console.log('QR data generated:', qrString)
    document.getElementById('qrDisplay').textContent = qrString.substring(0, 100) + '...'

    purchaseBtn.textContent = '✓ Ticket Purchased'
    console.log('Ticket purchase completed successfully')
  }, 2000)
})