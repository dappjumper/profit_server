const { readdirSync } = require('fs')
const path = require('path')
const { ObjectId } = require('mongodb')

const publicModuleData = []

function getModules () {
  const modules = readdirSync(__dirname, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map((dirent) => {
      return dirent.name
    })
  let compiledObject = {}
  for(let i = 0; i<modules.length; i++) {
    compiledObject[modules[i]] = require('./'+modules[i])
    publicModuleData.push(JSON.parse(JSON.stringify(compiledObject[modules[i]])))
    let mod = publicModuleData[publicModuleData.length-1]
    delete mod.handlers
    mod.id = modules[i]
  }
  return compiledObject
}

const _m = {
	modules: getModules()
}

_m.determine = {
  slot: (data) => {
    if (data.inline_query || data.chosen_inline_query) return 'inline'
    if (data.callback_query) return 'callback'
    if (data.channel_post) return 'channel'
    if (data.message) {
      if (data.message.chat) {
        return (data.message.chat.type == 'private' ? 'private' : 'group')
      }
    }
    return null
  },
  availableSlots: (bot) => {
    let slots = ['inline', 'channel', 'group', 'private']
    const activeModules = _m.determine.activeBotModules(bot)
    for(let i = 0; i<activeModules.length; i++) {
      slots.splice(i, 1)
    }
    return slots
  },
  activeBotModules: (bot) => {
    if (!(bot.modules ? Object.keys(bot.modules) : []).length) return []
    let activeModules = []
    for(let key in bot.modules) {
      if (bot.modules[key].active) activeModules.push(key)
    }
    return activeModules
  }
}


_m.updateBotModule = function(req, res) {
  if (!req.params.module_id) return res.send({ok: false, error: 'No module specified'})
  if (!req.body.data) return res.send({ok: false, error: 'No updates specified'})
  if (!_m.modules[req.params.module_id]) return res.send({ok: false, error: 'Module does not exist'})
  if (!req.bot.modules) req.bot.modules = {}
  let query = {
    $set: {}
  }
  for(let i = 0; i<_m.modules[req.params.module_id].options.length; i++) {
    let option = _m.modules[req.params.module_id].options[i]
    if(typeof req.body.data[option.id] !== 'undefined') {
      query.$set['modules.'+req.params.module_id+'.'+option.id] = req.body.data[option.id]
    } else {
      if (!req.bot.modules[req.params.module_id]) query.$set['modules.'+req.params.module_id+'.'+option.id] = option.default
    }
  }
  if (typeof req.body.data.active !== 'undefined') {
    if(req.body.data.active) {
      const availableSlots = _m.determine.availableSlots(req.bot)
      const requiredSlots = _m.modules[req.params.module_id].slots
      for(let i = 0; i<requiredSlots.length; i++) {
        if (availableSlots.indexOf(requiredSlots[i]) === -1) return res.send({ok: false, error: 'Module requires more slots than are available'})
      }
    }
    query.$set['modules.'+req.params.module_id+'.active'] = (req.body.data.active ? true : false)
  }
  _m.doQuery(req.params.bot_id, query)
    .then((result)=>{
      res.send({ok: true, data: result.value.modules[req.params.module_id]})
    })
    .catch((error)=>{
      res.send(error)
    })
}

_m.onUpdate = function({bot, data}) {
  if(!db || !bot || !user || !telegram) return console.log('Missing dependency')
  const slot = _m.determine.slot(data)
  if (!slot) return false
  const activeModules = _m.determine.activeBotModules(bot)
  for(let i in activeModules) {
    if (_m.modules[activeModules[i]].slots.indexOf(slot) > -1) return _m.modules[activeModules[i]].handlers[slot]({
      bot,
      data,
      options: bot.modules[activeModules[i]]
    })
  }
}

_m.doQuery = () => {}

var db, bot, user, telegram = null

_m.boot = function(app) {
  db = app.locals.db
  bot = app.locals.bot
  _m.doQuery = bot.doQuery
  user = app.locals.user
  telegram = app.locals.telegram
  app.get(`/modules`, (req, res)=>{res.send({ok: true, data: publicModuleData})})
  app.patch(`/bot/:bot_id/:module_id/`, user.verifyJWT, user.populateUser, bot.populateBotFromParam, user.mustOwnBot, _m.updateBotModule)
}

module.exports = _m