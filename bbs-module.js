// BBS Module - abstracted interface for BBS signatures
// Currently using a mock implementation for Pear compatibility

console.log('Loading BBS module...')

class BBSModule {
  constructor() {
    this.keyPair = null
  }

  async init() {
    console.log('BBS Module: Starting mock key pair generation...')
    try {
      // Mock BBS key pair for PoC
      this.keyPair = {
        publicKey: 'mock-bbs-public-key-' + Math.random().toString(36).substr(2, 9),
        privateKey: 'mock-bbs-private-key-' + Math.random().toString(36).substr(2, 9)
      }
      console.log('BBS Module: Mock key pair generated successfully')
      return this.keyPair
    } catch (error) {
      console.error('BBS Module: Failed to generate mock key pair:', error)
      throw error
    }
  }

  async createAgeProof(age, anonymousId) {
    console.log('BBS Module: Creating mock age proof...')

    if (!this.keyPair) {
      throw new Error('BBS module not initialized. Call init() first.')
    }

    const messages = [
      `age:${age}`,
      `id:${anonymousId}`,
      `timestamp:${Date.now()}`
    ]

    // Mock BBS signature for PoC
    const signature = `mock-bbs-signature-${Math.random().toString(36).substr(2, 16)}`

    console.log('BBS Module: Mock age proof created with messages:', messages)

    return {
      signature: signature,
      messages: messages,
      publicKey: this.keyPair.publicKey
    }
  }

  async createSelectiveProof(signedCredential, revealedIndices = []) {
    console.log('BBS Module: Creating mock selective proof for indices:', revealedIndices)

    // Mock selective proof for PoC
    const proof = {
      proof: `mock-selective-proof-${Math.random().toString(36).substr(2, 16)}`,
      revealedMessages: revealedIndices.map(i => signedCredential.messages[i]),
      publicKey: signedCredential.publicKey
    }

    console.log('BBS Module: Mock selective proof created')
    return proof
  }

  async verifyAgeProof(proof, minAge) {
    console.log('BBS Module: Verifying mock age proof...')

    try {
      // Mock verification - always valid for PoC
      const isValid = true

      if (!isValid) {
        return { valid: false, reason: 'Invalid proof signature' }
      }

      const revealedMessages = proof.revealedMessages || []

      for (const message of revealedMessages) {
        const messageStr = message.toString()
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
    console.log('BBS Module: Generating age proof for age:', age, 'minAge:', minAge)

    try {
      const credential = await this.createAgeProof(age, anonymousId)
      console.log('BBS Module: Created age credential')

      if (age >= minAge) {
        const ageOnlyProof = await this.createSelectiveProof(credential, [0])
        console.log('BBS Module: Generated selective proof')
        return {
          proof: ageOnlyProof,
          meetsRequirement: true,
          anonymousId
        }
      } else {
        throw new Error(`Age ${age} does not meet minimum requirement of ${minAge}`)
      }
    } catch (error) {
      console.error('BBS Module: Error generating age proof:', error)
      throw error
    }
  }

  getPublicKey() {
    return this.keyPair?.publicKey
  }
}

export default BBSModule