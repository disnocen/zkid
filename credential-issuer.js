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
  generateAnonymousId(name, surname, birthdate, location, ssn) {
    const identityString = `${name}:${surname}:${birthdate}:${location}:${ssn}`
    const hash = crypto.hash(Buffer.from(identityString))
    return hash.toString('hex')
  }

  // Issue a credential for a user with their verified attributes
  async issueCredential(userInfo) {
    console.log(`${this.issuerName}: Issuing credential for user...`)

    if (!this.keyPair) {
      throw new Error('Issuer not initialized. Call init() first.')
    }

    const { name, surname, age, birthdate, location, ssn } = userInfo

    // Generate anonymous ID from real identity
    const anonId = this.generateAnonymousId(name, surname, birthdate, location, ssn)

    // Create additional hashes for privacy
    const nameHash = crypto.hash(Buffer.from(`${name}:${surname}`)).toString('hex')
    const locationHash = crypto.hash(Buffer.from(location)).toString('hex')
    const ssnHash = crypto.hash(Buffer.from(ssn)).toString('hex')
    const randomNonce = crypto.randomBytes(16).toString('hex')

    // Encode all attributes as messages for BBS signing
    const attributes = [
      new TextEncoder().encode(`anonId:${anonId}`),
      new TextEncoder().encode(`age:${age}`),
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
      attributeLabels: ['anonId', 'age', 'nameHash', 'locationHash', 'ssnHash', 'nonce'],
      issuerPublicKey: this.keyPair.publicKey,
      issuerName: this.issuerName,
      issuedAt: Date.now(),
      anonId: anonId
    }

    // Store issued credential
    this.issuedCredentials.set(anonId, credential)

    console.log(`${this.issuerName}: Credential issued successfully for anonymous ID: ${anonId.substring(0, 8)}...`)

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