// Credential Issuer Module - Government/Company that issues identity credentials
// Issues BBS signed credentials containing Sara's verified attributes

import * as BBS from './bundled-bbs.js'
import crypto from 'hypercore-crypto'

class CredentialIssuer {
  constructor(issuerName = 'Government Identity Authority') {
    this.issuerName = issuerName
    this.keyPair = null
    this.issuedCredentials = new Map() // Track issued credentials
  }

  async init() {
    console.log(`${this.issuerName}: Initializing issuer key pair...`)
    try {
      this.keyPair = await BBS.generateKeyPair({
        ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
      })
      console.log(`${this.issuerName}: Issuer key pair generated successfully`)
      return this.keyPair
    } catch (error) {
      console.error(`${this.issuerName}: Failed to generate key pair:`, error)
      throw error
    }
  }

  // Generate anonymous ID from user's real identity data
  // Private key = hash of real identity, Public key = anonymous ID
  generateAnonymousId(name, surname, birthdate, location, ssn) {
    const identityString = `${name}:${surname}:${birthdate}:${location}:${ssn}`
    const identityHash = crypto.hash(Buffer.from(identityString))

    // Use the hash as the private key to generate a deterministic key pair
    const keyPair = crypto.keyPair(identityHash)

    return {
      anonId: keyPair.publicKey.toString('hex'), // This is the anonymous ID (public key)
      privateKey: identityHash.toString('hex'),   // Private key derived from real identity
      keyPair: keyPair
    }
  }

  // Determine credit score category
  getCreditScoreCategory(creditScore) {
    if (creditScore >= 0 && creditScore <= 300) return "poor"
    if (creditScore >= 301 && creditScore <= 600) return "fair"
    if (creditScore >= 601 && creditScore <= 800) return "good"
    if (creditScore >= 801) return "excellent"
    throw new Error("Invalid credit score")
  }

  // Issue a credential for a user with their verified attributes
  async issueCredential(userInfo) {
    console.log(`${this.issuerName}: Issuing credential for user...`)

    if (!this.keyPair) {
      throw new Error('Issuer not initialized. Call init() first.')
    }

    const { name, surname, creditScore, birthdate, location, ssn } = userInfo

    // Generate anonymous ID (public key) from real identity hash (private key)
    const identityKeys = this.generateAnonymousId(name, surname, birthdate, location, ssn)

    // Determine credit score category
    const creditScoreCategory = this.getCreditScoreCategory(creditScore)

    // Create mock accumulator reference instead of storing exact score
    const accumulatorRef = crypto.hash(Buffer.from(`credit_accumulator_${creditScore}_${identityKeys.anonId}`)).toString('hex').substring(0, 16)

    // Create additional hashes for privacy
    const nameHash = crypto.hash(Buffer.from(`${name}:${surname}`)).toString('hex')
    const locationHash = crypto.hash(Buffer.from(location)).toString('hex')
    const ssnHash = crypto.hash(Buffer.from(ssn)).toString('hex')
    const randomNonce = crypto.randomBytes(16).toString('hex')

    // Encode all attributes as messages for BBS signing
    // Note: We store the category for ZK proof generation but never reveal it
    const attributes = [
      new TextEncoder().encode(`anonId:${identityKeys.anonId}`),
      new TextEncoder().encode(`creditAccumulator:${accumulatorRef}`),
      new TextEncoder().encode(`creditCategory:${creditScoreCategory}`), // Hidden, used only for ZK proofs
      new TextEncoder().encode(`nameHash:${nameHash}`),
      new TextEncoder().encode(`locationHash:${locationHash}`),
      new TextEncoder().encode(`ssnHash:${ssnHash}`),
      new TextEncoder().encode(`nonce:${randomNonce}`)
    ]

    console.log(`${this.issuerName}: Signing attributes with BBS...`)

    // Sign all attributes with BBS
    const signature = await BBS.sign({
      secretKey: this.keyPair.secretKey,
      publicKey: this.keyPair.publicKey,
      header: new Uint8Array(0),
      messages: attributes,
      ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
    })

    const credential = {
      signature: signature,
      attributes: attributes,
      attributeLabels: ['anonId', 'creditAccumulator', 'creditCategory', 'nameHash', 'locationHash', 'ssnHash', 'nonce'],
      issuerPublicKey: this.keyPair.publicKey,
      issuerName: this.issuerName,
      issuedAt: Date.now(),
      anonId: identityKeys.anonId,
      identityKeyPair: identityKeys.keyPair // Include the key pair for Sara's use
    }

    // Store issued credential
    this.issuedCredentials.set(identityKeys.anonId, credential)

    console.log(`${this.issuerName}: Credential issued successfully for anonymous ID: ${identityKeys.anonId.substring(0, 8)}...`)

    return credential
  }

  // Verify a credential was issued by this issuer
  async verifyCredential(credential) {
    try {
      const isValid = await BBS.verifySignature({
        publicKey: credential.issuerPublicKey,
        signature: credential.signature,
        header: new Uint8Array(0),
        messages: credential.attributes,
        ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
      })

      return {
        valid: isValid,
        issuer: this.issuerName,
        anonId: credential.anonId
      }
    } catch (error) {
      console.error(`${this.issuerName}: Credential verification failed:`, error)
      return { valid: false, reason: error.message }
    }
  }

  getPublicKey() {
    return this.keyPair?.publicKey
  }

  getIssuerInfo() {
    return {
      name: this.issuerName,
      publicKey: this.keyPair?.publicKey,
      totalCredentialsIssued: this.issuedCredentials.size
    }
  }
}

export default CredentialIssuer