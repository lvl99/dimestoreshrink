/*
 * Dimestore Shrink
 */

var config = require('config')
var express = require('express')
var logger = require('morgan')
var twig = require('twig')
var path = require('path')
var fs = require('fs')

var app = express()
var DiagnosisData = require('./data.js')
var utils = require('./utils.js')
var DimestoreShrink = require('./dimestoreshrink.js')
var DimestoreTweetbot = require('./tweetbot.js')

// Set up app
app.set('tweetbot', (config.get('tweetbot') || false))
app.set('port', (config.has('port') ? config.get('port') : process.env.PORT || 3000))
app.set('env', (config.has('env') ? config.get('env') : process.env.NODE_ENV))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'twig')
app.use(logger('dev'))
app.use(express.static(path.join(__dirname, 'static')))

// Generic view data
var viewData = {
  env: app.get('env'),
  site: {
    url: '/',
    canonical: config.get('url'),
    ga: config.get('ga')
  },
  page: {
    permalink: config.get('url')
  },
  isDiagnosis: false,
  diagnosis: false
}

function funnyHeader () {
  return DiagnosisData.funnyHeader[DimestoreShrink.getRandomIndex(DiagnosisData.funnyHeader)]
}

// Funny header
viewData.funnyHeader = funnyHeader()

// Routes
// -- Index
app.get('/', function (req, res) {
  // Load the chain
  var loadChain = req.query.id

  // Create the diagnosis
  var diagnosis = new DimestoreShrink.Diagnosis(loadChain)
  viewData.diagnosis = diagnosis
  viewData.isDiagnosis = true
  viewData.page.permalink = viewData.site.canonical + 'diagnosis/' + diagnosis.output.uuid
  viewData.funnyHeader = funnyHeader()

  // Render
  res.render('diagnosis', viewData)
})

// -- Link to specific diagnosis
app.get('/diagnosis', function (req, res) {
  res.redirect('/')
})

// -- Link to specific diagnosis
app.get('/diagnosis/:id', function (req, res) {
  // Load the chain
  var loadChain = req.params.id
  if (!loadChain) res.redirect('/')

  // Load the diagnosis
  var diagnosis = new DimestoreShrink.Diagnosis(loadChain)
  viewData.diagnosis = diagnosis
  viewData.isDiagnosis = true
  viewData.page.permalink = viewData.site.canonical + 'diagnosis/' + diagnosis.output.uuid
  viewData.funnyHeader = funnyHeader()

  // Render
  res.render('diagnosis', viewData)
})

// -- Tweetbot
if (app.get('env') === 'production') {
  // Post a random diagnosis every 3 hours
  setInterval(function () {
    if (app.get('tweetbot')) {
      DimestoreTweetbot.postRandomDiagnosis()
    }
  }, 3600000 * 3)

  // Reply to tweets every 1 hour
  setInterval(function () {
    if (app.get('tweetbot')) {
      DimestoreTweetbot.replyToTweets()
    }
  }, 3600000)

  // Favourite retweets every 6 hours
  setInterval(function () {
    if (app.get('tweetbot')) {
      DimestoreTweetbot.faveRetweets()
    }
  }, 3600000 * 6)

  // Do it on initialisation
  if (app.get('tweetbot')) {
    DimestoreTweetbot.postRandomDiagnosis()
    DimestoreTweetbot.replyToTweets()
    DimestoreTweetbot.faveRetweets()
  }

} else if (app.get('env') === 'development') {
  app.get('/tweetbot', function (req, res) {
    res.render('tweetbot', viewData)
  })

  app.get('/tweetbot/postrandom', function (req, res) {
    utils.log('tweetbot/postrandom')

    // Post random diagnosis
    DimestoreTweetbot.postRandomDiagnosis().then(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.then', argv)
    }).catch(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.catch', argv)
    }).finally(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.finally', argv)
      // viewData.argv = argv
      res.render('tweetbot', viewData)
    })
  })

  // -- Tweetbot / Replies
  app.get('/tweetbot/replies', function (req, res) {
    utils.log('tweetbot/replies')

    // Reply to tweets
    DimestoreTweetbot.replyToTweets().then(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.then', argv)
    }).catch(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.catch', argv)
    }).finally(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.finally', argv)
      // viewData.argv = argv
      res.render('tweetbot', viewData)
    })
  })

  // -- Tweetbot / Favourite retweets
  app.get('/tweetbot/retweets', function (req, res) {
    utils.log('tweetbot/retweets')

    // Favourite retweets
    DimestoreTweetbot.faveRetweets().then(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.then', argv)
    }).catch(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.catch', argv)
    }).finally(function () {
      // var argv = Array.prototype.slice.call(arguments)
      // console.log('DimestoreTweetbot.finally', argv)
      // viewData.argv = argv
      res.render('tweetbot', viewData)
    })
  })
}

// Errors
app.use(function(req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// Output errors in dev
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    viewData.message = err.message
    viewData.error = err
    viewData.funnyHeader = funnyHeader()

    utils.error(err)

    res.status(err.status || 500)
    res.render('error', viewData)
  })
} else {
  // Don't output errors in production
  app.use(function(err, req, res, next) {
    viewData.message = err.message
    viewData.error = {}
    viewData.funnyHeader = funnyHeader()

    res.status(err.status || 500)
    res.render('error', viewData)
  })
}

app.listen(app.get('port'))
