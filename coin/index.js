const CoinqvestClient = require('coinqvest-merchant-sdk');

const client = new CoinqvestClient(
    process.env.COIN_KEY,
    process.env.COIN_SECRET
);

var coin = {
  client
}

var db, user, bot, telegram = null

const products = [{
  id: 'token',
  name: 'Premium Token',
  description: 'Load one month of premium per token onto your bot(s) of choice',
  cost: 25
}]

const publicProducts = {}

coin.getProducts = function(req, res) {
  res.send({ok: true, data: products})
}

coin.populateProduct = function(req, res, next) {
  if (!req.body.product) return res.send({ok: false, error: 'Product not specified'})
  if (!publicProducts[req.body.product]) return res.send({ok: false, error: 'Product does not exist'})
  req.product = publicProducts[req.body.product]
  next()
}

coin.getCheckout = function(req, res) {
  console.log(req.product)
}

coin.boot = (app) => {
  db = app.locals.db
  user = app.locals.user
  bot = app.locals.bot
  telegram = app.locals.telegram
  for(let i = 0; i<products.length; i++) {
    publicProducts[products[i].id] = products[i]
  }
  app.get('/products', coin.getProducts)
  app.post('/bot/:bot_id/checkout', user.verifyJWT, user.populateUser, user.mustOwnBot, bot.populateBotFromParam, coin.populateProduct, coin.getCheckout)
}

module.exports = coin