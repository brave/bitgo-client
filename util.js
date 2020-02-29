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
    seed = Buffer.from(seed)
    if (backup) {
      // BitGo wallet creation errors if the user and backup keys are the same.
      seed[0]++
    }
    return bitgo.coin(coin).keychains().create(seed)
  },

  /**
   * Signs a transaction with the local key.
   * @param {string} coin - type of the wallet; ex: 'btc'
   * @param {ArrayBuffer} seed - 32-byte input seed
   * @param {string} bitgoPub - bitgo public key
   * @param {Object} txPrebuild - transaction prebuild object from bitgo
   * @param {string} address - destination address
   * @param <number> amount - amount in base value (satoshi/wei/etc.)
   */
  signTransaction: async (coin, seed, bitgoPub, txPrebuild, address, amount) => {
    // create a dummy wallet object
    const wallet = bitgo.coin(coin).newWalletObject({})
    // create transaction params from the user input
    const txParams = {
      recipients: [{
        address,
        amount
      }]
    }
    // all 3 keychains are needed for verifyTransaction
    const userKeychain = module.exports.createKeychain(coin, seed)
    const backupKeychain = module.exports.createKeychain(coin, seed, true)

    // verify transaction received from brave actually sends the right
    // amount to the address we are expecting
    const verifyOptions = {
      txParams,
      txPrebuild,
      wallet,
      verification: {
        keychains: [
          { pub: userKeychain.pub },
          { pub: backupKeychain.pub },
          { pub: bitgoPub }],
        disableNetworking: true
      }
    }
    // verify transaction will throw if the transaction cannot be verified
    await wallet.baseCoin.verifyTransaction(verifyOptions)

    // sign the transaction, providing the tx prebuild, the encrypted user keychain, and the wallet passphrase.
    const signOptions = {
      txPrebuild,
      keychain: {
        prv: userKeychain.prv
      }
    }
    return wallet.signTransaction(signOptions)
  }
}
