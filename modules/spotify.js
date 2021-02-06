const SpotifyWebApi = require('spotify-web-api-node');
const {
    Client
} = require('pg');

const clientpg = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

clientpg.connect();

function refresh(spotify) {
    spotify.refreshAccessToken().then(
        function (data) {
            spotify.setAccessToken(data.body['access_token']);
        })
    .catch(function (err) {
        if (err.statusCode == 503) {
            setTimeout(() => {refresh(spotify)}, 30000);
        } else {
            console.error("Could not refresh access token", err);
        }
    });
}

class Spotify extends SpotifyWebApi {
    #lastSong = "";

    constructor() {
        super({
            clientId: process.env.SPOTIFY_CLIENTID,
            clientSecret: process.env.SPOTIFY_CLIENTSECRET,
            redirectUri: 'https://ehnvibot.herokuapp.com/callback'
        });
        this.setRefreshToken(process.env.SPOTIFY_EHNVI);
        setInterval(() => {refresh(this)}, 3600000);
        refresh(this);
    }

    updateSongList() {
        let upThis = this;
        this.getMyCurrentPlayingTrack()
                .then(function (data) {
                    if (!data.body.is_playing) {
                        upThis.#lastSong = "";
                        return;
                    }
                    const artists = data.body.item.artists.map(x => x.name.replaceAll("'", "''"));
                    let id = data.body.item.id;
                    if (id != upThis.#lastSong) {
                        upThis.#lastSong = id;
                        clientpg.query(`SELECT count FROM spotify WHERE id='${id}';`)
                        .then(res => {
                            if (res.rowCount == 0)
                                clientpg.query(`INSERT INTO spotify(id, titre, artistes) VALUES ('${id}', '${data.body.item.name.replaceAll("'", "''")}', '${JSON.stringify(artists)}')`)
                                .catch(err => {
                                    console.error(err);
                                });
                            else
                                clientpg.query(`UPDATE spotify SET count=${res.rows[0].count + 1} WHERE id='${id}';`)
                                .catch(err => {
                                    console.error(err);
                                });
                        })
                    }
                }, function (err) {
                    console.log('Something went wrong!', err);
                });
    }
}

module.exports = new Spotify();