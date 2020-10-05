const axios = require('axios')
const {ObjectId} = require('mongodb')
const telegramBase = 'https://api.telegram.org/bot'
const telegramMethod = (token, method) => `${telegramBase}${token}/${method}`
const ERROR_NO_TOKEN = {ok: false, error: 'No token specified'}
const ERROR_TOKEN_INVALID = {ok: false, error: 'Token is invalid'}
const ERROR_NO_BOT_ID = {ok: false, error: 'No bot specified'}
const ERROR_BOT_ID_INVALID = {ok: false, error: 'Bot ID is invalid'}
const user = require('./../userSystem')
var db = null

var bot = {
  tokenToBot: (token) => {
    return axios.get(telegramMethod(token, 'getMe'))
  }
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

bot.boot = (app) => {
  db = app.locals.db
}

module.exports = bot