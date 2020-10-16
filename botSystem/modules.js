const modules = {}
const axios = require('axios')
const ERROR_MODULE_404 = {ok: false, error: 'Module does not exist'}
const ERROR_NO_PAYLOAD = {ok: false, error: 'No change requested'}
const TELEGRAM_API = process.env.TELEGRAM_API || 'https://api.telegram.org/bot'
const { ObjectId } = require('mongodb')

var db, bot, user = null

function t_delete (message, bot) {
  if(!bot.t_info) return false
  if(!bot.t_info.token) return false
  axios.post(TELEGRAM_API+bot.t_info.token+'/deleteMessage', {
    chat_id: message.chat.id,
    message_id: message.message_id
  })
}

function isValidMessage (req) {
  if(!req.body.message) return false
  if(!req.body.message.chat) return false
  return true
}

function isForward (msg) { return (msg.forward_from || msg.forward_from_chat || msg.forward_from_message_id) }
function isJoin (msg) { return (msg.new_chat_members || msg.left_chat_member) } 
function isLink (msg) {
  if (!msg.entities) return false
  for(let i = 0; i<msg.entities.length; i++) {
    if (msg.entities[i].type == 'url' || msg.entities[i].type == 'text_link') return true
  }
}
function isMention (msg) {
  if (!msg.entities) return false
  for(let i = 0; i<msg.entities.length; i++) {
    if (msg.entities[i].type == 'mention' || msg.entities[i].type == 'text_mention') return true
  }
}
function isMedia (msg) { return (msg.video || msg.video_note || msg.photo || msg.document || msg.audio || msg.animation) }

function getConfig (req, name) { return req.bot.modules[name] }

function isAdmin(bot, user_id, chat_id) {
  return new Promise((resolve, reject) => {
    axios.post(TELEGRAM_API+bot.t_info.token+'/getChatMember', {
      chat_id,
      user_id
    })
    .then((result)=>{
      if(!result.data) return reject('No data returned')
      if(!result.data.ok) return reject(result.data.description)
      return resolve((result.data.result.status == 'administrator' || result.data.result.status == 'creator'))
    })
    .catch((error)=>{
      reject(error)
    })
  })
}

modules.handler = {
  moderation_basic: function(req) {
    if (!isValidMessage(req)) return false
    const conf = getConfig(req, 'moderation_basic')
    if (!(
        (conf.delete_join && isJoin(req.body.message)) || 
        (conf.delete_forward && isForward(req.body.message)) ||
        (conf.delete_link && isLink(req.body.message)) ||
        (conf.delete_mention && isMention(req.body.message)) ||
        (conf.delete_media && isMedia(req.body.message))
      )
    ) return false

    if (conf.ignore_admin) {
      isAdmin(req.bot, req.body.message.from.id, req.body.message.chat.id)
        .then((userIsAdmin)=>{
          if(!userIsAdmin) t_delete(req.body.message, req.bot)
        })
        .catch(()=>{
          //Telegram err
        })
    } else {
      t_delete(req.body.message, req.bot)
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
    },{
      name: 'Delete links',
      id: 'delete_link',
      type: 'Boolean',
      default: false
    },{
      name: 'Delete mentions',
      id: 'delete_mention',
      type: 'Boolean',
      default: false
    },{
      name: 'Delete media',
      id: 'delete_media',
      type: 'Boolean',
      default: false
    },{
      name: 'Ignore admins',
      id: 'ignore_admin',
      type: 'Boolean',
      default: true
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