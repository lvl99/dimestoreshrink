/*
 * Dimestore Shrink Tweetbot
 */

var config = require('config')
var assign = require('assign')
var Promise = require('bluebird')
var firebase = require('firebase')
var Twit = require('twit')
var svg2png = require('svg2png')
var fs = require('fs')
var path = require('path')

var utils = require('./utils.js')
var DimestoreShrink = require('./dimestoreshrink.js')
var DiagnosisData = require('./data.js')

firebase.initializeApp(config.get('firebase'))
var dimestoreDb = firebase.database()

// Twitter API
var T = new Twit(config.get('twitter'))

var DimestoreTweetbot = {}

function funnyHeader () {
  return DiagnosisData.funnyHeader[DimestoreShrink.getRandomIndex(DiagnosisData.funnyHeader)]
}

DimestoreTweetbot.diagnosisToImage = function (diagnosis) {
  var permalink = (config.get('url') + '').replace(/^https?:\/\/(www.)?/i, '') + (typeof output === 'object' ? 'diagnosis/' + diagnosis.output.uuid : '')
  var colors = {
    blue: '#12a8ff',
    yellow: '#ffff00',
    white: '#ffffff'
  }
  var svgCode = ['<svg version="1.1" width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">']

  // Defs
  svgCode.push('<defs>')
  svgCode.push('<style type="text/css">')
  svgCode.push('@import url("http://fonts.googleapis.com/css?family=Montserrat:400,600");')
  svgCode.push('.all {font-family: "Montserrat", Helvetica, Arial; font-size: 32px;}')
  svgCode.push('.header-name {font-size: 36px; font-weight: 600; color: ' + colors.yellow + '; fill: ' + colors.yellow + ';}')
  svgCode.push('.header-text {font-size: 42px; color: ' + colors.white + '; fill: ' + colors.white + ';}')
  svgCode.push('.diagnosis-name {font-size: 72px; font-weight: 600; color: ' + colors.white + '; fill: ' + colors.white + ';}')
  svgCode.push('.diagnosis-description {font-size: 42px; color: ' + colors.white + '; fill: ' + colors.yellow + ';}')
  svgCode.push('.footer-text {font-size: 36px; color: ' + colors.white + '; fill: ' + colors.white + '; opacity: 0.5;}')
  svgCode.push('.footer-text-2 {font-size: 36px; font-weight: 600; color: ' + colors.white + '; fill: ' + colors.white + '; opacity: 0.5;}')
  svgCode.push('</style>')
  svgCode.push('</defs>')

  // Encapsulating group
  svgCode.push('<g class="all">')

  // Background
  svgCode.push('<rect x="-1" y="-1" width="1002" height="1002" fill="' + colors.blue + '" />')

  // Header name
  svgCode.push('<text x="40" y="60" class="header-name">Dr Hugh Schtinck, Dimestore Shrink</text>')
  svgCode.push('<text x="40" y="120" class="footer-text">' + funnyHeader() + '</text>')
  svgCode.push('<text x="40" y="220" class="header-text">I believe you have ' + diagnosis.level + ' ' + diagnosis.type + ' of... </text>')

  // Name & Description
  svgCode.push('<foreignObject x="40" y="260" width="940" height="700">')
  svgCode.push('<body xmlns="http://www.w3.org/1999/xhtml">')
  svgCode.push('<h1 class="diagnosis-name">' + diagnosis.output.name + '</h1>')
  svgCode.push('<p class="diagnosis-description">' + diagnosis.output.description + '</p>')
  svgCode.push('</body>')
  svgCode.push('</foreignObject>')

  // Footer URL
  svgCode.push('<text x="40" y="880" class="footer-text">Get your own free psychological assessment:</text>')
  svgCode.push('<text x="40" y="940" class="footer-text-2">' + permalink.replace(/\/$/, '') + '</text>')

  svgCode.push('</g>')
  svgCode.push('</svg>')

  svgCode = svgCode.join('')

  var svgBuffer = new Buffer(svgCode)
  pngCode = svg2png.sync(svgBuffer, { width: 500, height: 500 })
  utils.log('DimestoreTweetbot.diagnosisToImage:', 'data:image/svg;base64,' + svgBuffer.toString('base64'), 'data:image/png;base64,' + pngCode.toString('base64'))

  var pngFile = path.join(__dirname, 'static/images/diagnoses', 'image-' + diagnosis.output.uuid + '.png')
  fs.writeFile(pngFile, pngCode, function (err) {
    if (err) {
      return utils.log(err)
    }
    utils.log('The file was saved to: ' + pngFile)
  })

  if (pngCode) {
    return 'data:image/png;base64,' + pngCode.toString('base64')
  } else {
    return false
  }
}

