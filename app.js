/** @typedef {import('pear-interface')} */ /* global Pear */
import crypto from 'hypercore-crypto'

document.querySelector('h1').addEventListener('click', (e) => { e.target.innerHTML = '🍐' })

const generateBtn = document.getElementById('generateBtn')
const keyTableBody = document.getElementById('keyTableBody')

generateBtn.addEventListener('click', () => {
  const keyPair = crypto.keyPair()

  const privateKey = keyPair.secretKey.toString('hex')
  const publicKey = keyPair.publicKey.toString('hex')

  const row = document.createElement('tr')
  row.innerHTML = `
    <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace; word-break: break-all;">${privateKey}</td>
    <td style="border: 1px solid #ddd; padding: 8px; font-family: monospace; word-break: break-all;">${publicKey}</td>
  `

  keyTableBody.appendChild(row)
})