const {address} = require('bitcoinjs-lib');
const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {networks} = require('./../chain');
const {Transaction} = require('bitcoinjs-lib');

const {addressDetails} = require('./../chain');
const getWatchedOutput = require('./get_watched_output');
const {returnResult} = require('./../async-util');

const {fromOutputScript} = address;

/** Return swap transactions detected in the outputs of a transaction.

  The type of swaps that can be detected in outputs are funding transactions.

  {
    cache: <Cache Type String>
    network: <Network Name String>
    transaction: <Transaction Hex String>
  }

  @returns via cbk
  {
    swaps: [{
      id: <Transaction Id Hex String>
      index: <Claim Key Index Number>
      invoice: <Invoice Id String>
      output: <Output Script Hex String>
      script: <Redeem Script Hex String>
      tokens: <Token Count Number>
      type: <Type String> 'funding'
      vout: <Output Index Number>
    }]
  }
*/
module.exports = ({cache, network, transaction}, cbk) => {
  return asyncAuto({
    // Validate arguments
    validate: cbk => {
      if (!cache) {
        return cbk([400, 'ExpectedCacheTypeForSwapCaching']);
      }

      if (!network) {
        return cbk([400, 'ExpectedNetworkToWatchForSwapOutput']);
      }

      if (!transaction) {
        return cbk([400, 'ExpectedTransaction']);
      }

      return cbk();
    },

    id: ['validate', ({}, cbk) => {
      try {
        return cbk(null, Transaction.fromHex(transaction).getId());
      } catch (e) {
        return cbk([400, 'ExpectedValidTransaction']);
      }
    }],

    // Derive transaction outputs
    outputs: ['validate', ({}, cbk) => {
      try {
        return cbk(null, Transaction.fromHex(transaction).outs);
      } catch (e) {
        return cbk([400, 'ExpectedValidTransaction']);
      }
    }],

    // Addresses associated with outputs, if any
    addresses: ['outputs', ({outputs}, cbk) => {
      const net = network === 'regtest' ? 'testnet' : network;

      if (!networks[net]) {
        return cbk([400, 'InvalidNetworkForSwapOutput']);
      }

      const outputAddresses = outputs.map(({script, value}, i) => {
        try {
          const address = fromOutputScript(script, networks[net]);

          return {
            address,
            index: i,
            output: script.toString('hex'),
            tokens: value,
            type: addressDetails({address}).type,
          };
        } catch (e) {
          return null;
        }
      });

      const scriptAddresses = outputAddresses
        .filter(n => !!n)
        .filter(({type}) => type === 'p2sh' || type === 'p2wsh');

      return cbk(null, scriptAddresses);
    }],

    // Addresses watched by the scanner
    watchedAddresses: ['addresses', 'id', ({addresses, id}, cbk) => {
      return asyncMap(addresses, ({address, index, output, tokens}, cbk) => {
        return getWatchedOutput({address, cache}, (err, res) => {
          if (!!err) {
            return cbk(err);
          }

          if (!res.swap) {
            return cbk();
          }

          return cbk(null, {
            id,
            output,
            tokens,
            index: res.swap.index,
            invoice: res.swap.invoice,
            script: res.swap.script,
            type: res.swap.type,
            vout: index,
          });
        });
      },
      cbk);
    }],

    // Final set of found swaps
    swaps: ['watchedAddresses', ({watchedAddresses}, cbk) => {
      return cbk(null, {swaps: watchedAddresses.filter(swap => !!swap)});
    }],
  },
  returnResult({of: 'swaps'}, cbk));
};