// Tweet!
DimestoreTweetbot.postRandomDiagnosis = function () {
  var self = this

  utils.log('DimestoreTweetbot.postRandomDiagnosis')

  var diagnosis = new DimestoreShrink.Diagnosis()
  var intro = ['Heard of|?', 'Know about|?', 'Know someone with|?', 'Familiar with|?']
  var outro = ['Read more', 'More', 'More info', 'Find out more', 'Learn more', 'Read all about it', 'Check it', 'Check it out']
  var pickIntro = intro[Math.floor(Math.random() * intro.length)].split('|')
  var pickOutro = outro[Math.floor(Math.random() * outro.length)]
  var output = pickIntro[0] + ' ' + diagnosis.output.name + pickIntro[1] + ' ' + pickOutro + ': ' + config.get('url') + 'diagnosis/' + diagnosis.output.uuid
  // var pngImage = self.diagnosisToImage(diagnosis)

  return T.post('statuses/update', {
    status: output
  }).catch(function (err) {
    if (err) utils.log('-- Error posting random diagnosis', err)
  })
}

DimestoreTweetbot.replyWithDiagnosis = function (userMentions, statusId, noPermalink) {
  var self = this

  utils.log('replyWithDiagnosis', {
    userMentions,
    statusId,
    noPermalink
  })

  // Check if hasn't replied to it already
  return dimestoreDb.ref('replies/' + statusId).once('value').then(function (dataSnapshot) {
    if (!dataSnapshot.exists()) {
      var diagnosis = new DimestoreShrink.Diagnosis()
      var intro = ['You may have', 'You\'ve got', 'I think you got', 'I think you have', 'You mosdef have']
      var output = intro[Math.floor(Math.random() * intro.length)] + ' ' + diagnosis.level + ' ' + diagnosis.type + ' of ' + diagnosis.output.name + '!'

      // Hide the permalink
      if (!noPermalink) {
        output += ' ' + config.get('url') + 'diagnosis/' + diagnosis.output.uuid
      }

      // @TODO generate images and upload to Twitter
      // var outputImage = (config.get('generateImages') ? self.diagnosisToImage(diagnosis) : false)

      utils.log('DimestoreTweetbot.replyWithDiagnosis:', {
        output: output,
        userMentions: userMentions,
        statusId: statusId
      })

      var screenNames = []
      for (var i = 0; i < userMentions.length; i++) {
        screenNames.push('@' + userMentions[i].screen_name)
      }

      if (screenNames.length > 0) {
        output = screenNames.join(' ') + ' ' + output

        return T.post('statuses/update', {
          status: output,
          in_reply_to_status_id: statusId
        }).catch(function (err) {
          if (err) utils.log('-- Error replying with diagnosis to tweet #' + statusId, err)
        }).then(function (data) {
          // Save to the DB
          dimestoreDb.ref('replies/' + statusId).set(output, function () {
            utils.log('replied to tweet #' + statusId + ' with diagnosis', output)
          })
        })
      }
    } else {
      // utils.log('Already replied!', statusId, dataSnapshot.val())
    }
  })
}

DimestoreTweetbot.replyWithWittyRemark = function (userMentions, statusId) {
  var self = this

  // Check if hasn't replied to it already
  return dimestoreDb.ref('replies/' + statusId).once('value').then(function (dataSnapshot) {
    if (!dataSnapshot.exists()) {
      var output = DiagnosisData.funnyHeader[DimestoreShrink.getRandomIndex(DiagnosisData.funnyHeader)]

      var screenNames = []
      for (var i = 0; i < userMentions.length; i++) {
        screenNames.push('@' + userMentions[i].screen_name)
      }

      // Only do if actual proper reply
      if (screenNames.length > 0) {
        output = screenNames.join(' ') + ' ' + output

        return T.post('statuses/update', {
          status: output,
          in_reply_to_status_id: statusId
        }).catch(function (err) {
          if (err) utils.log('-- Error replying with witty remark to tweet #' + statusId, err)
        }).then(function () {
          // Save to the DB
          dimestoreDb.ref('replies/' + statusId).set(output, function () {
            utils.log('replied to tweet #' + statusId + ' with witty remark', output)
          })
        })
      }
    } else {
      // utils.log('Already replied!', statusId, dataSnapshot.val())
    }
  })
}

