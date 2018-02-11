module.exports = {
  env: "production",
  url: "http://dimestoreshrink.lvl99.com/",
  debug: true,
  tweetbot: true,
  generateImages: false,
  ga: process.env.DS_GA || "OTHERWISE PUT YOUR INFO HERE",
  twitter: {
    consumer_key: process.env.DS_TWITTER_KEY || "OTHERWISE PUT YOUR INFO HERE",
    consumer_secret: process.env.DS_TWITTER_SECRET || "OTHERWISE PUT YOUR INFO HERE",
    access_token: process.env.DS_TWITTER_ACCESS_TOKEN || "OTHERWISE PUT YOUR INFO HERE",
    access_token_secret: process.env.DS_TWITTER_ACCESS_SECRET || "OTHERWISE PUT YOUR INFO HERE"
  },
  firebase: {
    apiKey: process.env.DS_FIREBASE_KEY || "OTHERWISE PUT YOUR INFO HERE",
    databaseURL: process.env.DS_FIREBASE_DB_URL || "OTHERWISE PUT YOUR INFO HERE"
  }
}
