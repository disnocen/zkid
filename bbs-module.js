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
      this.keyPair = await BBS.generateKeyPair({
        ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
      })
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
      secretKey: this.keyPair.secretKey,
      publicKey: this.keyPair.publicKey,
      header: new Uint8Array(0), // Empty header
      messages: messages,
      ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
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
      publicKey: signedCredential.publicKey,
      signature: signedCredential.signature,
      header: new Uint8Array(0), // Empty header
      messages: signedCredential.messages,
      presentationHeader: new Uint8Array(0), // Empty presentation header
      disclosedMessageIndexes: revealedIndices,
      ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
    })

    console.log('BBS Module: Real BBS selective proof created')
    return proof
  }

  async verifyAgeProof(proof, minAge, publicKey) {
    console.log('BBS Module: Verifying real BBS age proof...')

    try {
      const isValid = await BBS.verifyProof({
        publicKey: publicKey,
        proof: proof.proof || proof, // Handle both proof object and raw proof
        header: new Uint8Array(0),
        presentationHeader: new Uint8Array(0),
        disclosedMessages: proof.disclosedMessages || [],
        disclosedMessageIndexes: proof.disclosedMessageIndexes || [],
        ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
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

  // Mock ZK Age Predicate - proves age >= minAge without revealing exact age
  async proveAgePredicate(credential, minAge) {
    console.log('BBS Module: Creating mock ZK age predicate proof...')

    try {
      // Extract age from credential attributes
      let userAge = null
      for (const attr of credential.attributes) {
        const attrStr = new TextDecoder().decode(attr)
        if (attrStr.startsWith('age:')) {
          userAge = parseInt(attrStr.split(':')[1])
          break
        }
      }

      if (userAge === null) {
        throw new Error('Age attribute not found in credential')
      }

      if (userAge < minAge) {
        throw new Error(`Age ${userAge} does not meet minimum requirement of ${minAge}`)
      }

      console.log(`BBS Module: User age ${userAge} meets requirement of ${minAge}+`)

      // Create selective disclosure proof that reveals only anonId (index 0)
      // Age (index 1) is NOT revealed but the proof validates the credential
      const zkProof = await BBS.deriveProof({
        publicKey: credential.issuerPublicKey,
        signature: credential.signature,
        header: new Uint8Array(0),
        messages: credential.attributes,
        presentationHeader: new Uint8Array(0),
        disclosedMessageIndexes: [0], // Only reveal anonId
        ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
      })

      // Mock predicate result - in real implementation this would be a bulletproof
      const predicateProof = {
        type: 'age_gte',
        minAge: minAge,
        satisfied: true,
        // This would be a real zero-knowledge proof in production
        mockProof: `age_gte_${minAge}_proof_${Math.random().toString(36).substr(2, 8)}`
      }

      console.log('BBS Module: Mock ZK age predicate proof created successfully')

      return {
        bbsProof: zkProof,
        predicateProof: predicateProof,
        issuerPublicKey: credential.issuerPublicKey,
        anonId: credential.anonId,
        meetsRequirement: true
      }

    } catch (error) {
      console.error('BBS Module: Error creating ZK age predicate proof:', error)
      throw error
    }
  }

  // Verify a ZK age predicate proof without learning the exact age
  async verifyAgePredicate(proofData, minAge) {
    console.log('BBS Module: Verifying mock ZK age predicate proof...')

    try {
      // For BBS proof verification, we need to know which messages were disclosed
      // In our case, we disclosed index 0 (anonId) during proof generation
      const disclosedIndexes = [0] // We revealed only the anonId

      // Extract the disclosed message (anonId) from the original credential
      // This is a simplification - in a real implementation, this would come from the proof
      const disclosedMessages = [
        new TextEncoder().encode(`anonId:${proofData.anonId}`)
      ]

      console.log('BBS Module: Verifying with disclosed anonId:', proofData.anonId.substring(0, 8) + '...')

      // Verify the BBS proof
      const bbsValid = await BBS.verifyProof({
        publicKey: proofData.issuerPublicKey,
        proof: proofData.bbsProof,
        header: new Uint8Array(0),
        presentationHeader: new Uint8Array(0),
        disclosedMessages: disclosedMessages,
        disclosedMessageIndexes: disclosedIndexes,
        ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
      })

      if (!bbsValid) {
        console.error('BBS Module: BBS proof verification failed')
        return { valid: false, reason: 'Invalid BBS signature proof' }
      }

      console.log('BBS Module: BBS proof verification successful')

      // Mock predicate verification - in real implementation this would verify bulletproof
      const predicateValid = proofData.predicateProof.satisfied &&
                           proofData.predicateProof.minAge === minAge &&
                           proofData.predicateProof.type === 'age_gte'

      if (!predicateValid) {
        return { valid: false, reason: 'Age predicate not satisfied' }
      }

      console.log('BBS Module: ZK age predicate verification successful')

      return {
        valid: true,
        anonId: proofData.anonId,
        ageRequirementMet: true,
        // Exact age is NOT revealed - this is the key privacy property
        exactAgeHidden: true
      }

    } catch (error) {
      console.error('BBS Module: ZK age predicate verification failed:', error)
      return { valid: false, reason: error.message }
    }
  }

  getPublicKey() {
    return this.keyPair?.publicKey
  }
}

export default BBSModule