DimestoreTweetbot.replyWithSignoff = function (userMentions, statusId) {
  var self = this

  // Check if hasn't replied to it already
  return dimestoreDb.ref('replies/' + statusId).once('value').then(function (dataSnapshot) {
    if (!dataSnapshot.exists()) {
      var output = DiagnosisData.signoff[DimestoreShrink.getRandomIndex(DiagnosisData.signoff)]

      utils.log('DimestoreTweetbot.replyWithSignoff:', {
        output: output,
        userMentions: userMentions,
        statusId: statusId
      })

      var screenNames = []
      for (var i = 0; i < userMentions.length; i++) {
        screenNames.push('@' + userMentions[i].screen_name)
      }

      // Only do if actual proper reply
      if (screenNames.length > 0) {
        output = screenNames.join(' ') + ' ' + output

        return T.post('statuses/update', {
          status: output,
          in_reply_to_status_id: statusId
        }).catch(function (err) {
          if (err) utils.log('-- Error replying with signoff to tweet #' + statusId, err)
        }).then(function (resp) {
          // utils.log(resp)

          // Save to the DB
          dimestoreDb.ref('replies/' + statusId).set(output, function () {
            utils.log('replied to tweet #' + statusId + ' with signoff', output)
          })
        })
      }
    } else {
      // utils.log('Already replied!', statusId, dataSnapshot.val())
    }
  })
}

DimestoreTweetbot.markAsNoReply = function (statusId) {
  var self = this

  // Check if hasn't replied to it already
  return dimestoreDb.ref('replies/' + statusId).once('value').then(function (dataSnapshot) {
    if (!dataSnapshot.exists()) {
      // Save to the DB
      dimestoreDb.ref('replies/' + statusId).set('noReply', function () {
        utils.log('marked no reply to tweet #' + statusId)
      })
    } else {
      // utils.log('Already replied!', statusId, dataSnapshot.val())
    }
  })
}

