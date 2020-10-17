const axios = require('axios')
const _c = require('./common')
const action = {}

action.delete_message = ({ bot, data }) => {
  if(!bot.t_info) return false
  if(!bot.t_info.token) return false
  axios.post(_c.endpoints.telegram+bot.t_info.token+'/deleteMessage', {
    chat_id: data.message.chat.id,
    message_id: data.message.message_id
  })
}

module.exports = action