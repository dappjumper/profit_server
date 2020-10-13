if(!process.env.production) {
  require('dotenv').config()
} 
const express = require('express')
const app = express()
const MongoClient = require('mongodb').MongoClient;
const port = process.env.PORT || 8000
const bodyParser = require('body-parser')
const cors = require('cors')
const MONGODB_URI = process.env.MONGODB_URI

app.use(cors())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())

const client = new MongoClient(MONGODB_URI, {useUnifiedTopology: true})

client.connect(function(err, db) {
  if(err) return console.log('Failed', err)
  app.locals.db = db.db('profit');
  
  app.locals.user = require('./userSystem')
  app.locals.bot = require('./botSystem')
  app.locals.telegram = require('./telegramSystem')

  const boot = () => {
    app.locals.user.boot(app)
    app.locals.bot.boot(app)
    app.locals.telegram.boot(app)
    app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
  }

  if (process.env.LISTENER_URL) return boot()

  const tunnel = require('localtunnel')({ port })
    .then((result)=>{
      process.env.LISTENER_URL = result.url
      console.log('Tunnel started on '+result.url+' for port '+port)
    })
    .catch()
    .finally(boot)
});
