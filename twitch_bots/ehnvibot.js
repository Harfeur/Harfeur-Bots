const tmi = require('tmi.js');
const SpotifyWebApi = require('spotify-web-api-node');


var spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENTID,
    clientSecret: process.env.SPOTIFY_CLIENTSECRET,
    redirectUri: 'https://ehnvibot.herokuapp.com/callback'
});

spotifyApi.setAccessToken(process.env.SPOTIFY_EHNVI);

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

    twitchBot.on('message', (target, context, msg, self) => {
        if (self) return;

        const commandName = msg.trim().toLowerCase();

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

    });

    twitchBot.on('connected', (addr, port) => {
        console.log(`* Connected to ${addr}:${port}`);
    });

    twitchBot.connect();
}