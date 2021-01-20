const tmi = require('tmi.js');
const SpotifyWebApi = require('spotify-web-api-node');
const rates = require("bitcoin-exchange-rates");


var spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENTID,
    clientSecret: process.env.SPOTIFY_CLIENTSECRET,
    redirectUri: 'https://ehnvibot.herokuapp.com/callback'
});

spotifyApi.setRefreshToken(process.env.SPOTIFY_EHNVI);

function refresh() {
    spotifyApi.refreshAccessToken().then(
        function (data) {
            spotifyApi.setAccessToken(data.body['access_token']);
        })
        .catch(function (err) {
           if (err.statusCode == 503) {
                setTimeout(refresh, 30000);
           } else {
                console.error("Could not refresh access token", err);
           }
        }
    );
}

setInterval(refresh, 3600000);
refresh();

exports.run = () => {

    const opts = {
        connection: {
            reconnect: true
        },
        identity: {
            username: process.env.BOT_USERNAME,
            password: process.env.OAUTH_TOKEN
        },
        channels: [
            "ehnvi_"
        ]
    };

    function minsec(millis) {
        var minutes = Math.floor(millis / 60000);
        var seconds = ((millis % 60000) / 1000).toFixed(0);
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }

    const twitchBot = new tmi.client(opts);

    var countSkip = 0;

    twitchBot.on('message', (target, context, msg, self) => {
        if (self) return;

        const args = msg.split(" ");
        const commandName = args[0];

        if (commandName === '!help') {
            twitchBot.say(target, '!son -> Affiche le son en cours sur Spotify');
            twitchBot.say(target, '!eur 123 -> Convertit 123 µBTC en EURO');
            twitchBot.say(target, '!btc 123 -> Convertit 123 EURO en µBTC');
        }

        if (commandName === '!son') {
            spotifyApi.getMyCurrentPlayingTrack()
                .then(function (data) {
                    if (!data.body.is_playing) {
                        twitchBot.say(target, "Aucun son en cours de lecture");
                        return;
                    }
                    var duree = data.body.item.duration_ms;
                    var avancement = data.body.progress_ms;
                    var barredeson = '─────────────────';
                    var position = parseInt((barredeson.length * avancement) / duree);
                    barredeson = barredeson.slice(0, position) + '⚪' + barredeson.slice(position);
                    twitchBot.say(target, `${data.body.item.name} - ${data.body.item.artists[0].name}`);
                    twitchBot.say(target, `${barredeson}`);
                    twitchBot.say(target, `◄◄⠀▐▐⠀►► ${minsec(avancement)} / ${minsec(duree)}⠀───○ 🔊`);
                }, function (err) {
                    console.log('Something went wrong!', err);
                });

        }

        if (commandName === '!skip') {
            if (countSkip == 2) {
                spotifyApi.getMyCurrentPlayingTrack().then(function (data) {
                    if (!data.body.is_playing) {
                        twitchBot.say(target, "Aucun son en cours de lecture, je ne peux pas passer la musique");
                    } else {
                        spotifyApi.skipToNext();
                        twitchBot.say(target, 'Je viens de passer la musique');
                    }
                });
            } else if (countSkip == 0) {
                twitchBot.say(target, 'Pour passer la musique, un total de 3 personnes doivent faire !skip');
                setTimeout(() => {
                    if (countSkip < 2)
                        twitchBot.say(target, 'Pas assez de personnes ont voté, annulation ...');
                    countSkip = 0;
                }, 30000);
            }
            countSkip++;
        }

        if (commandName === "!eur" && args.length >= 2) {
            var value = parseFloat(args[1]);
            if (isNaN(value))
                twitchBot.say(target, "Veuillez indiquer un nombre");
            else
                rates.fromBTC(parseFloat(args[1]) * 0.000001, 'EUR', function (err, rate) {
                    twitchBot.say(target, `${value} µBTC = ${rate} €`);
                });
        }

        if (commandName === "!btc" && args.length >= 2) {
            var value = parseFloat(args[1]);
            if (isNaN(value))
                twitchBot.say(target, "Veuillez indiquer un nombre");
            else
                rates.fromBTC(1, 'EUR', function (err, rate) {
                    twitchBot.say(target, `${value} € = ${Math.round(value / rate * 1000000)} µBTC`);
                });
        }

    });

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port}`);
    });

    twitchBot.connect();
}