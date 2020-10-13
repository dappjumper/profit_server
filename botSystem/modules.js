const modules = {}
const axios = require('axios')
const ERROR_MODULE_404 = {ok: false, error: 'Module does not exist'}
const ERROR_NO_PAYLOAD = {ok: false, error: 'No change requested'}
const { ObjectId } = require('mongodb')

var db, bot, user = null


modules.handler = {
  moderation_basic: function({bot}) {

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
    options['modules.'+moduleData.id+'.'+option.id] = req.body.data[option.id] || option.default
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