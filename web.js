if (process.argv[2] && process.argv[2] == "dev") require("custom-env").env();

const express = require('express')
const app = express()
const port = 8080
const axios = require('axios')
const STREAMLABS_API_BASE = 'https://www.streamlabs.com/api/v1.0'

app.get('/', (req, res) => {
  let authorize_url = `${STREAMLABS_API_BASE}/authorize?`

  let params = {
    'client_id': process.env.CLIENT_ID,
    'redirect_uri': "https://harfeur-bots.herokuapp.com/auth",
    'response_type': 'code',
    'scope': 'donations.create',
  }

  // not encoding params
  authorize_url += Object.keys(params).map(k => `${k}=${params[k]}`).join('&')

  res.send(`<a href="${authorize_url}">Obtenir les jetons d'accès !</a>`)
})

app.get('/auth', (req, res) => {
  let code = req.query.code

  axios.post(`${STREAMLABS_API_BASE}/token?`, {
    'grant_type': 'authorization_code',
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET,
    'redirect_uri': process.env.REDIRECT_URI,
    'code': code
  }).then((response) => {
    res.send(`Jetons d'accès :
    access_token : ${response.data.access_token}
    refresh_token : ${response.data.refresh_token}`)
  }).catch((error) => {
    res.send("Erreur");
    console.log(error)
  })
})

app.get('/test', (req, res) => {
    if (row) {
      var data = {
        name: "Test",
        message: "Merci à XXX d'avoir donné XXX €",
        identifier: "Test",
        amount: 100.00  ,
        currency: "EUR"
      }
      axios.post('https://streamlabs.com/api/v1.0/donations', data)
      .then((res) => {
        console.log(`Status: ${res.status}`);
        console.log('Body: ', res.data);
      })
      .catch((err) => {
        console.error(err);
      });
    }
    res.send();

});

app.listen(port, () => console.log(`Demo app listening on port ${port}!`))
