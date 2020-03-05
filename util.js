'use strict'
const BitGoJS = require('bitgo')

// env doesn't matter since we aren't making any network calls to BitGo on the
// client side
const bitgo = new BitGoJS.BitGo({ env: 'test' })

module.exports = {
  /**
   * Takes a seed and converts it into a bitgo keychain.
   * @param {string} coin - type of the wallet; ex: 'btc'
   * @param {ArrayBuffer} seed - 32-byte input seed
   * @param {boolean} backup - true if this is a backup keychain
   */
  createKeychain: (coin, seed, backup) => {
    // Note: seed must be 32 bytes because Stellar and Algo require it. For
    // other coins, bitGoUtxoLib.HDNode.fromSeedBuffer accepts 16-64 bytes.
    if (!seed || seed.byteLength !== 32) {
      throw new Error('Missing 32-byte input seed for createKeychain.')
    }
    const seedBuffer = Buffer.from(seed)
    let finalBuffer
    if (backup) {
      // BitGo wallet creation errors if the user and backup keys are the same.
      finalBuffer = Buffer.alloc(32, seedBuffer)
      finalBuffer[0]++
    } else {
      finalBuffer = seedBuffer
    }
    return bitgo.coin(coin).keychains().create({ seed: finalBuffer })
  },

  /**
   * Signs a transaction with the local key.
   * @param {string} coin - type of the wallet; ex: 'btc'
   * @param {Object} userKeychain - user keychain object
   * @param {Object} backupKeychain - backup keychain object
   * @param {string} bitgoPub - bitgo public key
   * @param {Object} txPrebuild - transaction prebuild object from bitgo
   * @param {string} address - destination address
   * @param <string> amount - amount in base value (satoshi/wei/etc.)
   * @param <Object> addressInfo - extra info for the sending address
   * @param {boolean?} disableVerify - not recommended except for some tests.
   */
  signTransaction: async (coin, userKeychain, backupKeychain, bitgoPub,
    txPrebuild, address, amount, addressInfo, disableVerify) => {
    // create a dummy wallet object
    const wallet = bitgo.coin(coin).newWalletObject({})
    // create transaction params from the user input
    const txParams = {
      recipients: [{
        address,
        amount
      }]
    }

    const addresses = {}
    addresses[address] = addressInfo

    if (disableVerify && typeof it === 'function') {
      // Disable verification for tests where we are trying to test server-side
      // validation, not client-side validation (which is bypassable)
      console.warn('Running without transaction verification! This is not recommended.')
    } else {
      // verify transaction received from brave actually sends the right
      // amount to the address we are expecting
      const verifyOptions = {
        txParams,
        txPrebuild,
        wallet,
        verification: {
          addresses,
          keychains: {
            user: {
              pub: userKeychain.pub
            },
            backup: {
              pub: backupKeychain.pub
            },
            bitgo: {
              pub: bitgoPub
            }
          },
          disableNetworking: false // XXX: set this to true once BitGo updates their SDK.
        }
      }
      await wallet.baseCoin.verifyTransaction(verifyOptions)
    }

    // sign the transaction, providing the tx prebuild, the encrypted user keychain, and the wallet passphrase.
    const signOptions = {
      txPrebuild,
      prv: userKeychain.prv
    }
    return wallet.signTransaction(signOptions)
  }
}
