const modules = {}
const axios = require('axios')
const ERROR_MODULE_404 = {ok: false, error: 'Module does not exist'}
const ERROR_NO_PAYLOAD = {ok: false, error: 'No change requested'}
const TELEGRAM_API = process.env.TELEGRAM_API || 'https://api.telegram.org/bot'
const { ObjectId } = require('mongodb')

var db, bot, user = null

modules.actions = {
  deleteMsg: function(message, bot) {
    axios.post(TELEGRAM_API+bot.t_info.token+'/deleteMessage', {
      chat_id: message.chat.id,
      message_id: message.message_id
    })
  }
}

modules.handler = {
  moderation_basic: function(req) {
    const body = req.body
    const bot = req.bot
    const mod = req.bot.modules.moderation_basic

    if(!body.message) return false
    if(!body.message.chat) return false
    const msg = body.message
    if(mod.delete_join) {
      if(msg.new_chat_members || msg.left_chat_member) {
        return modules.actions.deleteMsg(msg, req.bot)
      }
    }
    if(mod.delete_forward) {
      if(msg.forward_from || msg.forward_from_chat || msg.forward_from_message_id) {
        return modules.actions.deleteMsg(msg, req.bot)
      }
    }
  }
}

modules.list = [
  {
    name: 'Basic moderation',
    id: 'moderation_basic',
    description: 'A basic moderation module',
    options: [{
      name: 'Delete join',
      id: 'delete_join',
      type: 'Boolean',
      default: false
    },{
      name: 'Delete forwards',
      id: 'delete_forward',
      type: 'Boolean',
      default: false
    }]
  }
]

modules.getModule = (mod) => {
  for (let i = 0; i<modules.list.length; i++) {
    if (modules.list[i].id === mod) return modules.list[i]
  }
  return false
}

modules.setModule = function(req, res) {
  const moduleData = modules.getModule(req.body.module)
  if (!req.body.data) return res.send(ERROR_NO_PAYLOAD)
  if (!moduleData) return res.send(ERROR_MODULE_404)
  let options = {}
  if(typeof req.body.data.active !== 'undefined') options['modules.'+moduleData.id+'.active'] = req.body.data.active
  for(let i = 0; i<moduleData.options.length; i++) {
    let option = moduleData.options[i]
    if(typeof req.body.data[option.id] !== 'undefined') options['modules.'+moduleData.id+'.'+option.id] = req.body.data[option.id]
  }
  console.log('saving', options)
  db.collection('bots').findOneAndUpdate({_id: ObjectId(req.params.bot_id)}, {$set:options}, {new: true, returnOriginal: false}, function(err, result) {
    if(err) return res.send({ok: false, error:'Could not update module'})
    res.send({ok: true, data: result.value.modules[req.body.module]})
  })
}

modules.getList = (req, res) => {
  res.send({ok: true, data:modules.list})
}

modules.boot = (app) => {
  db = app.locals.db
  bot = app.locals.bot
  user = app.locals.user
  app.get(`/bot/modules`, modules.getList)
  app.patch('/bot/:bot_id/module', user.verifyJWT, user.populateUser, user.mustOwnBot, modules.setModule)
}

module.exports = modules