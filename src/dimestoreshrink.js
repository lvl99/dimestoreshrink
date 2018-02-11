/*
 * Dimestore Shrink
 */

var btoa = require('btoa')
var atob = require('atob')
var DiagnosisData = require('./data.js')
var utils = require('./utils.js')

function getCollectionLength (collection) {
  if (collection instanceof Array) {
    return collection.length
  } else {
    var count = 0
    for (var i in collection) {
      count++
    }
    return count
  }
}

// Get a random index number from a collection
function getRandomIndex (collection) {
  return Math.floor(Math.random() * getCollectionLength(collection))
}

function capitalizeWords (input) {
  return input.replace(/(^|\s)([a-z])/g, function (m, p1, p2) {
    return p1 + p2.toUpperCase()
  })
}

// Diagnosis
var Diagnosis = function (loadChain) {
  var self = this

  self.words = []
  self.mode = 'new'
  self.loadChain = loadChain
  self.chain = []
  self.nameWordCount = 0
  self.level = ''
  self.type = ''
  self.name = []
  self.description = []
  self.pre = ''
  self.start = ''
  self.beforeEnd = ''
  self.end = ''
  self.subject = ''
  self.output = {
    name: '',
    description: '',
    chain: '',
    uuid: ''
  }

  // Generate new diagnosis
  self.generate = function () {
    self.mode = 'new'
    self.loadChain = false

    // Set up the chain to save the data index references too
    self.chain = []

    // First item in chain is number of words in name
    self.nameWordCount = Math.ceil(Math.random() * 3)
    self.addToChain(self.nameWordCount)

    // Generate name
    for (var i = 0; i < self.nameWordCount; i++) {
      // Get a random word
      var num = Math.floor(Math.random() * DiagnosisData.word.length)
      var word = DiagnosisData.word[num]

      // Ensure word hasn't been used already
      if (self.words.indexOf(word) === -1) {
        self.words.push(word)
        self.addToChain(num)
      }
    }

    // Get other random words
    self.level = self.getRandomItem(DiagnosisData.level)
    self.type = self.getRandomItem(DiagnosisData.type)
    self.pre = self.getRandomItem(DiagnosisData.pre)
    self.start = self.getRandomItem(DiagnosisData.start)
    self.beforeEnd = self.getRandomItem(DiagnosisData.beforeEnd)
    self.end = self.getRandomItem(DiagnosisData.end)
  }

  // Load diagnosis from an input string or array
  // e.g. '1_0_2_0_4_5_0_1'
  self.fromChain = function (loadChain) {
    self.words = []

    // Detect if string or array
    if (typeof loadChain === 'string') {
      // Assume UU/ID
      if (!loadChain.match('_')) {
        utils.log('decode base64', loadChain, atob(loadChain))
        loadChain = atob(loadChain)
      }
    }

    // Load an existing chain
    if (typeof loadChain === 'string') {
      loadChain = loadChain.split('_')
    }

    // If the loadChain is an array, start loading
    if (loadChain instanceof Array) {
      self.mode = 'load'
      self.loadChain = loadChain.slice(0)
      self.chain = []

      // First item in chain is number of words in name
      self.nameWordCount = parseInt(self.loadChain.shift(), 10)
      self.addToChain(self.nameWordCount)

      // Create the diagnosis from the chain given
      for (var i = 0; i < self.nameWordCount; i++) {
        var num = parseInt(self.loadChain.shift(), 10)
        self.words.push(DiagnosisData.word[num])
        self.addToChain(num)
      }

      // Automate extraction and validation for diagnosis data referenced in chain
      var indexes = {
        level: parseInt(self.loadChain.shift(), 10),
        type: parseInt(self.loadChain.shift(), 10),
        pre: parseInt(self.loadChain.shift(), 10),
        start: parseInt(self.loadChain.shift(), 10),
        beforeEnd: parseInt(self.loadChain.shift(), 10),
        end: parseInt(self.loadChain.shift(), 10)
      }

      utils.log('fromChain', indexes)

      for (var j = 0; j < indexes.length; j++) {
        // Check the number is valid within the collection, if not, get a random one
        if (indexes[j] > getCollectionLength(DiagnosisData[j])) {
          utils.log('invalid item given: ' + j + '[' + indexes[j] + '] => ' + getCollectionLength(DiagnosisData[j]))
          self[j] = self.getRandomItem(DiagnosisData[j])
        } else {
          self[j] = DiagnosisData[j][indexes[j]]
          self.addToChain(indexes[j])
        }
        utils.log(j, indexes[j], self[j])
      }
    }
  }

  // Add the number to the chain
  self.addToChain = function (num) {
    self.chain.push(num)
  }

  // Get a random item from a collection to add to the chain
  self.getRandomItem = function (collection, addToChain) {
    // Defaults to adding to the chain (mainly used by self.generate)
    if (typeof addToChain === 'undefined') addToChain = true

    var length = getCollectionLength(collection)
    var num = Math.floor(Math.random() * collection.length)

    // Array
    if (collection instanceof Array && collection[num]) {
      if (addToChain) self.addToChain(num)
      return collection[num]

    // Object
    } else {
      var count = 0
      for (var i = 0; i < collection.length; i++) {
        if (count === num) {
          if (addToChain) self.addToChain(num)
          return collection[i]
        }
        count++
      }
    }
  }

  // Replace %keywords% within text input
  self.replaceKeywords = function (input) {
    var keywords = input.match(/\%[^\%]+\%/g)

    // Replace keywords
    if (keywords && keywords.length) {
      for (var i = 0; i < keywords.length; i++) {
        var collection = false
        var collectionName = keywords[i].replace(/\%([^_\%]+)[^\%]*\%/, '$1').toLowerCase()
        var wordVariant = /_/.test(keywords[i]) ? keywords[i].replace(/\%[^_\%]+_([^\%]*)\%/, '$1').toLowerCase() : false
        var word = false

        // Get the word based on the collectionName
        if (collectionName === 'subject') {
          // Use the subject word
          word = self.subject

          // Otherwise load collection of words
        } else {
          collection = DiagnosisData[collectionName]

          switch (self.mode) {
            case 'new':
            default:
              word = self.getRandomItem(collection)
              break

            case 'load':
              // Check if word exists first
              var num = parseInt(self.loadChain.shift(), 10)
              var checkWord = collection[num]
              if (checkWord) {
                word = checkWord
                self.addToChain(num)
              } else {
                word = self.getRandomItem(collection)
              }
              break
          }
        }

        // Get variant
        if (typeof word[wordVariant] === 'string') {
          word = word[wordVariant]
        }

        // Replace all instances of this keyword, only if it's the subject
        if (collectionName === 'subject') {
          input = input.replace(new RegExp(keywords[i], 'gi'), word)

          // Replace a single instance of the keyword
        } else {
          input = input.replace(new RegExp(keywords[i], 'i'), word)
        }

        utils.log('replaced keyword', {
          keyword: keywords[i],
          collectionName: collectionName,
          wordVariant: wordVariant,
          word: word
        })
      }
    }

    return input
  }

  // Compile the diagnosis
  self.compile = function () {
    var i = 0, j = 0

    // Who or what is the subject?
    // -- Self
    self.subject = {
      single: '',
      plural: 'yourself'
    }

    // -- Something else
    for (i = 0; i < self.words.lenght; i++) {
      if (/^\%subject/i.test(self.words[i].word)) {
        switch (self.mode) {
          case 'new':
          default:
            self.subject = self.getRandomItem(DiagnosisData.thing)
            break

          case 'load':
            // Check if word exists first
            var num = parseInt(self.loadChain.shift(), 10)
            var checkWord = DiagnosisData.thing[num]
            if (checkWord) {
              self.subject = checkWord
              self.addToChain(num)
            } else {
              self.subject = self.getRandomItem(DiagnosisData.thing, false)
            }
            break
        }
      }
    }

    // Start of the diagnosis
    self.description.push(self.pre)
    self.description.push(self.start)

    // Build diagnosis from the selected words
    for (i = 0; i < self.words.length; i++) {
      self.name.push(self.words[i].word)
      self.description.push(self.words[i].sentences[i])
    }

    // End of the diagnosis name
    self.name.push(self.end.word)

    // Format the end of the diagnosis sentence depending on the number of words
    var endSentence = self.end.sentence.replace(/\%([a-z]+)\%/, function (m, p1) {
      var fallbackMod = 'ing'//(self.nameWordCount === 1 ? 's' : 'ing')

      // Modify the end word based on the beforeEnd (default to 'ing')
      var mod = self.beforeEnd.replace(/^[^\|]*\|/, '') || fallbackMod

      return DiagnosisData.endKeywords[p1][mod]
    })
    self.description.push(endSentence)

    // Create outputs
    self.output.name = self.name.join(' ')
    self.output.description = ''
    for (j = 0; j < self.description.length; j++) {
      // Add the beforeEnd
      if (j === (self.description.length - 1) && self.beforeEnd) {
        self.output.description += ' ' + self.beforeEnd.replace(/\|.*$/, '') + ' '
      }

      // Add the description
      self.output.description += self.description[j]

      // Insert commas and spaces
      if (j > 1 && j < (self.description.length - 1)) {
        self.output.description += ', '
      } else {
        self.output.description += ' '
      }
    }

    // Replace
    self.output.name = self.replaceKeywords(self.output.name)
    self.output.description = self.replaceKeywords(self.output.description)

    // Build UUID from chain string
    self.output.chain = self.chain.join('_')
    self.output.uuid = btoa(self.output.chain).replace(/=/g, '') // strip base64 padding

    // Final text formatting
    self.output.name = capitalizeWords(self.output.name).trim()
    self.output.description = self.output.description.replace(/ +/g, ' ').trim() + '.'

    utils.log(capitalizeWords(self.mode) + ' diagnosis! ' + self.output.name)
  }

  // Init
  if (loadChain) {
    self.fromChain(loadChain)
  } else {
    self.generate()
  }

  self.compile()
}

module.exports = {
  getCollectionLength: getCollectionLength,
  getRandomIndex: getRandomIndex,
  Diagnosis: Diagnosis
}
