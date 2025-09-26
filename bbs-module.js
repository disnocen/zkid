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

  // Determine credit score category
  getCreditScoreCategory(creditScore) {
    if (creditScore >= 0 && creditScore <= 300) return "poor"
    if (creditScore >= 301 && creditScore <= 600) return "fair"
    if (creditScore >= 601 && creditScore <= 800) return "good"
    if (creditScore >= 801) return "excellent"
    throw new Error("Invalid credit score")
  }

  // Mock ZK Credit Score Category Predicate - proves credit category without revealing exact score
  async proveCreditCategoryPredicate(credential, requiredCategory) {
    console.log('BBS Module: Creating mock ZK credit category predicate proof...')

    try {
      // Extract credit score and category from credential attributes
      let userCreditScore = null
      let userCreditCategory = null

      for (const attr of credential.attributes) {
        const attrStr = new TextDecoder().decode(attr)
        if (attrStr.startsWith('creditScore:')) {
          userCreditScore = parseInt(attrStr.split(':')[1])
        }
        if (attrStr.startsWith('creditCategory:')) {
          userCreditCategory = attrStr.split(':')[1]
        }
      }

      if (userCreditScore === null || userCreditCategory === null) {
        throw new Error('Credit score or category attribute not found in credential')
      }

      // Define category hierarchy for comparison
      const categoryOrder = { "poor": 1, "fair": 2, "good": 3, "excellent": 4 }
      const requiredLevel = categoryOrder[requiredCategory]
      const userLevel = categoryOrder[userCreditCategory]

      if (userLevel < requiredLevel) {
        throw new Error(`Credit category ${userCreditCategory} does not meet minimum requirement of ${requiredCategory}`)
      }

      console.log(`BBS Module: User credit category ${userCreditCategory} meets requirement of ${requiredCategory}+`)

      // Create selective disclosure proof that reveals only anonId (index 0) and creditCategory (index 2)
      // CreditScore (index 1) is NOT revealed but the proof validates the credential
      const zkProof = await BBS.deriveProof({
        publicKey: credential.issuerPublicKey,
        signature: credential.signature,
        header: new Uint8Array(0),
        messages: credential.attributes,
        presentationHeader: new Uint8Array(0),
        disclosedMessageIndexes: [0, 2], // Reveal anonId and creditCategory only
        ciphersuite: BBS.CIPHERSUITES.BLS12381_SHAKE256
      })

      // Mock predicate result - in real implementation this would be a bulletproof
      const predicateProof = {
        type: 'credit_category_gte',
        requiredCategory: requiredCategory,
        userCategory: userCreditCategory,
        satisfied: true,
        // This would be a real zero-knowledge proof in production
        mockProof: `credit_cat_${requiredCategory}_proof_${Math.random().toString(36).substr(2, 8)}`
      }

      console.log('BBS Module: Mock ZK credit category predicate proof created successfully')

      return {
        bbsProof: zkProof,
        predicateProof: predicateProof,
        issuerPublicKey: credential.issuerPublicKey,
        anonId: credential.anonId,
        userCategory: userCreditCategory,
        meetsRequirement: true
      }

    } catch (error) {
      console.error('BBS Module: Error creating ZK credit category predicate proof:', error)
      throw error
    }
  }

  // Verify a ZK credit category predicate proof without learning the exact credit score
  async verifyCreditCategoryPredicate(proofData, requiredCategory) {
    console.log('BBS Module: Verifying mock ZK credit category predicate proof...')

    try {
      // For BBS proof verification, we need to know which messages were disclosed
      // In our case, we disclosed index 0 (anonId) and index 2 (creditCategory) during proof generation
      const disclosedIndexes = [0, 2] // We revealed anonId and creditCategory

      // Extract the disclosed messages
      const disclosedMessages = [
        new TextEncoder().encode(`anonId:${proofData.anonId}`),
        new TextEncoder().encode(`creditCategory:${proofData.userCategory}`)
      ]

      console.log('BBS Module: Verifying with disclosed anonId:', proofData.anonId.substring(0, 8) + '...')
      console.log('BBS Module: Verifying with disclosed credit category:', proofData.userCategory)

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
                           proofData.predicateProof.requiredCategory === requiredCategory &&
                           proofData.predicateProof.type === 'credit_category_gte'

      if (!predicateValid) {
        return { valid: false, reason: 'Credit category predicate not satisfied' }
      }

      console.log('BBS Module: ZK credit category predicate verification successful')

      return {
        valid: true,
        anonId: proofData.anonId,
        creditCategory: proofData.userCategory,
        creditRequirementMet: true,
        // Exact credit score is NOT revealed - this is the key privacy property
        exactCreditScoreHidden: true
      }

    } catch (error) {
      console.error('BBS Module: ZK credit category predicate verification failed:', error)
      return { valid: false, reason: error.message }
    }
  }

  getPublicKey() {
    return this.keyPair?.publicKey
  }
}

export default BBSModule