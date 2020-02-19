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
    const keychain = bitgo.coin(coin).keychains().create(seed)
    return keychain
  },

  /**
   * Signs a transaction with the local key.
   * @param {Object} wallet - wallet instance
   * @param {Object} prebuildTx - prebuilt transaction
   */
  signTransaction: async (wallet, prebuildTx) => {
    const halfSigned = await wallet.prebuildAndSignTransaction({
      prebuildTx
    })
    return halfSigned
  }
}
