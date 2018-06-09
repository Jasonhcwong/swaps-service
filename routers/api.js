const bodyParser = require('body-parser');
const {Router} = require('express');

const {checkSwapStatus} = require('./../service');
const {createSwap} = require('./../service');
const {findSwapOutpoint} = require('./../service');
const {getAddressDetails} = require('./../service');
const {getInvoiceDetails} = require('./../service');
const {returnJson} = require('./../async-util');

const maxInvoiceFeeRate = 0.5;

/** Make an api router

  {
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({log}) => {
  const router = Router({caseSensitive: true});

  router.use(bodyParser.json());

  // GET details about an address
  router.get('/address_details/:address', ({params}, res) => {
    const {address} = params;

    return getAddressDetails({address}, returnJson({log, res}));
  });

  // GET details about an invoice
  router.get('/invoice_details/:invoice', ({params}, res) => {
    const {invoice} = params;

    return getInvoiceDetails({
      invoice,
      max_invoice_fee_rate: maxInvoiceFeeRate,
    },
    returnJson({log, res}));
  });

  // POST a swap output find details request
  router.post('/swap_outputs/', ({body}, res) => {
    return findSwapOutpoint({
      network: 'ltctestnet',
      redeem_script: body.redeem_script,
    },
    returnJson({log, res}));
  });

  // POST a new swap
  router.post('/swaps/', ({body}, res) => {
    return createSwap({
      cache: 'memory',
      currency: body.currency,
      invoice: body.invoice,
      refund_address: body.refund_address,
    },
    returnJson({log, res}));
  });

  // POST a swap check request
  router.post('/swaps/check', ({body, params}, res) => {
    return checkSwapStatus({
      cache: 'memory',
      invoice: body.invoice,
      network: 'ltctestnet',
      script: body.redeem_script,
    },
    returnJson({log, res}));
  });

  return router;
};

