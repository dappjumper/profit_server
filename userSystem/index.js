const jwt = require("jsonwebtoken")
const {ObjectId} = require('mongodb')
const bcrypt = require('bcrypt')
const saltRounds = 5
const prefix = '/user'
const SECRET = process.env.JWT_SECRET || 'supersecret'
const bodyRequirements = ['email', 'password']
const ERROR_DB = {ok: false, error: 'Database error'}
const ERROR_USER_404 = {ok: false, code: 404, error: 'User not found'}
const ERROR_USER_500 = {ok: false, code: 500, error: 'User operation failed'}
const ERROR_USER_EXISTS = {ok: false, code: 403, error: 'User exists already'}
const ERROR_USER_NO_TOKEN = {ok: false, code: 400, error: 'No JWT token specified'}
const ERROR_USER_BAD_PASSWORD = {ok: false, code: 403, error: 'Password is incorrect'}
const ERROR_USER_UNAUTHORIZED = {ok: false, code: 403, error: 'Unauthorized access'}
const ERROR_BOT_IN_USER = {ok: false, code: 400, error: 'Bot already attached'}

var db, bot, telegram = null
var user = {}

const defaultUser = (overwrite) => {
  return {
    ...{
      email: '',
      password: '',
      tokens: 0,
      verified: {
        email: false
      },
      bots: []
    },
    ...overwrite
  }
}

const generateJWT = function (payload, expiresIn) {
  return jwt.sign({
    _id: payload._id,
    email: payload.email
  }, SECRET, { expiresIn: expiresIn || '7d' })
}

const hashPassword = function(password) {
  return bcrypt.hash(password, saltRounds)
}

const compareHashedPassword = function(password, hash) {
  return bcrypt.compare(password, hash)
}

/* START MIDDLEWARE */
user.verifyJWT = function (req, res, next) {
  const authorizationHeader = req.headers['authorization']
  const token = authorizationHeader && authorizationHeader.split(' ')[1]
  if (token == null) return res.send(ERROR_USER_NO_TOKEN)
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.send(ERROR_USER_UNAUTHORIZED)
    req.user = user
    next()
  })
}

user.requireBody = function(req, res, next) {
  let goNext = true
  let missingFields = ''

  for(let i = 0; i<bodyRequirements.length; i++) {
    if(!req.body[bodyRequirements[i]]) {
      goNext = false
      missingFields += (missingFields.length ? ', ' : '') + bodyRequirements[i]
    }
  }

  if(goNext) {
    next()
  } else {
    res.send({ok: false, error: `${missingFields} not specified`})
  }
}
/* END MIDDLEWARE */

/* START ROUTES */
user.login =  function (req, res) {
  db.collection('users').findOne({email:req.body.email}, {password: false}, (err, result) => {
    if(err) return res.send(ERROR_DB)
    if(!result) return res.send(ERROR_USER_404)
    bcrypt.compare(req.body.password, result.password, function(err, compare) {
      if (err || !compare) return res.send(ERROR_USER_BAD_PASSWORD)
      delete result.password
      return res.send({
        ok: true,
        user: result,
        token: generateJWT(result)
      })
    });
  })
}

user.register =  function (req, res) {
  db.collection('users').findOne({email:req.body.email}, {password: false}, (err, result) => {
      if(err) return res.send(ERROR_DB)
      if(result) return res.send(ERROR_USER_EXISTS)
      hashPassword(req.body.password)
        .then((hashedPassword) => {
          db.collection('users').insertOne(defaultUser({
            email: req.body.email,
            password: hashedPassword
          }), (err, result) => {
            if(err || !result) return res.send(ERROR_USER_500)
            delete result.ops[0].password
            return res.send({ok: true, user: result.ops[0], token: generateJWT(result.ops[0])})
          })
        })
    })
}

user.populateUser = function(req, res, next) {
  db.collection('users').findOne({_id:ObjectId(req.user._id)}, {password: false}, (err, result) => {
    if(err) return res.send(ERROR_DB)
    if(!result) return res.send(ERROR_USER_404)
    delete result.password
    req.user = result
    next()
  })
}

user.getMe = function (req, res) {
  res.send({ok: true, data: req.user})
}

user.mustOwnBot = function (req, res, next) {
  for(var i = 0; i<req.user.bots.length; i++) {
    if (req.user.bots[i] == req.params.bot_id) return next()
  }
  return res.send(ERROR_USER_UNAUTHORIZED)
}

user.addBot = function (req, res) {
  db.collection('bots').findOneAndUpdate({'t_info.id': req.bot.t_info.id}, {$set: {t_info: req.bot.t_info}}, {upsert: true}, (err, result) => {
    if(err) return res.send(ERROR_DB)
    let botID = result.lastErrorObject.updatedExisting ? result.value._id : result.lastErrorObject.upserted
    db.collection('users').updateOne({_id:ObjectId(req.user._id)}, {
      $addToSet: {
        bots: botID
      }
    }, (err, resultUser) => {
      if(err) return res.send(ERROR_DB)
      res.send({ok: true, bot_id: botID})
    })
  })
}

user.removeBot = function (req, res) {
  db.collection('users').findOneAndUpdate({_id: ObjectId(req.user._id)}, {$pull: {bots: ObjectId(req.params.bot_id)}}, (err, result) => {
    if(err) return res.send(ERROR_DB)
    res.send({ok: true})
  })
}

user.boot = (app) => {
  db = app.locals.db
  bot = app.locals.bot
  telegram = app.locals.telegram
  app.post(`/user/login`, user.requireBody, user.login)
  app.post(`/user/register`, user.requireBody, user.register)
  app.get(`/user/me`, user.verifyJWT, user.populateUser, user.getMe)
  app.put(`/user/bot`, user.verifyJWT, bot.populateBotFromBody, user.populateUser, user.addBot)
  app.delete(`/user/bot/:bot_id`, user.verifyJWT, user.removeBot)
}

/* END ROUTES */

module.exports = user