DimestoreTweetbot.howShouldIReply = function (text) {
  var self = this

  // Default reply type
  var replyType = 'wittyRemark'

  // Conditions to not leave a reply
  var noReplyCond = [/ple?a?[sz]e?\s+stop/i,
                     /leave\s+me(\s+?(?:alone|be))?/i,
                     /go\s+away/i,
                     /f[aue]?c?[kc]\s+?(?:y?o?u|off?)/i,
                     /(?:shut\s+th[ea]\s+f[aue]?c?k\s+up|stfu)/i]

  // Conditions to reply with a diagnosis
  var diagnosisCond = [/wh?at\s+(?:(?:kind|type)\s+)?(?:(?:problem|issue|deal|sicknesse?|condition)s?\s+)?(?:do|have)\s+i\s+(?:got|have)/i,
                   /am\s+i\s+(?:an?\s+)?(?:crazy|weird|insane|strange|p?(?:s|c)?(?:y|i)ch?o)/i,
                   /wh?at'?(?:s|re)?\s+(?:(?:is|are)\s+)?my\s+(?:problem|issue|deal|sicknesse?|condition)s?/i,
                   /wh?at(?:'|\s+i)?s(.*)wrong\s+with\s+me/i]

  // Conditions to reply with a signoff
  var signoffCond = [/th?a?n?[kx]s? ?(?:u|you)?/i,
                     /(?:ur|yr|yo?u?'?re?)\s+(?:very|reall?y?)?.*funn?y/i,
                     /(?:ur|yr|yo?u?'?re?).*(?:crazy|stupid|lame|dumb?|ass|asshole|cunt|fuck|fucker|bastard|bitch)/i,
                     /\s+no$/i,
                     /wh?at\s+th[ea]\s+(heck|hell|fuck)\s*\?/i,
                     /\s+(?:re?a?l?ly|wh?at|huh)\?$/i]

  // Check for signoffs
  if (replyType === 'wittyRemark') {
    for (var i = 0; i < signoffCond.length; i++) {
      if (signoffCond[i].test(text)) {
        replyType = 'signoff'
        break
      }
    }
  }

  // Check for diagnosis
  if (replyType === 'wittyRemark') {
    for (var i = 0; i < diagnosisCond.length; i++) {
      if (diagnosisCond[i].test(text)) {
        replyType = 'diagnosis'
        break
      }
    }
  }

  // Check for no reply
  for (var i = 0; i < noReplyCond.length; i++) {
    if (noReplyCond[i].test(text)) {
      replyType = 'noReply'
      break
    }
  }

  utils.log('Replying to "' + text + '" with ' + replyType)
  return replyType
}

DimestoreTweetbot.replyToTweets = function () {
  var self = this

  utils.log('DimestoreTweetbot.replyToTweets')

  return T.get('statuses/mentions_timeline', {}).catch(function (err) {
    if (err) utils.log('-- Error fetching statuses/mentions_timeline')
  }).then(function (res) {
    // Found tweets
    if (res.hasOwnProperty('data')) {
      var data = res.data
      var doReplies = []

      utils.log('DimestoreTweetbot.replyToTweets: found ' + data.length + ' tweets with @dimestoreshrink mention')

      // Process each tweet
      for (var i = 0; i < data.length; i++) {
        var replyType = self.howShouldIReply(data[i].text)
        // utils.log('Replying to tweet:', {user: data[i].user.screen_name, text: data[i].text})

        // Detect type of tweet and formulate a response
        if (replyType === 'diagnosis') {
          var doReply = self.replyWithDiagnosis([data[i].user], data[i].id_str)
          if (doReply) doReplies.push(doReply)

        } else if (replyType === 'signoff') {
          // utils.log('replying with signoff to tweet ' + data[i].text)
          var doReply = self.replyWithSignoff([data[i].user], data[i].id_str)
          if (doReply) doReplies.push(doReply)

        } else if (replyType === 'wittyReply') {
          var doReply = self.replyWithWittyRemark([data[i].user], data[i].id_str)
          if (doReply) doReplies.push(doReply)

        } else if (replyType === 'noReply') {
          utils.log('noReply detected', {
            id: data[i].id_str,
            name: data[i].user.name,
            screen_name: data[i].user.screen_name,
            text: data[i].text
          })

          var doReply = self.markAsNoReply(data[i].id_str)
          if (doReply) doReplies.push(doReply)
        }
      }

      utils.log('-- Reply to ' + doReplies.length + ' tweets')
      return Promise.all(doReplies).then(function (res) {
        utils.log('-- Replied to ' + res.length + ' tweets!')
      })
    }
  })
}

DimestoreTweetbot.faveRetweets = function () {
  var self = this

  utils.log('DimestoreTweetbot.faveRetweets')

  return T.get('statuses/retweets_of_me', {}).catch(function (err) {
    if (err) utils.log('-- Error fetching statuses/retweets_of_me')
  }).then(function (res) {
    // Found tweets
    if (res.hasOwnProperty('data') && res.data.length > 0) {
      var data = res.data
      var doFaves = []

      utils.log('DimestoreTweetbot.faveRetweets: found ' + data.length + ' retweets!')

      // Go through all recent retweets
      for (var i = 0; i < data.length; i++) {
        var doFave = T.post('favorites/create', {
          id: data[i].id_str
        }).catch(function (error) {
          utils.log('-- Couldn\'t favourite retweet #' + data[i].id_str, error)
        }).then(function (resp) {
          if (resp.data.errors.length === 0) {
            utils.log('-- Favourited retweet #' + data[i].id_str)
          } else {
            utils.log('-- Couldn\'t favourite retweet #' + data[i].id_str, resp.data.errors)
          }
        })
        doFaves.push(doFave)
      }

      // utils.log('Favourite ' + doFaves.length + ' tweets')
      return Promise.all(doFaves).then(function (res) {
        utils.log('-- Favourited ' + res.length + ' RTs')
      })
    }
  })
}

module.exports = DimestoreTweetbot
