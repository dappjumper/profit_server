const axios = require('axios')
const {ObjectId} = require('mongodb')
const modules = require('./modules')
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

bot.activation = (req, res) => {
  if(typeof req.body.state == 'undefined') return res.send({ok:false, error:'Must specify activation state'})
  if(typeof req.body.state !== 'boolean') return res.send({ok:false, error:'New state must be boolean'})
  db.collection('bots').findOneAndUpdate({_id: ObjectId(req.params.bot_id)}, {$set:{active:req.body.state}}, function(err, result) {
    if(err) return res.send({ok: false, error:'Could not set state'})
    res.send({ok: true, data: {
      listener: process.env.LISTENER_URL,
      state: req.body.state
    }})
    result.value.active = req.body.state
    if (!req.body.state) return telegram.stopWebhook(result.value)
    telegram.startWebhook(result.value)
  })
}

bot.boot = (app) => {
  db = app.locals.db
  user = app.locals.user
  bot = app.locals.bot
  telegram = app.locals.telegram
  modules.boot(app)
  app.get(`/bot/:bot_id`, user.verifyJWT, user.populateUser, user.mustOwnBot, bot.populateBotFromParam, bot.getBot)
  app.patch(`/bot/:bot_id/activation`, user.verifyJWT, user.populateUser, user.mustOwnBot, bot.activation)
}

module.exports = bot