const axios = require('axios')
const {ObjectId} = require('mongodb')
const modules = require('./../modules')
const telegramBase = 'https://api.telegram.org/bot'
const telegramMethod = (token, method) => `${telegramBase}${token}/${method}`
const ERROR_NO_TOKEN = {ok: false, error: 'No token specified'}
const ERROR_TOKEN_INVALID = {ok: false, error: 'Token is invalid'}
const ERROR_NO_BOT_ID = {ok: false, error: 'No bot specified'}
const ERROR_BOT_ID_INVALID = {ok: false, error: 'Bot ID is invalid'}

var db, user, telegram = null
var bot = {}

bot.tokenToBot = (token) => {
  return axios.get(telegramMethod(token, 'getMe'))
}

bot.populateBotFromBody = (req, res, next) => {
  if(!req.body.token) return res.send(ERROR_NO_TOKEN)
  bot.tokenToBot(req.body.token)
    .then((result)=>{
      if(!result.data.ok) return res.send(ERROR_TOKEN_INVALID)
      req.bot = {t_info: result.data.result}
      req.bot.t_info.token = req.body.token
      next()
    })
    .catch((error)=>{
      return res.send(ERROR_TOKEN_INVALID)
    })
}

bot.populateBotFromParam = (req, res, next) => {
  if(!req.params.bot_id) return res.send(ERROR_NO_BOT_ID)
  db.collection('bots').findOne({_id: ObjectId(req.params.bot_id)}, (err, result) => {
    if (err) return res.send(ERROR_BOT_ID_INVALID)
    req.bot = result
    next()
  })
}

bot.getBot = (req, res) => {
  res.send({ok: true, data: req.bot})
}

bot.allowedUpdates = ['active']

bot.doQuery = function(bot_id, query) {
  return new Promise((resolve, reject)=>{
    db.collection('bots').findOneAndUpdate({_id: ObjectId(bot_id)}, query, {new: true, returnOriginal: false}, function(err, result) {
      if(err || !result) return reject({ok: false, error: 'Database error'})
      resolve(result)
    })
  })
}

function updateBot (req, res, query) {
  bot.doQuery(req.bot._id, query)
    .then((result)=>{
      res.send({ok: true, data: query.$set})
    })
    .catch(()=>{
      res.send({ok: false, error: 'Failed to update bot'})
    })
}

function updateBotWithWebhook (req, res, query) {
  telegram[req.body.data.active ? 'startWebhook' : 'stopWebhook'](req.bot)
    .then((result)=>{
      updateBot(req, res, query)
    })
    .catch((error)=>{
      res.send({ok: false, error: 'Bot token seems to be invalid.'})
    })
}

bot.updateBot = (req, res) => {
  let query = {$set: {}}
  let doUpdate = false
  for(let i = 0; i<bot.allowedUpdates.length; i++) {
    if (typeof req.body.data[bot.allowedUpdates[i]] !== 'undefined') {
      doUpdate = true
      query.$set[bot.allowedUpdates[i]] = req.body.data[bot.allowedUpdates[i]]
    }
  }
  if (!doUpdate) res.send({ok: false, error: 'No updates performed'})
  if (typeof req.body.data.active !== 'undefined') return updateBotWithWebhook(req, res, query)
  updateBot(req, res, query)
}

bot.boot = (app) => {
  db = app.locals.db
  user = app.locals.user
  bot = app.locals.bot
  telegram = app.locals.telegram
  modules.boot(app)
  app.get(`/bot/:bot_id`, user.verifyJWT, user.populateUser, user.mustOwnBot, bot.populateBotFromParam, bot.getBot)
  app.patch(`/bot/:bot_id`, user.verifyJWT, user.populateUser, user.mustOwnBot, bot.populateBotFromParam, bot.updateBot)
}

module.exports = bot