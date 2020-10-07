const axios = require('axios')
const LISTENER_URL = process.env.LISTENER_URL || 'https://profit-server.hostman.site/telegram'
const ERROR_NO_CHANGE = {ok: false, error: 'No change specified'}

var db, bot, user = null

var telegram = {
  LISTENER_URL: LISTENER_URL
}

telegram.boot = (app) => {
  db = app.locals.db
  bot = app.locals.bot
  user = app.locals.user
}

module.exports = telegram