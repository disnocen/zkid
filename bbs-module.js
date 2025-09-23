// BBS Module - abstracted interface for BBS signatures
// Now using real BBS signatures via bundled library

import * as BBS from './bundled-bbs.js'

console.log('Loading real BBS module...')

class BBSModule {
  constructor() {
    this.keyPair = null
  }

  async init() {
    console.log('BBS Module: Starting real BBS key pair generation...')
    try {
      this.keyPair = await BBS.generateKeyPair()
      console.log('BBS Module: Real BBS key pair generated successfully')
      return this.keyPair
    } catch (error) {
      console.error('BBS Module: Failed to generate BBS key pair:', error)
      throw error
    }
  }

  async createAgeProof(age, anonymousId) {
    console.log('BBS Module: Creating real BBS age proof...')

    if (!this.keyPair) {
      throw new Error('BBS module not initialized. Call init() first.')
    }

    const messages = [
      new TextEncoder().encode(`age:${age}`),
      new TextEncoder().encode(`id:${anonymousId}`),
      new TextEncoder().encode(`timestamp:${Date.now()}`)
    ]

    console.log('BBS Module: Signing messages with real BBS...')

    const signature = await BBS.sign({
      keyPair: this.keyPair,
      messages: messages
    })

    console.log('BBS Module: Real BBS signature created')

    return {
      signature: signature,
      messages: messages,
      publicKey: this.keyPair.publicKey
    }
  }

  async createSelectiveProof(signedCredential, revealedIndices = []) {
    console.log('BBS Module: Creating real BBS selective proof for indices:', revealedIndices)

    const proof = await BBS.deriveProof({
      signature: signedCredential.signature,
      publicKey: signedCredential.publicKey,
      messages: signedCredential.messages,
      disclosedIndexes: revealedIndices
    })

    console.log('BBS Module: Real BBS selective proof created')
    return proof
  }

  async verifyAgeProof(proof, minAge, publicKey) {
    console.log('BBS Module: Verifying real BBS age proof...')

    try {
      const isValid = await BBS.verifyProof({
        proof: proof,
        publicKey: publicKey
      })

      if (!isValid) {
        return { valid: false, reason: 'Invalid proof signature' }
      }

      // For BBS proofs, disclosed messages are included in the proof
      const disclosedMessages = proof.disclosedMessages || []

      for (const message of disclosedMessages) {
        const messageStr = new TextDecoder().decode(message)
        if (messageStr.startsWith('age:')) {
          const age = parseInt(messageStr.split(':')[1])
          if (age >= minAge) {
            console.log('BBS Module: Age verification successful')
            return { valid: true, ageVerified: true }
          } else {
            return { valid: false, reason: `Age ${age} is below minimum ${minAge}` }
          }
        }
      }

      return { valid: true, ageVerified: false, reason: 'Age not revealed in proof' }
    } catch (error) {
      console.error('BBS Module: Verification error:', error)
      return { valid: false, reason: error.message }
    }
  }

  async generateAgeOnlyProof(age, anonymousId, minAge) {
    console.log('BBS Module: Generating zero-knowledge age proof for age:', age, 'minAge:', minAge)

    try {
      // First create a BBS signature over all attributes
      const credential = await this.createAgeProof(age, anonymousId)
      console.log('BBS Module: Created BBS credential with all attributes')

      if (age >= minAge) {
        // Create a zero-knowledge proof that reveals ONLY the anonymousId (index 1)
        // The age (index 0) is NOT revealed, but the proof still validates
        // This proves the person has the credential without revealing their exact age
        const zkProof = await this.createSelectiveProof(credential, [1]) // Only reveal anonymousId

        console.log('BBS Module: Generated zero-knowledge proof - age hidden, ID revealed')

        return {
          proof: zkProof,
          meetsRequirement: true,
          anonymousId,
          publicKey: this.keyPair.publicKey
        }
      } else {
        throw new Error(`Age ${age} does not meet minimum requirement of ${minAge}`)
      }
    } catch (error) {
      console.error('BBS Module: Error generating zero-knowledge age proof:', error)
      throw error
    }
  }

  getPublicKey() {
    return this.keyPair?.publicKey
  }
}

export default BBSModule