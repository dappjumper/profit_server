var _main = require('./../')
var _c = require('./../common')
var axios = require('axios')
var _action = require('./../action')

function shouldDeleteMessage({data, options}) {
  if (options.delete_forward) if (_c.contains.forward(data.message)) return true
  if (options.delete_media) if (_c.contains.media(data.message)) return true
  if (options.delete_join) if (_c.contains.joinOrLeft(data.message)) return true
  if (options.delete_link) if (_c.contains.entityType(data.message, ['url','text_link'])) return true
  if (options.delete_mention) if (_c.contains.entityType(data.message, ['mention', 'text_mention'])) return true
  return false
}

const _m = {
  name: 'Basic Moderation',
  slots: ['group'],
  description: 'A basic moderation module',
  level: 0,
  handlers: {
    group: ({bot, data, options}) => {
      if (!shouldDeleteMessage({data, options})) return false
      if (typeof options.ignore_admin !== 'undefined' && !options.ignore_admin) return _action.delete_message({ bot, data })
      _c.isAdmin({ bot, data })
        .catch(()=>{
          _action.delete_message({ bot, data })
        })
    }
  },
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

module.exports = _m