const axios = require('axios')

const common = {
  contains: {
    forward: (msg) => { return (msg.forward_from || msg.forward_from_chat || msg.forward_from_message_id) },
    joinOrLeft: (msg) => { return (msg.new_chat_members || msg.left_chat_member) },
    entityType: (msg, triggers) => {
      if (!msg.entities && !msg.caption_entities) return false
      const entities = (msg.entities || []).concat((msg.caption_entities || []))
      for(let i = 0; i<entities.length; i++) {
        if (triggers.includes(entities[i].type)) return true
      }
      return false
    },
    media: (msg) => { return (msg.video || msg.video_note || msg.photo || msg.document || msg.audio || msg.animation) }
  }
}

common.endpoints = {
  telegram: 'https://api.telegram.org/bot'
}

common.isAdmin = ({bot, data}) => {
  return new Promise((resolve, reject) => {
    axios.post(common.endpoints.telegram+bot.t_info.token+'/getChatMember', {
      chat_id: data.message.chat.id,
      user_id: data.message.from.id
    })
    .then((result)=>{
      if(!result.data) return reject('No data returned')
      if(!result.data.ok) return reject(result.data.description)
      if((result.data.result.status == 'administrator' || result.data.result.status == 'creator')) return resolve()
      reject()
    })
    .catch((error)=>{
      reject(error)
    })
  })
}

module.exports = common