const axios = require('axios')
const ERROR_NO_CHANGE = {ok: false, error: 'No change specified'}
const ERROR_TELEGRAM_API = {ok: false, error: 'Telegram API call failed'}
const TELEGRAM_API = process.TELEGRAM_API || 'https://api.telegram.org/bot'

const requireTelegram = function (req, res, next) {

}

var db, bot, user = null

var telegram = {}

telegram.startWebhook = function(bot) {
  return new Promise((resolve, reject) => {
    telegram.stopWebhook(bot)
    .then((webhook)=>{
      axios.post(`${TELEGRAM_API}${bot.t_info.token}/setWebhook`, {
        url: `${process.env.LISTENER_URL}/telegram/${bot._id}`
      })
      .then((result) => {
        if (!result.data) return reject(ERROR_TELEGRAM_API)
        if (!result.data.ok) return reject(ERROR_TELEGRAM_API)
        console.log('Webhook set!', `${process.env.LISTENER_URL}/telegram/${bot._id}`, result.data)
        resolve(result.data.result)
      })
      .catch((e) => {
        reject(ERROR_TELEGRAM_API)
      })
    })
    .finally(()=>{

    })
  })
}

telegram.getWebhook = function(bot) {
  return new Promise((resolve, reject) => {
    axios.get(`${TELEGRAM_API}${bot.t_info.token}/getWebhookInfo`)
    .then((result) => {
      if (!result.data) return reject(ERROR_TELEGRAM_API)
      if (!result.data.ok) return reject(ERROR_TELEGRAM_API)
      resolve(result.data.result)
    })
    .catch((e) => {
      reject(ERROR_TELEGRAM_API)
    })
  })
}

telegram.stopWebhook = function(bot) {
  return new Promise((resolve, reject) => {
    axios.get(`${TELEGRAM_API}${bot.t_info.token}/deleteWebhook`)
    .then(() => {
      //Always resolve non-critical function
      resolve()
    })
    .catch((e) => {
      reject(ERROR_TELEGRAM_API)
    })
  })
}

telegram.onUpdate = function(req, res) {
  res.send(200)
  console.log('Has update!', req.body)
}

telegram.boot = (app) => {
  db = app.locals.db
  bot = app.locals.bot
  user = app.locals.user
  app.post('/telegram/:bot_id', telegram.onUpdate)
}

module.exports = telegram